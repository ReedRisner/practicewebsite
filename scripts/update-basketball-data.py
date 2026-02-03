#!/usr/bin/env python3
"""
Kentucky Basketball Data Auto-Updater (Python Version)

This script automatically updates:
1. Team stats and rankings in update.json
2. Game results in 2025-schedule.json

Usage:
    python update-basketball-data.py
"""

import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional
import urllib.request
import urllib.error

# Configuration
API_KEY = os.environ.get('BASKETBALL_API_KEY', '0/5PdgRvOqvcUo9VqUAcXFUEYqXxU3T26cGqt9c6FFArBcyqE4BD3njMuwOnQz+3')
API_BASE_URL = 'https://api.collegebasketballdata.com'
KENTUCKY_TEAM_ID = '135'  # May need adjustment
SEASON = '2025'

# File paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'data')
UPDATE_JSON_PATH = os.path.join(DATA_DIR, 'update.json')
SCHEDULE_JSON_PATH = os.path.join(DATA_DIR, '2025-schedule.json')


def make_api_request(endpoint: str) -> Optional[Dict]:
    """Make an API request and return JSON response."""
    url = f"{API_BASE_URL}{endpoint}"
    
    try:
        req = urllib.request.Request(url)
        req.add_header('Authorization', f'Bearer {API_KEY}')
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req, timeout=30) as response:
            data = response.read()
            return json.loads(data.decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code} for {url}: {e.reason}")
        return None
    except urllib.error.URLError as e:
        print(f"URL Error for {url}: {e.reason}")
        return None
    except json.JSONDecodeError as e:
        print(f"JSON Decode Error: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None


def fetch_team_stats() -> Optional[Dict]:
    """Fetch Kentucky team statistics."""
    print("Fetching Kentucky team stats...")
    
    # Try multiple endpoint patterns
    endpoints = [
        f"/teams/{KENTUCKY_TEAM_ID}/stats?season={SEASON}",
        f"/v1/teams/{KENTUCKY_TEAM_ID}/stats?season={SEASON}",
        f"/api/teams/{KENTUCKY_TEAM_ID}?season={SEASON}",
        f"/teams/stats?team={KENTUCKY_TEAM_ID}&season={SEASON}",
    ]
    
    for endpoint in endpoints:
        print(f"  Trying: {endpoint}")
        data = make_api_request(endpoint)
        if data:
            print(f"  ✓ Success!")
            return data
        print(f"  ✗ Failed")
    
    print("  All endpoints failed")
    return None


def fetch_schedule() -> Optional[Dict]:
    """Fetch Kentucky team schedule."""
    print("Fetching Kentucky schedule...")
    
    endpoints = [
        f"/teams/{KENTUCKY_TEAM_ID}/schedule?season={SEASON}",
        f"/v1/teams/{KENTUCKY_TEAM_ID}/schedule?season={SEASON}",
        f"/api/schedule?team={KENTUCKY_TEAM_ID}&season={SEASON}",
        f"/schedule/{KENTUCKY_TEAM_ID}?season={SEASON}",
    ]
    
    for endpoint in endpoints:
        print(f"  Trying: {endpoint}")
        data = make_api_request(endpoint)
        if data:
            print(f"  ✓ Success!")
            return data
        print(f"  ✗ Failed")
    
    print("  All endpoints failed")
    return None


def update_stats_file(stats_data: Dict) -> bool:
    """Update the update.json file with new statistics."""
    print("Updating stats file...")
    
    try:
        # Read existing data
        with open(UPDATE_JSON_PATH, 'r') as f:
            existing_data = json.load(f)
        
        # Map API data to your format
        # Note: This mapping depends on the actual API response structure
        # You'll need to adjust these mappings based on the real API response
        
        if stats_data:
            # Update rankings if available
            if 'rankings' in stats_data:
                rankings = stats_data['rankings']
                if 'record' in rankings:
                    existing_data['2025']['rankings']['Overall Record'] = rankings['record']
                if 'kenpom' in rankings:
                    existing_data['2025']['rankings']['KenPom'] = rankings['kenpom']
                if 'net' in rankings:
                    existing_data['2025']['rankings']['NET Rankings'] = rankings['net']
            
            # Update stats if available
            if 'stats' in stats_data:
                stats = stats_data['stats']
                # Map API stats to your format
                # Example mappings (adjust based on actual API):
                if 'offensive_rating' in stats:
                    existing_data['2025']['stats']['Offensive Rating']['value'] = str(stats['offensive_rating'])
                if 'defensive_rating' in stats:
                    existing_data['2025']['stats']['Defensive Rating']['value'] = str(stats['defensive_rating'])
        
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


def update_schedule_file(schedule_data: Dict) -> bool:
    """Update the 2025-schedule.json file with game results."""
    print("Updating schedule file...")
    
    try:
        # Read existing schedule
        with open(SCHEDULE_JSON_PATH, 'r') as f:
            existing_schedule = json.load(f)
        
        if not schedule_data or 'games' not in schedule_data:
            print("  ! No schedule data available to update")
            return False
        
        games_updated = 0
        
        # Update each game with results from API
        for api_game in schedule_data['games']:
            # Find matching game in existing schedule
            for schedule_game in existing_schedule:
                # Match by date
                try:
                    schedule_date = datetime.strptime(schedule_game['date'], '%B %d, %Y').date()
                    api_date = datetime.fromisoformat(api_game['date']).date()
                    
                    if schedule_date == api_date:
                        # Check if game is completed
                        if api_game.get('status') == 'completed':
                            # Update result
                            kentucky_score = api_game.get('kentucky_score', 0)
                            opponent_score = api_game.get('opponent_score', 0)
                            
                            if kentucky_score > opponent_score:
                                schedule_game['result'] = f"W {kentucky_score}-{opponent_score}"
                            else:
                                schedule_game['result'] = f"L {kentucky_score}-{opponent_score}"
                            
                            print(f"  ✓ Updated: {schedule_game['date']} - {schedule_game['result']}")
                            games_updated += 1
                        break
                except (ValueError, KeyError) as e:
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
    print("Kentucky Basketball Data Updater")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)
    print()
    
    # Ensure data directory exists
    os.makedirs(DATA_DIR, exist_ok=True)
    
    success = True
    
    # Fetch and update stats
    stats_data = fetch_team_stats()
    if stats_data:
        if not update_stats_file(stats_data):
            success = False
    else:
        print("⚠ Warning: Could not fetch team stats")
        success = False
    
    print()
    
    # Fetch and update schedule
    schedule_data = fetch_schedule()
    if schedule_data:
        if not update_schedule_file(schedule_data):
            success = False
    else:
        print("⚠ Warning: Could not fetch schedule")
        success = False
    
    print()
    print("=" * 50)
    print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("Status:", "SUCCESS ✓" if success else "COMPLETED WITH WARNINGS ⚠")
    print("=" * 50)
    
    return 0 if success else 1


if __name__ == '__main__':
    sys.exit(main())
