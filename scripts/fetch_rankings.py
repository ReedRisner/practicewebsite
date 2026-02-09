#!/usr/bin/env python3
"""
Fetch AP Top 25 Rankings for Men's College Basketball
Processes and formats data for BBN Stats website
Uses College Basketball Data API for comprehensive ranking history
"""

import requests
import json
import os
from datetime import datetime

def fetch_ap_rankings(season=2026):
    """
    Fetch AP Top 25 rankings from College Basketball Data API
    Args:
        season (int): Season year (ending year, e.g., 2026 for 2025-26 season)
    """
    url = f"https://api.collegebasketballdata.com/rankings?season={season}&pollType=ap"
    
    print(f"Fetching AP Top 25 rankings for {season} season...")
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()
        print(f"✓ Fetched {len(data)} ranking entries")
        return data
    except requests.exceptions.RequestException as e:
        print(f"✗ Error fetching rankings: {e}")
        return None

def normalize_team_name(name):
    """
    Normalize team names for consistent matching
    """
    # Convert to lowercase
    name = name.lower()
    
    # Common normalizations
    replacements = {
        'st.': 'st',
        'miami (oh)': 'miami ohio',
        'miami-oh': 'miami ohio',
        'miami (fl)': 'miami',
        'miami-fl': 'miami',
        'st john\'s': 'st johns',
        'saint john\'s': 'st johns',
        'saint louis': 'st louis',
        'unc': 'north carolina',
        'uconn': 'connecticut',
    }
    
    for old, new in replacements.items():
        name = name.replace(old, new)
    
    # Remove special characters
    name = name.replace('.', '')
    name = name.replace('\'', '')
    name = name.replace('(', '')
    name = name.replace(')', '')
    
    # Normalize whitespace
    name = ' '.join(name.split())
    
    return name

def process_rankings(raw_data):
    """
    Convert API data to website format with weekly rankings
    Returns a structure with:
    - Latest poll date
    - Current rankings (most recent week)
    - Historical rankings by week (for freezing played games)
    """
    if not raw_data or len(raw_data) == 0:
        return None
    
    # Group rankings by week
    weeks = {}
    latest_week = None
    latest_date = None
    
    for entry in raw_data:
        week = entry['week']
        poll_date = entry['pollDate']
        team = entry['team']
        rank = entry.get('ranking')
        
        # Track latest poll
        if latest_date is None or poll_date > latest_date:
            latest_date = poll_date
            latest_week = week
        
        # Initialize week if not exists
        if week not in weeks:
            weeks[week] = {
                'pollDate': poll_date,
                'teams': {}
            }
        
        # Only store ranked teams (ranking 1-25)
        if rank is not None and 1 <= rank <= 25:
            normalized_name = normalize_team_name(team)
            weeks[week]['teams'][normalized_name] = {
                'rank': rank,
                'school': team,
                'points': entry.get('points', 0)
            }
    
    # Get current (latest) rankings
    current_rankings = weeks.get(latest_week, {}).get('teams', {})
    
    # Create metadata
    poll_info = {
        'season': raw_data[0]['season'] if raw_data else 2026,
        'latestWeek': latest_week,
        'latestPollDate': latest_date,
        'lastUpdated': datetime.now().isoformat(),
        'currentRankings': current_rankings,
        'weeklyRankings': weeks  # Store all weeks for historical lookups
    }
    
    return poll_info

def save_rankings(rankings_data, output_dir='data'):
    """Save processed rankings to JSON file"""
    os.makedirs(output_dir, exist_ok=True)
    
    filename = f"{output_dir}/ap-rankings.json"
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(rankings_data, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Saved rankings to {filename}")
    return filename

def main():
    """Main execution function"""
    print("="*50)
    print("Fetching AP Top 25 Rankings")
    print("="*50)
    
    # Fetch for current season (2025-26)
    raw_data = fetch_ap_rankings(season=2026)
    
    if raw_data:
        processed_data = process_rankings(raw_data)
        if processed_data:
            save_rankings(processed_data)
            print(f"✓ Successfully processed rankings")
            print(f"  - Season: {processed_data['season']}")
            print(f"  - Latest week: {processed_data['latestWeek']}")
            print(f"  - Latest poll date: {processed_data['latestPollDate']}")
            print(f"  - Current ranked teams: {len(processed_data['currentRankings'])}")
            print(f"  - Total weeks tracked: {len(processed_data['weeklyRankings'])}")
        else:
            print("✗ Failed to process rankings data")
    else:
        print("✗ Failed to fetch rankings")
    
    print("="*50)

if __name__ == "__main__":
    main()
