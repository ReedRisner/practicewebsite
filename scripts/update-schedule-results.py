#!/usr/bin/env python3
"""
Kentucky Basketball Schedule Result Auto-Updater

This script updates game results in the 2025-schedule.json file by:
1. Fetching completed Kentucky games from the CBBD API
2. Matching them to games in the schedule
3. Updating the "result" field with actual scores (W/L and score)

Usage:
    python update-schedule-results.py
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
SEASON = 2026  # 2025-2026 season

# File paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'data')
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


def fetch_kentucky_games() -> List[Dict]:
    """Fetch all Kentucky games from the API for the season."""
    print("Fetching Kentucky games from API...")
    
    try:
        configuration = get_api_configuration()
        
        with cbbd.ApiClient(configuration) as api_client:
            games_api = cbbd.GamesApi(api_client)
            
            try:
                # Get all Kentucky games for the season
                games = games_api.get_games(season=SEASON, team=KENTUCKY_TEAM)
                
                if games:
                    print(f"  ✓ Found {len(games)} games from API")
                    
                    # Convert to dict format for easier processing
                    game_list = []
                    for game in games:
                        # Determine if Kentucky was home or away
                        is_home = game.home_team == KENTUCKY_TEAM
                        
                        # Get Kentucky's score and opponent's score
                        if is_home:
                            uk_score = game.home_points
                            opp_score = game.away_points
                            opponent = game.away_team
                        else:
                            uk_score = game.away_points
                            opp_score = game.home_points
                            opponent = game.home_team
                        
                        # Determine win/loss
                        if game.status and str(game.status).lower() == 'final':
                            if uk_score > opp_score:
                                result = f"W {uk_score}-{opp_score}"
                            else:
                                result = f"L {uk_score}-{opp_score}"
                        else:
                            result = "TBD"  # Game not finished yet
                        
                        game_list.append({
                            'date': game.start_date,
                            'opponent': opponent,
                            'result': result,
                            'status': str(game.status) if game.status else 'unknown',
                            'home': is_home
                        })
                    
                    return game_list
                else:
                    print("  ⚠️  No games found from API")
                    return []
                
            except ApiException as e:
                print(f"  ✗ Games API error: {e}")
                return []
                
    except Exception as e:
        print(f"  ✗ Error fetching games: {e}")
        import traceback
        traceback.print_exc()
        return []


def normalize_opponent_name(name: str) -> str:
    """Normalize opponent names for matching."""
    # Remove common prefixes/suffixes and normalize
    normalized = name.strip()
    
    # Remove "vs " or "at " prefixes
    if normalized.startswith('vs '):
        normalized = normalized[3:]
    elif normalized.startswith('at '):
        normalized = normalized[3:]
    
    # Common name variations
    replacements = {
        'Mizzou': 'Missouri',
        'Ole Miss': 'Mississippi',
        'Mississippi State': 'Mississippi State',
        'Tennessee Tech': 'Tennessee Tech',
        'St. Johns': "St. John's",
        "St. John's": "St. John's",
    }
    
    for old, new in replacements.items():
        if old.lower() in normalized.lower():
            normalized = new
    
    return normalized.strip()


def match_game_by_opponent_and_date(schedule_game: Dict, api_games: List[Dict]) -> Optional[Dict]:
    """Match a schedule game to an API game by opponent name and approximate date."""
    schedule_opponent = normalize_opponent_name(schedule_game['opponent'])
    
    # Parse the schedule date
    try:
        schedule_date = datetime.strptime(schedule_game['date'], '%B %d, %Y')
    except:
        return None
    
    # Try to find a matching game
    for api_game in api_games:
        api_opponent = normalize_opponent_name(api_game['opponent'])
        
        # Check if opponents match (case-insensitive)
        if api_opponent.lower() != schedule_opponent.lower():
            continue
        
        # Check if dates are close (within 1 day to account for timezone differences)
        api_date = api_game['date'].replace(tzinfo=None)  # Remove timezone for comparison
        date_diff = abs((api_date - schedule_date).days)
        
        if date_diff <= 1:
            return api_game
    
    return None


def update_schedule_file(api_games: List[Dict]) -> bool:
    """Update the schedule JSON file with results from API games."""
    print("Updating schedule file...")
    
    try:
        # Read existing schedule
        with open(SCHEDULE_JSON_PATH, 'r') as f:
            schedule = json.load(f)
        
        updates_made = 0
        
        # Update each game in the schedule
        for game in schedule:
            # Skip exhibition games - they might not be in API
            if game.get('exh', False):
                continue
            
            # Skip games that already have results (unless it's TBD)
            current_result = game.get('result', 'TBD')
            if current_result != 'TBD':
                continue
            
            # Try to match this game to an API game
            matched_game = match_game_by_opponent_and_date(game, api_games)
            
            if matched_game and matched_game['result'] != 'TBD':
                old_result = game['result']
                game['result'] = matched_game['result']
                print(f"  ✓ Updated {game['opponent']}: {old_result} → {matched_game['result']}")
                updates_made += 1
        
        # Write updated schedule back to file
        if updates_made > 0:
            with open(SCHEDULE_JSON_PATH, 'w') as f:
                json.dump(schedule, f, indent=4)
            print(f"  ✓ Successfully updated {updates_made} game(s)")
            return True
        else:
            print("  ℹ️  No updates needed - all completed games already have results")
            return True
        
    except FileNotFoundError:
        print(f"  ✗ Error: Schedule file not found: {SCHEDULE_JSON_PATH}")
        return False
    except json.JSONDecodeError as e:
        print(f"  ✗ Error: Invalid JSON in schedule file: {e}")
        return False
    except Exception as e:
        print(f"  ✗ Error updating schedule: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main execution function."""
    print("=" * 70)
    print("Kentucky Basketball Schedule Result Auto-Updater")
    print(f"Season: 2025-2026 (API season {SEASON})")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    print()
    
    # Ensure data directory exists
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # Fetch games from API
    api_games = fetch_kentucky_games()
    
    if not api_games:
        print("✗ Failed to fetch games from API")
        print("=" * 70)
        return 1
    
    print()
    
    # Update the schedule file
    success = update_schedule_file(api_games)
    
    print()
    print("=" * 70)
    print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    if success:
        print("Status: SUCCESS ✓")
    else:
        print("Status: FAILED ✗")
    
    print("=" * 70)
    return 0 if success else 1


if __name__ == '__main__':
    sys.exit(main())
