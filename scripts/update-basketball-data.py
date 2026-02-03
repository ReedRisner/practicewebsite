#!/usr/bin/env python3
"""
Kentucky Basketball Data Auto-Updater (Improved Version)

This script uses the official CBBD Python library to automatically update:
1. Team stats and rankings in update.json
2. Game results in 2025-schedule.json

Usage:
    python update-basketball-data-improved.py

Requirements:
    pip install cbbd --break-system-packages
"""

import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional
import cbbd
from cbbd.rest import ApiException

# Configuration
API_KEY = os.environ.get('BASKETBALL_API_KEY', '')
KENTUCKY_TEAM = 'Kentucky'
SEASON = 2025

# File paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'data')
UPDATE_JSON_PATH = os.path.join(DATA_DIR, 'update.json')
SCHEDULE_JSON_PATH = os.path.join(DATA_DIR, '2025-schedule.json')


def get_api_configuration():
    """Create and return the CBBD API configuration."""
    configuration = cbbd.Configuration(
        host="https://api.collegebasketballdata.com"
    )
    
    if API_KEY:
        configuration.access_token = API_KEY
    else:
        print("⚠️  Warning: No API key found. Set BASKETBALL_API_KEY environment variable.")
    
    return configuration


def parse_schedule_date(date_str: str) -> Optional[datetime]:
    """Parse date from schedule JSON format (e.g., 'November 4, 2024')."""
    try:
        # Try common formats
        for fmt in ['%B %d, %Y', '%b %d, %Y', '%m/%d/%Y', '%Y-%m-%d']:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        return None
    except Exception:
        return None


def parse_api_date(date_str: str) -> Optional[datetime]:
    """Parse date from API format."""
    try:
        # API typically returns ISO format like '2024-11-04' or '2024-11-04T19:00:00'
        if 'T' in date_str:
            return datetime.fromisoformat(date_str.split('T')[0])
        return datetime.fromisoformat(date_str)
    except Exception:
        return None


def normalize_opponent_name(name: str) -> str:
    """Normalize opponent name for matching."""
    # Remove common prefixes
    name = name.replace('vs ', '').replace('at ', '').replace('vs. ', '').replace('@ ', '')
    # Remove special characters and extra spaces
    name = name.strip().lower()
    # Handle common variations
    replacements = {
        'st.': 'st',
        'st ': 'st',
        'state': 'st',
        'university': '',
        'univ': '',
        'u.': '',
    }
    for old, new in replacements.items():
        name = name.replace(old, new)
    return ' '.join(name.split())  # Remove extra whitespace


def fetch_team_stats() -> Optional[Dict]:
    """Fetch Kentucky team statistics."""
    print("Fetching Kentucky team stats...")
    
    try:
        configuration = get_api_configuration()
        
        with cbbd.ApiClient(configuration) as api_client:
            stats_api = cbbd.StatsApi(api_client)
            
            try:
                stats_response = stats_api.get_team_season_stats(
                    season=SEASON,
                    team=KENTUCKY_TEAM
                )
                
                if stats_response:
                    print(f"  ✓ Successfully fetched stats for {KENTUCKY_TEAM}")
                    return {'stats': stats_response}
                
            except ApiException as e:
                print(f"  ✗ Stats API error: {e}")
                return None
                
    except Exception as e:
        print(f"  ✗ Error fetching team stats: {e}")
        return None


def fetch_ratings() -> Optional[Dict]:
    """Fetch Kentucky team ratings."""
    print("Fetching Kentucky ratings...")
    
    try:
        configuration = get_api_configuration()
        
        with cbbd.ApiClient(configuration) as api_client:
            ratings_api = cbbd.RatingsApi(api_client)
            
            try:
                ratings_response = ratings_api.get_adjusted_efficiency(
                    season=SEASON,
                    team=KENTUCKY_TEAM
                )
                
                if ratings_response:
                    print(f"  ✓ Successfully fetched ratings for {KENTUCKY_TEAM}")
                    return {'ratings': ratings_response}
                
            except ApiException as e:
                print(f"  ✗ Ratings API error: {e}")
                return None
                
    except Exception as e:
        print(f"  ✗ Error fetching ratings: {e}")
        return None


def fetch_schedule() -> Optional[List]:
    """Fetch Kentucky team schedule and game results."""
    print("Fetching Kentucky schedule...")
    
    try:
        configuration = get_api_configuration()
        
        with cbbd.ApiClient(configuration) as api_client:
            games_api = cbbd.GamesApi(api_client)
            
            try:
                games_response = games_api.get_games(
                    season=SEASON,
                    team=KENTUCKY_TEAM
                )
                
                if games_response:
                    print(f"  ✓ Successfully fetched {len(games_response)} games for {KENTUCKY_TEAM}")
                    return games_response
                
            except ApiException as e:
                print(f"  ✗ Games API error: {e}")
                return None
                
    except Exception as e:
        print(f"  ✗ Error fetching schedule: {e}")
        return None


def update_stats_file(stats_data: Dict, ratings_data: Dict) -> bool:
    """Update the update.json file with new statistics."""
    print("Updating stats file...")
    
    try:
        with open(UPDATE_JSON_PATH, 'r') as f:
            existing_data = json.load(f)
        
        if '2025' not in existing_data:
            existing_data['2025'] = {'stats': {}, 'rankings': {}}
        
        # Update ratings
        if ratings_data and ratings_data.get('ratings'):
            for rating in ratings_data['ratings']:
                if hasattr(rating, 'adj_o'):
                    existing_data['2025']['stats']['Offensive Rating'] = {
                        'value': f"{rating.adj_o:.1f}",
                        'rank': getattr(rating, 'adj_o_rank', 'N/A')
                    }
                if hasattr(rating, 'adj_d'):
                    existing_data['2025']['stats']['Defensive Rating'] = {
                        'value': f"{rating.adj_d:.1f}",
                        'rank': getattr(rating, 'adj_d_rank', 'N/A')
                    }
        
        # Update basic stats
        if stats_data and stats_data.get('stats'):
            for stat in stats_data['stats']:
                if hasattr(stat, 'wins') and hasattr(stat, 'losses'):
                    existing_data['2025']['rankings']['Overall Record'] = f"{stat.wins}-{stat.losses}"
                
                if hasattr(stat, 'ppg'):
                    existing_data['2025']['stats']['Points Per Game'] = {
                        'value': f"{stat.ppg:.1f}",
                        'rank': 'N/A'
                    }
                if hasattr(stat, 'fg_pct'):
                    existing_data['2025']['stats']['Field Goal %'] = {
                        'value': f"{stat.fg_pct * 100:.1f}%",
                        'rank': 'N/A'
                    }
        
        with open(UPDATE_JSON_PATH, 'w') as f:
            json.dump(existing_data, f, indent=4)
        
        print("  ✓ Stats file updated successfully!")
        return True
        
    except FileNotFoundError:
        print(f"  ✗ Error: File not found: {UPDATE_JSON_PATH}")
        return False
    except Exception as e:
        print(f"  ✗ Error updating stats file: {e}")
        return False


def update_schedule_file(games: List) -> bool:
    """Update the 2025-schedule.json file with game results."""
    print("Updating schedule file...")
    
    try:
        with open(SCHEDULE_JSON_PATH, 'r') as f:
            existing_schedule = json.load(f)
        
        if not games:
            print("  ! No games data available to update")
            return True  # Not an error, just no data
        
        games_updated = 0
        games_checked = 0
        
        print(f"  Checking {len(existing_schedule)} scheduled games against {len(games)} API games...")
        
        # Create a lookup map for API games by date
        api_games_by_date = {}
        for api_game in games:
            api_date = getattr(api_game, 'game_date', None)
            if api_date:
                parsed_date = parse_api_date(api_date)
                if parsed_date:
                    date_key = parsed_date.strftime('%Y-%m-%d')
                    api_games_by_date[date_key] = api_game
        
        # Update scheduled games with results
        for schedule_game in existing_schedule:
            games_checked += 1
            schedule_date_str = schedule_game.get('date', '')
            
            if not schedule_date_str:
                continue
                
            parsed_schedule_date = parse_schedule_date(schedule_date_str)
            if not parsed_schedule_date:
                print(f"  ⚠️  Could not parse date: {schedule_date_str}")
                continue
            
            date_key = parsed_schedule_date.strftime('%Y-%m-%d')
            
            # Find matching API game
            api_game = api_games_by_date.get(date_key)
            
            if api_game:
                # Check if game is completed
                completed = getattr(api_game, 'completed', False)
                
                if completed:
                    home_team = getattr(api_game, 'home_team', '')
                    away_team = getattr(api_game, 'away_team', '')
                    home_score = getattr(api_game, 'home_score', 0)
                    away_score = getattr(api_game, 'away_score', 0)
                    
                    # Determine Kentucky's score
                    if home_team == KENTUCKY_TEAM:
                        kentucky_score = home_score
                        opponent_score = away_score
                    else:
                        kentucky_score = away_score
                        opponent_score = home_score
                    
                    # Build result string
                    if kentucky_score > opponent_score:
                        new_result = f"W {kentucky_score}-{opponent_score}"
                    else:
                        new_result = f"L {kentucky_score}-{opponent_score}"
                    
                    # Update only if changed
                    current_result = schedule_game.get('result', 'TBD')
                    if current_result != new_result:
                        schedule_game['result'] = new_result
                        print(f"  ✓ Updated: {schedule_date_str} - {new_result}")
                        games_updated += 1
        
        print(f"  Checked {games_checked} games, updated {games_updated} results")
        
        if games_updated > 0:
            # Write updated schedule
            with open(SCHEDULE_JSON_PATH, 'w') as f:
                json.dump(existing_schedule, f, indent=4)
            print(f"  ✓ Schedule file updated successfully!")
            return True
        else:
            print("  ℹ️  All games already up to date")
            return True  # Not an error
            
    except FileNotFoundError:
        print(f"  ✗ Error: File not found: {SCHEDULE_JSON_PATH}")
        return False
    except Exception as e:
        print(f"  ✗ Error updating schedule file: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main execution function."""
    print("=" * 60)
    print("Kentucky Basketball Data Updater (CBBD API)")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print()
    
    os.makedirs(DATA_DIR, exist_ok=True)
    
    success = True
    
    # Fetch and update stats
    stats_data = fetch_team_stats()
    ratings_data = fetch_ratings()
    
    if stats_data or ratings_data:
        if not update_stats_file(stats_data or {}, ratings_data or {}):
            success = False
    else:
        print("⚠️  Warning: Could not fetch team stats or ratings")
        success = False
    
    print()
    
    # Fetch and update schedule
    games = fetch_schedule()
    if games is not None:
        if not update_schedule_file(games):
            success = False
    else:
        print("⚠️  Warning: Could not fetch schedule")
        success = False
    
    print()
    print("=" * 60)
    print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    if success:
        print("Status: SUCCESS ✓")
        print("=" * 60)
        return 0
    else:
        print("Status: COMPLETED WITH ERRORS ✗")
        print("=" * 60)
        return 1


if __name__ == '__main__':
    sys.exit(main())
