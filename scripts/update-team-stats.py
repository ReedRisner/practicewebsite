#!/usr/bin/env python3
"""
Kentucky Basketball Team Statistics Auto-Updater

This script updates team statistics in update.json by:
1. Fetching Kentucky's season stats from CBBD API
2. Calculating derived stats (Net Rating, percentages)
3. Getting rankings by comparing to all D1 teams
4. Updating the stats section of update.json

Note: Rankings are approximate based on all D1 teams in the API.
KenPom rankings require a subscription and are not auto-updated.

Usage:
    python update-team-stats.py
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


def fetch_kentucky_stats():
    """Fetch Kentucky's team statistics from the API."""
    print("Fetching Kentucky team statistics...")
    
    try:
        configuration = get_api_configuration()
        
        with cbbd.ApiClient(configuration) as api_client:
            stats_api = cbbd.StatsApi(api_client)
            
            try:
                # Get Kentucky stats
                stats = stats_api.get_team_season_stats(
                    season=SEASON,
                    team=KENTUCKY_TEAM
                )
                
                if stats and len(stats) > 0:
                    uk_stats = stats[0]
                    print(f"  ✓ Found stats for {uk_stats.team}")
                    return uk_stats
                else:
                    print("  ⚠️  No stats found for Kentucky")
                    return None
                
            except ApiException as e:
                print(f"  ✗ Stats API error: {e}")
                return None
                
    except Exception as e:
        print(f"  ✗ Error fetching stats: {e}")
        import traceback
        traceback.print_exc()
        return None


def fetch_all_teams_stats():
    """Fetch all D1 team statistics for ranking purposes."""
    print("Fetching all D1 team statistics for rankings...")
    
    try:
        configuration = get_api_configuration()
        
        with cbbd.ApiClient(configuration) as api_client:
            stats_api = cbbd.StatsApi(api_client)
            
            try:
                # Get all teams
                all_stats = stats_api.get_team_season_stats(season=SEASON)
                
                if all_stats:
                    print(f"  ✓ Found stats for {len(all_stats)} teams")
                    return all_stats
                else:
                    print("  ⚠️  No team stats found")
                    return []
                
            except ApiException as e:
                print(f"  ✗ Stats API error: {e}")
                return []
                
    except Exception as e:
        print(f"  ✗ Error fetching all stats: {e}")
        return []


def calculate_rank(value: float, all_values: List[float], higher_is_better: bool = True) -> int:
    """Calculate rank based on value compared to all teams."""
    if higher_is_better:
        sorted_values = sorted(all_values, reverse=True)
    else:
        sorted_values = sorted(all_values)
    
    try:
        rank = sorted_values.index(value) + 1
        return rank
    except ValueError:
        return 0


def extract_stat_value(stats_obj, attr_path: str, default=0.0):
    """Safely extract nested attribute from stats object."""
    try:
        obj = stats_obj
        for attr in attr_path.split('.'):
            obj = getattr(obj, attr, None)
            if obj is None:
                return default
        return float(obj) if obj is not None else default
    except:
        return default


def calculate_team_stats(uk_stats, all_stats):
    """Calculate Kentucky's stats and rankings."""
    print("\nCalculating statistics and rankings...")
    
    stats = {}
    
    # Extract Kentucky values
    uk_off_rating = extract_stat_value(uk_stats, 'rating')
    uk_def_rating = extract_stat_value(uk_stats, 'opponent_rating')
    uk_pace = extract_stat_value(uk_stats, 'pace')
    uk_tov_pct = extract_stat_value(uk_stats, 'turnover_ratio')
    uk_def_tov_pct = extract_stat_value(uk_stats, 'opponent_turnover_ratio')
    
    # Shooting percentages
    uk_fg3_pct = extract_stat_value(uk_stats, 'three_point_field_goal.pct')
    uk_fg2_pct = extract_stat_value(uk_stats, 'two_point_field_goal.pct')
    uk_ft_pct = extract_stat_value(uk_stats, 'free_throw.pct')
    
    # Defensive shooting percentages
    uk_def_fg3_pct = extract_stat_value(uk_stats, 'opponent_three_point_field_goal.pct')
    uk_def_fg2_pct = extract_stat_value(uk_stats, 'opponent_two_point_field_goal.pct')
    uk_def_ft_pct = extract_stat_value(uk_stats, 'opponent_free_throw.pct')
    
    # Calculate Net Rating
    uk_net_rating = uk_off_rating - uk_def_rating if uk_off_rating and uk_def_rating else 0
    
    # Collect all teams' values for ranking
    all_off_ratings = []
    all_def_ratings = []
    all_net_ratings = []
    all_paces = []
    all_tov_pcts = []
    all_def_tov_pcts = []
    all_fg3_pcts = []
    all_fg2_pcts = []
    all_ft_pcts = []
    all_def_fg3_pcts = []
    all_def_fg2_pcts = []
    all_def_ft_pcts = []
    
    for team in all_stats:
        off_r = extract_stat_value(team, 'rating')
        def_r = extract_stat_value(team, 'opponent_rating')
        
        if off_r > 0:
            all_off_ratings.append(off_r)
        if def_r > 0:
            all_def_ratings.append(def_r)
        if off_r > 0 and def_r > 0:
            all_net_ratings.append(off_r - def_r)
        
        pace = extract_stat_value(team, 'pace')
        if pace > 0:
            all_paces.append(pace)
        
        tov = extract_stat_value(team, 'turnover_ratio')
        if tov > 0:
            all_tov_pcts.append(tov)
        
        def_tov = extract_stat_value(team, 'opponent_turnover_ratio')
        if def_tov > 0:
            all_def_tov_pcts.append(def_tov)
        
        fg3 = extract_stat_value(team, 'three_point_field_goal.pct')
        if fg3 > 0:
            all_fg3_pcts.append(fg3)
        
        fg2 = extract_stat_value(team, 'two_point_field_goal.pct')
        if fg2 > 0:
            all_fg2_pcts.append(fg2)
        
        ft = extract_stat_value(team, 'free_throw.pct')
        if ft > 0:
            all_ft_pcts.append(ft)
        
        def_fg3 = extract_stat_value(team, 'opponent_three_point_field_goal.pct')
        if def_fg3 > 0:
            all_def_fg3_pcts.append(def_fg3)
        
        def_fg2 = extract_stat_value(team, 'opponent_two_point_field_goal.pct')
        if def_fg2 > 0:
            all_def_fg2_pcts.append(def_fg2)
        
        def_ft = extract_stat_value(team, 'opponent_free_throw.pct')
        if def_ft > 0:
            all_def_ft_pcts.append(def_ft)
    
    # Calculate rankings
    stats["Offensive Rating"] = {
        "value": f"{uk_off_rating:.1f}",
        "rank": str(calculate_rank(uk_off_rating, all_off_ratings, higher_is_better=True))
    }
    
    stats["Defensive Rating"] = {
        "value": f"{uk_def_rating:.1f}",
        "rank": str(calculate_rank(uk_def_rating, all_def_ratings, higher_is_better=False))
    }
    
    stats["Net Rating"] = {
        "value": f"+{uk_net_rating:.2f}" if uk_net_rating >= 0 else f"{uk_net_rating:.2f}",
        "rank": str(calculate_rank(uk_net_rating, all_net_ratings, higher_is_better=True))
    }
    
    stats["Pace"] = {
        "value": f"{uk_pace:.1f}",
        "rank": str(calculate_rank(uk_pace, all_paces, higher_is_better=True))
    }
    
    stats["Offensive TOV%"] = {
        "value": f"{uk_tov_pct:.1f}",
        "rank": str(calculate_rank(uk_tov_pct, all_tov_pcts, higher_is_better=False))
    }
    
    stats["Defensive TOV%"] = {
        "value": f"{uk_def_tov_pct:.1f}",
        "rank": str(calculate_rank(uk_def_tov_pct, all_def_tov_pcts, higher_is_better=True))
    }
    
    stats["O3P%"] = {
        "value": f"{uk_fg3_pct:.1f}",
        "rank": str(calculate_rank(uk_fg3_pct, all_fg3_pcts, higher_is_better=True))
    }
    
    stats["O2P%"] = {
        "value": f"{uk_fg2_pct:.1f}",
        "rank": str(calculate_rank(uk_fg2_pct, all_fg2_pcts, higher_is_better=True))
    }
    
    stats["OFT%"] = {
        "value": f"{uk_ft_pct:.1f}",
        "rank": str(calculate_rank(uk_ft_pct, all_ft_pcts, higher_is_better=True))
    }
    
    stats["D3P%"] = {
        "value": f"{uk_def_fg3_pct:.1f}",
        "rank": str(calculate_rank(uk_def_fg3_pct, all_def_fg3_pcts, higher_is_better=False))
    }
    
    stats["D2P%"] = {
        "value": f"{uk_def_fg2_pct:.1f}",
        "rank": str(calculate_rank(uk_def_fg2_pct, all_def_fg2_pcts, higher_is_better=False))
    }
    
    stats["DFT%"] = {
        "value": f"{uk_def_ft_pct:.1f}",
        "rank": str(calculate_rank(uk_def_ft_pct, all_def_ft_pcts, higher_is_better=False))
    }
    
    print("  ✓ Statistics calculated")
    return stats


def update_json_file(stats: Dict) -> bool:
    """Update the stats section in update.json."""
    print("\nUpdating update.json file...")
    
    try:
        # Read existing data
        with open(UPDATE_JSON_PATH, 'r') as f:
            data = json.load(f)
        
        # Ensure 2025 section exists
        if '2025' not in data:
            data['2025'] = {'stats': {}, 'rankings': {}}
        
        if 'stats' not in data['2025']:
            data['2025']['stats'] = {}
        
        # Update stats
        data['2025']['stats'] = stats
        
        # Write back
        with open(UPDATE_JSON_PATH, 'w') as f:
            json.dump(data, f, indent=4)
        
        print("  ✓ Successfully updated stats in update.json")
        return True
        
    except FileNotFoundError:
        print(f"  ✗ Error: File not found: {UPDATE_JSON_PATH}")
        return False
    except json.JSONDecodeError as e:
        print(f"  ✗ Error: Invalid JSON: {e}")
        return False
    except Exception as e:
        print(f"  ✗ Error updating file: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main execution function."""
    print("=" * 80)
    print("Kentucky Basketball Team Statistics Auto-Updater")
    print(f"Season: 2025-2026 (API season {SEASON})")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    print()
    
    # Ensure data directory exists
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # Fetch Kentucky stats
    uk_stats = fetch_kentucky_stats()
    if not uk_stats:
        print("\n✗ Failed to fetch Kentucky stats")
        return 1
    
    print()
    
    # Fetch all teams for rankings
    all_stats = fetch_all_teams_stats()
    if not all_stats:
        print("\n⚠️  Could not fetch all teams - rankings may be inaccurate")
        return 1
    
    # Calculate stats and rankings
    stats = calculate_team_stats(uk_stats, all_stats)
    
    # Display stats summary
    print("\n" + "=" * 80)
    print("STATISTICS SUMMARY")
    print("=" * 80)
    for stat_name, stat_data in stats.items():
        print(f"  {stat_name:20s} {stat_data['value']:>8s}  (Rank: #{stat_data['rank']})")
    print("=" * 80)
    
    # Update JSON file
    success = update_json_file(stats)
    
    print()
    print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    if success:
        print("Status: SUCCESS ✓")
    else:
        print("Status: FAILED ✗")
    
    print("=" * 80)
    return 0 if success else 1


if __name__ == '__main__':
    sys.exit(main())
