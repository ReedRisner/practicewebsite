// Enhanced boxscore.js with API integration
let gameLogsData = null;
let currentGameId = null;
let currentSortCol = null;
let currentSortDir = 'desc';

document.addEventListener('DOMContentLoaded', async function() {
    await loadGameLogs();
    loadBoxScore();
});

async function loadGameLogs() {
    try {
        const response = await fetch('../data/gamelog.json');
        if (!response.ok) throw new Error('Failed to load game logs');
        gameLogsData = await response.json();
        console.log('Game logs loaded successfully');
    } catch (error) {
        console.error('Error loading game logs:', error);
        showError('Failed to load game data');
    }
}

function loadBoxScore() {
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('gameId');
    const season = urlParams.get('season');
    const opponent = urlParams.get('opponent');
    
    if (!gameId && !opponent) {
        showError('No game specified');
        return;
    }
    
    if (!gameLogsData) {
        setTimeout(loadBoxScore, 100);
        return;
    }
    
    let game = null;
    
    // Find game by ID or opponent
    if (gameId) {
        currentGameId = parseInt(gameId);
        game = findGameById(currentGameId);
    } else if (opponent && season) {
        game = findGameByOpponent(opponent, season);
    }
    
    if (!game) {
        showError('Game not found');
        return;
    }
    
    renderBoxScore(game);
}

function findGameById(gameId) {
    for (const seasonKey in gameLogsData.seasons) {
        const season = gameLogsData.seasons[seasonKey];
        const game = season.games.find(g => g.gameId === gameId);
        if (game) return game;
    }
    return null;
}

function findGameByOpponent(opponent, season) {
    const seasonData = gameLogsData.seasons[season];
    if (!seasonData) return null;
    
    return seasonData.games.find(g => 
        g.opponent.toLowerCase() === opponent.toLowerCase()
    );
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
    
    // Render player stats
    renderPlayerStats(game.players);
    
    // Render team stats
    renderTeamStats(game.teamStats);
    
    // Setup sorting
    setupSorting();
}

function renderPlayerStats(players) {
    const tbody = document.getElementById('player-stats');
    tbody.innerHTML = '';
    
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
        separator.innerHTML = '<td colspan="12" style="background: #f0f0f0; font-weight: bold; padding: 8px;">BENCH</td>';
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
    
    const fg = player.fieldGoals || {};
    const threeP = player.threePointFieldGoals || {};
    const ft = player.freeThrows || {};
    
    const rating = calculatePlayerRating(player);
    const ratingClass = `rating-${Math.floor(rating)}`;
    
    row.innerHTML = `
        <td class="player-name">${player.name}${isStarter ? ' *' : ''}</td>
        <td>${player.minutes || 0}</td>
        <td><strong>${player.points || 0}</strong></td>
        <td>${totalRebounds}</td>
        <td>${player.assists || 0}</td>
        <td>${player.steals || 0}</td>
        <td>${player.blocks || 0}</td>
        <td>${player.turnovers || 0}</td>
        <td>${fg.made || 0}-${fg.attempted || 0}</td>
        <td>${threeP.made || 0}-${threeP.attempted || 0}</td>
        <td>${ft.made || 0}-${ft.attempted || 0}</td>
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
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        fgm: 0,
        fga: 0,
        tpm: 0,
        tpa: 0,
        ftm: 0,
        fta: 0
    };
    
    players.forEach(player => {
        totals.points += player.points || 0;
        totals.rebounds += (player.rebounds?.offensive || 0) + (player.rebounds?.defensive || 0);
        totals.assists += player.assists || 0;
        totals.steals += player.steals || 0;
        totals.blocks += player.blocks || 0;
        totals.turnovers += player.turnovers || 0;
        totals.fgm += player.fieldGoals?.made || 0;
        totals.fga += player.fieldGoals?.attempted || 0;
        totals.tpm += player.threePointFieldGoals?.made || 0;
        totals.tpa += player.threePointFieldGoals?.attempted || 0;
        totals.ftm += player.freeThrows?.made || 0;
        totals.fta += player.freeThrows?.attempted || 0;
    });
    
    row.innerHTML = `
        <td class="player-name"><strong>TEAM TOTALS</strong></td>
        <td>-</td>
        <td><strong>${totals.points}</strong></td>
        <td>${totals.rebounds}</td>
        <td>${totals.assists}</td>
        <td>${totals.steals}</td>
        <td>${totals.blocks}</td>
        <td>${totals.turnovers}</td>
        <td>${totals.fgm}-${totals.fga}</td>
        <td>${totals.tpm}-${totals.tpa}</td>
        <td>${totals.ftm}-${totals.fta}</td>
        <td>-</td>
    `;
    
    return row;
}

function renderTeamStats(teamStats) {
    if (!teamStats) return;
    
    const fg = teamStats.fieldGoals || {};
    const threeP = teamStats.threePointFieldGoals || {};
    const ft = teamStats.freeThrows || {};
    
    document.getElementById('fg-pct').textContent = 
        `${(fg.pct || 0).toFixed(1)}%`;
    document.getElementById('three-pct').textContent = 
        `${(threeP.pct || 0).toFixed(1)}%`;
    document.getElementById('ft-pct').textContent = 
        `${(ft.pct || 0).toFixed(1)}%`;
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
        
        const aText = a.cells[getColumnIndex(sortKey)].textContent;
        const bText = b.cells[getColumnIndex(sortKey)].textContent;
        
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
    const game = findGameById(currentGameId);
    if (game) {
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
        'ast': 4,
        'stl': 5,
        'blk': 6,
        'to': 7,
        'fg': 8,
        'threept': 9,
        'ft': 10,
        'rating': 11
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
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}
