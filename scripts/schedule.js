function parseGameDate(dateStr) {
    const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12',
        'January': '01', 'February': '02', 'March': '03',
        'April': '04', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };

    try {
        const cleaned = dateStr.replace(/,/g, '').trim();
        const parts = cleaned.split(/\s+/);
        if (parts.length !== 3) throw new Error('Invalid date format');
        
        const [monthStr, day, year] = parts;
        return `${year}-${months[monthStr]}-${day.padStart(2, '0')}`;
    } catch (error) {
        console.error('Date parsing error:', error.message, 'for date:', dateStr);
        return 'invalid-date';
    }
}

// Rankings Manager - Now loads from local JSON file (no CORS issues!)
const RankingsManager = {
    cache: {
        rankings: null,
        timestamp: null,
        expiryMinutes: 60 // Cache for 1 hour
    },

    async fetchLocalRankings() {
        try {
            // Load from your local ap-rankings.json file (created by GitHub Actions)
            const response = await fetch('../data/ap-rankings.json');
            if (!response.ok) {
                console.warn('Could not load ap-rankings.json, using static rankings');
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
        
        // Convert the teams object to a Map for consistent interface
        const rankings = new Map();
        Object.entries(data.teams).forEach(([school, info]) => {
            rankings.set(school, info.rank);
        });
        
        return rankings;
    },

    async getRankings() {
        const now = Date.now();
        
        // Check cache
        if (this.cache.rankings && this.cache.timestamp) {
            const ageMinutes = (now - this.cache.timestamp) / (1000 * 60);
            if (ageMinutes < this.cache.expiryMinutes) {
                return this.cache.rankings;
            }
        }
        
        // Fetch fresh data from local file
        const data = await this.fetchLocalRankings();
        if (data) {
            this.cache.rankings = this.parseRankings(data);
            this.cache.timestamp = now;
        }
        
        return this.cache.rankings;
    },

    findTeamRank(opponentName, rankings) {
        if (!rankings) return null;
        
        const cleanName = opponentName.replace(/^(vs|at)\s+/i, '').toLowerCase().trim();
        
        if (rankings.has(cleanName)) return rankings.get(cleanName);
        
        const variations = [
            cleanName,
            cleanName.replace(/\./g, ''),
            cleanName.replace(/st\./g, 'st'),
            cleanName.replace(/&/g, 'and'),
            cleanName.replace(/\'/g, ''),
            cleanName.replace(/-/g, ' '),
        ];
        
        for (const variation of variations) {
            if (rankings.has(variation)) return rankings.get(variation);
        }
        
        for (const [teamName, rank] of rankings) {
            if (teamName.includes(cleanName) || cleanName.includes(teamName)) {
                return rank;
            }
        }
        
        return null;
    },

    async updateGameRankings(games) {
        const rankings = await this.getRankings();
        
        // If we can't get rankings, just use what's in the JSON
        if (!rankings) {
            console.log('Using rankings from schedule JSON file');
            return games;
        }
        
        games.forEach(game => {
            // Only update upcoming games
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

async function loadSchedule(season) {
    try {
        const response = await fetch(`../data/${season}-schedule.json`);
        if (!response.ok) throw new Error('Schedule not found');
        let games = await response.json();

        // Update rankings for upcoming games from local JSON file
        games = await RankingsManager.updateGameRankings(games);

        const tbody = document.getElementById('scheduleBody');
        const list = document.getElementById('scheduleList');
        tbody.innerHTML = '';
        list.innerHTML = '';

        // Initialize stats variables
        let totalWins = 0, totalLosses = 0, confWins = 0, confLosses = 0;
        let apWins = 0, apLosses = 0, quad1Wins = 0, quad1Losses = 0;
        let homeWins = 0, homeLosses = 0;
        let awayWins = 0, awayLosses = 0;

        // Process games for both list and table
        games.forEach(game => {
            // Create table row (for mobile)
            const row = document.createElement('tr');
            
            // Add click handler only for completed games
            if (game.result && game.result !== 'TBD') {
                row.style.cursor = 'pointer';
                row.addEventListener('click', () => {
                    const season = document.getElementById('seasonSelect').value;
                    const formattedDate = parseGameDate(game.date);
                    window.location.href = `boxscore.html?season=${season}&date=${formattedDate}`;
                });
            }

            // Update stats - EXCLUDE EXHIBITION GAMES
            if (game.result && game.result !== 'TBD' && !game.exh) {
                // Update total record
                game.result.startsWith('W') ? totalWins++ : totalLosses++;
                
                // Update conference record
                if (game.conference) {
                    game.result.startsWith('W') ? confWins++ : confLosses++;
                }
                
                // Update AP Top 25 record
                if (game.opponentRank && game.opponentRank <= 25) {
                    game.result.startsWith('W') ? apWins++ : apLosses++;
                }
                
                // Update Quad 1 record
                if (game.quad === 1) {
                    game.result.startsWith('W') ? quad1Wins++ : quad1Losses++;
                }
                
                // Update venue records
                if (game.venue === 'home') {
                    game.result.startsWith('W') ? homeWins++ : homeLosses++;
                } else if (game.venue === 'away') {
                    game.result.startsWith('W') ? awayWins++ : awayLosses++;
                }
            }

            // Determine what label to show
            let gameLabel = '';
            if (game.title) {
                gameLabel = `<div class="game-tournament">${game.title}</div>`;
            } else {
                gameLabel = game.conference ? 
                    '<div class="game-conference">Conference</div>' : 
                    '<div class="game-non-conference">Non-Conference</div>';
            }

            // Format ranking display with indicator for live rankings
            let rankDisplay = '';
            if (game.opponentRank && game.opponentRank <= 25) {
                rankDisplay = `<span class="opponent-rank">#${game.opponentRank}</span>${rankIndicator} `;
            }

            // Populate row - INCLUDING TIME
            row.innerHTML = `
                <td data-label="Date" class="game-date">
                    ${game.day ? game.day + ', ' : ''}${game.date}
                </td>
                <td data-label="Matchup">
                    <img src="../images/opponents/${game.logo}" class="team-logo" alt="${game.opponent} Logo">
                    <strong>${rankDisplay}${game.opponent}</strong>
                </td>
                <td data-label="Location">${game.location}</td>
                <td data-label="Time">${game.time ? game.time : '-'}</td>
                <td data-label="Result">
                    <span class="badge ${game.result === 'TBD' ? 
                        'bg-secondary' : 
                        game.result.startsWith('W') ? 
                        'bg-success' : 
                        'bg-danger'}">
                        ${game.result}
                    </span>
                </td>
            `;

            tbody.appendChild(row);
            
            // Create list card (for desktop)
            const card = document.createElement('div');
            card.className = `game-card ${game.result && game.result !== 'TBD' ? 'completed' : ''}`;
            
            // Add click handler for completed games
            if (game.result && game.result !== 'TBD') {
                card.addEventListener('click', () => {
                    const season = document.getElementById('seasonSelect').value;
                    const formattedDate = parseGameDate(game.date);
                    window.location.href = `boxscore.html?season=${season}&date=${formattedDate}`;
                });
            }
            
            const resultClass = game.result === 'TBD' ? 
                'bg-secondary' : 
                game.result.startsWith('W') ? 
                'bg-success' : 
                'bg-danger';
            
            card.innerHTML = `
                <div class="game-info">
                    <div class="game-details">
                        <h5 class="game-date">${game.day ? game.day + ', ' : ''}${game.date}</h5>
                        <div class="game-matchup">
                            <img src="../images/opponents/${game.logo}" class="team-logo" alt="${game.opponent} Logo">
                            <div>
                                <div class="opponent-name">
                                    ${rankDisplay}
                                    ${game.opponent}
                                </div>
                                <div class="game-location">${game.location}</div>
                                ${game.time ? `<div class="game-time">${game.time}</div>` : ''}
                                ${gameLabel}
                            </div>
                        </div>
                    </div>
                </div>
                <span class="game-result badge ${resultClass}">${game.result}</span>
            `;
            
            list.appendChild(card);
        });

        // Update stats displays
        const totalGames = totalWins + totalLosses;
        document.getElementById('totalRecord').textContent = `${totalWins}-${totalLosses}`;
        document.getElementById('conferenceRecord').textContent = `${confWins}-${confLosses}`;
        document.getElementById('winningPercentage').textContent = 
            totalGames > 0 ? `${(totalWins/totalGames*100).toFixed(1)}%` : '-';
        document.getElementById('apTop25Wins').textContent = `${apWins}-${apLosses}`;
        document.getElementById('quad1Wins').textContent = `${quad1Wins}-${quad1Losses}`;
        document.getElementById('tournamentFinish').textContent = 
            season === "2024" ? "Sweet 16" : "-";
        
        // New venue records
        document.getElementById('homeRecord').textContent = `${homeWins}-${homeLosses}`;
        document.getElementById('awayRecord').textContent = `${awayWins}-${awayLosses}`;
        
        // Conference winning percentage
        const confTotal = confWins + confLosses;
        document.getElementById('conferenceWinPercentage').textContent = 
            confTotal > 0 ? `${((confWins / confTotal) * 100).toFixed(1)}%` : '-';

    } catch (error) {
        console.error('Error loading schedule:', error);
        document.getElementById('scheduleBody').innerHTML = `
            <tr><td colspan="5" class="text-center text-danger">Error loading schedule data</td></tr>
        `;
        document.getElementById('scheduleList').innerHTML = `
            <div class="text-center text-danger">Error loading schedule data</div>
        `;
    }
}

// Initial load - default to 2025-2026 season
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const season = urlParams.get('season') || '2025'; // Default to 2025 if no parameter
    document.getElementById('seasonSelect').value = season;
    loadSchedule(season);
});

// Season selector handler
document.getElementById('seasonSelect').addEventListener('change', function() {
    const season = this.value;
    // Update URL with the selected season
    const url = new URL(window.location);
    url.searchParams.set('season', season);
    window.history.replaceState({}, '', url);
    loadSchedule(season);
});


