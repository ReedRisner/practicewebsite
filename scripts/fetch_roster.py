#!/usr/bin/env python3
"""
Fetch roster data from College Basketball Data API
Creates roster.json with player information including past season averages
"""

import requests
import json
import os
from datetime import datetime

API_BASE = "https://api.collegebasketballdata.com"
TEAM = "Kentucky"
START_YEAR = 2009
END_YEAR = 2026

def get_headers():
    """Get request headers with API key"""
    api_key = os.getenv("BASKETBALL_API_KEY")
    if not api_key:
        raise ValueError("BASKETBALL_API_KEY environment variable not set")
    return {"X-API-Key": api_key}

def fetch_roster(season):
    """Fetch roster data for a given season"""
    url = f"{API_BASE}/teams/roster"
    params = {"season": season, "team": TEAM}
    
    try:
        response = requests.get(url, params=params, headers=get_headers(), timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching roster for {season}: {e}")
        return None

def fetch_player_season_stats(season):
    """Fetch player season stats"""
    url = f"{API_BASE}/stats/player/season"
    params = {"season": season, "team": TEAM}
    
    try:
        response = requests.get(url, params=params, headers=get_headers(), timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching player stats for {season}: {e}")
        return []

def build_player_history(all_stats):
    """Build a history of player stats across seasons"""
    player_history = {}
    
    for season, stats_list in all_stats.items():
        if not stats_list:
            continue
            
        for player_stat in stats_list:
            player_id = player_stat.get('athleteId')
            player_name = player_stat.get('name')
            
            if not player_id:
                continue
            
            if player_id not in player_history:
                player_history[player_id] = {
                    'name': player_name,
                    'seasons': []
                }
            
            # Add season stats
            season_data = {
                'season': season,
                'team': player_stat.get('team'),
                'conference': player_stat.get('conference'),
                'games': player_stat.get('games'),
                'starts': player_stat.get('starts'),
                'minutes': player_stat.get('minutes'),
                'ppg': round(player_stat.get('points', 0) / max(player_stat.get('games', 1), 1), 1),
                'rpg': round(player_stat.get('rebounds', {}).get('total', 0) / max(player_stat.get('games', 1), 1), 1),
                'apg': round(player_stat.get('assists', 0) / max(player_stat.get('games', 1), 1), 1),
                'fg_pct': player_stat.get('fieldGoals', {}).get('pct'),
                'three_pct': player_stat.get('threePointFieldGoals', {}).get('pct'),
                'ft_pct': player_stat.get('freeThrows', {}).get('pct'),
                'offensiveRating': player_stat.get('offensiveRating'),
                'defensiveRating': player_stat.get('defensiveRating'),
                'netRating': player_stat.get('netRating'),
                'usage': player_stat.get('usage'),
                'trueShootingPct': player_stat.get('trueShootingPct'),
                'winShares': player_stat.get('winShares', {}).get('total')
            }
            
            player_history[player_id]['seasons'].append(season_data)
    
    return player_history

def main():
    print(f"Fetching roster data for {TEAM} ({START_YEAR}-{END_YEAR})...")
    
    all_rosters = {}
    all_stats = {}
    
    # Fetch data for all seasons
    for year in range(START_YEAR, END_YEAR + 1):
        print(f"Processing season {year}...")
        
        # Fetch roster
        roster_data = fetch_roster(year)
        if roster_data:
            all_rosters[year] = roster_data
        
        # Fetch player stats
        stats_data = fetch_player_season_stats(year)
        if stats_data:
            all_stats[year] = stats_data
    
    # Build player history
    print("Building player history...")
    player_history = build_player_history(all_stats)
    
    # Enrich rosters with player history
    print("Enriching rosters with player history...")
    for season, roster_list in all_rosters.items():
        if not roster_list:
            continue
            
        for team_roster in roster_list:
            players = team_roster.get('players', [])
            
            for player in players:
                player_id = player.get('id')
                
                if player_id and player_id in player_history:
                    # Add career stats
                    history = player_history[player_id]['seasons']
                    player['careerStats'] = history
                    
                    # Calculate career totals if multiple seasons
                    if len(history) > 1:
                        total_games = sum(s.get('games', 0) for s in history)
                        total_points = sum(s.get('ppg', 0) * s.get('games', 0) for s in history)
                        total_rebounds = sum(s.get('rpg', 0) * s.get('games', 0) for s in history)
                        total_assists = sum(s.get('apg', 0) * s.get('games', 0) for s in history)
                        
                        if total_games > 0:
                            player['careerAverages'] = {
                                'games': total_games,
                                'ppg': round(total_points / total_games, 1),
                                'rpg': round(total_rebounds / total_games, 1),
                                'apg': round(total_assists / total_games, 1)
                            }
    
    # Create output structure
    output = {
        'lastUpdated': datetime.now().isoformat(),
        'team': TEAM,
        'seasons': all_rosters
    }
    
    # Ensure data directory exists
    os.makedirs('../data', exist_ok=True)
    
    # Write to file
    output_path = '../data/roster.json'
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"✓ Roster data saved to {output_path}")
    print(f"  Total seasons: {len(all_rosters)}")
    print(f"  Total unique players: {len(player_history)}")

if __name__ == "__main__":
    main()
