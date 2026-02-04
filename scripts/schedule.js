/**
 * BBN Stats - Schedule Management
 * Handles loading, displaying, and filtering Kentucky Basketball schedules
 */

// Utility: Parse game date string to ISO format
function parseGameDate(dateStr) {
    const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };

    try {
        const parts = dateStr.trim().split(/\s+/);
        if (parts.length < 2) throw new Error('Invalid date format');
        
        const [monthStr, day] = parts;
        const month = months[monthStr];
        
        if (!month) throw new Error('Invalid month');
        
        // Determine year based on month (Nov-Apr is current season)
        const seasonYear = document.getElementById('seasonSelect').value;
        const year = ['Nov', 'Dec'].includes(monthStr) ? seasonYear : parseInt(seasonYear) + 1;
        
        return `${year}-${month}-${day.padStart(2, '0')}`;
    } catch (error) {
        console.error('Date parsing error:', error.message, 'for date:', dateStr);
        return 'invalid-date';
    }
}

// Rankings Manager - Handles AP Top 25 rankings
const RankingsManager = {
    cache: {
        rankings: null,
        timestamp: null,
        expiryMinutes: 60 // Cache for 1 hour
    },

    async fetchLocalRankings() {
        try {
            const response = await fetch('../data/ap-rankings.json');
            if (!response.ok) {
                console.warn('Could not load ap-rankings.json, using schedule data rankings');
                return null;
            }
            const data = await response.json();
            console.log('✓ Loaded AP rankings from local file');
            console.log(`  Last updated: ${data.apPollDate}`);
            return data;
        } catch (error) {
            console.warn('Error loading local rankings:', error);
            return null;
        }
    },

    parseRankings(data) {
        if (!data || !data.teams) return null;
        
        // Convert teams object to Map for O(1) lookups
        const rankings = new Map();
        Object.entries(data.teams).forEach(([normalizedName, info]) => {
            rankings.set(normalizedName, info.rank);
        });
        
        return rankings;
    },

    async getRankings() {
        const now = Date.now();
        
        // Check cache validity
        if (this.cache.rankings && this.cache.timestamp) {
            const ageMinutes = (now - this.cache.timestamp) / (1000 * 60);
            if (ageMinutes < this.cache.expiryMinutes) {
                return this.cache.rankings;
            }
        }
        
        // Fetch fresh data
        const data = await this.fetchLocalRankings();
        if (data) {
            this.cache.rankings = this.parseRankings(data);
            this.cache.timestamp = now;
        }
        
        return this.cache.rankings;
    },

    normalizeTeamName(name) {
        // Normalize team name for matching
        let normalized = name.toLowerCase().trim();
        
        // Remove prefixes
        normalized = normalized.replace(/^(vs|at|#\d+)\s+/gi, '');
        
        // Common replacements
        const replacements = {
            'st.': 'st',
            'miami (oh)': 'miami ohio',
            'miami-oh': 'miami ohio',
            'miami (fl)': 'miami',
            'st john\'s': 'st johns',
            'saint louis': 'st louis',
            'unc': 'north carolina',
            'uconn': 'connecticut',
        };
        
        for (const [old, newVal] of Object.entries(replacements)) {
            normalized = normalized.replace(old, newVal);
        }
        
        // Remove special characters
        normalized = normalized.replace(/[.'\(\)]/g, '');
        normalized = normalized.replace(/\s+/g, ' ');
        
        return normalized.trim();
    },

    findTeamRank(opponentName, rankings) {
        if (!rankings) return null;
        
        const normalized = this.normalizeTeamName(opponentName);
        
        // Direct match
        if (rankings.has(normalized)) {
            return rankings.get(normalized);
        }
        
        // Fuzzy match
        for (const [teamName, rank] of rankings) {
            if (teamName.includes(normalized) || normalized.includes(teamName)) {
                return rank;
            }
        }
        
        return null;
    },

    async updateGameRankings(games) {
        const rankings = await this.getRankings();
        
        if (!rankings) {
            console.log('Using rankings from schedule JSON file');
            return games;
        }
        
        // Only update upcoming games (TBD results)
        games.forEach(game => {
            if (game.result === 'TBD') {
                const rank = this.findTeamRank(game.opponent, rankings);
                if (rank !== null && rank <= 25) {
                    game.opponentRank = rank;
                    game.liveRank = true;
                } else {
                    game.opponentRank = 0;
                }
            }
        });
        
        return games;
    }
};

// Stats Calculator - Computes team statistics
class StatsCalculator {
    constructor() {
        this.reset();
    }

    reset() {
        this.totalWins = 0;
        this.totalLosses = 0;
        this.confWins = 0;
        this.confLosses = 0;
        this.apWins = 0;
        this.apLosses = 0;
        this.homeWins = 0;
        this.homeLosses = 0;
        this.awayWins = 0;
        this.awayLosses = 0;
        this.neutralWins = 0;
        this.neutralLosses = 0;
        this.currentStreak = 0;
        this.streakType = '';
    }

    processGame(game) {
        // Skip TBD games and exhibitions
        if (!game.result || game.result === 'TBD' || game.exh) {
            return;
        }

        const isWin = game.result.startsWith('W');
        
        // Total record
        isWin ? this.totalWins++ : this.totalLosses++;
        
        // Streak calculation
        if (this.streakType === '') {
            this.streakType = isWin ? 'W' : 'L';
            this.currentStreak = 1;
        } else if ((this.streakType === 'W' && isWin) || (this.streakType === 'L' && !isWin)) {
            this.currentStreak++;
        } else {
            this.streakType = isWin ? 'W' : 'L';
            this.currentStreak = 1;
        }
        
        // Conference record
        if (game.conference) {
            isWin ? this.confWins++ : this.confLosses++;
        }
        
        // AP Top 25 record
        if (game.opponentRank && game.opponentRank <= 25) {
            isWin ? this.apWins++ : this.apLosses++;
        }
        
        // Venue records
        if (game.venue === 'home') {
            isWin ? this.homeWins++ : this.homeLosses++;
        } else if (game.venue === 'away') {
            isWin ? this.awayWins++ : this.awayLosses++;
        } else if (game.venue === 'neutral') {
            isWin ? this.neutralWins++ : this.neutralLosses++;
        }
    }

    getWinPercentage(wins, losses) {
        const total = wins + losses;
        return total > 0 ? ((wins / total) * 100).toFixed(1) + '%' : '-';
    }

    updateDisplay(season) {
        // Update DOM elements
        document.getElementById('totalRecord').textContent = `${this.totalWins}-${this.totalLosses}`;
        document.getElementById('conferenceRecord').textContent = `${this.confWins}-${this.confLosses}`;
        document.getElementById('apTop25Wins').textContent = `${this.apWins}-${this.apLosses}`;
        document.getElementById('winningPercentage').textContent = this.getWinPercentage(this.totalWins, this.totalLosses);
        document.getElementById('conferenceWinPercentage').textContent = this.getWinPercentage(this.confWins, this.confLosses);
        document.getElementById('currentStreak').textContent = this.currentStreak > 0 ? `${this.currentStreak}${this.streakType}` : '-';
        document.getElementById('homeRecord').textContent = `${this.homeWins}-${this.homeLosses}`;
        document.getElementById('awayRecord').textContent = `${this.awayWins}-${this.awayLosses}`;
        
        // Tournament finish (hardcoded for now)
        const tournamentFinishes = {
            '2024': 'Sweet 16',
            '2023': 'Second Round',
            '2022': 'First Round',
        };
        document.getElementById('tournamentFinish').textContent = tournamentFinishes[season] || '-';
    }
}

// Game Card Renderer - Creates HTML elements for games
class GameRenderer {
    static createGameCard(game, season) {
        const card = document.createElement('div');
        card.className = `game-card ${game.result && game.result !== 'TBD' ? 'completed' : ''}`;
        
        // Add click handler for completed games
        if (game.result && game.result !== 'TBD') {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                const formattedDate = parseGameDate(game.date);
                window.location.href = `boxscore.html?season=${season}&date=${formattedDate}`;
            });
        }
        
        const rankDisplay = game.opponentRank && game.opponentRank <= 25 
            ? `<span class="opponent-rank">#${game.opponentRank}</span> ` 
            : '';
        
        const gameLabel = this.getGameLabel(game);
        const resultClass = this.getResultClass(game.result);
        
        card.innerHTML = `
            <div class="game-info">
                <div class="game-details">
                    <h5 class="game-date">${game.day ? game.day + ', ' : ''}${game.date}</h5>
                    <div class="game-matchup">
                        <img src="../images/opponents/${game.logo}" 
                             class="team-logo" 
                             alt="${game.opponent} Logo"
                             onerror="this.src='../images/opponents/default.png'">
                        <div>
                            <div class="opponent-name">
                                ${rankDisplay}${game.opponent}
                            </div>
                            <div class="game-location">${game.location}</div>
                            ${game.time ? `<div class="game-time"><i class="far fa-clock"></i> ${game.time}</div>` : ''}
                            ${gameLabel}
                        </div>
                    </div>
                </div>
            </div>
            <span class="game-result badge ${resultClass}">${game.result}</span>
        `;
        
        return card;
    }

    static createTableRow(game, season) {
        const row = document.createElement('tr');
        
        // Add click handler for completed games
        if (game.result && game.result !== 'TBD') {
            row.style.cursor = 'pointer';
            row.addEventListener('click', () => {
                const formattedDate = parseGameDate(game.date);
                window.location.href = `boxscore.html?season=${season}&date=${formattedDate}`;
            });
        }

        const rankDisplay = game.opponentRank && game.opponentRank <= 25 
            ? `<span class="opponent-rank">#${game.opponentRank}</span> ` 
            : '';
        
        const resultClass = this.getResultClass(game.result);
        
        row.innerHTML = `
            <td data-label="Date" class="game-date">
                ${game.day ? game.day + ', ' : ''}${game.date}
            </td>
            <td data-label="Matchup">
                <img src="../images/opponents/${game.logo}" 
                     class="team-logo" 
                     alt="${game.opponent} Logo"
                     onerror="this.src='../images/opponents/default.png'">
                <strong>${rankDisplay}${game.opponent}</strong>
            </td>
            <td data-label="Location">${game.location}</td>
            <td data-label="Time">${game.time || '-'}</td>
            <td data-label="Result">
                <span class="badge ${resultClass}">${game.result}</span>
            </td>
        `;
        
        return row;
    }

    static getGameLabel(game) {
        if (game.title) {
            return `<div class="game-tournament">${game.title}</div>`;
        }
        return game.conference 
            ? '<div class="game-conference">Conference</div>' 
            : '<div class="game-non-conference">Non-Conference</div>';
    }

    static getResultClass(result) {
        if (result === 'TBD') return 'bg-secondary';
        return result.startsWith('W') ? 'bg-success' : 'bg-danger';
    }
}

// Main Schedule Loader
async function loadSchedule(season) {
    try {
        // Show loading state
        const tbody = document.getElementById('scheduleBody');
        const list = document.getElementById('scheduleList');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading schedule...</td></tr>';
        list.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading schedule...</div>';

        // Fetch schedule data
        const response = await fetch(`../data/${season}-schedule.json`);
        if (!response.ok) throw new Error('Schedule not found');
        
        let games = await response.json();

        // Update rankings for upcoming games
        games = await RankingsManager.updateGameRankings(games);

        // Clear loading state
        tbody.innerHTML = '';
        list.innerHTML = '';

        // Calculate statistics
        const stats = new StatsCalculator();
        games.forEach(game => stats.processGame(game));
        stats.updateDisplay(season);

        // Render games
        games.forEach(game => {
            const card = GameRenderer.createGameCard(game, season);
            const row = GameRenderer.createTableRow(game, season);
            
            list.appendChild(card);
            tbody.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading schedule:', error);
        const errorMsg = `
            <div class="text-center text-danger p-4">
                <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                <p>Error loading schedule data</p>
                <small>${error.message}</small>
            </div>
        `;
        document.getElementById('scheduleBody').innerHTML = `<tr><td colspan="5">${errorMsg}</td></tr>`;
        document.getElementById('scheduleList').innerHTML = errorMsg;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const season = urlParams.get('season') || '2025'; // Default to 2025-26
    document.getElementById('seasonSelect').value = season;
    loadSchedule(season);
});

// Season selector handler
document.getElementById('seasonSelect').addEventListener('change', function() {
    const season = this.value;
    const url = new URL(window.location);
    url.searchParams.set('season', season);
    window.history.replaceState({}, '', url);
    loadSchedule(season);
});
