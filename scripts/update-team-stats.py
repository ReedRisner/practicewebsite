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


def fetch_kentucky_efficiency():
    """Fetch Kentucky's adjusted efficiency (offensive/defensive ratings)."""
    print("Fetching Kentucky efficiency ratings...")
    
    try:
        configuration = get_api_configuration()
        
        with cbbd.ApiClient(configuration) as api_client:
            ratings_api = cbbd.RatingsApi(api_client)
            
            try:
                # Get Kentucky efficiency ratings
                efficiency = ratings_api.get_adjusted_efficiency(
                    season=SEASON,
                    team=KENTUCKY_TEAM
                )
                
                if efficiency and len(efficiency) > 0:
                    uk_efficiency = efficiency[0]
                    print(f"  ✓ Found efficiency for {uk_efficiency.team}")
                    return uk_efficiency
                else:
                    print("  ⚠️  No efficiency data found for Kentucky")
                    return None
                
            except ApiException as e:
                print(f"  ✗ Ratings API error: {e}")
                return None
                
    except Exception as e:
        print(f"  ✗ Error fetching efficiency: {e}")
        import traceback
        traceback.print_exc()
        return None


def fetch_kentucky_shooting():
    """Fetch Kentucky's shooting statistics."""
    print("Fetching Kentucky shooting statistics...")
    
    try:
        configuration = get_api_configuration()
        
        with cbbd.ApiClient(configuration) as api_client:
            stats_api = cbbd.StatsApi(api_client)
            
            try:
                # Get Kentucky shooting stats
                stats = stats_api.get_team_season_shooting_stats(
                    season=SEASON,
                    team=KENTUCKY_TEAM
                )
                
                if stats and len(stats) > 0:
                    uk_stats = stats[0]
                    print(f"  ✓ Found shooting stats for {uk_stats.team}")
                    return uk_stats
                else:
                    print("  ⚠️  No shooting stats found for Kentucky")
                    return None
                
            except ApiException as e:
                print(f"  ✗ Stats API error: {e}")
                return None
                
    except Exception as e:
        print(f"  ✗ Error fetching shooting stats: {e}")
        import traceback
        traceback.print_exc()
        return None


def fetch_all_efficiency():
    """Fetch all D1 team efficiency ratings for ranking purposes."""
    print("Fetching all D1 team efficiency ratings for rankings...")
    
    try:
        configuration = get_api_configuration()
        
        with cbbd.ApiClient(configuration) as api_client:
            ratings_api = cbbd.RatingsApi(api_client)
            
            try:
                # Get all teams
                all_efficiency = ratings_api.get_adjusted_efficiency(season=SEASON)
                
                if all_efficiency:
                    print(f"  ✓ Found efficiency for {len(all_efficiency)} teams")
                    return all_efficiency
                else:
                    print("  ⚠️  No efficiency data found")
                    return []
                
            except ApiException as e:
                print(f"  ✗ Ratings API error: {e}")
                return []
                
    except Exception as e:
        print(f"  ✗ Error fetching all efficiency: {e}")
        return []


def fetch_all_shooting():
    """Fetch all D1 team shooting stats for ranking purposes."""
    print("Fetching all D1 team shooting stats for rankings...")
    
    try:
        configuration = get_api_configuration()
        
        with cbbd.ApiClient(configuration) as api_client:
            stats_api = cbbd.StatsApi(api_client)
            
            try:
                # Get all teams
                all_stats = stats_api.get_team_season_shooting_stats(season=SEASON)
                
                if all_stats:
                    print(f"  ✓ Found shooting stats for {len(all_stats)} teams")
                    return all_stats
                else:
                    print("  ⚠️  No shooting stats found")
                    return []
                
            except ApiException as e:
                print(f"  ✗ Stats API error: {e}")
                return []
                
    except Exception as e:
        print(f"  ✗ Error fetching all shooting stats: {e}")
        return []


def calculate_rank(value: float, all_values: List[float], higher_is_better: bool = True) -> int:
    """Calculate rank based on value compared to all teams."""
    if value is None or value == 0:
        return 0
    
    # Filter out None and 0 values
    valid_values = [v for v in all_values if v is not None and v != 0]
    
    if not valid_values:
        return 0
    
    if higher_is_better:
        sorted_values = sorted(valid_values, reverse=True)
    else:
        sorted_values = sorted(valid_values)
    
    try:
        rank = sorted_values.index(value) + 1
        return rank
    except ValueError:
        # Value not in list, find closest position
        for i, v in enumerate(sorted_values):
            if (higher_is_better and value >= v) or (not higher_is_better and value <= v):
                return i + 1
        return len(sorted_values) + 1


def safe_get(obj, attr, default=0.0):
    """Safely get attribute value."""
    try:
        value = getattr(obj, attr, None)
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError, AttributeError):
        return default


def calculate_team_stats(uk_efficiency, uk_shooting, all_efficiency, all_shooting):
    """Calculate Kentucky's stats and rankings."""
    print("\nCalculating statistics and rankings...")
    
    stats = {}
    
    # Extract Kentucky efficiency values
    uk_off_rating = safe_get(uk_efficiency, 'offense')
    uk_def_rating = safe_get(uk_efficiency, 'defense')
    uk_pace = safe_get(uk_efficiency, 'pace')
    uk_tov_pct = safe_get(uk_efficiency, 'turnover_pct')
    uk_def_tov_pct = safe_get(uk_efficiency, 'opponent_turnover_pct')
    
    # Extract Kentucky shooting values
    uk_fg3_pct = safe_get(uk_shooting, 'three_point_pct') * 100 if uk_shooting else 0
    uk_fg2_pct = safe_get(uk_shooting, 'two_point_pct') * 100 if uk_shooting else 0
    uk_ft_pct = safe_get(uk_shooting, 'free_throw_pct') * 100 if uk_shooting else 0
    uk_def_fg3_pct = safe_get(uk_shooting, 'opponent_three_point_pct') * 100 if uk_shooting else 0
    uk_def_fg2_pct = safe_get(uk_shooting, 'opponent_two_point_pct') * 100 if uk_shooting else 0
    uk_def_ft_pct = safe_get(uk_shooting, 'opponent_free_throw_pct') * 100 if uk_shooting else 0
    
    # Calculate Net Rating
    uk_net_rating = uk_off_rating - uk_def_rating if uk_off_rating and uk_def_rating else 0
    
    # Collect all teams' values for ranking
    all_off_ratings = []
    all_def_ratings = []
    all_net_ratings = []
    all_paces = []
    all_tov_pcts = []
    all_def_tov_pcts = []
    
    for team in all_efficiency:
        off_r = safe_get(team, 'offense')
        def_r = safe_get(team, 'defense')
        pace = safe_get(team, 'pace')
        tov = safe_get(team, 'turnover_pct')
        def_tov = safe_get(team, 'opponent_turnover_pct')
        
        if off_r > 0:
            all_off_ratings.append(off_r)
        if def_r > 0:
            all_def_ratings.append(def_r)
        if off_r > 0 and def_r > 0:
            all_net_ratings.append(off_r - def_r)
        if pace > 0:
            all_paces.append(pace)
        if tov > 0:
            all_tov_pcts.append(tov)
        if def_tov > 0:
            all_def_tov_pcts.append(def_tov)
    
    # Collect all shooting values
    all_fg3_pcts = []
    all_fg2_pcts = []
    all_ft_pcts = []
    all_def_fg3_pcts = []
    all_def_fg2_pcts = []
    all_def_ft_pcts = []
    
    for team in all_shooting:
        fg3 = safe_get(team, 'three_point_pct') * 100
        fg2 = safe_get(team, 'two_point_pct') * 100
        ft = safe_get(team, 'free_throw_pct') * 100
        def_fg3 = safe_get(team, 'opponent_three_point_pct') * 100
        def_fg2 = safe_get(team, 'opponent_two_point_pct') * 100
        def_ft = safe_get(team, 'opponent_free_throw_pct') * 100
        
        if fg3 > 0:
            all_fg3_pcts.append(fg3)
        if fg2 > 0:
            all_fg2_pcts.append(fg2)
        if ft > 0:
            all_ft_pcts.append(ft)
        if def_fg3 > 0:
            all_def_fg3_pcts.append(def_fg3)
        if def_fg2 > 0:
            all_def_fg2_pcts.append(def_fg2)
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
    
    # Fetch Kentucky efficiency
    uk_efficiency = fetch_kentucky_efficiency()
    if not uk_efficiency:
        print("\n✗ Failed to fetch Kentucky efficiency")
        return 1
    
    print()
    
    # Fetch Kentucky shooting
    uk_shooting = fetch_kentucky_shooting()
    if not uk_shooting:
        print("\n⚠️  Warning: Failed to fetch Kentucky shooting stats")
        # Continue anyway, shooting stats are optional
    
    print()
    
    # Fetch all teams for rankings
    all_efficiency = fetch_all_efficiency()
    if not all_efficiency:
        print("\n⚠️  Could not fetch all teams efficiency - rankings may be inaccurate")
        return 1
    
    print()
    
    all_shooting = fetch_all_shooting()
    if not all_shooting:
        print("\n⚠️  Could not fetch all teams shooting - shooting rankings may be inaccurate")
        # Continue anyway
    
    # Calculate stats and rankings
    stats = calculate_team_stats(uk_efficiency, uk_shooting, all_efficiency, all_shooting)
    
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
