#!/usr/bin/env python3
"""
Fetch Kentucky Basketball Schedule from College Basketball Data API
Processes and formats data for BBN Stats website
"""

import requests
import json
from datetime import datetime
import os
import sys

# API Configuration - uses same key as your existing workflow
API_KEY = os.environ.get('BASKETBALL_API_KEY', '')

def fetch_schedule(season, api_key=None):
    """
    Fetch schedule data from API for a specific season
    Args:
        season (int): Year the season starts (e.g., 2025 for 2025-26 season)
        api_key (str): API key for authentication
    """
    # API endpoint - season parameter is the year the season ENDS
    api_season = season + 1  # API uses end year (2026 for 2025-26 season)
    url = f"https://api.collegebasketballdata.com/games?team=Kentucky&season={api_season}"
    
    print(f"Fetching schedule for {season}-{season+1} season...")
    print(f"URL: {url}")
    
    headers = {}
    if api_key:
        headers['Authorization'] = f'Bearer {api_key}'
        print("✓ Using API key for authentication")
    else:
        print("⚠️  No API key provided - request will likely fail")
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        print(f"✓ Fetched {len(data)} games")
        return data
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            print(f"✗ Error: API authentication failed")
            print(f"   Make sure BASKETBALL_API_KEY is set in GitHub Secrets")
            return None
        else:
            print(f"✗ HTTP Error {e.response.status_code}: {e}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"✗ Error fetching schedule: {e}")
        return None

def determine_venue(game, kentucky_team_id=135):
    """Determine if game is home, away, or neutral"""
    if game['neutralSite']:
        return 'neutral'
    elif game['homeTeamId'] == kentucky_team_id:
        return 'home'
    else:
        return 'away'

def format_location(game, kentucky_team_id=135):
    """Format location string for display"""
    venue_type = determine_venue(game, kentucky_team_id)
    
    if venue_type == 'home':
        return f"Home - {game['venue']}"
    elif venue_type == 'neutral':
        return f"Neutral - {game['venue']}, {game['city']}, {game['state']}"
    else:
        return f"Away - {game['venue']}, {game['city']}, {game['state']}"

def format_time(start_date_str):
    """Convert ISO datetime to readable time"""
    if not start_date_str:
        return None
    
    try:
        dt = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
        # Convert to EST/EDT (UTC-5/UTC-4)
        from datetime import timedelta
        dt_est = dt - timedelta(hours=5)
        
        # Format as 12-hour time
        time_str = dt_est.strftime("%I:%M %p ET").lstrip('0')
        return time_str
    except Exception as e:
        print(f"Error parsing time: {e}")
        return None

def get_opponent_info(game, kentucky_team_id=135):
    """Get opponent team name and ID"""
    if game['homeTeamId'] == kentucky_team_id:
        return {
            'name': game['awayTeam'],
            'id': game['awayTeamId'],
            'conference': game['awayConference']
        }
    else:
        return {
            'name': game['homeTeam'],
            'id': game['homeTeamId'],
            'conference': game['homeConference']
        }

def get_game_result(game, kentucky_team_id=135):
    """Determine game result from Kentucky's perspective"""
    if game['status'] != 'final':
        return 'TBD'
    
    if game['homeTeamId'] == kentucky_team_id:
        uk_score = game['homePoints']
        opp_score = game['awayPoints']
    else:
        uk_score = game['awayPoints']
        opp_score = game['homePoints']
    
    if uk_score > opp_score:
        return f"W {uk_score}-{opp_score}"
    else:
        return f"L {uk_score}-{opp_score}"

def format_date(start_date_str):
    """Format date for display"""
    if not start_date_str:
        return None
    
    try:
        dt = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
        from datetime import timedelta
        dt_est = dt - timedelta(hours=5)
        
        # Format as "Mon Nov 15"
        day_name = dt_est.strftime("%a")  # Mon, Tue, etc.
        month_name = dt_est.strftime("%b")  # Jan, Feb, etc.
        day_num = dt_est.strftime("%d").lstrip('0')  # 15, 1, etc.
        
        return {
            'day': day_name,
            'date': f"{month_name} {day_num}",
            'full': dt_est.strftime("%B %d, %Y")
        }
    except Exception as e:
        print(f"Error parsing date: {e}")
        return None

def get_team_logo_filename(team_name):
    """Generate logo filename from team name"""
    # Convert to lowercase and replace spaces/special chars with hyphens
    filename = team_name.lower()
    filename = filename.replace(' ', '-')
    filename = filename.replace('&', 'and')
    filename = filename.replace('.', '')
    filename = filename.replace("'", '')
    return f"{filename}.png"

def is_conference_game(game, kentucky_team_id=135):
    """Check if game is a conference game"""
    opponent = get_opponent_info(game, kentucky_team_id)
    # Both teams must be in SEC
    return game['conferenceGame'] and opponent['conference'] == 'SEC'

def process_schedule(raw_data, season):
    """
    Convert API data to website format
    """
    kentucky_team_id = 135
    processed_games = []
    
    for game in raw_data:
        opponent = get_opponent_info(game, kentucky_team_id)
        date_info = format_date(game['startDate'])
        venue_type = determine_venue(game, kentucky_team_id)
        
        if not date_info:
            continue
        
        game_obj = {
            'date': date_info['date'],
            'day': date_info['day'],
            'opponent': opponent['name'],
            'logo': get_team_logo_filename(opponent['name']),
            'location': format_location(game, kentucky_team_id),
            'venue': venue_type,
            'time': format_time(game['startDate']),
            'result': get_game_result(game, kentucky_team_id),
            'conference': is_conference_game(game, kentucky_team_id),
            'opponentRank': 0,  # Will be updated by frontend from rankings API
            'title': game['gameNotes'] if game['gameNotes'] else None,
            'exh': False  # Mark as true for exhibition games if needed
        }
        
        processed_games.append(game_obj)
    
    # Sort by date (earliest first)
    processed_games.sort(key=lambda x: datetime.strptime(x['date'], "%b %d"))
    
    return processed_games

def save_schedule(schedule_data, season, output_dir='data'):
    """Save processed schedule to JSON file"""
    os.makedirs(output_dir, exist_ok=True)
    
    filename = f"{output_dir}/{season}-schedule.json"
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(schedule_data, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Saved schedule to {filename}")
    return filename

def main():
    """Main execution function"""
    # Get API key from environment variable or command line
    api_key = API_KEY
    
    if not api_key and len(sys.argv) > 1:
        api_key = sys.argv[1]
    
    if not api_key:
        print("\n" + "="*60)
        print("⚠️  WARNING: No API Key Found")
        print("="*60)
        print("\nMake sure BASKETBALL_API_KEY is set:")
        print("  - Environment variable: export BASKETBALL_API_KEY='your-key'")
        print("  - Command line: python fetch_schedule.py YOUR_API_KEY")
        print("  - GitHub Secret: Add BASKETBALL_API_KEY in repository settings")
        print("\n" + "="*60 + "\n")
    
    # Fetch schedules for multiple seasons
    seasons = [2024, 2025]  # 2024-25 and 2025-26 seasons
    
    success_count = 0
    for season in seasons:
        print(f"\n{'='*50}")
        print(f"Processing {season}-{season+1} Season")
        print(f"{'='*50}")
        
        raw_data = fetch_schedule(season, api_key)
        
        if raw_data:
            processed_data = process_schedule(raw_data, season)
            save_schedule(processed_data, season)
            print(f"✓ Successfully processed {len(processed_data)} games")
            success_count += 1
        else:
            print(f"✗ Failed to process {season}-{season+1} season")
    
    print("\n" + "="*50)
    print(f"Schedule fetch complete! ({success_count}/{len(seasons)} seasons)")
    print("="*50)
    
    # Exit with error code if no seasons were successful
    if success_count == 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
