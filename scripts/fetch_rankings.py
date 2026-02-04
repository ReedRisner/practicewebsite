#!/usr/bin/env python3
"""
Fetch AP Top 25 Rankings for Men's College Basketball
Processes and formats data for BBN Stats website
"""

import requests
import json
import os
from datetime import datetime

def fetch_ap_rankings():
    """
    Fetch current AP Top 25 rankings
    """
    url = "https://ncaa-api.henrygd.me/rankings/basketball-men/d1/associated-press"
    
    print("Fetching AP Top 25 rankings...")
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()
        print(f"✓ Fetched rankings data")
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
    Convert API data to website format
    Returns a dictionary with team names as keys and rank info as values
    """
    if not raw_data or 'data' not in raw_data:
        return None
    
    rankings = {}
    
    for team in raw_data['data']:
        rank = int(team['RANK'])
        school = team['SCHOOL']
        record = team['RECORD (1ST PLACE VOTES)']
        
        # Parse record (remove first place votes if present)
        record_clean = record.split('(')[0].strip() if '(' in record else record.strip()
        
        # Normalize team name for matching
        normalized_name = normalize_team_name(school)
        
        rankings[normalized_name] = {
            'rank': rank,
            'school': school,  # Keep original name
            'record': record_clean
        }
    
    # Create metadata
    poll_info = {
        'apPollDate': raw_data.get('updated', 'Unknown'),
        'lastUpdated': datetime.now().isoformat(),
        'teams': rankings
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
    
    raw_data = fetch_ap_rankings()
    
    if raw_data:
        processed_data = process_rankings(raw_data)
        if processed_data:
            save_rankings(processed_data)
            print(f"✓ Successfully processed {len(processed_data['teams'])} ranked teams")
            print(f"✓ Poll date: {processed_data['apPollDate']}")
        else:
            print("✗ Failed to process rankings data")
    else:
        print("✗ Failed to fetch rankings")
    
    print("="*50)

if __name__ == "__main__":
    main()
