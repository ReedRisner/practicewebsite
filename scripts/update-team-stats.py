#!/usr/bin/env python3
"""
Kentucky Basketball Team Statistics Auto-Updater

This script updates team statistics in update.json by:
1. Fetching Kentucky's season stats from CBBD API
2. Calculating derived stats (Net Rating, percentages)
3. Getting rankings by comparing to all D1 teams
4. Updating the stats section of update.json

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
    """Fetch Kentucky's adjusted efficiency ratings."""
    print("Fetching Kentucky efficiency ratings...")
    
    try:
        configuration = get_api_configuration()
        
        with cbbd.ApiClient(configuration) as api_client:
            ratings_api = cbbd.RatingsApi(api_client)
            
            efficiency = ratings_api.get_adjusted_efficiency(
                season=SEASON,
                team=KENTUCKY_TEAM
            )
            
            if efficiency and len(efficiency) > 0:
                print(f"  ✓ Found efficiency for {efficiency[0].team}")
                return efficiency[0]
            else:
                print("  ⚠️  No efficiency data found")
                return None
                
    except ApiException as e:
        print(f"  ✗ API error: {e}")
        return None
    except Exception as e:
        print(f"  ✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return None


def fetch_kentucky_stats():
    """Fetch Kentucky's team season stats."""
    print("Fetching Kentucky team stats...")
    
    try:
        configuration = get_api_configuration()
        
        with cbbd.ApiClient(configuration) as api_client:
            stats_api = cbbd.StatsApi(api_client)
            
            stats = stats_api.get_team_season_stats(
                season=SEASON,
                team=KENTUCKY_TEAM
            )
            
            if stats and len(stats) > 0:
                print(f"  ✓ Found stats for {stats[0].team}")
                return stats[0]
            else:
                print("  ⚠️  No stats found")
                return None
                
    except ApiException as e:
        print(f"  ✗ API error: {e}")
        return None
    except Exception as e:
        print(f"  ✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return None


def fetch_all_efficiency():
    """Fetch all teams' efficiency for rankings."""
    print("Fetching all teams efficiency...")
    
    try:
        configuration = get_api_configuration()
        
        with cbbd.ApiClient(configuration) as api_client:
            ratings_api = cbbd.RatingsApi(api_client)
            
            all_eff = ratings_api.get_adjusted_efficiency(season=SEASON)
            
            if all_eff:
                print(f"  ✓ Found {len(all_eff)} teams")
                return all_eff
            return []
                
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return []


def fetch_all_stats():
    """Fetch all teams' stats for rankings."""
    print("Fetching all teams stats...")
    
    try:
        configuration = get_api_configuration()
        
        with cbbd.ApiClient(configuration) as api_client:
            stats_api = cbbd.StatsApi(api_client)
            
            all_stats = stats_api.get_team_season_stats(season=SEASON)
            
            if all_stats:
                print(f"  ✓ Found {len(all_stats)} teams")
                return all_stats
            return []
                
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return []


def safe_get(obj, attr, default=0.0):
    """Safely get attribute value."""
    if obj is None:
        return default
    try:
        value = getattr(obj, attr, None)
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError, AttributeError):
        return default


def calculate_rank(value: float, all_values: List[float], higher_is_better: bool = True) -> int:
    """Calculate rank based on value compared to all teams."""
    if value is None or value == 0:
        return 0
    
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
        for i, v in enumerate(sorted_values):
            if (higher_is_better and value >= v) or (not higher_is_better and value <= v):
                return i + 1
        return len(sorted_values) + 1


def calculate_team_stats(uk_eff, uk_stats, all_eff, all_stats):
    """Calculate Kentucky's stats and rankings."""
    print("\nCalculating statistics and rankings...")
    
    if not uk_eff or not uk_stats:
        print("  ✗ Missing required data")
        return None
    
    stats = {}
    
    # Extract Kentucky efficiency values
    uk_off_rating = safe_get(uk_eff, 'offense')
    uk_def_rating = safe_get(uk_eff, 'defense')
    uk_pace = safe_get(uk_eff, 'tempo')
    uk_net_rating = uk_off_rating - uk_def_rating if uk_off_rating and uk_def_rating else 0
    
    # Extract Kentucky stats - per game averages
    uk_games = safe_get(uk_stats, 'games', 1)  # Avoid division by zero
    
    # Turnovers per game
    uk_to_total = safe_get(uk_stats, 'turnovers')
    uk_to_pg = uk_to_total / uk_games if uk_games > 0 else 0
    
    # Assists per game
    uk_ast_total = safe_get(uk_stats, 'assists')
    uk_ast_pg = uk_ast_total / uk_games if uk_games > 0 else 0
    
    # Rebounds per game
    uk_reb_total = safe_get(uk_stats, 'total_rebounds')
    uk_reb_pg = uk_reb_total / uk_games if uk_games > 0 else 0
    
    # Steals per game
    uk_stl_total = safe_get(uk_stats, 'steals')
    uk_stl_pg = uk_stl_total / uk_games if uk_games > 0 else 0
    
    # Blocks per game
    uk_blk_total = safe_get(uk_stats, 'blocks')
    uk_blk_pg = uk_blk_total / uk_games if uk_games > 0 else 0
    
    # Shooting percentages (already in percentage form or decimal)
    uk_fg3_pct = safe_get(uk_stats, 'three_point_field_goal_pct')
    if uk_fg3_pct < 1:  # If it's a decimal, convert to percentage
        uk_fg3_pct *= 100
    
    uk_fg2_pct = safe_get(uk_stats, 'two_point_field_goal_pct')
    if uk_fg2_pct < 1:
        uk_fg2_pct *= 100
    
    uk_ft_pct = safe_get(uk_stats, 'free_throw_pct')
    if uk_ft_pct < 1:
        uk_ft_pct *= 100
    
    print(f"\n  UK Values:")
    print(f"    Offensive Rating: {uk_off_rating:.1f}")
    print(f"    Defensive Rating: {uk_def_rating:.1f}")
    print(f"    Net Rating: {uk_net_rating:.2f}")
    print(f"    Pace: {uk_pace:.1f}")
    print(f"    TO per game: {uk_to_pg:.1f}")
    print(f"    Assists per game: {uk_ast_pg:.1f}")
    print(f"    Rebounds per game: {uk_reb_pg:.1f}")
    print(f"    Steals per game: {uk_stl_pg:.1f}")
    print(f"    Blocks per game: {uk_blk_pg:.1f}")
    print(f"    3P%: {uk_fg3_pct:.1f}")
    print(f"    2P%: {uk_fg2_pct:.1f}")
    print(f"    FT%: {uk_ft_pct:.1f}")
    
    # Collect all values for rankings
    all_off_ratings = []
    all_def_ratings = []
    all_net_ratings = []
    all_paces = []
    
    for team in all_eff:
        off_r = safe_get(team, 'offense')
        def_r = safe_get(team, 'defense')
        pace = safe_get(team, 'tempo')
        
        if off_r > 0:
            all_off_ratings.append(off_r)
        if def_r > 0:
            all_def_ratings.append(def_r)
        if off_r > 0 and def_r > 0:
            all_net_ratings.append(off_r - def_r)
        if pace > 0:
            all_paces.append(pace)
    
    all_to_pgs = []
    all_ast_pgs = []
    all_reb_pgs = []
    all_stl_pgs = []
    all_blk_pgs = []
    all_fg3_pcts = []
    all_fg2_pcts = []
    all_ft_pcts = []
    
    for team in all_stats:
        games = safe_get(team, 'games', 1)
        
        to_pg = safe_get(team, 'turnovers') / games if games > 0 else 0
        ast_pg = safe_get(team, 'assists') / games if games > 0 else 0
        reb_pg = safe_get(team, 'total_rebounds') / games if games > 0 else 0
        stl_pg = safe_get(team, 'steals') / games if games > 0 else 0
        blk_pg = safe_get(team, 'blocks') / games if games > 0 else 0
        
        fg3_pct = safe_get(team, 'three_point_field_goal_pct')
        if fg3_pct < 1:
            fg3_pct *= 100
        
        fg2_pct = safe_get(team, 'two_point_field_goal_pct')
        if fg2_pct < 1:
            fg2_pct *= 100
        
        ft_pct = safe_get(team, 'free_throw_pct')
        if ft_pct < 1:
            ft_pct *= 100
        
        if to_pg > 0:
            all_to_pgs.append(to_pg)
        if ast_pg > 0:
            all_ast_pgs.append(ast_pg)
        if reb_pg > 0:
            all_reb_pgs.append(reb_pg)
        if stl_pg > 0:
            all_stl_pgs.append(stl_pg)
        if blk_pg > 0:
            all_blk_pgs.append(blk_pg)
        if fg3_pct > 0:
            all_fg3_pcts.append(fg3_pct)
        if fg2_pct > 0:
            all_fg2_pcts.append(fg2_pct)
        if ft_pct > 0:
            all_ft_pcts.append(ft_pct)
    
    # Build stats dictionary
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
    
    stats["Turnovers"] = {
        "value": f"{uk_to_pg:.1f}",
        "rank": str(calculate_rank(uk_to_pg, all_to_pgs, higher_is_better=False))
    }
    
    stats["Assists"] = {
        "value": f"{uk_ast_pg:.1f}",
        "rank": str(calculate_rank(uk_ast_pg, all_ast_pgs, higher_is_better=True))
    }
    
    stats["Rebounds"] = {
        "value": f"{uk_reb_pg:.1f}",
        "rank": str(calculate_rank(uk_reb_pg, all_reb_pgs, higher_is_better=True))
    }
    
    stats["Steals"] = {
        "value": f"{uk_stl_pg:.1f}",
        "rank": str(calculate_rank(uk_stl_pg, all_stl_pgs, higher_is_better=True))
    }
    
    stats["Blocks"] = {
        "value": f"{uk_blk_pg:.1f}",
        "rank": str(calculate_rank(uk_blk_pg, all_blk_pgs, higher_is_better=True))
    }
    
    stats["3P%"] = {
        "value": f"{uk_fg3_pct:.1f}",
        "rank": str(calculate_rank(uk_fg3_pct, all_fg3_pcts, higher_is_better=True))
    }
    
    stats["2P%"] = {
        "value": f"{uk_fg2_pct:.1f}",
        "rank": str(calculate_rank(uk_fg2_pct, all_fg2_pcts, higher_is_better=True))
    }
    
    stats["FT%"] = {
        "value": f"{uk_ft_pct:.1f}",
        "rank": str(calculate_rank(uk_ft_pct, all_ft_pcts, higher_is_better=True))
    }
    
    print("  ✓ Statistics calculated")
    return stats


def update_json_file(stats: Dict) -> bool:
    """Update the stats section in update.json."""
    print("\nUpdating update.json file...")
    
    try:
        with open(UPDATE_JSON_PATH, 'r') as f:
            data = json.load(f)
        
        if '2025' not in data:
            data['2025'] = {'stats': {}, 'rankings': {}}
        
        if 'stats' not in data['2025']:
            data['2025']['stats'] = {}
        
        data['2025']['stats'] = stats
        
        with open(UPDATE_JSON_PATH, 'w') as f:
            json.dump(data, f, indent=4)
        
        print("  ✓ Successfully updated stats in update.json")
        return True
        
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
    
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # Fetch Kentucky data
    uk_eff = fetch_kentucky_efficiency()
    uk_stats = fetch_kentucky_stats()
    
    if not uk_eff or not uk_stats:
        print("\n✗ Failed to fetch Kentucky data")
        return 1
    
    print()
    
    # Fetch all teams data
    all_eff = fetch_all_efficiency()
    all_stats = fetch_all_stats()
    
    if not all_eff or not all_stats:
        print("\n⚠️  Warning: Could not fetch all teams data")
    
    # Calculate stats
    stats = calculate_team_stats(uk_eff, uk_stats, all_eff, all_stats)
    
    if not stats:
        print("\n✗ Failed to calculate stats")
        return 1
    
    # Display summary
    print("\n" + "=" * 80)
    print("STATISTICS SUMMARY")
    print("=" * 80)
    for stat_name, stat_data in stats.items():
        print(f"  {stat_name:20s} {stat_data['value']:>8s}  (Rank: #{stat_data['rank']})")
    print("=" * 80)
    
    # Update file
    success = update_json_file(stats)
    
    print()
    print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Status: {'SUCCESS ✓' if success else 'FAILED ✗'}")
    print("=" * 80)
    
    return 0 if success else 1


if __name__ == '__main__':
    sys.exit(main())
