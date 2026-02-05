#!/usr/bin/env python3
"""
Fetch COMPLETE player statistics from College Basketball Data API
Captures EVERY stat field available from the API
"""

import requests
import json
import os
from datetime import datetime

API_BASE = "https://api.collegebasketballdata.com"
TEAM = "Kentucky"
START_YEAR = 2025
END_YEAR = 2026

def get_headers():
    """Get request headers with API key"""
    api_key = os.getenv("BASKETBALL_API_KEY")
    if not api_key:
        raise ValueError("BASKETBALL_API_KEY environment variable not set")
    return {"Authorization": f"Bearer {api_key}"}

def fetch_player_season_stats(season):
    """Fetch ALL player season statistics"""
    url = f"{API_BASE}/stats/player/season"
    params = {"season": season, "team": TEAM}
    
    try:
        response = requests.get(url, params=params, headers=get_headers(), timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching season stats for {season}: {e}")
        return []

def fetch_player_shooting_stats(season):
    """Fetch ALL player shooting statistics"""
    url = f"{API_BASE}/stats/player/shooting/season"
    params = {"season": season, "team": TEAM}
    
    try:
        response = requests.get(url, params=params, headers=get_headers(), timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching shooting stats for {season}: {e}")
        return []

def merge_all_stats(season_stats, shooting_stats):
    """Merge ALL stats - keep every field from API"""
    # Create a lookup dictionary for shooting stats
    shooting_lookup = {}
    for shooting in shooting_stats:
        athlete_id = shooting.get('athleteId')
        if athlete_id:
            shooting_lookup[athlete_id] = shooting
    
    # Merge stats - keep EVERYTHING
    merged = []
    for player in season_stats:
        athlete_id = player.get('athleteId')
        
        # Start with complete player object (all API fields)
        merged_player = {
            # Identity
            'season': player.get('season'),
            'seasonLabel': player.get('seasonLabel'),
            'teamId': player.get('teamId'),
            'team': player.get('team'),
            'conference': player.get('conference'),
            'athleteId': player.get('athleteId'),
            'athleteSourceId': player.get('athleteSourceId'),
            'name': player.get('name'),
            'position': player.get('position'),
            
            # Game Participation
            'games': player.get('games'),
            'starts': player.get('starts'),
            'minutes': player.get('minutes'),
            
            # Scoring
            'points': player.get('points'),
            
            # Other Counting Stats
            'turnovers': player.get('turnovers'),
            'fouls': player.get('fouls'),
            'assists': player.get('assists'),
            'steals': player.get('steals'),
            'blocks': player.get('blocks'),
            
            # Advanced Ratings
            'offensiveRating': player.get('offensiveRating'),
            'defensiveRating': player.get('defensiveRating'),
            'netRating': player.get('netRating'),
            'PORPAG': player.get('PORPAG'),
            'usage': player.get('usage'),
            'assistsTurnoverRatio': player.get('assistsTurnoverRatio'),
            'offensiveReboundPct': player.get('offensiveReboundPct'),
            'freeThrowRate': player.get('freeThrowRate'),
            'effectiveFieldGoalPct': player.get('effectiveFieldGoalPct'),
            'trueShootingPct': player.get('trueShootingPct'),
            
            # Shooting Stats (complete objects)
            'fieldGoals': {
                'made': player.get('fieldGoals', {}).get('made'),
                'attempted': player.get('fieldGoals', {}).get('attempted'),
                'pct': player.get('fieldGoals', {}).get('pct')
            },
            'twoPointFieldGoals': {
                'made': player.get('twoPointFieldGoals', {}).get('made'),
                'attempted': player.get('twoPointFieldGoals', {}).get('attempted'),
                'pct': player.get('twoPointFieldGoals', {}).get('pct')
            },
            'threePointFieldGoals': {
                'made': player.get('threePointFieldGoals', {}).get('made'),
                'attempted': player.get('threePointFieldGoals', {}).get('attempted'),
                'pct': player.get('threePointFieldGoals', {}).get('pct')
            },
            'freeThrows': {
                'made': player.get('freeThrows', {}).get('made'),
                'attempted': player.get('freeThrows', {}).get('attempted'),
                'pct': player.get('freeThrows', {}).get('pct')
            },
            
            # Rebounds (complete object)
            'rebounds': {
                'offensive': player.get('rebounds', {}).get('offensive'),
                'defensive': player.get('rebounds', {}).get('defensive'),
                'total': player.get('rebounds', {}).get('total')
            },
            
            # Win Shares (complete object)
            'winShares': {
                'offensive': player.get('winShares', {}).get('offensive'),
                'defensive': player.get('winShares', {}).get('defensive'),
                'total': player.get('winShares', {}).get('total'),
                'totalPer40': player.get('winShares', {}).get('totalPer40')
            }
        }
        
        # Add ALL shooting stats if available
        if athlete_id and athlete_id in shooting_lookup:
            shooting = shooting_lookup[athlete_id]
            merged_player['shootingStats'] = {
                'trackedShots': shooting.get('trackedShots'),
                'freeThrowRate': shooting.get('freeThrowRate'),
                'assistedPct': shooting.get('assistedPct'),
                
                # Dunks (complete)
                'dunks': {
                    'attempted': shooting.get('dunks', {}).get('attempted'),
                    'made': shooting.get('dunks', {}).get('made'),
                    'pct': shooting.get('dunks', {}).get('pct'),
                    'assisted': shooting.get('dunks', {}).get('assisted'),
                    'assistedPct': shooting.get('dunks', {}).get('assistedPct')
                },
                
                # Layups (complete)
                'layups': {
                    'attempted': shooting.get('layups', {}).get('attempted'),
                    'made': shooting.get('layups', {}).get('made'),
                    'pct': shooting.get('layups', {}).get('pct'),
                    'assisted': shooting.get('layups', {}).get('assisted'),
                    'assistedPct': shooting.get('layups', {}).get('assistedPct')
                },
                
                # Tip-ins (complete)
                'tipIns': {
                    'attempted': shooting.get('tipIns', {}).get('attempted'),
                    'made': shooting.get('tipIns', {}).get('made'),
                    'pct': shooting.get('tipIns', {}).get('pct')
                },
                
                # Two-point jumpers (complete)
                'twoPointJumpers': {
                    'attempted': shooting.get('twoPointJumpers', {}).get('attempted'),
                    'made': shooting.get('twoPointJumpers', {}).get('made'),
                    'pct': shooting.get('twoPointJumpers', {}).get('pct'),
                    'assisted': shooting.get('twoPointJumpers', {}).get('assisted'),
                    'assistedPct': shooting.get('twoPointJumpers', {}).get('assistedPct')
                },
                
                # Three-point jumpers (complete)
                'threePointJumpers': {
                    'attempted': shooting.get('threePointJumpers', {}).get('attempted'),
                    'made': shooting.get('threePointJumpers', {}).get('made'),
                    'pct': shooting.get('threePointJumpers', {}).get('pct'),
                    'assisted': shooting.get('threePointJumpers', {}).get('assisted'),
                    'assistedPct': shooting.get('threePointJumpers', {}).get('assistedPct')
                },
                
                # Free throws from shooting endpoint
                'freeThrows': {
                    'attempted': shooting.get('freeThrows', {}).get('attempted'),
                    'made': shooting.get('freeThrows', {}).get('made'),
                    'pct': shooting.get('freeThrows', {}).get('pct')
                },
                
                # Shot attempts breakdown (percentages)
                'attemptsBreakdown': {
                    'dunks': shooting.get('attemptsBreakdown', {}).get('dunks'),
                    'layups': shooting.get('attemptsBreakdown', {}).get('layups'),
                    'tipIns': shooting.get('attemptsBreakdown', {}).get('tipIns'),
                    'twoPointJumpers': shooting.get('attemptsBreakdown', {}).get('twoPointJumpers'),
                    'threePointJumpers': shooting.get('attemptsBreakdown', {}).get('threePointJumpers')
                }
            }
        
        # Calculate comprehensive per-game averages
        games = player.get('games', 0)
        if games > 0:
            merged_player['perGameAverages'] = {
                'points': round(player.get('points', 0) / games, 2),
                'rebounds': round(player.get('rebounds', {}).get('total', 0) / games, 2),
                'offensiveRebounds': round(player.get('rebounds', {}).get('offensive', 0) / games, 2),
                'defensiveRebounds': round(player.get('rebounds', {}).get('defensive', 0) / games, 2),
                'assists': round(player.get('assists', 0) / games, 2),
                'steals': round(player.get('steals', 0) / games, 2),
                'blocks': round(player.get('blocks', 0) / games, 2),
                'turnovers': round(player.get('turnovers', 0) / games, 2),
                'fouls': round(player.get('fouls', 0) / games, 2),
                'minutes': round(player.get('minutes', 0) / games, 2),
                'fieldGoalsMade': round(player.get('fieldGoals', {}).get('made', 0) / games, 2),
                'fieldGoalsAttempted': round(player.get('fieldGoals', {}).get('attempted', 0) / games, 2),
                'twoPointMade': round(player.get('twoPointFieldGoals', {}).get('made', 0) / games, 2),
                'twoPointAttempted': round(player.get('twoPointFieldGoals', {}).get('attempted', 0) / games, 2),
                'threePointMade': round(player.get('threePointFieldGoals', {}).get('made', 0) / games, 2),
                'threePointAttempted': round(player.get('threePointFieldGoals', {}).get('attempted', 0) / games, 2),
                'freeThrowsMade': round(player.get('freeThrows', {}).get('made', 0) / games, 2),
                'freeThrowsAttempted': round(player.get('freeThrows', {}).get('attempted', 0) / games, 2)
            }
        
        # Calculate per-40 minute stats
        minutes = player.get('minutes', 0)
        if minutes > 0:
            merged_player['per40Stats'] = {
                'points': round(player.get('points', 0) * 40 / minutes, 2),
                'rebounds': round(player.get('rebounds', {}).get('total', 0) * 40 / minutes, 2),
                'offensiveRebounds': round(player.get('rebounds', {}).get('offensive', 0) * 40 / minutes, 2),
                'defensiveRebounds': round(player.get('rebounds', {}).get('defensive', 0) * 40 / minutes, 2),
                'assists': round(player.get('assists', 0) * 40 / minutes, 2),
                'steals': round(player.get('steals', 0) * 40 / minutes, 2),
                'blocks': round(player.get('blocks', 0) * 40 / minutes, 2),
                'turnovers': round(player.get('turnovers', 0) * 40 / minutes, 2),
                'fouls': round(player.get('fouls', 0) * 40 / minutes, 2)
            }
        
        # Add calculated efficiency metrics
        fga = player.get('fieldGoals', {}).get('attempted', 0)
        fta = player.get('freeThrows', {}).get('attempted', 0)
        tov = player.get('turnovers', 0)
        
        if fga > 0 or fta > 0 or tov > 0:
            possessions = fga + 0.44 * fta + tov
            if possessions > 0:
                merged_player['calculatedMetrics'] = {
                    'pointsPerShot': round(player.get('points', 0) / max(fga, 1), 3),
                    'pointsPerPossession': round(player.get('points', 0) / possessions, 3),
                    'shootingEfficiency': player.get('effectiveFieldGoalPct'),
                    'scoringEfficiency': player.get('trueShootingPct'),
                    'assistPercentage': round((player.get('assists', 0) / max(possessions, 1)) * 100, 2),
                    'turnoverPercentage': round((tov / max(possessions, 1)) * 100, 2),
                    'reboundRate': round((player.get('rebounds', {}).get('total', 0) / max(minutes, 1)) * 40, 2)
                }
        
        merged.append(merged_player)
    
    return merged

def main():
    print(f"Fetching COMPLETE player statistics for {TEAM} ({START_YEAR}-{END_YEAR})...")
    print("Capturing EVERY stat from the API...")
    
    all_seasons_data = {}
    
    # Fetch data for all seasons
    for year in range(START_YEAR, END_YEAR + 1):
        print(f"Processing season {year}...")
        
        # Fetch season stats
        season_stats = fetch_player_season_stats(year)
        
        # Fetch shooting stats
        shooting_stats = fetch_player_shooting_stats(year)
        
        if season_stats:
            # Merge ALL stats
            complete_stats = merge_all_stats(season_stats, shooting_stats)
            
            all_seasons_data[year] = {
                'season': year,
                'seasonLabel': f"{year-1}{year}",
                'team': TEAM,
                'playerCount': len(complete_stats),
                'players': complete_stats
            }
            
            print(f"  ✓ {len(complete_stats)} players with complete stats")
    
    # Create output structure
    output = {
        'lastUpdated': datetime.now().isoformat(),
        'team': TEAM,
        'dataSource': API_BASE,
        'seasonsIncluded': list(all_seasons_data.keys()),
        'totalSeasons': len(all_seasons_data),
        'seasons': all_seasons_data
    }
    
    # --- FIXED PATH HANDLING ---
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = os.path.join(BASE_DIR, '..', 'data')
    
    os.makedirs(DATA_DIR, exist_ok=True)
    
    output_path = os.path.join(DATA_DIR, 'gamelog.json')
    print("Writing to:", os.path.abspath(output_path))
    
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"\n✓ Complete player stats saved to {output_path}")
    print(f"  Total seasons: {len(all_seasons_data)}")
    
    # Calculate total players across all seasons
    total_players = sum(len(season_data['players']) for season_data in all_seasons_data.values())
    print(f"  Total player-season records: {total_players}")
    
    # Show sample of captured stats
    if all_seasons_data:
        latest_season = max(all_seasons_data.keys())
        if all_seasons_data[latest_season]['players']:
            sample_player = all_seasons_data[latest_season]['players'][0]
            print(f"\n✓ Sample stats captured for {sample_player['name']}:")
            print(f"  - Basic: {len([k for k in sample_player.keys() if not isinstance(sample_player[k], dict)])} fields")
            print(f"  - Shooting breakdown: {len(sample_player.get('shootingStats', {}))} categories")
            print(f"  - Per-game averages: {len(sample_player.get('perGameAverages', {}))} stats")
            print(f"  - Per-40 stats: {len(sample_player.get('per40Stats', {}))} stats")

if __name__ == "__main__":
    main()
