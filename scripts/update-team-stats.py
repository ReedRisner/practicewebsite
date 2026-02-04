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
import requests

# Configuration
API_KEY = os.environ.get('BASKETBALL_API_KEY', '')
KENTUCKY_TEAM_ID = 153  # Kentucky team ID
KENTUCKY_CONFERENCE_ID = 24  # SEC conference ID
SEASON = 2025  # 2025-2026 season

# API endpoints
API_BASE_URL = "https://api.collegebasketballdata.com"
STATS_ENDPOINT = f"{API_BASE_URL}/stats/team/season"

# File paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'data')
UPDATE_JSON_PATH = os.path.join(DATA_DIR, 'update.json')


def get_headers():
    """Get API request headers."""
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"
    return headers


def safe_get(data_dict, *keys, default=0.0):
    """Safely get nested value from dictionary."""
    try:
        value = data_dict
        for key in keys:
            if value is None:
                return default
            value = value.get(key, default) if isinstance(value, dict) else default
        
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


def fetch_team_stats(team_id: int, conference_id: int) -> Dict:
    """Fetch team statistics from API."""
    url = f"{STATS_ENDPOINT}?season={SEASON}&team={team_id}&conference={conference_id}"
    
    try:
        response = requests.get(url, headers=get_headers(), timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if data and len(data) > 0:
            return data[0]
        return None
    except Exception as e:
        print(f"  Error fetching team stats: {e}")
        return None


def fetch_all_teams_stats(conference_id: int) -> List[Dict]:
    """Fetch all teams statistics for the conference."""
    url = f"{STATS_ENDPOINT}?season={SEASON}&conference={conference_id}"
    
    try:
        response = requests.get(url, headers=get_headers(), timeout=30)
        response.raise_for_status()
        data = response.json()
        return data if data else []
    except Exception as e:
        print(f"  Error fetching all teams stats: {e}")
        return []


def fetch_and_calculate_stats():
    """Fetch all data and calculate stats."""
    print("=" * 80)
    print("Kentucky Basketball Team Statistics Auto-Updater")
    print(f"Season: 2025-2026 (API season {SEASON})")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    print()
    
    # Fetch Kentucky stats
    print("Fetching Kentucky statistics...")
    uk_data = fetch_team_stats(KENTUCKY_TEAM_ID, KENTUCKY_CONFERENCE_ID)
    
    if not uk_data:
        print("  ✗ No Kentucky data available")
        return None
    
    print(f"  ✓ Found: {uk_data.get('team', 'Unknown')}")
    print(f"    Games: {uk_data.get('games', 0)}")
    print(f"    Record: {uk_data.get('wins', 0)}-{uk_data.get('losses', 0)}")
    
    # Fetch all teams stats for rankings
    print("\nFetching all teams statistics for rankings...")
    all_teams_data = fetch_all_teams_stats(KENTUCKY_CONFERENCE_ID)
    
    if not all_teams_data:
        print("  ✗ No conference data available for rankings")
        all_teams_data = [uk_data]  # Use only Kentucky data
    else:
        print(f"  ✓ Found {len(all_teams_data)} teams")
    
    # Extract Kentucky stats
    print("\nCalculating statistics...")
    
    uk_team_stats = uk_data.get('teamStats', {})
    uk_games = uk_data.get('games', 1)
    
    # Get Kentucky values
    uk_off_rating = safe_get(uk_team_stats, 'rating')
    uk_pace = safe_get(uk_data, 'pace')
    
    # Calculate defensive rating from opponent stats
    uk_opp_stats = uk_data.get('opponentStats', {})
    uk_def_rating = safe_get(uk_opp_stats, 'rating')
    
    # Net rating
    uk_net_rating = uk_off_rating - uk_def_rating if uk_off_rating and uk_def_rating else 0
    
    # Per-game stats
    uk_to = safe_get(uk_team_stats, 'turnovers', 'total') / uk_games if uk_games > 0 else 0
    uk_ast = safe_get(uk_team_stats, 'assists') / uk_games if uk_games > 0 else 0
    uk_reb = safe_get(uk_team_stats, 'rebounds', 'total') / uk_games if uk_games > 0 else 0
    uk_stl = safe_get(uk_team_stats, 'steals') / uk_games if uk_games > 0 else 0
    uk_blk = safe_get(uk_team_stats, 'blocks') / uk_games if uk_games > 0 else 0
    
    # Shooting percentages
    uk_fg3_pct = safe_get(uk_team_stats, 'threePointFieldGoals', 'pct')
    if uk_fg3_pct < 1:
        uk_fg3_pct *= 100
    
    uk_fg2_pct = safe_get(uk_team_stats, 'twoPointFieldGoals', 'pct')
    if uk_fg2_pct < 1:
        uk_fg2_pct *= 100
    
    uk_ft_pct = safe_get(uk_team_stats, 'freeThrows', 'pct')
    if uk_ft_pct < 1:
        uk_ft_pct *= 100
    
    # Opponent shooting percentages
    uk_opp_fg3_pct = safe_get(uk_opp_stats, 'threePointFieldGoals', 'pct')
    if uk_opp_fg3_pct < 1:
        uk_opp_fg3_pct *= 100
    
    uk_opp_fg2_pct = safe_get(uk_opp_stats, 'twoPointFieldGoals', 'pct')
    if uk_opp_fg2_pct < 1:
        uk_opp_fg2_pct *= 100
    
    uk_opp_ft_pct = safe_get(uk_opp_stats, 'freeThrows', 'pct')
    if uk_opp_ft_pct < 1:
        uk_opp_ft_pct *= 100
    
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
    all_off_ratings = []
    all_def_ratings = []
    all_paces = []
    all_net_ratings = []
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
    
    for team_data in all_teams_data:
        team_stats = team_data.get('teamStats', {})
        opp_stats = team_data.get('opponentStats', {})
        games = team_data.get('games', 1)
        
        # Ratings
        off_rating = safe_get(team_stats, 'rating')
        def_rating = safe_get(opp_stats, 'rating')
        pace = safe_get(team_data, 'pace')
        
        all_off_ratings.append(off_rating)
        all_def_ratings.append(def_rating)
        all_paces.append(pace)
        all_net_ratings.append(off_rating - def_rating if off_rating and def_rating else 0)
        
        # Per-game stats
        if games > 0:
            all_to_pgs.append(safe_get(team_stats, 'turnovers', 'total') / games)
            all_ast_pgs.append(safe_get(team_stats, 'assists') / games)
            all_reb_pgs.append(safe_get(team_stats, 'rebounds', 'total') / games)
            all_stl_pgs.append(safe_get(team_stats, 'steals') / games)
            all_blk_pgs.append(safe_get(team_stats, 'blocks') / games)
        
        # Shooting percentages
        fg3 = safe_get(team_stats, 'threePointFieldGoals', 'pct')
        if fg3 < 1:
            fg3 *= 100
        all_fg3_pcts.append(fg3)
        
        fg2 = safe_get(team_stats, 'twoPointFieldGoals', 'pct')
        if fg2 < 1:
            fg2 *= 100
        all_fg2_pcts.append(fg2)
        
        ft = safe_get(team_stats, 'freeThrows', 'pct')
        if ft < 1:
            ft *= 100
        all_ft_pcts.append(ft)
        
        # Opponent shooting percentages
        opp_fg3 = safe_get(opp_stats, 'threePointFieldGoals', 'pct')
        if opp_fg3 < 1:
            opp_fg3 *= 100
        all_opp_fg3_pcts.append(opp_fg3)
        
        opp_fg2 = safe_get(opp_stats, 'twoPointFieldGoals', 'pct')
        if opp_fg2 < 1:
            opp_fg2 *= 100
        all_opp_fg2_pcts.append(opp_fg2)
        
        opp_ft = safe_get(opp_stats, 'freeThrows', 'pct')
        if opp_ft < 1:
            opp_ft *= 100
        all_opp_ft_pcts.append(opp_ft)
    
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
        
        # Read existing data
        if os.path.exists(UPDATE_JSON_PATH):
            with open(UPDATE_JSON_PATH, 'r') as f:
                data = json.load(f)
        else:
            data = {}
        
        # Ensure 2025 season exists
        if '2025' not in data:
            data['2025'] = {'stats': {}, 'rankings': {}}
        
        if 'stats' not in data['2025']:
            data['2025']['stats'] = {}
        
        # Update stats
        data['2025']['stats'] = stats
        
        # Write updated data
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
