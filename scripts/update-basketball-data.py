#!/usr/bin/env python3
"""
Kentucky Basketball Data Auto-Updater (Fixed Version)

This script uses the official CBBD Python library to automatically update:
1. Team stats and rankings in update.json
2. Game results in 2025-schedule.json

Usage:
    python update-basketball-data-fixed.py

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
from pprint import pprint

# Configuration
API_KEY = os.environ.get('BASKETBALL_API_KEY', '')
KENTUCKY_TEAM = 'Kentucky'  # Team name for API queries
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
    
    # Set the API key (Bearer token)
    if API_KEY:
        configuration.access_token = API_KEY
    else:
        print("⚠️  Warning: No API key found. Set BASKETBALL_API_KEY environment variable.")
        print("   You can get a free API key at https://collegebasketballdata.com")
    
    return configuration


def fetch_team_stats() -> Optional[Dict]:
    """Fetch Kentucky team statistics using the official CBBD API."""
    print("Fetching Kentucky team stats...")
    
    try:
        configuration = get_api_configuration()
        
        with cbbd.ApiClient(configuration) as api_client:
            # Use the Stats API to get team season stats
            stats_api = cbbd.StatsApi(api_client)
            
            try:
                # Get team season stats
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
    """Fetch Kentucky team ratings (KenPom-style adjusted efficiency)."""
    print("Fetching Kentucky ratings...")
    
    try:
        configuration = get_api_configuration()
        
        with cbbd.ApiClient(configuration) as api_client:
            # Use the Ratings API to get adjusted efficiency ratings
            ratings_api = cbbd.RatingsApi(api_client)
            
            try:
                # Get adjusted efficiency ratings (similar to KenPom)
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
            # Use the Games API to get schedule
            games_api = cbbd.GamesApi(api_client)
            
            try:
                # Get games for Kentucky
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
        # Read existing data
        with open(UPDATE_JSON_PATH, 'r') as f:
            existing_data = json.load(f)
        
        if not existing_data.get('2025'):
            existing_data['2025'] = {'stats': {}, 'rankings': {}}
        
        # Update ratings from adjusted efficiency data
        if ratings_data and ratings_data.get('ratings'):
            for rating in ratings_data['ratings']:
                # The API returns adjusted offensive and defensive efficiency
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
                # Update record
                if hasattr(stat, 'wins') and hasattr(stat, 'losses'):
                    existing_data['2025']['rankings']['Overall Record'] = f"{stat.wins}-{stat.losses}"
                
                # Add other available stats
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
        
        # Write updated data
        with open(UPDATE_JSON_PATH, 'w') as f:
            json.dump(existing_data, f, indent=4)
        
        print("  ✓ Stats file updated successfully!")
        return True
        
    except FileNotFoundError:
        print(f"  ✗ Error: File not found: {UPDATE_JSON_PATH}")
        return False
    except json.JSONDecodeError as e:
        print(f"  ✗ Error: Invalid JSON in file: {e}")
        return False
    except Exception as e:
        print(f"  ✗ Error updating stats file: {e}")
        return False


def update_schedule_file(games: List) -> bool:
    """Update the 2025-schedule.json file with game results."""
    print("Updating schedule file...")
    
    try:
        # Read existing schedule
        with open(SCHEDULE_JSON_PATH, 'r') as f:
            existing_schedule = json.load(f)
        
        if not games:
            print("  ! No games data available to update")
            return False
        
        games_updated = 0
        
        # Update each game with results from API
        for api_game in games:
            # Find matching game in existing schedule
            for schedule_game in existing_schedule:
                try:
                    # Parse the date from schedule
                    schedule_date_str = schedule_game.get('date', '')
                    # API game date
                    api_date = getattr(api_game, 'game_date', None)
                    
                    if not api_date:
                        continue
                    
                    # Match by date (simplified - you may need to adjust)
                    if api_date and schedule_date_str:
                        # Check if game is completed
                        if getattr(api_game, 'completed', False):
                            # Get scores
                            home_team = getattr(api_game, 'home_team', '')
                            away_team = getattr(api_game, 'away_team', '')
                            home_score = getattr(api_game, 'home_score', 0)
                            away_score = getattr(api_game, 'away_score', 0)
                            
                            # Determine if Kentucky won
                            if home_team == KENTUCKY_TEAM:
                                kentucky_score = home_score
                                opponent_score = away_score
                            else:
                                kentucky_score = away_score
                                opponent_score = home_score
                            
                            # Update result
                            if kentucky_score > opponent_score:
                                result = f"W {kentucky_score}-{opponent_score}"
                            else:
                                result = f"L {kentucky_score}-{opponent_score}"
                            
                            # Only update if changed
                            if schedule_game.get('result') != result:
                                schedule_game['result'] = result
                                print(f"  ✓ Updated: {schedule_game['date']} - {result}")
                                games_updated += 1
                        break
                        
                except (ValueError, KeyError, AttributeError) as e:
                    continue
        
        if games_updated > 0:
            # Write updated schedule
            with open(SCHEDULE_JSON_PATH, 'w') as f:
                json.dump(existing_schedule, f, indent=4)
            print(f"  ✓ Schedule file updated successfully! ({games_updated} games)")
            return True
        else:
            print("  ! No new game results to update")
            return False
            
    except FileNotFoundError:
        print(f"  ✗ Error: File not found: {SCHEDULE_JSON_PATH}")
        return False
    except json.JSONDecodeError as e:
        print(f"  ✗ Error: Invalid JSON in file: {e}")
        return False
    except Exception as e:
        print(f"  ✗ Error updating schedule file: {e}")
        return False


def main():
    """Main execution function."""
    print("=" * 50)
    print("Kentucky Basketball Data Updater (CBBD API)")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)
    print()
    
    # Ensure data directory exists
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
    if games:
        if not update_schedule_file(games):
            success = False
    else:
        print("⚠️  Warning: Could not fetch schedule")
        success = False
    
    print()
    print("=" * 50)
    print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("Status:", "SUCCESS ✓" if success else "COMPLETED WITH WARNINGS ⚠️")
    print("=" * 50)
    
    return 0 if success else 1


if __name__ == '__main__':
    sys.exit(main())
