// Enhanced boxscore.js with team colors and proper data handling
let gameLogsData = null;
let teamInfoData = null;
let currentGame = null;
let currentSortCol = null;
let currentSortDir = 'desc';

document.addEventListener('DOMContentLoaded', async function() {
    await loadGameLogs();
    await loadTeamInfo();
    loadBoxScore();
});

async function loadGameLogs() {
    try {
        const response = await fetch('../data/gamelog.json');
        if (!response.ok) throw new Error('Failed to load game logs');
        gameLogsData = await response.json();
    } catch (error) {
        console.error('Error loading game logs:', error);
        showError('Failed to load game data: ' + error.message);
    }
}

async function loadTeamInfo() {
    try {
        const response = await fetch('../data/teaminfo.json');
        if (!response.ok) throw new Error('Failed to load team info');
        teamInfoData = await response.json();
    } catch (error) {
        console.error('Error loading team info:', error);
    }
}

function loadBoxScore() {
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('gameId');
    let season = urlParams.get('season');
    const opponent = urlParams.get('opponent');
    const date = urlParams.get('date');
    
    if (!gameId && !opponent && !date) {
        showError('No game specified');
        return;
    }
    
    if (!gameLogsData) {
        setTimeout(loadBoxScore, 100);
        return;
    }
    
    if (date) {
        season = getSeasonFromDate(date);
    }
    
    let game = null;
    if (gameId) {
        game = findGameById(parseInt(gameId));
    } else if (date && season) {
        game = findGameByDate(date, season);
        if (!game) {
            const [y, m, d] = date.split('-');
            const alt = parseInt(m) >= 7 ? `${parseInt(y)-1}-${m}-${d}` : date;
            game = findGameByDate(alt, season);
        }
    }
    
    if (!game) {
        showError('Game not found');
        return;
    }
    
    currentGame = game;
    renderBoxScore(game);
}

function getSeasonFromDate(dateStr) {
    const [year, month] = dateStr.split('-').map(Number);
    return month >= 7 ? `${year + 1}` : `${year}`;
}

function findGameById(gameId) {
    for (const seasonKey in gameLogsData.seasons) {
        const game = gameLogsData.seasons[seasonKey].games.find(g => g.gameId === gameId);
        if (game) return game;
    }
    return null;
}

function findGameByDate(dateStr, seasonKey) {
    const seasonData = gameLogsData.seasons[seasonKey];
    if (!seasonData) return null;
    return seasonData.games.find(g => g.startDate.split('T')[0] === dateStr);
}

function getTeamColors(teamName) {
    if (!teamInfoData) return { primary: '#dc3545', secondary: '#721c24' };
    
    const team = teamInfoData.find(t => 
        t.school.toLowerCase() === teamName.toLowerCase() ||
        t.displayName.toLowerCase().includes(teamName.toLowerCase())
    );
    
    return team && team.primaryColor ? {
        primary: `#${team.primaryColor}`,
        secondary: `#${team.secondaryColor || team.primaryColor}`
    } : { primary: '#dc3545', secondary: '#721c24' };
}

function renderBoxScore(game) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('boxscore-content').style.display = 'block';
    
    const opponentColors = getTeamColors(game.opponent);
    document.documentElement.style.setProperty('--opponent-primary', opponentColors.primary);
    
    // Header
    document.getElementById('opponent-name').textContent = `${game.isHome ? 'vs' : '@'} ${game.opponent}`;
    document.getElementById('game-date').textContent = new Date(game.startDate).toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    const ukScore = game.teamStats?.points?.total || 0;
    const oppScore = game.opponentStats?.points?.total || 0;
    const result = ukScore > oppScore ? 'W' : 'L';
    
    document.getElementById('game-result').textContent = `${result} ${ukScore}-${oppScore}`;
    document.getElementById('game-result').style.color = result === 'W' ? '#28a745' : '#dc3545';
    document.getElementById('game-location').textContent = game.neutralSite ? 'Neutral Site' : (game.isHome ? 'Rupp Arena' : 'Away');
    document.getElementById('game-type').textContent = game.conferenceGame ? 'Conference Game' : 'Non-Conference';
    
    renderPeriodScoring(game);
    renderTeamComparison(game, opponentColors);
    renderPointsBreakdown(game);
    renderFourFactors(game, opponentColors);
    renderPlayerStats(game.players || []);
    renderTeamShooting(game, opponentColors);
    renderReboundingBreakdown(game, opponentColors);
    renderTurnoversAndFouls(game, opponentColors);
    renderGameFlow(game, opponentColors);
    
    setupSorting();
}

function renderPeriodScoring(game) {
    const container = document.getElementById('periodScoring');
    
    if (!game.periodScores || game.periodScores.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Period scoring data not available</p>';
        return;
    }
    
    let html = '<div class="period-scoring">';
    game.periodScores.forEach(period => {
        html += `
            <div class="period-box">
                <div class="period-label">${period.period}</div>
                <div class="period-scores">
                    <div style="color: #0033A0; font-weight: bold;">${period.kentucky || 0}</div>
                    <div style="color: #666;">-</div>
                    <div style="color: var(--opponent-primary); font-weight: bold;">${period.opponent || 0}</div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderTeamComparison(game, opponentColors) {
    const container = document.getElementById('teamComparison');
    const uk = game.teamStats || {};
    const opp = game.opponentStats || {};
    
    const stats = [
        { name: 'Field Goals', uk: uk.fieldGoals?.made || 0, opp: opp.fieldGoals?.made || 0 },
        { name: 'Three Pointers', uk: uk.threePointFieldGoals?.made || 0, opp: opp.threePointFieldGoals?.made || 0 },
        { name: 'Free Throws', uk: uk.freeThrows?.made || 0, opp: opp.freeThrows?.made || 0 },
        { name: 'Rebounds', uk: uk.rebounds?.total || 0, opp: opp.rebounds?.total || 0 },
        { name: 'Assists', uk: uk.assists || 0, opp: opp.assists || 0 },
        { name: 'Steals', uk: uk.steals || 0, opp: opp.steals || 0 },
        { name: 'Blocks', uk: uk.blocks || 0, opp: opp.blocks || 0 },
        { name: 'Turnovers', uk: uk.turnovers || 0, opp: opp.turnovers || 0 }
    ];
    
    let html = '';
    stats.forEach(s => {
        const total = s.uk + s.opp || 1;
        html += `
            <div class="stat-comparison">
                <div class="stat-name">${s.name}</div>
                <div class="stat-bar-container">
                    <div class="stat-bar-kentucky" style="width: ${(s.uk/total*100)}%">${s.uk}</div>
                    <div class="stat-bar-opponent" style="width: ${(s.opp/total*100)}%; background: ${opponentColors.primary}">${s.opp}</div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderPointsBreakdown(game) {
    const pts = game.teamStats?.points || {};
    document.getElementById('pointsBreakdown').innerHTML = `
        <div class="points-breakdown">
            <div class="breakdown-card">
                <div class="breakdown-label">Points in Paint</div>
                <div class="breakdown-value">${pts.paint || 0}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">Fast Break Points</div>
                <div class="breakdown-value">${pts.fastBreak || 0}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">Bench Points</div>
                <div class="breakdown-value">${pts.bench || 0}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">Second Chance</div>
                <div class="breakdown-value">${pts.secondChance || 0}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">Points Off Turnovers</div>
                <div class="breakdown-value">${pts.offTurnovers || 0}</div>
            </div>
        </div>
    `;
}

function renderFourFactors(game, opponentColors) {
    const uk = game.teamStats || {};
    const opp = game.opponentStats || {};
    
    const ukEFG = calculateEFG(uk);
    const oppEFG = calculateEFG(opp);
    const ukTOV = calculateTOVPct(uk);
    const oppTOV = calculateTOVPct(opp);
    const ukORB = calculateORBPct(uk, opp);
    const oppORB = calculateORBPct(opp, uk);
    const ukFTRate = calculateFTRate(uk);
    const oppFTRate = calculateFTRate(opp);
    
    document.getElementById('fourFactorsComparison').innerHTML = `
        <div class="four-factors-grid">
            <div class="factor-comparison">
                <div class="factor-name">Effective FG%</div>
                <div class="factor-values">
                    <span class="factor-uk">${ukEFG}%</span>
                    <span class="factor-opp" style="color: ${opponentColors.primary}">${oppEFG}%</span>
                </div>
            </div>
            <div class="factor-comparison">
                <div class="factor-name">Turnover Rate</div>
                <div class="factor-values">
                    <span class="factor-uk">${ukTOV}%</span>
                    <span class="factor-opp" style="color: ${opponentColors.primary}">${oppTOV}%</span>
                </div>
            </div>
            <div class="factor-comparison">
                <div class="factor-name">Off. Rebound %</div>
                <div class="factor-values">
                    <span class="factor-uk">${ukORB}%</span>
                    <span class="factor-opp" style="color: ${opponentColors.primary}">${oppORB}%</span>
                </div>
            </div>
            <div class="factor-comparison">
                <div class="factor-name">FT Rate</div>
                <div class="factor-values">
                    <span class="factor-uk">${ukFTRate}</span>
                    <span class="factor-opp" style="color: ${opponentColors.primary}">${oppFTRate}</span>
                </div>
            </div>
        </div>
    `;
}

function calculateEFG(stats) {
    const fgm = stats.fieldGoals?.made || 0;
    const fga = stats.fieldGoals?.attempted || 0;
    const tpm = stats.threePointFieldGoals?.made || 0;
    return fga === 0 ? '0.0' : ((fgm + 0.5 * tpm) / fga * 100).toFixed(1);
}

function calculateTOVPct(stats) {
    const tov = stats.turnovers || 0;
    const fga = stats.fieldGoals?.attempted || 0;
    const fta = stats.freeThrows?.attempted || 0;
    const poss = fga + 0.44 * fta + tov;
    return poss === 0 ? '0.0' : (tov / poss * 100).toFixed(1);
}

function calculateORBPct(teamStats, oppStats) {
    const orb = teamStats.rebounds?.offensive || 0;
    const oppDrb = oppStats.rebounds?.defensive || 0;
    const total = orb + oppDrb;
    return total === 0 ? '0.0' : (orb / total * 100).toFixed(1);
}

function calculateFTRate(stats) {
    const fta = stats.freeThrows?.attempted || 0;
    const fga = stats.fieldGoals?.attempted || 0;
    return fga === 0 ? '0.00' : (fta / fga).toFixed(2);
}

function renderTeamShooting(game, opponentColors) {
    const uk = game.teamStats || {};
    const opp = game.opponentStats || {};
    
    document.getElementById('teamShooting').innerHTML = `
        <div class="points-breakdown">
            <div class="breakdown-card">
                <div class="breakdown-label">Kentucky FG%</div>
                <div class="breakdown-value">${(uk.fieldGoals?.pct || 0).toFixed(1)}%</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">Kentucky 3PT%</div>
                <div class="breakdown-value">${(uk.threePointFieldGoals?.pct || 0).toFixed(1)}%</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">Kentucky FT%</div>
                <div class="breakdown-value">${(uk.freeThrows?.pct || 0).toFixed(1)}%</div>
            </div>
            <div class="breakdown-card" style="border-top: 4px solid ${opponentColors.primary}">
                <div class="breakdown-label">Opponent FG%</div>
                <div class="breakdown-value" style="color: ${opponentColors.primary}">${(opp.fieldGoals?.pct || 0).toFixed(1)}%</div>
            </div>
            <div class="breakdown-card" style="border-top: 4px solid ${opponentColors.primary}">
                <div class="breakdown-label">Opponent 3PT%</div>
                <div class="breakdown-value" style="color: ${opponentColors.primary}">${(opp.threePointFieldGoals?.pct || 0).toFixed(1)}%</div>
            </div>
            <div class="breakdown-card" style="border-top: 4px solid ${opponentColors.primary}">
                <div class="breakdown-label">Opponent FT%</div>
                <div class="breakdown-value" style="color: ${opponentColors.primary}">${(opp.freeThrows?.pct || 0).toFixed(1)}%</div>
            </div>
        </div>
    `;
}

function renderReboundingBreakdown(game, opponentColors) {
    const uk = game.teamStats || {};
    const opp = game.opponentStats || {};
    
    document.getElementById('reboundingBreakdown').innerHTML = `
        <div class="points-breakdown">
            <div class="breakdown-card">
                <div class="breakdown-label">UK Offensive Rebounds</div>
                <div class="breakdown-value">${uk.rebounds?.offensive || 0}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">UK Defensive Rebounds</div>
                <div class="breakdown-value">${uk.rebounds?.defensive || 0}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">UK Total Rebounds</div>
                <div class="breakdown-value">${uk.rebounds?.total || 0}</div>
            </div>
            <div class="breakdown-card" style="border-top: 4px solid ${opponentColors.primary}">
                <div class="breakdown-label">OPP Offensive Rebounds</div>
                <div class="breakdown-value" style="color: ${opponentColors.primary}">${opp.rebounds?.offensive || 0}</div>
            </div>
            <div class="breakdown-card" style="border-top: 4px solid ${opponentColors.primary}">
                <div class="breakdown-label">OPP Defensive Rebounds</div>
                <div class="breakdown-value" style="color: ${opponentColors.primary}">${opp.rebounds?.defensive || 0}</div>
            </div>
            <div class="breakdown-card" style="border-top: 4px solid ${opponentColors.primary}">
                <div class="breakdown-label">OPP Total Rebounds</div>
                <div class="breakdown-value" style="color: ${opponentColors.primary}">${opp.rebounds?.total || 0}</div>
            </div>
        </div>
    `;
}

function renderTurnoversAndFouls(game, opponentColors) {
    const uk = game.teamStats || {};
    const opp = game.opponentStats || {};
    
    const ukTov = typeof uk.turnovers === 'object' ? uk.turnovers.total || 0 : (uk.turnovers || 0);
    const ukFouls = typeof uk.fouls === 'object' ? uk.fouls.total || 0 : (uk.fouls || 0);
    const oppTov = typeof opp.turnovers === 'object' ? opp.turnovers.total || 0 : (opp.turnovers || 0);
    const oppFouls = typeof opp.fouls === 'object' ? opp.fouls.total || 0 : (opp.fouls || 0);
    
    document.getElementById('turnoversAndFouls').innerHTML = `
        <div class="points-breakdown">
            <div class="breakdown-card">
                <div class="breakdown-label">UK Turnovers</div>
                <div class="breakdown-value">${ukTov}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">UK Personal Fouls</div>
                <div class="breakdown-value">${ukFouls}</div>
            </div>
            <div class="breakdown-card" style="border-top: 4px solid ${opponentColors.primary}">
                <div class="breakdown-label">OPP Turnovers</div>
                <div class="breakdown-value" style="color: ${opponentColors.primary}">${oppTov}</div>
            </div>
            <div class="breakdown-card" style="border-top: 4px solid ${opponentColors.primary}">
                <div class="breakdown-label">OPP Personal Fouls</div>
                <div class="breakdown-value" style="color: ${opponentColors.primary}">${oppFouls}</div>
            </div>
        </div>
    `;
}

function renderGameFlow(game, opponentColors) {
    const uk = game.teamStats || {};
    const opp = game.opponentStats || {};
    const pace = uk.pace || 0;
    const poss = uk.possessions || 0;
    
    document.getElementById('gameFlow').innerHTML = `
        <div class="points-breakdown">
            <div class="breakdown-card">
                <div class="breakdown-label">Pace</div>
                <div class="breakdown-value">${typeof pace === 'number' ? pace.toFixed(1) : '0.0'}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">Possessions</div>
                <div class="breakdown-value">${poss}</div>
            </div>
            <div class="breakdown-card">
                <div class="breakdown-label">UK Efficiency</div>
                <div class="breakdown-value">${poss > 0 ? ((uk.points?.total || 0) / poss * 100).toFixed(1) : '0.0'}</div>
            </div>
            <div class="breakdown-card" style="border-top: 4px solid ${opponentColors.primary}">
                <div class="breakdown-label">OPP Efficiency</div>
                <div class="breakdown-value" style="color: ${opponentColors.primary}">${poss > 0 ? ((opp.points?.total || 0) / poss * 100).toFixed(1) : '0.0'}</div>
            </div>
        </div>
    `;
}

function renderPlayerStats(players) {
    const tbody = document.getElementById('player-stats');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!players || players.length === 0) {
        tbody.innerHTML = '<tr><td colspan="25" style="text-align: center; padding: 2rem; color: #666;">No player data available</td></tr>';
        return;
    }
    
    const sorted = [...players].sort((a, b) => (b.minutes || 0) - (a.minutes || 0));
    const starters = sorted.filter(p => p.starter);
    const bench = sorted.filter(p => !p.starter);
    
    starters.forEach(p => tbody.appendChild(createPlayerRow(p, true)));
    
    if (bench.length > 0 && starters.length > 0) {
        const sep = document.createElement('tr');
        sep.className = 'bench-separator';
        sep.innerHTML = '<td colspan="25" style="background: #f0f0f0; font-weight: bold; padding: 8px; text-align: center;">BENCH</td>';
        tbody.appendChild(sep);
    }
    
    bench.forEach(p => tbody.appendChild(createPlayerRow(p, false)));
    tbody.appendChild(createTeamTotalsRow(players));
}

function createPlayerRow(player, isStarter) {
    const row = document.createElement('tr');
    row.className = isStarter ? 'starter-row' : 'bench-row';
    
    const reb = player.rebounds || {};
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
    
    row.innerHTML = `
        <td class="player-name">${player.name}${isStarter ? ' *' : ''}</td>
        <td>${player.minutes || 0}</td>
        <td><strong>${player.points || 0}</strong></td>
        <td>${(reb.offensive || 0) + (reb.defensive || 0)}</td>
        <td>${reb.offensive || 0}</td>
        <td>${reb.defensive || 0}</td>
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
        <td>${(player.offensiveRating || 0).toFixed(1)}</td>
        <td>${(player.defensiveRating || 0).toFixed(1)}</td>
        <td>${(player.plusMinus || 0) > 0 ? '+' : ''}${player.plusMinus || 0}</td>
        <td>${(player.usageRate || 0).toFixed(1)}%</td>
        <td>${(player.gameScore || rating).toFixed(1)}</td>
        <td><span class="rating-cell ${ratingClass}">${rating.toFixed(1)}</span></td>
    `;
    
    return row;
}

function createTeamTotalsRow(players) {
    const row = document.createElement('tr');
    row.className = 'team-totals-row';
    
    const t = { pts: 0, reb: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, fgm: 0, fga: 0, twopm: 0, twopa: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0 };
    
    players.forEach(p => {
        t.pts += p.points || 0;
        t.oreb += p.rebounds?.offensive || 0;
        t.dreb += p.rebounds?.defensive || 0;
        t.reb += (p.rebounds?.offensive || 0) + (p.rebounds?.defensive || 0);
        t.ast += p.assists || 0;
        t.stl += p.steals || 0;
        t.blk += p.blocks || 0;
        t.tov += p.turnovers || 0;
        t.pf += p.fouls || 0;
        t.fgm += p.fieldGoals?.made || 0;
        t.fga += p.fieldGoals?.attempted || 0;
        t.twopm += p.twoPointFieldGoals?.made || 0;
        t.twopa += p.twoPointFieldGoals?.attempted || 0;
        t.tpm += p.threePointFieldGoals?.made || 0;
        t.tpa += p.threePointFieldGoals?.attempted || 0;
        t.ftm += p.freeThrows?.made || 0;
        t.fta += p.freeThrows?.attempted || 0;
    });
    
    row.innerHTML = `
        <td class="player-name"><strong>TEAM TOTALS</strong></td>
        <td>-</td>
        <td><strong>${t.pts}</strong></td>
        <td>${t.reb}</td>
        <td>${t.oreb}</td>
        <td>${t.dreb}</td>
        <td>${t.ast}</td>
        <td>${t.stl}</td>
        <td>${t.blk}</td>
        <td>${t.tov}</td>
        <td>${t.pf}</td>
        <td>${t.fgm}-${t.fga}</td>
        <td>${t.fga > 0 ? (t.fgm/t.fga*100).toFixed(1) : '0.0'}%</td>
        <td>${t.twopm}-${t.twopa}</td>
        <td>${t.twopa > 0 ? (t.twopm/t.twopa*100).toFixed(1) : '0.0'}%</td>
        <td>${t.tpm}-${t.tpa}</td>
        <td>${t.tpa > 0 ? (t.tpm/t.tpa*100).toFixed(1) : '0.0'}%</td>
        <td>${t.ftm}-${t.fta}</td>
        <td>${t.fta > 0 ? (t.ftm/t.fta*100).toFixed(1) : '0.0'}%</td>
        <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
    `;
    
    return row;
}

function calculatePlayerRating(player) {
    const { points = 0, rebounds = {}, assists = 0, steals = 0, blocks = 0, turnovers = 0, fouls = 0, fieldGoals = {}, freeThrows = {}, minutes = 0 } = player;
    
    if (minutes === 0) return 0;
    
    const gameScore = points + (0.4 * (fieldGoals.made || 0)) - (0.7 * (fieldGoals.attempted || 0)) - 
        (0.4 * ((freeThrows.attempted || 0) - (freeThrows.made || 0))) + 
        (0.7 * (rebounds.offensive || 0)) + (0.3 * (rebounds.defensive || 0)) + 
        steals + (0.7 * assists) + (0.7 * blocks) - (0.4 * fouls) - turnovers;
    
    return Math.max(0, Math.min(10, gameScore / 3));
}

function setupSorting() {
    document.querySelectorAll('.boxscore-table th[data-sort]').forEach(header => {
        header.style.cursor = 'pointer';
        header.addEventListener('click', () => sortTable(header.dataset.sort));
    });
}

function sortTable(sortKey) {
    if (!currentGame || !currentGame.players) return;
    
    const tbody = document.getElementById('player-stats');
    const rows = Array.from(tbody.querySelectorAll('tr:not(.bench-separator):not(.team-totals-row)'));
    
    if (currentSortCol === sortKey) {
        currentSortDir = currentSortDir === 'desc' ? 'asc' : 'desc';
    } else {
        currentSortCol = sortKey;
        currentSortDir = 'desc';
    }
    
    rows.sort((a, b) => {
        const aText = a.cells[getColumnIndex(sortKey)]?.textContent || '';
        const bText = b.cells[getColumnIndex(sortKey)]?.textContent || '';
        
        let aVal, bVal;
        if (sortKey !== 'player') {
            aVal = parseFloat(aText.replace(/[^0-9.-]/g, '')) || 0;
            bVal = parseFloat(bText.replace(/[^0-9.-]/g, '')) || 0;
        } else {
            aVal = aText;
            bVal = bText;
        }
        
        return currentSortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
    tbody.appendChild(createTeamTotalsRow(currentGame.players));
    
    updateSortIndicators(sortKey);
}

function getColumnIndex(sortKey) {
    const map = {
        'player': 0, 'min': 1, 'pts': 2, 'reb': 3, 'orb': 4, 'drb': 5,
        'ast': 6, 'stl': 7, 'blk': 8, 'to': 9, 'pf': 10, 'fg': 11,
        'fg_pct': 12, 'two': 13, 'two_pct': 14, 'three': 15, 'three_pct': 16,
        'ft': 17, 'ft_pct': 18, 'ortg': 19, 'drtg': 20, 'nrtg': 21,
        'usg': 22, 'gs': 23, 'rating': 24
    };
    return map[sortKey] || 0;
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
