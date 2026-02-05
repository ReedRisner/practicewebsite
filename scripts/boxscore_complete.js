// Enhanced boxscore.js with API integration and date parameter support
let gameLogsData = null;
let currentGameId = null;
let currentSortCol = null;
let currentSortDir = 'desc';

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Page loaded, initializing...');
    await loadGameLogs();
    loadBoxScore();
});

async function loadGameLogs() {
    try {
        const response = await fetch('../data/gamelog.json');
        if (!response.ok) throw new Error('Failed to load game logs');
        gameLogsData = await response.json();
        console.log('Game logs loaded successfully:', gameLogsData);
    } catch (error) {
        console.error('Error loading game logs:', error);
        showError('Failed to load game data: ' + error.message);
    }
}

function loadBoxScore() {
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('gameId');
    let season = urlParams.get('season');
    const opponent = urlParams.get('opponent');
    const date = urlParams.get('date'); // NEW: Support for date parameter
    
    console.log('URL Parameters:', { gameId, season, opponent, date });
    console.log('Full URL:', window.location.href);
    
    if (!gameId && !opponent && !date) {
        console.error('No game parameters found in URL');
        showError('No game specified. Please provide gameId, date, or opponent+season parameters.');
        return;
    }
    
    if (!gameLogsData) {
        console.log('Game logs not loaded yet, retrying...');
        setTimeout(loadBoxScore, 100);
        return;
    }
    
    // If we have a date but no season, or season needs to be converted to season format
    if (date && season) {
        season = convertToSeasonFormat(date, season);
        console.log('Converted to season format:', season);
    } else if (date && !season) {
        // Extract year from date and determine season
        season = getSeasonFromDate(date);
        console.log('Determined season from date:', season);
    }
    
    let game = null;
    
    // Find game by ID, date, or opponent
    if (gameId) {
        currentGameId = parseInt(gameId);
        console.log('Searching for game by ID:', currentGameId);
        game = findGameById(currentGameId);
    } else if (date && season) {
        console.log('Searching for game by date and season:', { date, season });
        game = findGameByDate(date, season);
    } else if (date) {
        console.log('Searching for game by date (all seasons):', date);
        game = findGameByDateAllSeasons(date);
    } else if (opponent && season) {
        console.log('Searching for game by opponent and season:', { opponent, season });
        game = findGameByOpponent(opponent, season);
    }
    
    if (!game) {
        console.error('Game not found with parameters:', { gameId, season, opponent, date });
        console.log('Available seasons:', Object.keys(gameLogsData.seasons || {}));
        showError('Game not found. Check console for details.');
        return;
    }
    
    console.log('Game found:', game);
    renderBoxScore(game);
}

function getSeasonFromDate(dateStr) {
    // dateStr format: "2024-11-19"
    const [year, month] = dateStr.split('-').map(Number);
    
    // Basketball season runs from July (7) to June (6)
    // Season format is just the ending year
    // If month is July-December (7-12), season is nextYear
    // If month is January-June (1-6), season is year
    
    if (month >= 7) {
        // Second half of year: 2024-07 through 2024-12 = 2024-25 season = "2025"
        return `${year + 1}`;
    } else {
        // First half of year: 2024-01 through 2024-06 = 2023-24 season = "2024"
        return `${year}`;
    }
}

function convertToSeasonFormat(dateStr, yearParam) {
    // yearParam might be "2024" which is already the correct format
    // or it might be "2024-25" which we need to convert
    
    // If yearParam is just a 4-digit year, return it as is
    if (yearParam && yearParam.length === 4 && !yearParam.includes('-')) {
        return yearParam;
    }
    
    // If it has a hyphen (like "2024-25"), extract the second year
    if (yearParam && yearParam.includes('-')) {
        const parts = yearParam.split('-');
        return parts[1].length === 2 ? `20${parts[1]}` : parts[1];
    }
    
    // Otherwise, use the date to determine the season
    return getSeasonFromDate(dateStr);
}

function findGameById(gameId) {
    console.log('Searching all seasons for gameId:', gameId);
    for (const seasonKey in gameLogsData.seasons) {
        const season = gameLogsData.seasons[seasonKey];
        console.log(`Checking season ${seasonKey}, ${season.games.length} games`);
        const game = season.games.find(g => g.gameId === gameId);
        if (game) {
            console.log('Game found in season:', seasonKey);
            return game;
        }
    }
    console.log('Game not found in any season');
    return null;
}

function findGameByDate(dateStr, seasonKey) {
    const seasonData = gameLogsData.seasons[seasonKey];
    if (!seasonData) {
        console.error('Season not found:', seasonKey);
        return null;
    }
    
    console.log(`Searching season ${seasonKey} for date:`, dateStr);
    
    const game = seasonData.games.find(g => {
        // Extract date from startDate (format: "2024-11-19T...")
        const gameDate = g.startDate.split('T')[0];
        const match = gameDate === dateStr;
        console.log(`  Checking ${g.opponent} (${gameDate}) vs ${dateStr}: ${match}`);
        return match;
    });
    
    if (!game) {
        console.log('Available dates in this season:', seasonData.games.map(g => ({
            date: g.startDate.split('T')[0],
            opponent: g.opponent
        })));
    }
    
    return game;
}

function findGameByDateAllSeasons(dateStr) {
    console.log('Searching all seasons for date:', dateStr);
    
    for (const seasonKey in gameLogsData.seasons) {
        const season = gameLogsData.seasons[seasonKey];
        const game = season.games.find(g => {
            const gameDate = g.startDate.split('T')[0];
            return gameDate === dateStr;
        });
        
        if (game) {
            console.log('Game found in season:', seasonKey);
            return game;
        }
    }
    
    console.log('Game not found in any season');
    return null;
}

function findGameByOpponent(opponent, season) {
    const seasonData = gameLogsData.seasons[season];
    if (!seasonData) {
        console.error('Season not found:', season);
        return null;
    }
    
    console.log(`Searching season ${season} for opponent:`, opponent);
    const game = seasonData.games.find(g => {
        const match = g.opponent.toLowerCase() === opponent.toLowerCase();
        console.log(`  Checking ${g.opponent} vs ${opponent}: ${match}`);
        return match;
    });
    
    if (!game) {
        console.log('Available opponents in this season:', seasonData.games.map(g => g.opponent));
    }
    
    return game;
}

function renderBoxScore(game) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('boxscore-content').style.display = 'block';
    
    // Update header
    document.getElementById('opponent-name').textContent = 
        `${game.isHome ? 'vs' : '@'} ${game.opponent}`;
    
    const gameDate = new Date(game.startDate);
    document.getElementById('game-date').textContent = 
        gameDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    
    // Calculate final score
    const kentuckyScore = game.teamStats?.points?.total || 0;
    const opponentScore = game.opponentStats?.points?.total || 0;
    const result = kentuckyScore > opponentScore ? 'W' : 'L';
    
    document.getElementById('game-result').textContent = 
        `${result} ${kentuckyScore}-${opponentScore}`;
    document.getElementById('game-result').className = 
        `game-info ${result === 'W' ? 'text-success' : 'text-danger'}`;
    
    // Location
    let location = game.neutralSite ? 'Neutral Site' : 
                   (game.isHome ? 'Rupp Arena' : 'Away');
    document.getElementById('game-location').textContent = location;
    
    // Game type
    const gameType = game.conferenceGame ? 'Conference Game' : 'Non-Conference';
    document.getElementById('game-type').textContent = gameType;
    
    // Render sections
    renderPeriodScoring(game);
    renderTeamComparison(game);
    renderPointsBreakdown(game);
    renderFourFactors(game);
    renderPlayerStats(game.players);
    renderTeamShooting(game);
    renderReboundingBreakdown(game);
    renderTurnoversAndFouls(game);
    renderGameFlow(game);
    
    // Setup sorting
    setupSorting();
}

function renderPeriodScoring(game) {
    const container = document.getElementById('periodScoring');
    if (!game.periodScores || game.periodScores.length === 0) {
        container.innerHTML = '<p>Period scoring data not available</p>';
        return;
    }
    
    let html = '<div class="period-scoring">';
    
    game.periodScores.forEach((period, index) => {
        html += `
            <div class="period-box">
                <div class="period-label">${period.period}</div>
                <div class="period-scores">
                    <div style="color: #0033A0; font-weight: bold;">${period.kentucky}</div>
                    <div style="color: #666;">-</div>
                    <div style="color: #dc3545; font-weight: bold;">${period.opponent}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function renderTeamComparison(game) {
    const container = document.getElementById('teamComparison');
    const ukStats = game.teamStats || {};
    const oppStats = game.opponentStats || {};
    
    const comparisons = [
        { name: 'Field Goals', uk: ukStats.fieldGoals?.made || 0, opp: oppStats.fieldGoals?.made || 0 },
        { name: 'Three Pointers', uk: ukStats.threePointFieldGoals?.made || 0, opp: oppStats.threePointFieldGoals?.made || 0 },
        { name: 'Free Throws', uk: ukStats.freeThrows?.made || 0, opp: oppStats.freeThrows?.made || 0 },
        { name: 'Rebounds', uk: ukStats.rebounds?.total || 0, opp: oppStats.rebounds?.total || 0 },
        { name: 'Assists', uk: ukStats.assists || 0, opp: oppStats.assists || 0 },
        { name: 'Steals', uk: ukStats.steals || 0, opp: oppStats.steals || 0 },
        { name: 'Blocks', uk: ukStats.blocks || 0, opp: oppStats.blocks || 0 },
        { name: 'Turnovers', uk: ukStats.turnovers || 0, opp: oppStats.turnovers || 0, inverse: true }
    ];
    
    let html = '';
    comparisons.forEach(comp => {
        const total = comp.uk + comp.opp || 1;
        const ukPct = (comp.uk / total) * 100;
        const oppPct = (comp.opp / total) * 100;
        
        html += `
            <div class="stat-comparison">
                <div class="stat-name">${comp.name}</div>
                <div class="stat-bar-container">
                    <div class="stat-bar-kentucky" style="width: ${ukPct}%">${comp.uk}</div>
                    <div class="stat-bar-opponent" style="width: ${oppPct}%">${comp.opp}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function renderPointsBreakdown(game) {
    const container = document.getElementById('pointsBreakdown');
    const stats = game.teamStats || {};
    
    const paintPoints = stats.points?.paint || 0;
    const fastBreakPoints = stats.points?.fastBreak || 0;
    const benchPoints = stats.points?.bench || 0;
    const secondChancePoints = stats.points?.secondChance || 0;
    const pointsOffTurnovers = stats.points?.offTurnovers || 0;
    
    container.innerHTML = `
        <div class="points-breakdown">
            <div class="breakdown-card">
                <div class="breakdown-label">Points in Paint</div>
                <div class="breakdown-value">${paintPoints}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">Fast Break Points</div>
                <div class="breakdown-value">${fastBreakPoints}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">Bench Points</div>
                <div class="breakdown-value">${benchPoints}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">Second Chance</div>
                <div class="breakdown-value">${secondChancePoints}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">Points Off Turnovers</div>
                <div class="breakdown-value">${pointsOffTurnovers}</div>
            </div>
        </div>
    `;
}

function renderFourFactors(game) {
    const container = document.getElementById('fourFactorsComparison');
    const ukStats = game.teamStats || {};
    const oppStats = game.opponentStats || {};
    
    const ukEFG = calculateEFG(ukStats);
    const oppEFG = calculateEFG(oppStats);
    const ukTOV = calculateTOVPct(ukStats);
    const oppTOV = calculateTOVPct(oppStats);
    const ukORB = calculateORBPct(ukStats, oppStats);
    const oppORB = calculateORBPct(oppStats, ukStats);
    const ukFTRate = calculateFTRate(ukStats);
    const oppFTRate = calculateFTRate(oppStats);
    
    container.innerHTML = `
        <div class="four-factors-grid">
            <div class="factor-comparison">
                <div class="factor-name">Effective FG%</div>
                <div class="factor-values">
                    <span class="factor-uk">${ukEFG}%</span>
                    <span class="factor-opp">${oppEFG}%</span>
                </div>
            </div>
            <div class="factor-comparison">
                <div class="factor-name">Turnover Rate</div>
                <div class="factor-values">
                    <span class="factor-uk">${ukTOV}%</span>
                    <span class="factor-opp">${oppTOV}%</span>
                </div>
            </div>
            <div class="factor-comparison">
                <div class="factor-name">Off. Rebound %</div>
                <div class="factor-values">
                    <span class="factor-uk">${ukORB}%</span>
                    <span class="factor-opp">${oppORB}%</span>
                </div>
            </div>
            <div class="factor-comparison">
                <div class="factor-name">FT Rate</div>
                <div class="factor-values">
                    <span class="factor-uk">${ukFTRate}</span>
                    <span class="factor-opp">${oppFTRate}</span>
                </div>
            </div>
        </div>
    `;
}

function calculateEFG(stats) {
    const fgm = stats.fieldGoals?.made || 0;
    const fga = stats.fieldGoals?.attempted || 0;
    const tpm = stats.threePointFieldGoals?.made || 0;
    
    if (fga === 0) return 0;
    return ((fgm + 0.5 * tpm) / fga * 100).toFixed(1);
}

function calculateTOVPct(stats) {
    const tov = stats.turnovers || 0;
    const fga = stats.fieldGoals?.attempted || 0;
    const fta = stats.freeThrows?.attempted || 0;
    
    const possessions = fga + 0.44 * fta + tov;
    if (possessions === 0) return 0;
    return (tov / possessions * 100).toFixed(1);
}

function calculateORBPct(teamStats, oppStats) {
    const orb = teamStats.rebounds?.offensive || 0;
    const oppDrb = oppStats.rebounds?.defensive || 0;
    
    const total = orb + oppDrb;
    if (total === 0) return 0;
    return (orb / total * 100).toFixed(1);
}

function calculateFTRate(stats) {
    const fta = stats.freeThrows?.attempted || 0;
    const fga = stats.fieldGoals?.attempted || 0;
    
    if (fga === 0) return '0.0';
    return (fta / fga).toFixed(2);
}

function renderTeamShooting(game) {
    const container = document.getElementById('teamShooting');
    const ukStats = game.teamStats || {};
    const oppStats = game.opponentStats || {};
    
    container.innerHTML = `
        <div class="points-breakdown">
            <div class="breakdown-card">
                <div class="breakdown-label">Kentucky FG%</div>
                <div class="breakdown-value">${(ukStats.fieldGoals?.pct || 0).toFixed(1)}%</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">Kentucky 3PT%</div>
                <div class="breakdown-value">${(ukStats.threePointFieldGoals?.pct || 0).toFixed(1)}%</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">Kentucky FT%</div>
                <div class="breakdown-value">${(ukStats.freeThrows?.pct || 0).toFixed(1)}%</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">Opponent FG%</div>
                <div class="breakdown-value">${(oppStats.fieldGoals?.pct || 0).toFixed(1)}%</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">Opponent 3PT%</div>
                <div class="breakdown-value">${(oppStats.threePointFieldGoals?.pct || 0).toFixed(1)}%</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">Opponent FT%</div>
                <div class="breakdown-value">${(oppStats.freeThrows?.pct || 0).toFixed(1)}%</div>
            </div>
        </div>
    `;
}

function renderReboundingBreakdown(game) {
    const container = document.getElementById('reboundingBreakdown');
    const ukStats = game.teamStats || {};
    const oppStats = game.opponentStats || {};
    
    container.innerHTML = `
        <div class="points-breakdown">
            <div class="breakdown-card">
                <div class="breakdown-label">UK Offensive Rebounds</div>
                <div class="breakdown-value">${ukStats.rebounds?.offensive || 0}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">UK Defensive Rebounds</div>
                <div class="breakdown-value">${ukStats.rebounds?.defensive || 0}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">UK Total Rebounds</div>
                <div class="breakdown-value">${ukStats.rebounds?.total || 0}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">OPP Offensive Rebounds</div>
                <div class="breakdown-value">${oppStats.rebounds?.offensive || 0}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">OPP Defensive Rebounds</div>
                <div class="breakdown-value">${oppStats.rebounds?.defensive || 0}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">OPP Total Rebounds</div>
                <div class="breakdown-value">${oppStats.rebounds?.total || 0}</div>
            </div>
        </div>
    `;
}

function renderTurnoversAndFouls(game) {
    const container = document.getElementById('turnoversAndFouls');
    const ukStats = game.teamStats || {};
    const oppStats = game.opponentStats || {};
    
    container.innerHTML = `
        <div class="points-breakdown">
            <div class="breakdown-card">
                <div class="breakdown-label">UK Turnovers</div>
                <div class="breakdown-value">${ukStats.turnovers || 0}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">UK Personal Fouls</div>
                <div class="breakdown-value">${ukStats.fouls || 0}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">OPP Turnovers</div>
                <div class="breakdown-value">${oppStats.turnovers || 0}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">OPP Personal Fouls</div>
                <div class="breakdown-value">${oppStats.fouls || 0}</div>
            </div>
        </div>
    `;
}

function renderGameFlow(game) {
    const container = document.getElementById('gameFlow');
    const ukStats = game.teamStats || {};
    const oppStats = game.opponentStats || {};
    
    const pace = ukStats.pace || 0;
    const possessions = ukStats.possessions || 0;
    
    container.innerHTML = `
        <div class="points-breakdown">
            <div class="breakdown-card">
                <div class="breakdown-label">Pace</div>
                <div class="breakdown-value">${pace.toFixed(1)}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">Possessions</div>
                <div class="breakdown-value">${possessions}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">UK Efficiency</div>
                <div class="breakdown-value">${((ukStats.points?.total || 0) / (possessions || 1) * 100).toFixed(1)}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">OPP Efficiency</div>
                <div class="breakdown-value">${((oppStats.points?.total || 0) / (possessions || 1) * 100).toFixed(1)}</div>
            </div>
        </div>
    `;
}

function renderPlayerStats(players) {
    const tbody = document.getElementById('player-stats');
    if (!tbody) {
        console.error('Player stats tbody not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (!players || players.length === 0) {
        tbody.innerHTML = '<tr><td colspan="25">No player data available</td></tr>';
        return;
    }
    
    // Sort by minutes by default
    const sortedPlayers = [...players].sort((a, b) => 
        (b.minutes || 0) - (a.minutes || 0)
    );
    
    // Starters first
    const starters = sortedPlayers.filter(p => p.starter);
    const bench = sortedPlayers.filter(p => !p.starter);
    
    // Add starters
    starters.forEach(player => {
        tbody.appendChild(createPlayerRow(player, true));
    });
    
    // Add separator if there are bench players
    if (bench.length > 0 && starters.length > 0) {
        const separator = document.createElement('tr');
        separator.className = 'bench-separator';
        separator.innerHTML = '<td colspan="25" style="background: #f0f0f0; font-weight: bold; padding: 8px;">BENCH</td>';
        tbody.appendChild(separator);
    }
    
    // Add bench
    bench.forEach(player => {
        tbody.appendChild(createPlayerRow(player, false));
    });
    
    // Add team totals
    tbody.appendChild(createTeamTotalsRow(players));
}

function createPlayerRow(player, isStarter) {
    const row = document.createElement('tr');
    row.className = isStarter ? 'starter-row' : 'bench-row';
    
    const rebounds = player.rebounds || {};
    const totalRebounds = (rebounds.offensive || 0) + (rebounds.defensive || 0);
    const offReb = rebounds.offensive || 0;
    const defReb = rebounds.defensive || 0;
    
    const fg = player.fieldGoals || {};
    const twoP = player.twoPointFieldGoals || {};
    const threeP = player.threePointFieldGoals || {};
    const ft = player.freeThrows || {};
    
    const fgPct = fg.attempted > 0 ? (fg.made / fg.attempted * 100).toFixed(1) : '0.0';
    const twoPct = twoP.attempted > 0 ? (twoP.made / twoP.attempted * 100).toFixed(1) : '0.0';
    const threePct = threeP.attempted > 0 ? (threeP.made / threeP.attempted * 100).toFixed(1) : '0.0';
    const ftPct = ft.attempted > 0 ? (ft.made / ft.attempted * 100).toFixed(1) : '0.0';
    
    const rating = calculatePlayerRating(player);
    const ratingClass = `rating-${Math.floor(rating)}`;
    
    const ortg = player.offensiveRating || 0;
    const drtg = player.defensiveRating || 0;
    const plusMinus = player.plusMinus || 0;
    const usg = player.usageRate || 0;
    const gameScore = player.gameScore || rating;
    
    row.innerHTML = `
        <td class="player-name">${player.name}${isStarter ? ' *' : ''}</td>
        <td>${player.minutes || 0}</td>
        <td><strong>${player.points || 0}</strong></td>
        <td>${totalRebounds}</td>
        <td>${offReb}</td>
        <td>${defReb}</td>
        <td>${player.assists || 0}</td>
        <td>${player.steals || 0}</td>
        <td>${player.blocks || 0}</td>
        <td>${player.turnovers || 0}</td>
        <td>${player.fouls || 0}</td>
        <td>${fg.made || 0}-${fg.attempted || 0}</td>
        <td>${fgPct}%</td>
        <td>${twoP.made || 0}-${twoP.attempted || 0}</td>
        <td>${twoPct}%</td>
        <td>${threeP.made || 0}-${threeP.attempted || 0}</td>
        <td>${threePct}%</td>
        <td>${ft.made || 0}-${ft.attempted || 0}</td>
        <td>${ftPct}%</td>
        <td>${ortg.toFixed(1)}</td>
        <td>${drtg.toFixed(1)}</td>
        <td>${plusMinus > 0 ? '+' : ''}${plusMinus}</td>
        <td>${usg.toFixed(1)}%</td>
        <td>${gameScore.toFixed(1)}</td>
        <td><span class="rating-cell ${ratingClass}">${rating.toFixed(1)}</span></td>
    `;
    
    return row;
}

function createTeamTotalsRow(players) {
    const row = document.createElement('tr');
    row.className = 'team-totals-row';
    
    const totals = {
        minutes: 0,
        points: 0,
        totalReb: 0,
        offReb: 0,
        defReb: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        fouls: 0,
        fgm: 0,
        fga: 0,
        twopm: 0,
        twopa: 0,
        tpm: 0,
        tpa: 0,
        ftm: 0,
        fta: 0
    };
    
    players.forEach(player => {
        totals.points += player.points || 0;
        totals.offReb += player.rebounds?.offensive || 0;
        totals.defReb += player.rebounds?.defensive || 0;
        totals.totalReb += (player.rebounds?.offensive || 0) + (player.rebounds?.defensive || 0);
        totals.assists += player.assists || 0;
        totals.steals += player.steals || 0;
        totals.blocks += player.blocks || 0;
        totals.turnovers += player.turnovers || 0;
        totals.fouls += player.fouls || 0;
        totals.fgm += player.fieldGoals?.made || 0;
        totals.fga += player.fieldGoals?.attempted || 0;
        totals.twopm += player.twoPointFieldGoals?.made || 0;
        totals.twopa += player.twoPointFieldGoals?.attempted || 0;
        totals.tpm += player.threePointFieldGoals?.made || 0;
        totals.tpa += player.threePointFieldGoals?.attempted || 0;
        totals.ftm += player.freeThrows?.made || 0;
        totals.fta += player.freeThrows?.attempted || 0;
    });
    
    const fgPct = totals.fga > 0 ? (totals.fgm / totals.fga * 100).toFixed(1) : '0.0';
    const twoPct = totals.twopa > 0 ? (totals.twopm / totals.twopa * 100).toFixed(1) : '0.0';
    const threePct = totals.tpa > 0 ? (totals.tpm / totals.tpa * 100).toFixed(1) : '0.0';
    const ftPct = totals.fta > 0 ? (totals.ftm / totals.fta * 100).toFixed(1) : '0.0';
    
    row.innerHTML = `
        <td class="player-name"><strong>TEAM TOTALS</strong></td>
        <td>-</td>
        <td><strong>${totals.points}</strong></td>
        <td>${totals.totalReb}</td>
        <td>${totals.offReb}</td>
        <td>${totals.defReb}</td>
        <td>${totals.assists}</td>
        <td>${totals.steals}</td>
        <td>${totals.blocks}</td>
        <td>${totals.turnovers}</td>
        <td>${totals.fouls}</td>
        <td>${totals.fgm}-${totals.fga}</td>
        <td>${fgPct}%</td>
        <td>${totals.twopm}-${totals.twopa}</td>
        <td>${twoPct}%</td>
        <td>${totals.tpm}-${totals.tpa}</td>
        <td>${threePct}%</td>
        <td>${totals.ftm}-${totals.fta}</td>
        <td>${ftPct}%</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
    `;
    
    return row;
}

function calculatePlayerRating(player) {
    const {
        points = 0,
        rebounds = {},
        assists = 0,
        steals = 0,
        blocks = 0,
        turnovers = 0,
        fouls = 0,
        fieldGoals = {},
        freeThrows = {},
        minutes = 0
    } = player;
    
    if (minutes === 0) return 0;
    
    const totalRebounds = (rebounds.offensive || 0) + (rebounds.defensive || 0);
    const fgm = fieldGoals.made || 0;
    const fga = fieldGoals.attempted || 0;
    const ftm = freeThrows.made || 0;
    const fta = freeThrows.attempted || 0;
    
    // Game Score formula
    const gameScore = points + 
        (0.4 * fgm) - 
        (0.7 * fga) - 
        (0.4 * (fta - ftm)) + 
        (0.7 * (rebounds.offensive || 0)) + 
        (0.3 * (rebounds.defensive || 0)) + 
        steals + 
        (0.7 * assists) + 
        (0.7 * blocks) - 
        (0.4 * fouls) - 
        turnovers;
    
    // Normalize to 0-10 scale
    const normalizedRating = Math.max(0, Math.min(10, gameScore / 3));
    
    return normalizedRating;
}

function setupSorting() {
    document.querySelectorAll('.boxscore-table th[data-sort]').forEach(header => {
        header.style.cursor = 'pointer';
        header.addEventListener('click', function() {
            const sortKey = this.dataset.sort;
            sortTable(sortKey);
        });
    });
}

function sortTable(sortKey) {
    const tbody = document.getElementById('player-stats');
    const rows = Array.from(tbody.querySelectorAll('tr:not(.bench-separator):not(.team-totals-row)'));
    
    // Toggle sort direction
    if (currentSortCol === sortKey) {
        currentSortDir = currentSortDir === 'desc' ? 'asc' : 'desc';
    } else {
        currentSortCol = sortKey;
        currentSortDir = 'desc';
    }
    
    // Sort rows
    rows.sort((a, b) => {
        let aVal, bVal;
        
        const aText = a.cells[getColumnIndex(sortKey)]?.textContent || '';
        const bText = b.cells[getColumnIndex(sortKey)]?.textContent || '';
        
        // Handle numeric values
        if (sortKey !== 'player') {
            aVal = parseFloat(aText.replace(/[^0-9.-]/g, '')) || 0;
            bVal = parseFloat(bText.replace(/[^0-9.-]/g, '')) || 0;
        } else {
            aVal = aText;
            bVal = bText;
        }
        
        if (currentSortDir === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
    
    // Clear tbody and re-add sorted rows
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
    
    // Re-add team totals at the end
    const urlParams = new URLSearchParams(window.location.search);
    const date = urlParams.get('date');
    const season = urlParams.get('season');
    
    let game = null;
    if (currentGameId) {
        game = findGameById(currentGameId);
    } else if (date && season) {
        game = findGameByDate(date, season);
    } else if (date) {
        game = findGameByDateAllSeasons(date);
    }
    
    if (game && game.players) {
        tbody.appendChild(createTeamTotalsRow(game.players));
    }
    
    // Update sort indicators
    updateSortIndicators(sortKey);
}

function getColumnIndex(sortKey) {
    const columnMap = {
        'player': 0,
        'min': 1,
        'pts': 2,
        'reb': 3,
        'orb': 4,
        'drb': 5,
        'ast': 6,
        'stl': 7,
        'blk': 8,
        'to': 9,
        'pf': 10,
        'fg': 11,
        'fg_pct': 12,
        'two': 13,
        'two_pct': 14,
        'three': 15,
        'three_pct': 16,
        'ft': 17,
        'ft_pct': 18,
        'ortg': 19,
        'drtg': 20,
        'nrtg': 21,
        'usg': 22,
        'gs': 23,
        'rating': 24
    };
    return columnMap[sortKey] || 0;
}

function updateSortIndicators(sortKey) {
    document.querySelectorAll('.boxscore-table th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    
    const activeHeader = document.querySelector(`.boxscore-table th[data-sort="${sortKey}"]`);
    if (activeHeader) {
        activeHeader.classList.add(`sort-${currentSortDir}`);
    }
}

function showError(message) {
    document.getElementById('loading').style.display = 'none';
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    console.error('Error:', message);
}
