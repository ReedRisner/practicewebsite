#!/usr/bin/env python3
"""
Fetch COMPLETE game logs from College Basketball Data API
Captures EVERY stat field available for players and teams
"""

import requests
import json
import os
from datetime import datetime

API_BASE = "https://api.collegebasketballdata.com"
TEAM = "Kentucky"
START_YEAR = 2009
END_YEAR = 2026

def fetch_player_game_logs(season):
    """Fetch ALL player game logs for a season"""
    url = f"{API_BASE}/games/players"
    params = {"team": TEAM, "season": season}
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching player game logs for {season}: {e}")
        return []

def fetch_team_game_logs(season):
    """Fetch ALL team game logs for a season"""
    url = f"{API_BASE}/games/teams"
    params = {"team": TEAM, "season": season}
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching team game logs for {season}: {e}")
        return []

def organize_complete_game_data(player_logs, team_logs):
    """Organize ALL player and team stats by game - capture EVERYTHING"""
    # Create game lookup from team logs
    game_lookup = {}
    for game in team_logs:
        game_id = game.get('gameId')
        if game_id:
            game_lookup[game_id] = game
    
    # Organize by game with COMPLETE data
    games_dict = {}
    for game_log in player_logs:
        game_id = game_log.get('gameId')
        if not game_id:
            continue
        
        if game_id not in games_dict:
            # Get team game info
            team_game = game_lookup.get(game_id, {})
            
            games_dict[game_id] = {
                # Game Identity
                'gameId': game_id,
                'season': game_log.get('season'),
                'seasonLabel': game_log.get('seasonLabel'),
                'seasonType': game_log.get('seasonType'),
                'tournament': game_log.get('tournament'),
                'startDate': game_log.get('startDate'),
                'startTimeTbd': game_log.get('startTimeTbd'),
                
                # Opponent Information
                'opponentId': game_log.get('opponentId'),
                'opponent': game_log.get('opponent'),
                'opponentConference': game_log.get('opponentConference'),
                'opponentSeed': game_log.get('opponentSeed'),
                
                # Location
                'isHome': game_log.get('isHome'),
                'neutralSite': game_log.get('neutralSite'),
                
                # Game Details
                'conferenceGame': game_log.get('conferenceGame'),
                'gameType': game_log.get('gameType'),
                'notes': game_log.get('notes'),
                'gameMinutes': game_log.get('gameMinutes'),
                'gamePace': game_log.get('gamePace'),
                
                # COMPLETE Team Stats
                'teamStats': {
                    'possessions': team_game.get('teamStats', {}).get('possessions'),
                    'assists': team_game.get('teamStats', {}).get('assists'),
                    'steals': team_game.get('teamStats', {}).get('steals'),
                    'blocks': team_game.get('teamStats', {}).get('blocks'),
                    'trueShooting': team_game.get('teamStats', {}).get('trueShooting'),
                    'rating': team_game.get('teamStats', {}).get('rating'),
                    'gameScore': team_game.get('teamStats', {}).get('gameScore'),
                    
                    # Points breakdown
                    'points': {
                        'total': team_game.get('teamStats', {}).get('points', {}).get('total'),
                        'byPeriod': team_game.get('teamStats', {}).get('points', {}).get('byPeriod'),
                        'largestLead': team_game.get('teamStats', {}).get('points', {}).get('largestLead'),
                        'fastBreak': team_game.get('teamStats', {}).get('points', {}).get('fastBreak'),
                        'inPaint': team_game.get('teamStats', {}).get('points', {}).get('inPaint'),
                        'offTurnovers': team_game.get('teamStats', {}).get('points', {}).get('offTurnovers')
                    },
                    
                    # Two-point shooting
                    'twoPointFieldGoals': {
                        'made': team_game.get('teamStats', {}).get('twoPointFieldGoals', {}).get('made'),
                        'attempted': team_game.get('teamStats', {}).get('twoPointFieldGoals', {}).get('attempted'),
                        'pct': team_game.get('teamStats', {}).get('twoPointFieldGoals', {}).get('pct')
                    },
                    
                    # Three-point shooting
                    'threePointFieldGoals': {
                        'made': team_game.get('teamStats', {}).get('threePointFieldGoals', {}).get('made'),
                        'attempted': team_game.get('teamStats', {}).get('threePointFieldGoals', {}).get('attempted'),
                        'pct': team_game.get('teamStats', {}).get('threePointFieldGoals', {}).get('pct')
                    },
                    
                    # Free throws
                    'freeThrows': {
                        'made': team_game.get('teamStats', {}).get('freeThrows', {}).get('made'),
                        'attempted': team_game.get('teamStats', {}).get('freeThrows', {}).get('attempted'),
                        'pct': team_game.get('teamStats', {}).get('freeThrows', {}).get('pct')
                    },
                    
                    # Total field goals
                    'fieldGoals': {
                        'made': team_game.get('teamStats', {}).get('fieldGoals', {}).get('made'),
                        'attempted': team_game.get('teamStats', {}).get('fieldGoals', {}).get('attempted'),
                        'pct': team_game.get('teamStats', {}).get('fieldGoals', {}).get('pct')
                    },
                    
                    # Turnovers
                    'turnovers': {
                        'total': team_game.get('teamStats', {}).get('turnovers', {}).get('total'),
                        'teamTotal': team_game.get('teamStats', {}).get('turnovers', {}).get('teamTotal')
                    },
                    
                    # Rebounds
                    'rebounds': {
                        'offensive': team_game.get('teamStats', {}).get('rebounds', {}).get('offensive'),
                        'defensive': team_game.get('teamStats', {}).get('rebounds', {}).get('defensive'),
                        'total': team_game.get('teamStats', {}).get('rebounds', {}).get('total')
                    },
                    
                    # Fouls
                    'fouls': {
                        'total': team_game.get('teamStats', {}).get('fouls', {}).get('total'),
                        'technical': team_game.get('teamStats', {}).get('fouls', {}).get('technical'),
                        'flagrant': team_game.get('teamStats', {}).get('fouls', {}).get('flagrant')
                    },
                    
                    # Four Factors
                    'fourFactors': {
                        'effectiveFieldGoalPct': team_game.get('teamStats', {}).get('fourFactors', {}).get('effectiveFieldGoalPct'),
                        'freeThrowRate': team_game.get('teamStats', {}).get('fourFactors', {}).get('freeThrowRate'),
                        'turnoverRatio': team_game.get('teamStats', {}).get('fourFactors', {}).get('turnoverRatio'),
                        'offensiveReboundPct': team_game.get('teamStats', {}).get('fourFactors', {}).get('offensiveReboundPct')
                    }
                },
                
                # COMPLETE Opponent Stats (same structure)
                'opponentStats': {
                    'possessions': team_game.get('opponentStats', {}).get('possessions'),
                    'assists': team_game.get('opponentStats', {}).get('assists'),
                    'steals': team_game.get('opponentStats', {}).get('steals'),
                    'blocks': team_game.get('opponentStats', {}).get('blocks'),
                    'trueShooting': team_game.get('opponentStats', {}).get('trueShooting'),
                    'rating': team_game.get('opponentStats', {}).get('rating'),
                    'gameScore': team_game.get('opponentStats', {}).get('gameScore'),
                    
                    'points': {
                        'total': team_game.get('opponentStats', {}).get('points', {}).get('total'),
                        'byPeriod': team_game.get('opponentStats', {}).get('points', {}).get('byPeriod'),
                        'largestLead': team_game.get('opponentStats', {}).get('points', {}).get('largestLead'),
                        'fastBreak': team_game.get('opponentStats', {}).get('points', {}).get('fastBreak'),
                        'inPaint': team_game.get('opponentStats', {}).get('points', {}).get('inPaint'),
                        'offTurnovers': team_game.get('opponentStats', {}).get('points', {}).get('offTurnovers')
                    },
                    
                    'twoPointFieldGoals': {
                        'made': team_game.get('opponentStats', {}).get('twoPointFieldGoals', {}).get('made'),
                        'attempted': team_game.get('opponentStats', {}).get('twoPointFieldGoals', {}).get('attempted'),
                        'pct': team_game.get('opponentStats', {}).get('twoPointFieldGoals', {}).get('pct')
                    },
                    
                    'threePointFieldGoals': {
                        'made': team_game.get('opponentStats', {}).get('threePointFieldGoals', {}).get('made'),
                        'attempted': team_game.get('opponentStats', {}).get('threePointFieldGoals', {}).get('attempted'),
                        'pct': team_game.get('opponentStats', {}).get('threePointFieldGoals', {}).get('pct')
                    },
                    
                    'freeThrows': {
                        'made': team_game.get('opponentStats', {}).get('freeThrows', {}).get('made'),
                        'attempted': team_game.get('opponentStats', {}).get('freeThrows', {}).get('attempted'),
                        'pct': team_game.get('opponentStats', {}).get('freeThrows', {}).get('pct')
                    },
                    
                    'fieldGoals': {
                        'made': team_game.get('opponentStats', {}).get('fieldGoals', {}).get('made'),
                        'attempted': team_game.get('opponentStats', {}).get('fieldGoals', {}).get('attempted'),
                        'pct': team_game.get('opponentStats', {}).get('fieldGoals', {}).get('pct')
                    },
                    
                    'turnovers': {
                        'total': team_game.get('opponentStats', {}).get('turnovers', {}).get('total'),
                        'teamTotal': team_game.get('opponentStats', {}).get('turnovers', {}).get('teamTotal')
                    },
                    
                    'rebounds': {
                        'offensive': team_game.get('opponentStats', {}).get('rebounds', {}).get('offensive'),
                        'defensive': team_game.get('opponentStats', {}).get('rebounds', {}).get('defensive'),
                        'total': team_game.get('opponentStats', {}).get('rebounds', {}).get('total')
                    },
                    
                    'fouls': {
                        'total': team_game.get('opponentStats', {}).get('fouls', {}).get('total'),
                        'technical': team_game.get('opponentStats', {}).get('fouls', {}).get('technical'),
                        'flagrant': team_game.get('opponentStats', {}).get('fouls', {}).get('flagrant')
                    },
                    
                    'fourFactors': {
                        'effectiveFieldGoalPct': team_game.get('opponentStats', {}).get('fourFactors', {}).get('effectiveFieldGoalPct'),
                        'freeThrowRate': team_game.get('opponentStats', {}).get('fourFactors', {}).get('freeThrowRate'),
                        'turnoverRatio': team_game.get('opponentStats', {}).get('fourFactors', {}).get('turnoverRatio'),
                        'offensiveReboundPct': team_game.get('opponentStats', {}).get('fourFactors', {}).get('offensiveReboundPct')
                    }
                },
                
                'players': []
            }
        
        # Add COMPLETE player stats to game
        games_dict[game_id]['players'].append({
            # Player Identity
            'athleteId': game_log.get('athleteId'),
            'athleteSourceId': game_log.get('athleteSourceId'),
            'name': game_log.get('name'),
            'position': game_log.get('position'),
            
            # Game Participation
            'starter': game_log.get('starter'),
            'ejected': game_log.get('ejected'),
            'minutes': game_log.get('minutes'),
            
            # Counting Stats
            'points': game_log.get('points'),
            'turnovers': game_log.get('turnovers'),
            'fouls': game_log.get('fouls'),
            'assists': game_log.get('assists'),
            'steals': game_log.get('steals'),
            'blocks': game_log.get('blocks'),
            
            # Advanced Metrics
            'gameScore': game_log.get('gameScore'),
            'offensiveRating': game_log.get('offensiveRating'),
            'defensiveRating': game_log.get('defensiveRating'),
            'netRating': game_log.get('netRating'),
            'usage': game_log.get('usage'),
            'effectiveFieldGoalPct': game_log.get('effectiveFieldGoalPct'),
            'trueShootingPct': game_log.get('trueShootingPct'),
            'assistsTurnoverRatio': game_log.get('assistsTurnoverRatio'),
            'freeThrowRate': game_log.get('freeThrowRate'),
            'offensiveReboundPct': game_log.get('offensiveReboundPct'),
            
            # Shooting
            'fieldGoals': {
                'made': game_log.get('fieldGoals', {}).get('made'),
                'attempted': game_log.get('fieldGoals', {}).get('attempted'),
                'pct': game_log.get('fieldGoals', {}).get('pct')
            },
            'twoPointFieldGoals': {
                'made': game_log.get('twoPointFieldGoals', {}).get('made'),
                'attempted': game_log.get('twoPointFieldGoals', {}).get('attempted'),
                'pct': game_log.get('twoPointFieldGoals', {}).get('pct')
            },
            'threePointFieldGoals': {
                'made': game_log.get('threePointFieldGoals', {}).get('made'),
                'attempted': game_log.get('threePointFieldGoals', {}).get('attempted'),
                'pct': game_log.get('threePointFieldGoals', {}).get('pct')
            },
            'freeThrows': {
                'made': game_log.get('freeThrows', {}).get('made'),
                'attempted': game_log.get('freeThrows', {}).get('attempted'),
                'pct': game_log.get('freeThrows', {}).get('pct')
            },
            
            # Rebounds
            'rebounds': {
                'offensive': game_log.get('rebounds', {}).get('offensive'),
                'defensive': game_log.get('rebounds', {}).get('defensive'),
                'total': game_log.get('rebounds', {}).get('total')
            }
        })
    
    return list(games_dict.values())

def calculate_game_results(games):
    """Calculate win/loss and add comprehensive result info"""
    for game in games:
        team_stats = game.get('teamStats', {})
        opponent_stats = game.get('opponentStats', {})
        
        team_points = team_stats.get('points', {}).get('total', 0)
        opponent_points = opponent_stats.get('points', {}).get('total', 0)
        
        # Result
        if team_points > opponent_points:
            game['result'] = 'W'
            game['finalScore'] = f"W {team_points}-{opponent_points}"
            game['pointDifferential'] = team_points - opponent_points
        else:
            game['result'] = 'L'
            game['finalScore'] = f"L {team_points}-{opponent_points}"
            game['pointDifferential'] = team_points - opponent_points
        
        game['teamScore'] = team_points
        game['opponentScore'] = opponent_points
        
        # Scoring by period
        game['scoringByPeriod'] = {
            'team': team_stats.get('points', {}).get('byPeriod', []),
            'opponent': opponent_stats.get('points', {}).get('byPeriod', [])
        }
        
        # Game flow stats
        game['gameFlow'] = {
            'teamLargestLead': team_stats.get('points', {}).get('largestLead', 0),
            'opponentLargestLead': opponent_stats.get('points', {}).get('largestLead', 0),
            'pace': game.get('gamePace'),
            'possessions': team_stats.get('possessions')
        }
    
    return games

def main():
    print(f"Fetching COMPLETE game logs for {TEAM} ({START_YEAR}-{END_YEAR})...")
    print("Capturing EVERY stat from the API...")
    
    all_seasons_games = {}
    
    # Fetch data for all seasons
    for year in range(START_YEAR, END_YEAR + 1):
        print(f"Processing season {year}...")
        
        # Fetch player game logs
        player_logs = fetch_player_game_logs(year)
        
        # Fetch team game logs
        team_logs = fetch_team_game_logs(year)
        
        if player_logs:
            # Organize with ALL data
            games = organize_complete_game_data(player_logs, team_logs)
            
            # Add results and calculated stats
            games = calculate_game_results(games)
            
            # Sort by date
            games.sort(key=lambda x: x.get('startDate', ''))
            
            all_seasons_games[year] = {
                'season': year,
                'seasonLabel': f"{year-1}{year}",
                'team': TEAM,
                'gameCount': len(games),
                'games': games
            }
            
            print(f"  ✓ {len(games)} games with complete stats")
    
    # Create output structure
    output = {
        'lastUpdated': datetime.now().isoformat(),
        'team': TEAM,
        'dataSource': API_BASE,
        'seasonsIncluded': list(all_seasons_games.keys()),
        'totalSeasons': len(all_seasons_games),
        'seasons': all_seasons_games
    }
    
    # Ensure data directory exists
    os.makedirs('../data', exist_ok=True)
    
    # Write to file
    output_path = '../data/gamelog.json'
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"\n✓ Complete game logs saved to {output_path}")
    print(f"  Total seasons: {len(all_seasons_games)}")
    
    # Calculate total games
    total_games = sum(season_data['gameCount'] for season_data in all_seasons_games.values())
    print(f"  Total games: {total_games}")
    
    # Show sample stats
    if all_seasons_games:
        latest_season = max(all_seasons_games.keys())
        if all_seasons_games[latest_season]['games']:
            sample_game = all_seasons_games[latest_season]['games'][0]
            print(f"\n✓ Sample game data captured:")
            print(f"  - Team stats categories: {len(sample_game.get('teamStats', {}))}")
            print(f"  - Opponent stats categories: {len(sample_game.get('opponentStats', {}))}")
            print(f"  - Players in game: {len(sample_game.get('players', []))}")
            if sample_game.get('players'):
                print(f"  - Stats per player: {len(sample_game['players'][0])} fields")

if __name__ == "__main__":
    main()
