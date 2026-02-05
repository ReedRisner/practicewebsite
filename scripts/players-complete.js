// Enhanced players.js with API integration
let allPlayersData = null;
let allGameLogsData = null;
let rosterData = null;
let currentSortKey = 'rating';
let currentSortDirection = 'desc';

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    await loadAllData();
    handleURLParameters();
    setupEventListeners();
    setDefaultView();
});

async function loadAllData() {
    try {
        // Load player stats
        const statsResponse = await fetch('../data/playerstats.json');
        if (!statsResponse.ok) throw new Error('Failed to load player stats');
        allPlayersData = await statsResponse.json();
        
        // Load game logs
        const gameLogsResponse = await fetch('../data/gamelog.json');
        if (!gameLogsResponse.ok) throw new Error('Failed to load game logs');
        allGameLogsData = await gameLogsResponse.json();
        
        // Load roster data
        const rosterResponse = await fetch('../data/roster.json');
        if (!rosterResponse.ok) throw new Error('Failed to load roster');
        rosterData = await rosterResponse.json();
        
        console.log('All data loaded successfully');
        populateSeasonSelector();
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load player data. Please try again later.');
    }
}

function populateSeasonSelector() {
    const seasonSelect = document.getElementById('seasonSelect');
    if (!seasonSelect || !allPlayersData) return;
    
    seasonSelect.innerHTML = '';
    
    // Get all seasons and sort in descending order
    const seasons = Object.keys(allPlayersData.seasons).sort((a, b) => b - a);
    
    seasons.forEach(season => {
        const option = document.createElement('option');
        option.value = season;
        option.textContent = `${parseInt(season)-1}-${season}`;
        seasonSelect.appendChild(option);
    });
    
    // Set to most recent season
    if (seasons.length > 0) {
        seasonSelect.value = seasons[0];
    }
}

function handleURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const playerName = urlParams.get('player');
    const season = urlParams.get('season') || getCurrentSeason();
    
    if (playerName) {
        const checkDataAndShowPlayer = () => {
            if (!allPlayersData?.seasons?.[season]) {
                setTimeout(checkDataAndShowPlayer, 100);
                return;
            }
            
            const seasonData = allPlayersData.seasons[season];
            const player = seasonData.players.find(p => p.name === playerName);
            
            if (player) {
                document.getElementById('seasonSelect').value = season;
                showPlayerDetail(player, season);
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                loadPlayerStats(season);
            }
        };
        checkDataAndShowPlayer();
    } else {
        loadPlayerStats(season);
    }
}

function getCurrentSeason() {
    const seasons = Object.keys(allPlayersData?.seasons || {});
    return seasons.length > 0 ? Math.max(...seasons.map(Number)).toString() : '2026';
}

function setupEventListeners() {
    // Season selector
    document.getElementById('seasonSelect')?.addEventListener('change', function() {
        loadPlayerStats(this.value);
    });
    
    // View toggles
    document.getElementById('gridViewToggle')?.addEventListener('change', function() {
        toggleView(this.checked ? 'grid' : 'table');
    });
    
    // Advanced stats toggle
    document.getElementById('advancedStatsToggle')?.addEventListener('change', function() {
        document.querySelector('.stats-table')?.classList.toggle('show-advanced');
        loadPlayerStats(document.getElementById('seasonSelect').value);
    });
    
    // Back button
    document.getElementById('backToList')?.addEventListener('click', function() {
        showPlayerList();
    });
}

function loadPlayerStats(season) {
    if (!allPlayersData?.seasons?.[season]) {
        showError(`No data available for season ${season}`);
        return;
    }
    
    const seasonData = allPlayersData.seasons[season];
    let players = [...seasonData.players];
    
    // Add game ratings
    players = players.map(player => {
        const gameRatings = calculatePlayerGameRatings(player, season);
        return {
            ...player,
            gameRatings,
            avgRating: calculateAverageRating(gameRatings),
            rosterInfo: getRosterInfo(player.athleteId, season)
        };
    });
    
    // Sort players
    players = sortPlayers(players, currentSortKey, currentSortDirection);
    
    // Update UI
    updateSortArrows(currentSortKey, currentSortDirection);
    
    // Render based on view mode
    const viewPreference = sessionStorage.getItem('viewPreference') || 'table';
    if (viewPreference === 'grid') {
        loadPlayerGrid(players, season);
        document.getElementById('playersGridView').style.display = 'grid';
        document.getElementById('playerListSection').style.display = 'none';
    } else {
        loadPlayerTable(players, season);
        document.getElementById('playerListSection').style.display = 'block';
        document.getElementById('playersGridView').style.display = 'none';
    }
}

function calculatePlayerGameRatings(player, season) {
    const gameLogsForSeason = allGameLogsData?.seasons?.[season];
    if (!gameLogsForSeason) return [];
    
    const playerGames = [];
    
    gameLogsForSeason.games.forEach(game => {
        const playerInGame = game.players.find(p => 
            p.athleteId === player.athleteId || p.name === player.name
        );
        
        if (playerInGame && playerInGame.minutes > 0) {
            const rating = calculateGameRating(playerInGame);
            playerGames.push({
                ...game,
                playerStats: playerInGame,
                rating
            });
        }
    });
    
    return playerGames;
}

function calculateGameRating(playerStats) {
    const {
        points = 0,
        rebounds = {},
        assists = 0,
        steals = 0,
        blocks = 0,
        turnovers = 0,
        fieldGoals = {},
        freeThrows = {},
        minutes = 0
    } = playerStats;
    
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
    
    // Normalize to 0-10 scale (approximately)
    const normalizedRating = Math.max(0, Math.min(10, gameScore / 3));
    
    return normalizedRating;
}

function calculateAverageRating(gameRatings) {
    if (!gameRatings || gameRatings.length === 0) return 0;
    const sum = gameRatings.reduce((acc, game) => acc + (game.rating || 0), 0);
    return sum / gameRatings.length;
}

function getRosterInfo(athleteId, season) {
    if (!rosterData?.seasons?.[season]) return null;
    
    const seasonRoster = rosterData.seasons[season];
    for (const teamRoster of seasonRoster) {
        const player = teamRoster.players?.find(p => p.id === athleteId);
        if (player) {
            return {
                jersey: player.jersey,
                position: player.position,
                height: player.height,
                weight: player.weight,
                hometown: player.hometown,
                careerStats: player.careerStats,
                careerAverages: player.careerAverages
            };
        }
    }
    return null;
}

function loadPlayerTable(players, season) {
    const tbody = document.getElementById('playerStats');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    players.forEach(player => {
        const row = createPlayerRow(player, season);
        tbody.appendChild(row);
    });
    
    addSortEventListeners();
}

function createPlayerRow(player, season) {
    const row = document.createElement('tr');
    row.className = 'player-row';
    row.onclick = () => showPlayerDetail(player, season);
    
    const avgRating = player.avgRating || 0;
    const ratingClass = isNaN(avgRating) ? 'rating-na' : `rating-${Math.floor(avgRating)}`;
    
    const avg = player.averages || {};
    const rosterInfo = player.rosterInfo || {};
    
    row.innerHTML = `
        <td class="player-name">
            <div class="player-name-cell">
                <span class="player-jersey">${rosterInfo.jersey || '-'}</span>
                <span>${player.name}</span>
            </div>
        </td>
        <td>${rosterInfo.position || player.position || '-'}</td>
        <td>${player.games || 0}</td>
        <td>${avg.mpg || 0}</td>
        <td><strong>${avg.ppg || 0}</strong></td>
        <td>${avg.rpg || 0}</td>
        <td>${avg.apg || 0}</td>
        <td>${avg.spg || 0}</td>
        <td>${avg.bpg || 0}</td>
        <td>${avg.tpg || 0}</td>
        <td>${(player.fieldGoals?.pct || 0).toFixed(1)}%</td>
        <td>${(player.threePointFieldGoals?.pct || 0).toFixed(1)}%</td>
        <td>${(player.freeThrows?.pct || 0).toFixed(1)}%</td>
        <td class="advanced-stat">${(player.trueShootingPct * 100 || 0).toFixed(1)}%</td>
        <td class="advanced-stat">${player.offensiveRating?.toFixed(1) || '-'}</td>
        <td class="advanced-stat">${player.defensiveRating?.toFixed(1) || '-'}</td>
        <td class="advanced-stat">${player.usage?.toFixed(1) || '-'}</td>
        <td class="advanced-stat">${player.winShares?.total?.toFixed(1) || '-'}</td>
        <td>
            <span class="rating-cell ${ratingClass}">
                ${isNaN(avgRating) ? 'N/A' : avgRating.toFixed(1)}
            </span>
        </td>
    `;
    
    return row;
}

function loadPlayerGrid(players, season) {
    const gridContainer = document.getElementById('playersGridView');
    if (!gridContainer) return;
    
    gridContainer.innerHTML = '';
    
    players.forEach(player => {
        const card = createPlayerCard(player, season);
        gridContainer.appendChild(card);
    });
}

function createPlayerCard(player, season) {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.onclick = () => showPlayerDetail(player, season);
    
    const avgRating = player.avgRating || 0;
    const ratingClass = isNaN(avgRating) ? 'rating-na' : `rating-${Math.floor(avgRating)}`;
    const avg = player.averages || {};
    const rosterInfo = player.rosterInfo || {};
    
    card.innerHTML = `
        <div class="player-card-header">
            <div class="player-card-backdrop"></div>
            <div class="player-card-info">
                <div class="player-card-name">${player.name}</div>
                <div class="player-card-position">${rosterInfo.position || player.position || '-'}</div>
                ${rosterInfo.jersey ? `<div class="player-card-jersey">#${rosterInfo.jersey}</div>` : ''}
            </div>
            <div class="player-card-rating ${ratingClass}">
                ${isNaN(avgRating) ? 'N/A' : avgRating.toFixed(1)}
            </div>
        </div>
        <div class="player-card-stats">
            <div class="stat-row">
                <span class="stat-label">PPG</span>
                <span class="stat-value">${avg.ppg || 0}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">RPG</span>
                <span class="stat-value">${avg.rpg || 0}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">APG</span>
                <span class="stat-value">${avg.apg || 0}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">FG%</span>
                <span class="stat-value">${(player.fieldGoals?.pct || 0).toFixed(1)}%</span>
            </div>
        </div>
    `;
    
    return card;
}

function showPlayerDetail(player, season) {
    const detailSection = document.getElementById('playerDetailSection');
    const listSection = document.getElementById('playerListSection');
    const gridView = document.getElementById('playersGridView');
    
    if (!detailSection) return;
    
    // Hide list views
    listSection.style.display = 'none';
    gridView.style.display = 'none';
    detailSection.style.display = 'block';
    
    // Populate player details
    renderPlayerDetail(player, season);
}

function renderPlayerDetail(player, season) {
    const container = document.getElementById('playerDetailContent');
    if (!container) return;
    
    const rosterInfo = player.rosterInfo || {};
    const avg = player.averages || {};
    const gameRatings = player.gameRatings || [];
    
    container.innerHTML = `
        <div class="player-detail-header">
            <div class="player-detail-main">
                ${rosterInfo.jersey ? `<div class="player-detail-jersey">#${rosterInfo.jersey}</div>` : ''}
                <div>
                    <h2>${player.name}</h2>
                    <p class="player-detail-info">
                        ${rosterInfo.position || player.position || 'N/A'} • 
                        ${formatHeight(rosterInfo.height)} • 
                        ${rosterInfo.weight || 'N/A'} lbs
                        ${rosterInfo.hometown ? ` • ${rosterInfo.hometown.city}, ${rosterInfo.hometown.state}` : ''}
                    </p>
                </div>
            </div>
            <div class="player-detail-rating">
                <div class="rating-cell rating-${Math.floor(player.avgRating || 0)}">
                    ${(player.avgRating || 0).toFixed(1)}
                </div>
                <div class="rating-label">Season Rating</div>
            </div>
        </div>
        
        <div class="player-stats-grid">
            <div class="stat-card">
                <h4>Games</h4>
                <div class="stat-value">${player.games || 0}</div>
            </div>
            <div class="stat-card">
                <h4>PPG</h4>
                <div class="stat-value">${avg.ppg || 0}</div>
            </div>
            <div class="stat-card">
                <h4>RPG</h4>
                <div class="stat-value">${avg.rpg || 0}</div>
            </div>
            <div class="stat-card">
                <h4>APG</h4>
                <div class="stat-value">${avg.apg || 0}</div>
            </div>
            <div class="stat-card">
                <h4>FG%</h4>
                <div class="stat-value">${(player.fieldGoals?.pct || 0).toFixed(1)}%</div>
            </div>
            <div class="stat-card">
                <h4>3P%</h4>
                <div class="stat-value">${(player.threePointFieldGoals?.pct || 0).toFixed(1)}%</div>
            </div>
        </div>
        
        ${rosterInfo.careerStats ? renderCareerStats(rosterInfo.careerStats) : ''}
        
        <h3 class="mt-4">Game Log</h3>
        ${renderGameLog(gameRatings)}
    `;
}

function renderCareerStats(careerStats) {
    if (!careerStats || careerStats.length === 0) return '';
    
    let html = '<h3 class="mt-4">Career History</h3><div class="career-stats-table"><table class="table"><thead><tr>';
    html += '<th>Season</th><th>Team</th><th>G</th><th>PPG</th><th>RPG</th><th>APG</th><th>FG%</th><th>3P%</th></tr></thead><tbody>';
    
    careerStats.forEach(season => {
        html += `<tr>
            <td>${season.season - 1}-${season.season}</td>
            <td>${season.team}</td>
            <td>${season.games}</td>
            <td>${season.ppg}</td>
            <td>${season.rpg}</td>
            <td>${season.apg}</td>
            <td>${season.fg_pct?.toFixed(1) || '-'}%</td>
            <td>${season.three_pct?.toFixed(1) || '-'}%</td>
        </tr>`;
    });
    
    html += '</tbody></table></div>';
    return html;
}

function renderGameLog(gameRatings) {
    if (!gameRatings || gameRatings.length === 0) {
        return '<p>No game data available.</p>';
    }
    
    let html = '<div class="game-log-table"><table class="table"><thead><tr>';
    html += '<th>Date</th><th>Opponent</th><th>Result</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>Rating</th></tr></thead><tbody>';
    
    gameRatings.forEach(game => {
        const stats = game.playerStats;
        const date = new Date(game.startDate).toLocaleDateString();
        const result = game.result || '-';
        
        html += `<tr>
            <td>${date}</td>
            <td>${game.isHome ? 'vs' : '@'} ${game.opponent}</td>
            <td class="${result === 'W' ? 'text-success' : 'text-danger'}">${result}</td>
            <td>${stats.minutes}</td>
            <td>${stats.points}</td>
            <td>${(stats.rebounds?.total || 0)}</td>
            <td>${stats.assists}</td>
            <td><span class="rating-cell rating-${Math.floor(game.rating)}">${game.rating.toFixed(1)}</span></td>
        </tr>`;
    });
    
    html += '</tbody></table></div>';
    return html;
}

function showPlayerList() {
    document.getElementById('playerDetailSection').style.display = 'none';
    
    const viewPreference = sessionStorage.getItem('viewPreference') || 'table';
    if (viewPreference === 'grid') {
        document.getElementById('playersGridView').style.display = 'grid';
    } else {
        document.getElementById('playerListSection').style.display = 'block';
    }
}

function sortPlayers(players, sortKey, direction) {
    return players.sort((a, b) => {
        let aVal, bVal;
        
        switch(sortKey) {
            case 'name':
                aVal = a.name;
                bVal = b.name;
                break;
            case 'rating':
                aVal = a.avgRating || 0;
                bVal = b.avgRating || 0;
                break;
            case 'ppg':
                aVal = a.averages?.ppg || 0;
                bVal = b.averages?.ppg || 0;
                break;
            case 'rpg':
                aVal = a.averages?.rpg || 0;
                bVal = b.averages?.rpg || 0;
                break;
            case 'apg':
                aVal = a.averages?.apg || 0;
                bVal = b.averages?.apg || 0;
                break;
            default:
                aVal = a[sortKey] || 0;
                bVal = b[sortKey] || 0;
        }
        
        if (direction === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
}

function updateSortArrows(sortKey, direction) {
    document.querySelectorAll('[data-sort-key]').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
    });
    
    const activeHeader = document.querySelector(`[data-sort-key="${sortKey}"]`);
    if (activeHeader) {
        activeHeader.classList.add(`sort-${direction}`);
    }
}

function addSortEventListeners() {
    document.querySelectorAll('[data-sort-key]').forEach(header => {
        header.replaceWith(header.cloneNode(true));
    });
    
    document.querySelectorAll('[data-sort-key]').forEach(header => {
        header.addEventListener('click', function() {
            const sortKey = this.dataset.sortKey;
            if (currentSortKey === sortKey) {
                currentSortDirection = currentSortDirection === 'desc' ? 'asc' : 'desc';
            } else {
                currentSortKey = sortKey;
                currentSortDirection = 'desc';
            }
            loadPlayerStats(document.getElementById('seasonSelect').value);
        });
    });
}

function toggleView(viewType) {
    const playerListSection = document.getElementById('playerListSection');
    const playersGridView = document.getElementById('playersGridView');
    
    playerListSection.style.display = 'none';
    playersGridView.style.display = 'none';
    
    if (viewType === 'grid') {
        playersGridView.style.display = 'grid';
        sessionStorage.setItem('viewPreference', 'grid');
    } else {
        playerListSection.style.display = 'block';
        sessionStorage.setItem('viewPreference', 'table');
    }
}

function setDefaultView() {
    const gridToggle = document.getElementById('gridViewToggle');
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        gridToggle.checked = true;
        toggleView('grid');
    } else if (!sessionStorage.getItem('viewPreference')) {
        gridToggle.checked = false;
        toggleView('table');
    } else {
        const pref = sessionStorage.getItem('viewPreference');
        gridToggle.checked = pref === 'grid';
        toggleView(pref);
    }
}

function formatHeight(inches) {
    if (!inches) return 'N/A';
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}
