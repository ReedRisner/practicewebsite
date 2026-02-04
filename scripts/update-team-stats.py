#!/usr/bin/env python3
"""
Kentucky Basketball Team Statistics Auto-Updater

Usage:
    python update-team-stats.py
"""

import json
import os
import sys
from datetime import datetime
from typing import Dict, List
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


def safe_get(data_dict, key, default=0.0):
    """Safely get value from dictionary."""
    try:
        value = data_dict.get(key, default)
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
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


def fetch_and_calculate_stats():
    """Fetch all data and calculate stats."""
    print("=" * 80)
    print("Kentucky Basketball Team Statistics Auto-Updater")
    print(f"Season: 2025-2026 (API season {SEASON})")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    print()
    
    configuration = get_api_configuration()
    
    with cbbd.ApiClient(configuration) as api_client:
        ratings_api = cbbd.RatingsApi(api_client)
        stats_api = cbbd.StatsApi(api_client)
        
        # Fetch Kentucky efficiency
        print("Fetching Kentucky efficiency...")
        try:
            uk_eff_list = ratings_api.get_adjusted_efficiency(
                season=SEASON,
                team=KENTUCKY_TEAM
            )
            if not uk_eff_list:
                print("  ✗ No efficiency data")
                return None
            
            uk_eff = uk_eff_list[0].to_dict()
            print(f"  ✓ Found: {uk_eff.get('team', 'Unknown')}")
            print(f"\n  Kentucky Efficiency Data:")
            for key, value in uk_eff.items():
                print(f"    {key}: {value}")
                
        except ApiException as e:
            print(f"  ✗ API Error: {e}")
            return None
        
        # Fetch Kentucky stats
        print("\nFetching Kentucky stats...")
        try:
            uk_stats_list = stats_api.get_team_season_stats(
                season=SEASON,
                team=KENTUCKY_TEAM
            )
            if not uk_stats_list:
                print("  ✗ No stats data")
                return None
            
            uk_stats = uk_stats_list[0].to_dict()
            print(f"  ✓ Found: {uk_stats.get('team', 'Unknown')}")
            print(f"\n  Kentucky Stats Data:")
            for key, value in uk_stats.items():
                if not callable(value) and not key.startswith('_'):
                    print(f"    {key}: {value}")
                
        except ApiException as e:
            print(f"  ✗ API Error: {e}")
            return None
        
        # Fetch all teams for rankings
        print("\nFetching all teams efficiency...")
        try:
            all_eff_list = ratings_api.get_adjusted_efficiency(season=SEASON)
            all_eff = [team.to_dict() for team in all_eff_list]
            print(f"  ✓ Found {len(all_eff)} teams")
        except Exception as e:
            print(f"  ✗ Error: {e}")
            all_eff = []
        
        print("\nFetching all teams stats...")
        try:
            all_stats_list = stats_api.get_team_season_stats(season=SEASON)
            all_stats = [team.to_dict() for team in all_stats_list]
            print(f"  ✓ Found {len(all_stats)} teams")
        except Exception as e:
            print(f"  ✗ Error: {e}")
            all_stats = []
        
        # Calculate stats
        print("\nCalculating statistics...")
        
        # Get Kentucky values from dictionaries
        uk_off_rating = safe_get(uk_eff, 'offensiveRating')
        uk_def_rating = safe_get(uk_eff, 'defensiveRating')
        uk_pace = safe_get(uk_stats, 'pace')
        uk_net_rating = uk_off_rating - uk_def_rating if uk_off_rating and uk_def_rating else 0
        
        # Get teamStats and opponentStats dictionaries
        team_stats = uk_stats.get('teamStats', {})
        opp_stats = uk_stats.get('opponentStats', {})
        
        uk_games = safe_get(uk_stats, 'games', 1)
        
        # Per-game stats from teamStats
        uk_to = safe_get(team_stats.get('turnovers', {}), 'total') / uk_games if uk_games > 0 else 0
        uk_ast = safe_get(team_stats, 'assists') / uk_games if uk_games > 0 else 0
        uk_reb = safe_get(team_stats.get('rebounds', {}), 'total') / uk_games if uk_games > 0 else 0
        uk_stl = safe_get(team_stats, 'steals') / uk_games if uk_games > 0 else 0
        uk_blk = safe_get(team_stats, 'blocks') / uk_games if uk_games > 0 else 0
        
        # Shooting percentages from teamStats
        uk_fg3_pct = safe_get(team_stats.get('threePointFieldGoals', {}), 'pct')
        uk_fg2_pct = safe_get(team_stats.get('twoPointFieldGoals', {}), 'pct')
        uk_ft_pct = safe_get(team_stats.get('freeThrows', {}), 'pct')
        
        # Opponent shooting percentages from opponentStats
        uk_opp_fg3_pct = safe_get(opp_stats.get('threePointFieldGoals', {}), 'pct')
        uk_opp_fg2_pct = safe_get(opp_stats.get('twoPointFieldGoals', {}), 'pct')
        uk_opp_ft_pct = safe_get(opp_stats.get('freeThrows', {}), 'pct')
        
        print(f"\n  Extracted Values:")
        print(f"    Offensive Rating: {uk_off_rating:.1f}")
        print(f"    Defensive Rating: {uk_def_rating:.1f}")
        print(f"    Net Rating: {uk_net_rating:.2f}")
        print(f"    Pace: {uk_pace:.1f}")
        print(f"    Turnovers/game: {uk_to:.1f}")
        print(f"    Assists/game: {uk_ast:.1f}")
        print(f"    Rebounds/game: {uk_reb:.1f}")
        print(f"    Steals/game: {uk_stl:.1f}")
        print(f"    Blocks/game: {uk_blk:.1f}")
        print(f"    3P%: {uk_fg3_pct:.1f}")
        print(f"    2P%: {uk_fg2_pct:.1f}")
        print(f"    FT%: {uk_ft_pct:.1f}")
        print(f"    Opp 3P%: {uk_opp_fg3_pct:.1f}")
        print(f"    Opp 2P%: {uk_opp_fg2_pct:.1f}")
        print(f"    Opp FT%: {uk_opp_ft_pct:.1f}")
        
        # Collect all values for ranking
        all_off_ratings = [safe_get(t, 'offensiveRating') for t in all_eff]
        all_def_ratings = [safe_get(t, 'defensiveRating') for t in all_eff]
        all_net_ratings = [safe_get(t, 'offensiveRating') - safe_get(t, 'defensiveRating') for t in all_eff]
        
        all_paces = []
        all_to_pgs = []
        all_ast_pgs = []
        all_reb_pgs = []
        all_stl_pgs = []
        all_blk_pgs = []
        all_fg3_pcts = []
        all_fg2_pcts = []
        all_ft_pcts = []
        all_opp_fg3_pcts = []
        all_opp_fg2_pcts = []
        all_opp_ft_pcts = []
        
        for team in all_stats:
            games = safe_get(team, 'games', 1)
            team_stats_dict = team.get('teamStats', {})
            opp_stats_dict = team.get('opponentStats', {})
            
            # Add pace
            all_paces.append(safe_get(team, 'pace'))
            
            if games > 0:
                all_to_pgs.append(safe_get(team_stats_dict.get('turnovers', {}), 'total') / games)
                all_ast_pgs.append(safe_get(team_stats_dict, 'assists') / games)
                all_reb_pgs.append(safe_get(team_stats_dict.get('rebounds', {}), 'total') / games)
                all_stl_pgs.append(safe_get(team_stats_dict, 'steals') / games)
                all_blk_pgs.append(safe_get(team_stats_dict, 'blocks') / games)
            
            # Shooting percentages (already in percentage format)
            all_fg3_pcts.append(safe_get(team_stats_dict.get('threePointFieldGoals', {}), 'pct'))
            all_fg2_pcts.append(safe_get(team_stats_dict.get('twoPointFieldGoals', {}), 'pct'))
            all_ft_pcts.append(safe_get(team_stats_dict.get('freeThrows', {}), 'pct'))
            
            # Opponent shooting percentages
            all_opp_fg3_pcts.append(safe_get(opp_stats_dict.get('threePointFieldGoals', {}), 'pct'))
            all_opp_fg2_pcts.append(safe_get(opp_stats_dict.get('twoPointFieldGoals', {}), 'pct'))
            all_opp_ft_pcts.append(safe_get(opp_stats_dict.get('freeThrows', {}), 'pct'))
        
        # Build stats dictionary
        stats = {
            "Offensive Rating": {
                "value": f"{uk_off_rating:.1f}",
                "rank": str(calculate_rank(uk_off_rating, all_off_ratings, higher_is_better=True))
            },
            "Defensive Rating": {
                "value": f"{uk_def_rating:.1f}",
                "rank": str(calculate_rank(uk_def_rating, all_def_ratings, higher_is_better=False))
            },
            "Net Rating": {
                "value": f"+{uk_net_rating:.2f}" if uk_net_rating >= 0 else f"{uk_net_rating:.2f}",
                "rank": str(calculate_rank(uk_net_rating, all_net_ratings, higher_is_better=True))
            },
            "Pace": {
                "value": f"{uk_pace:.1f}",
                "rank": str(calculate_rank(uk_pace, all_paces, higher_is_better=True))
            },
            "Turnovers": {
                "value": f"{uk_to:.1f}",
                "rank": str(calculate_rank(uk_to, all_to_pgs, higher_is_better=False))
            },
            "Assists": {
                "value": f"{uk_ast:.1f}",
                "rank": str(calculate_rank(uk_ast, all_ast_pgs, higher_is_better=True))
            },
            "Rebounds": {
                "value": f"{uk_reb:.1f}",
                "rank": str(calculate_rank(uk_reb, all_reb_pgs, higher_is_better=True))
            },
            "Steals": {
                "value": f"{uk_stl:.1f}",
                "rank": str(calculate_rank(uk_stl, all_stl_pgs, higher_is_better=True))
            },
            "Blocks": {
                "value": f"{uk_blk:.1f}",
                "rank": str(calculate_rank(uk_blk, all_blk_pgs, higher_is_better=True))
            },
            "3P%": {
                "value": f"{uk_fg3_pct:.1f}",
                "rank": str(calculate_rank(uk_fg3_pct, all_fg3_pcts, higher_is_better=True))
            },
            "2P%": {
                "value": f"{uk_fg2_pct:.1f}",
                "rank": str(calculate_rank(uk_fg2_pct, all_fg2_pcts, higher_is_better=True))
            },
            "FT%": {
                "value": f"{uk_ft_pct:.1f}",
                "rank": str(calculate_rank(uk_ft_pct, all_ft_pcts, higher_is_better=True))
            },
            "Opp 3P%": {
                "value": f"{uk_opp_fg3_pct:.1f}",
                "rank": str(calculate_rank(uk_opp_fg3_pct, all_opp_fg3_pcts, higher_is_better=False))
            },
            "Opp 2P%": {
                "value": f"{uk_opp_fg2_pct:.1f}",
                "rank": str(calculate_rank(uk_opp_fg2_pct, all_opp_fg2_pcts, higher_is_better=False))
            },
            "Opp FT%": {
                "value": f"{uk_opp_ft_pct:.1f}",
                "rank": str(calculate_rank(uk_opp_ft_pct, all_opp_ft_pcts, higher_is_better=False))
            }
        }
        
        return stats


def update_json_file(stats: Dict) -> bool:
    """Update the stats section in update.json."""
    print("\nUpdating update.json file...")
    
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        
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
    stats = fetch_and_calculate_stats()
    
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
