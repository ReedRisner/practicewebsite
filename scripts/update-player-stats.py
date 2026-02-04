#!/usr/bin/env python3
"""
Kentucky Basketball Player Statistics Auto-Updater

This script fetches player statistics from the College Basketball Data API
and stores them in a JSON file for use by the comparison tool.

Usage:
    python update-player-stats.py
"""

import json
import os
import sys
from datetime import datetime
from typing import Dict, List
import cbbd
from cbbd.rest import ApiException

# Configuration
API_KEY = os.environ.get('BASKETBALL_API_KEY', '')
KENTUCKY_TEAM = 'Kentucky'
SEASON = 2026  # 2025-2026 season

# File paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'data')
PLAYERS_JSON_PATH = os.path.join(DATA_DIR, 'api-players.json')


def get_api_configuration():
    """Create and return the CBBD API configuration."""
    configuration = cbbd.Configuration(
        host="https://api.collegebasketballdata.com"
    )
    
    if API_KEY:
        configuration.access_token = API_KEY
    else:
        print("⚠️  Warning: No API key found. Set BASKETBALL_API_KEY environment variable.")
        print("    The API may still work without a key, but with rate limits.")
    
    return configuration


def fetch_player_stats():
    """Fetch all Kentucky player statistics from the API."""
    print("=" * 80)
    print("Kentucky Basketball Player Statistics Auto-Updater")
    print(f"Season: 2025-2026 (API season {SEASON})")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    print()
    
    configuration = get_api_configuration()
    
    with cbbd.ApiClient(configuration) as api_client:
        stats_api = cbbd.StatsApi(api_client)
        
        # Fetch Kentucky player stats
        print("Fetching Kentucky player stats...")
        try:
            players_list = stats_api.get_player_season_stats(
                season=SEASON,
                team=KENTUCKY_TEAM
            )
            
            if not players_list:
                print("  ✗ No player data found")
                return None
            
            # Convert to dictionaries
            players_data = [player.to_dict() for player in players_list]
            
            print(f"  ✓ Found {len(players_data)} players")
            
            # Display player summary
            print(f"\n  Players loaded:")
            for player in sorted(players_data, key=lambda x: x.get('minutes', 0), reverse=True):
                name = player.get('name', 'Unknown')
                position = player.get('position', '?')
                games = player.get('games', 0)
                minutes = player.get('minutes', 0)
                ppg = player.get('points', 0) / games if games > 0 else 0
                athlete_id = player.get('athleteSourceId', 'N/A')
                
                print(f"    {name:25s} ({position}) - {games:2d}G, {minutes:4d}min, {ppg:4.1f}ppg - ID: {athlete_id}")
            
            return players_data
                
        except ApiException as e:
            print(f"  ✗ API Error: {e}")
            return None
        except Exception as e:
            print(f"  ✗ Unexpected Error: {e}")
            import traceback
            traceback.print_exc()
            return None


def save_players_json(players_data: List[Dict]) -> bool:
    """Save the players data to JSON file."""
    print("\nSaving player data to JSON file...")
    
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        
        # Create output structure
        output_data = {
            "lastUpdated": datetime.now().isoformat(),
            "season": SEASON,
            "seasonLabel": "2025-2026",
            "team": KENTUCKY_TEAM,
            "playerCount": len(players_data),
            "players": players_data
        }
        
        with open(PLAYERS_JSON_PATH, 'w') as f:
            json.dump(output_data, f, indent=2)
        
        print(f"  ✓ Successfully saved {len(players_data)} players to {PLAYERS_JSON_PATH}")
        return True
        
    except Exception as e:
        print(f"  ✗ Error saving file: {e}")
        import traceback
        traceback.print_exc()
        return False


def display_statistics(players_data: List[Dict]):
    """Display summary statistics."""
    print("\n" + "=" * 80)
    print("PLAYER STATISTICS SUMMARY")
    print("=" * 80)
    
    # Sort by points per game
    sorted_players = sorted(
        players_data,
        key=lambda x: x.get('points', 0) / max(x.get('games', 1), 1),
        reverse=True
    )
    
    print("\nTop Scorers (Points Per Game):")
    print(f"  {'Rank':<6} {'Player':<25} {'PPG':<8} {'RPG':<8} {'APG':<8}")
    print("  " + "-" * 70)
    
    for i, player in enumerate(sorted_players[:10], 1):
        name = player.get('name', 'Unknown')
        games = max(player.get('games', 1), 1)
        ppg = player.get('points', 0) / games
        rpg = player.get('rebounds', {}).get('total', 0) / games
        apg = player.get('assists', 0) / games
        
        print(f"  {i:<6} {name:<25} {ppg:<8.1f} {rpg:<8.1f} {apg:<8.1f}")
    
    # Team totals
    total_points = sum(p.get('points', 0) for p in players_data)
    total_rebounds = sum(p.get('rebounds', {}).get('total', 0) for p in players_data)
    total_assists = sum(p.get('assists', 0) for p in players_data)
    
    avg_games = sum(p.get('games', 0) for p in players_data) / len(players_data)
    
    print(f"\nTeam Totals:")
    print(f"  Total Points: {total_points}")
    print(f"  Total Rebounds: {total_rebounds}")
    print(f"  Total Assists: {total_assists}")
    print(f"  Average Games Played: {avg_games:.1f}")
    
    print("=" * 80)


def main():
    """Main execution function."""
    players_data = fetch_player_stats()
    
    if not players_data:
        print("\n✗ Failed to fetch player stats")
        return 1
    
    # Display statistics
    display_statistics(players_data)
    
    # Save to file
    success = save_players_json(players_data)
    
    print()
    print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Status: {'SUCCESS ✓' if success else 'FAILED ✗'}")
    print("=" * 80)
    
    return 0 if success else 1


if __name__ == '__main__':
    sys.exit(main())
