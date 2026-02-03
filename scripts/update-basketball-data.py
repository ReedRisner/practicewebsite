#!/usr/bin/env python3
"""
Kentucky Basketball Data Auto-Updater (Simplified)

This script updates:
1. Total season record (W-L) for 2025-2026 season
2. Conference standings/rankings (SEC - Conference ID 24)

You will manually update: KenPom, NET Rankings, Bracketology

Usage:
    python update-basketball-data.py
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
CONFERENCE_ID = 24  # SEC Conference

# File paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'data')
UPDATE_JSON_PATH = os.path.join(DATA_DIR, 'update.json')


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


def fetch_team_record() -> Optional[Dict]:
    """Fetch Kentucky's current season record (W-L)."""
    print("Fetching Kentucky season record...")
    
    try:
        configuration = get_api_configuration()
        
        with cbbd.ApiClient(configuration) as api_client:
            stats_api = cbbd.StatsApi(api_client)
            
            try:
                stats_response = stats_api.get_team_season_stats(
                    season=SEASON,
                    team=KENTUCKY_TEAM
                )
                
                if stats_response and len(stats_response) > 0:
                    stat = stats_response[0]
                    wins = getattr(stat, 'wins', 0)
                    losses = getattr(stat, 'losses', 0)
                    conf_wins = getattr(stat, 'conference_wins', 0)
                    conf_losses = getattr(stat, 'conference_losses', 0)
                    
                    print(f"  ✓ Overall Record: {wins}-{losses}")
                    print(f"  ✓ Conference Record: {conf_wins}-{conf_losses}")
                    
                    return {
                        'overall_record': f"{wins}-{losses}",
                        'conference_record': f"{conf_wins}-{conf_losses}",
                        'wins': wins,
                        'losses': losses,
                        'conf_wins': conf_wins,
                        'conf_losses': conf_losses
                    }
                else:
                    print("  ⚠️  No stats found for current season")
                    return None
                
            except ApiException as e:
                print(f"  ✗ Stats API error: {e}")
                return None
                
    except Exception as e:
        print(f"  ✗ Error fetching team record: {e}")
        return None


def fetch_conference_standings() -> Optional[Dict]:
    """Fetch SEC conference standings to find Kentucky's ranking."""
    print("Fetching SEC conference standings...")
    
    try:
        configuration = get_api_configuration()
        
        with cbbd.ApiClient(configuration) as api_client:
            stats_api = cbbd.StatsApi(api_client)
            
            try:
                # Get all SEC teams' stats
                standings_response = stats_api.get_team_season_stats(
                    season=SEASON,
                    conference=CONFERENCE_ID
                )
                
                if standings_response:
                    # Sort by conference record (wins desc, losses asc)
                    teams = []
                    for team_stat in standings_response:
                        team_name = getattr(team_stat, 'team', '')
                        conf_wins = getattr(team_stat, 'conference_wins', 0)
                        conf_losses = getattr(team_stat, 'conference_losses', 0)
                        
                        teams.append({
                            'team': team_name,
                            'conf_wins': conf_wins,
                            'conf_losses': conf_losses,
                            'win_pct': conf_wins / (conf_wins + conf_losses) if (conf_wins + conf_losses) > 0 else 0
                        })
                    
                    # Sort by conference win percentage
                    teams.sort(key=lambda x: (-x['win_pct'], x['conf_losses']))
                    
                    # Find Kentucky's position
                    kentucky_rank = None
                    for i, team in enumerate(teams, 1):
                        if team['team'] == KENTUCKY_TEAM:
                            kentucky_rank = i
                            print(f"  ✓ Kentucky is #{i} in SEC standings")
                            print(f"    Conference Record: {team['conf_wins']}-{team['conf_losses']}")
                            break
                    
                    if kentucky_rank:
                        return {
                            'conference_rank': kentucky_rank,
                            'total_teams': len(teams)
                        }
                    else:
                        print("  ⚠️  Kentucky not found in SEC standings")
                        return None
                else:
                    print("  ⚠️  No conference standings found")
                    return None
                
            except ApiException as e:
                print(f"  ✗ Standings API error: {e}")
                return None
                
    except Exception as e:
        print(f"  ✗ Error fetching conference standings: {e}")
        return None


def update_json_file(record_data: Dict, standings_data: Dict) -> bool:
    """Update the update.json file with record and conference ranking."""
    print("Updating update.json file...")
    
    try:
        # Read existing data
        with open(UPDATE_JSON_PATH, 'r') as f:
            existing_data = json.load(f)
        
        # Ensure 2025 section exists (this represents 2025-2026 season)
        if '2025' not in existing_data:
            existing_data['2025'] = {'stats': {}, 'rankings': {}}
        
        # Update overall record
        if record_data:
            existing_data['2025']['rankings']['Overall Record'] = record_data['overall_record']
            print(f"  ✓ Updated Overall Record: {record_data['overall_record']}")
            
            # Also update conference record if you want to track it
            if 'conference_record' in record_data:
                existing_data['2025']['rankings']['Conference Record'] = record_data['conference_record']
                print(f"  ✓ Updated Conference Record: {record_data['conference_record']}")
        
        # Update conference standing
        if standings_data:
            conference_standing = f"#{standings_data['conference_rank']} in SEC"
            existing_data['2025']['rankings']['Conference Standing'] = conference_standing
            print(f"  ✓ Updated Conference Standing: {conference_standing}")
        
        # Write updated data back
        with open(UPDATE_JSON_PATH, 'w') as f:
            json.dump(existing_data, f, indent=4)
        
        print("  ✓ File updated successfully!")
        return True
        
    except FileNotFoundError:
        print(f"  ✗ Error: File not found: {UPDATE_JSON_PATH}")
        print(f"     Please make sure {UPDATE_JSON_PATH} exists")
        return False
    except json.JSONDecodeError as e:
        print(f"  ✗ Error: Invalid JSON in file: {e}")
        return False
    except Exception as e:
        print(f"  ✗ Error updating file: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main execution function."""
    print("=" * 70)
    print("Kentucky Basketball Auto-Updater - Simplified")
    print(f"Season: 2025-2026 (API season {SEASON})")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    print()
    
    # Ensure data directory exists
    os.makedirs(DATA_DIR, exist_ok=True)
    
    success = True
    
    # Fetch team record
    record_data = fetch_team_record()
    if not record_data:
        print("⚠️  Warning: Could not fetch team record")
        success = False
    
    print()
    
    # Fetch conference standings
    standings_data = fetch_conference_standings()
    if not standings_data:
        print("⚠️  Warning: Could not fetch conference standings")
        success = False
    
    print()
    
    # Update the JSON file
    if record_data or standings_data:
        if not update_json_file(record_data or {}, standings_data or {}):
            success = False
    else:
        print("✗ No data to update")
        success = False
    
    print()
    print("=" * 70)
    print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    if success:
        print("Status: SUCCESS ✓")
        print()
        print("Updated:")
        if record_data:
            print(f"  • Overall Record: {record_data['overall_record']}")
            print(f"  • Conference Record: {record_data['conference_record']}")
        if standings_data:
            print(f"  • Conference Standing: #{standings_data['conference_rank']} in SEC")
        print()
        print("You can manually update:")
        print("  • KenPom Rankings")
        print("  • NET Rankings")
        print("  • Bracketology")
        print("=" * 70)
        return 0
    else:
        print("Status: FAILED ✗")
        print("=" * 70)
        return 1


if __name__ == '__main__':
    sys.exit(main())
