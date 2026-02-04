// API Configuration
const API_BASE_URL = 'https://api.collegebasketballdata.com';
const SEASON = 2026;
const TEAM = 'Kentucky';

// State
let allPlayersData = [];
let player1Data = null;
let player2Data = null;
let averagesChart = null;
let shootingChart = null;
let playingTimeChart = null;
let advancedChart = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadPlayers();
    setupEventListeners();
});

// Fetch all Kentucky players from API
async function loadPlayers() {
    try {
        showLoading('Loading players...');
        
        const response = await fetch(`${API_BASE_URL}/stats/player/season?season=${SEASON}&team=${TEAM}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        allPlayersData = await response.json();
        
        // Sort players by minutes played (descending)
        allPlayersData.sort((a, b) => b.minutes - a.minutes);
        
        populatePlayerSelects();
        hideLoading();
        
        console.log(`Loaded ${allPlayersData.length} players`);
        
    } catch (error) {
        console.error('Error loading players:', error);
        alert('Failed to load players from API. Please check your connection and try again.');
        hideLoading();
    }
}

// Populate player select dropdowns
function populatePlayerSelects() {
    const player1Select = document.getElementById('player1Select');
    const player2Select = document.getElementById('player2Select');
    
    // Clear existing options except the first one
    player1Select.innerHTML = '<option value="">Select First Player</option>';
    player2Select.innerHTML = '<option value="">Select Second Player</option>';
    
    allPlayersData.forEach(player => {
        const option1 = document.createElement('option');
        const option2 = document.createElement('option');
        
        // Use athleteSourceId as value
        option1.value = player.athleteSourceId;
        option2.value = player.athleteSourceId;
        
        // Display: Name (Position) - Games Played
        option1.textContent = `${player.name} (${player.position}) - ${player.games}G`;
        option2.textContent = `${player.name} (${player.position}) - ${player.games}G`;
        
        player1Select.appendChild(option1);
        player2Select.appendChild(option2);
    });
}

// Setup event listeners
function setupEventListeners() {
    const player1Select = document.getElementById('player1Select');
    const player2Select = document.getElementById('player2Select');
    const per30Toggle = document.getElementById('per30Toggle');
    
    player1Select.addEventListener('change', handlePlayerSelection);
    player2Select.addEventListener('change', handlePlayerSelection);
    if (per30Toggle) {
        per30Toggle.addEventListener('change', handlePlayerSelection);
    }
}

// Handle player selection
async function handlePlayerSelection() {
    const player1Id = document.getElementById('player1Select').value;
    const player2Id = document.getElementById('player2Select').value;
    
    if (player1Id && player2Id) {
        // Find players by athleteSourceId
        player1Data = allPlayersData.find(p => p.athleteSourceId === player1Id);
        player2Data = allPlayersData.find(p => p.athleteSourceId === player2Id);
        
        if (player1Data && player2Data) {
            displayComparison();
            document.getElementById('downloadBtn').style.display = 'block';
            document.querySelector('.comparison-box').style.display = 'block';
        }
    } else {
        // Clear comparison if not both selected
        document.getElementById('player1Card').innerHTML = '';
        document.getElementById('player2Card').innerHTML = '';
        document.getElementById('downloadBtn').style.display = 'none';
        document.querySelector('.comparison-box').style.display = 'none';
        destroyCharts();
    }
}

// Display player comparison
function displayComparison() {
    const per30 = document.getElementById('per30Toggle')?.checked || false;
    
    renderPlayerCard('player1Card', player1Data, player2Data, per30);
    renderPlayerCard('player2Card', player2Data, player1Data, per30);
    renderCharts(player1Data, player2Data, per30);
}

// Render individual player card
function renderPlayerCard(cardId, playerData, comparisonPlayer, per30 = false) {
    const card = document.getElementById(cardId);
    
    const gp = playerData.games;
    const mpg = playerData.minutes / gp;
    
    // Calculate per-30 multiplier if needed
    const multiplier = per30 ? (30 / mpg) : 1;
    
    card.innerHTML = `
        <div class="text-center">
            <h3 class="text-uk-blue mt-3 mb-1">${playerData.name}</h3>
            <div class="text-muted mb-3">${playerData.position} | #${playerData.athleteSourceId}</div>
            <div class="text-muted mb-1">${playerData.seasonLabel} Season</div>
            <div class="text-muted mb-3"><small>${gp} games, ${playerData.starts} starts</small></div>
            <div class="stats-box">
                ${generateStatsList(playerData, comparisonPlayer, per30, multiplier)}
            </div>
        </div>
    `;
}

// Generate stats list for a player
function generateStatsList(player, comparisonPlayer, per30, multiplier) {
    const gp = player.games;
    const mpg = player.minutes / gp;
    
    const stats = [
        { 
            label: per30 ? 'MIN (norm)' : 'MPG', 
            value: per30 ? 30 : mpg.toFixed(1),
            compValue: comparisonPlayer ? (per30 ? 30 : (comparisonPlayer.minutes / comparisonPlayer.games).toFixed(1)) : null,
            higherBetter: true
        },
        { 
            label: per30 ? 'PPer30' : 'PPG', 
            value: ((player.points / gp) * multiplier).toFixed(1),
            compValue: comparisonPlayer ? ((comparisonPlayer.points / comparisonPlayer.games) * (per30 ? (30 / (comparisonPlayer.minutes / comparisonPlayer.games)) : 1)).toFixed(1) : null,
            higherBetter: true
        },
        { 
            label: per30 ? 'RPer30' : 'RPG', 
            value: ((player.rebounds.total / gp) * multiplier).toFixed(1),
            compValue: comparisonPlayer ? ((comparisonPlayer.rebounds.total / comparisonPlayer.games) * (per30 ? (30 / (comparisonPlayer.minutes / comparisonPlayer.games)) : 1)).toFixed(1) : null,
            higherBetter: true
        },
        { 
            label: per30 ? 'APer30' : 'APG', 
            value: ((player.assists / gp) * multiplier).toFixed(1),
            compValue: comparisonPlayer ? ((comparisonPlayer.assists / comparisonPlayer.games) * (per30 ? (30 / (comparisonPlayer.minutes / comparisonPlayer.games)) : 1)).toFixed(1) : null,
            higherBetter: true
        },
        { 
            label: per30 ? 'TOPer30' : 'TOPG', 
            value: ((player.turnovers / gp) * multiplier).toFixed(1),
            compValue: comparisonPlayer ? ((comparisonPlayer.turnovers / comparisonPlayer.games) * (per30 ? (30 / (comparisonPlayer.minutes / comparisonPlayer.games)) : 1)).toFixed(1) : null,
            higherBetter: false
        },
        { 
            label: 'FG%', 
            value: player.fieldGoals.pct.toFixed(1) + '%',
            compValue: comparisonPlayer ? comparisonPlayer.fieldGoals.pct.toFixed(1) + '%' : null,
            higherBetter: true
        },
        { 
            label: '3P%', 
            value: player.threePointFieldGoals.pct.toFixed(1) + '%',
            compValue: comparisonPlayer ? comparisonPlayer.threePointFieldGoals.pct.toFixed(1) + '%' : null,
            higherBetter: true
        },
        { 
            label: 'FT%', 
            value: player.freeThrows.pct.toFixed(1) + '%',
            compValue: comparisonPlayer ? comparisonPlayer.freeThrows.pct.toFixed(1) + '%' : null,
            higherBetter: true
        },
        { 
            label: 'TS%', 
            value: (player.trueShootingPct * 100).toFixed(1) + '%',
            compValue: comparisonPlayer ? (comparisonPlayer.trueShootingPct * 100).toFixed(1) + '%' : null,
            higherBetter: true
        },
        { 
            label: per30 ? 'BPer30' : 'BPG', 
            value: ((player.blocks / gp) * multiplier).toFixed(1),
            compValue: comparisonPlayer ? ((comparisonPlayer.blocks / comparisonPlayer.games) * (per30 ? (30 / (comparisonPlayer.minutes / comparisonPlayer.games)) : 1)).toFixed(1) : null,
            higherBetter: true
        },
        { 
            label: per30 ? 'SPer30' : 'SPG', 
            value: ((player.steals / gp) * multiplier).toFixed(1),
            compValue: comparisonPlayer ? ((comparisonPlayer.steals / comparisonPlayer.games) * (per30 ? (30 / (comparisonPlayer.minutes / comparisonPlayer.games)) : 1)).toFixed(1) : null,
            higherBetter: true
        },
        { 
            label: 'ORTG', 
            value: player.offensiveRating.toFixed(1),
            compValue: comparisonPlayer ? comparisonPlayer.offensiveRating.toFixed(1) : null,
            higherBetter: true
        },
        { 
            label: 'DRTG', 
            value: player.defensiveRating.toFixed(1),
            compValue: comparisonPlayer ? comparisonPlayer.defensiveRating.toFixed(1) : null,
            higherBetter: false
        },
        { 
            label: 'NET', 
            value: player.netRating > 0 ? '+' + player.netRating.toFixed(1) : player.netRating.toFixed(1),
            compValue: comparisonPlayer ? (comparisonPlayer.netRating > 0 ? '+' + comparisonPlayer.netRating.toFixed(1) : comparisonPlayer.netRating.toFixed(1)) : null,
            higherBetter: true
        },
        { 
            label: 'USG%', 
            value: player.usage.toFixed(1) + '%',
            compValue: comparisonPlayer ? comparisonPlayer.usage.toFixed(1) + '%' : null,
            higherBetter: true
        },
        { 
            label: 'WS', 
            value: player.winShares.total.toFixed(1),
            compValue: comparisonPlayer ? comparisonPlayer.winShares.total.toFixed(1) : null,
            higherBetter: true
        }
    ];
    
    return stats.map(stat => {
        const isHigher = stat.compValue ? isStatHigher(stat.value, stat.compValue, stat.higherBetter) : false;
        
        return `
            <div class="stat-row">
                <div class="stat-label">${stat.label}</div>
                <div class="stat-value ${isHigher ? 'higher-stat highlight-better' : ''}">${stat.value}</div>
            </div>
        `;
    }).join('');
}

// Check if stat is higher (better)
function isStatHigher(value, comparisonValue, higherBetter) {
    const cleanValue = parseFloat(value.toString().replace(/[%+]/g, ''));
    const cleanCompValue = parseFloat(comparisonValue.toString().replace(/[%+]/g, ''));
    
    if (isNaN(cleanValue) || isNaN(cleanCompValue)) return false;
    
    if (higherBetter) {
        return cleanValue > cleanCompValue;
    } else {
        return cleanValue < cleanCompValue;
    }
}

// Render comparison charts
function renderCharts(player1, player2, per30 = false) {
    destroyCharts();
    
    const p1Games = player1.games;
    const p2Games = player2.games;
    
    const p1Mpg = player1.minutes / p1Games;
    const p2Mpg = player2.minutes / p2Games;
    
    const p1Mult = per30 ? (30 / p1Mpg) : 1;
    const p2Mult = per30 ? (30 / p2Mpg) : 1;
    
    // Averages Chart
    const ctx1 = document.getElementById('averagesChart')?.getContext('2d');
    if (ctx1) {
        averagesChart = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: ['Points', 'Rebounds', 'Assists', 'Steals', 'Blocks'],
                datasets: [{
                    label: player1.name,
                    data: [
                        (player1.points / p1Games) * p1Mult,
                        (player1.rebounds.total / p1Games) * p1Mult,
                        (player1.assists / p1Games) * p1Mult,
                        (player1.steals / p1Games) * p1Mult,
                        (player1.blocks / p1Games) * p1Mult
                    ],
                    backgroundColor: 'rgba(0, 51, 160, 0.8)',
                    borderColor: 'rgba(0, 51, 160, 1)',
                    borderWidth: 2
                }, {
                    label: player2.name,
                    data: [
                        (player2.points / p2Games) * p2Mult,
                        (player2.rebounds.total / p2Games) * p2Mult,
                        (player2.assists / p2Games) * p2Mult,
                        (player2.steals / p2Games) * p2Mult,
                        (player2.blocks / p2Games) * p2Mult
                    ],
                    backgroundColor: 'rgba(128, 128, 128, 0.8)',
                    borderColor: 'rgba(128, 128, 128, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: per30 ? 'Per-30-Minute Averages' : 'Per Game Averages',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Shooting Chart
    const ctx2 = document.getElementById('shootingChart')?.getContext('2d');
    if (ctx2) {
        shootingChart = new Chart(ctx2, {
            type: 'radar',
            data: {
                labels: ['FG%', '2P%', '3P%', 'FT%', 'eFG%'],
                datasets: [{
                    label: player1.name,
                    data: [
                        player1.fieldGoals.pct,
                        player1.twoPointFieldGoals.pct,
                        player1.threePointFieldGoals.pct,
                        player1.freeThrows.pct,
                        player1.effectiveFieldGoalPct
                    ],
                    backgroundColor: 'rgba(0, 51, 160, 0.2)',
                    borderColor: 'rgba(0, 51, 160, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(0, 51, 160, 1)'
                }, {
                    label: player2.name,
                    data: [
                        player2.fieldGoals.pct,
                        player2.twoPointFieldGoals.pct,
                        player2.threePointFieldGoals.pct,
                        player2.freeThrows.pct,
                        player2.effectiveFieldGoalPct
                    ],
                    backgroundColor: 'rgba(128, 128, 128, 0.2)',
                    borderColor: 'rgba(128, 128, 128, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(128, 128, 128, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Shooting Percentages',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20
                        }
                    }
                }
            }
        });
    }
    
    // Playing Time Chart
    const ctx3 = document.getElementById('playingTimeChart')?.getContext('2d');
    if (ctx3) {
        playingTimeChart = new Chart(ctx3, {
            type: 'bar',
            data: {
                labels: ['Games', 'Starts', 'Total Minutes', 'Min/Game'],
                datasets: [{
                    label: player1.name,
                    data: [
                        player1.games,
                        player1.starts,
                        player1.minutes,
                        player1.minutes / player1.games
                    ],
                    backgroundColor: 'rgba(0, 51, 160, 0.8)',
                    borderColor: 'rgba(0, 51, 160, 1)',
                    borderWidth: 2
                }, {
                    label: player2.name,
                    data: [
                        player2.games,
                        player2.starts,
                        player2.minutes,
                        player2.minutes / player2.games
                    ],
                    backgroundColor: 'rgba(128, 128, 128, 0.8)',
                    borderColor: 'rgba(128, 128, 128, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Playing Time',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Advanced Stats Chart
    const ctx4 = document.getElementById('advancedChart')?.getContext('2d');
    if (ctx4) {
        advancedChart = new Chart(ctx4, {
            type: 'bar',
            data: {
                labels: ['Off Rating', 'Net Rating', 'Usage%', 'TS%', 'Win Shares'],
                datasets: [{
                    label: player1.name,
                    data: [
                        player1.offensiveRating,
                        player1.netRating,
                        player1.usage,
                        player1.trueShootingPct * 100,
                        player1.winShares.total
                    ],
                    backgroundColor: 'rgba(0, 51, 160, 0.8)',
                    borderColor: 'rgba(0, 51, 160, 1)',
                    borderWidth: 2
                }, {
                    label: player2.name,
                    data: [
                        player2.offensiveRating,
                        player2.netRating,
                        player2.usage,
                        player2.trueShootingPct * 100,
                        player2.winShares.total
                    ],
                    backgroundColor: 'rgba(128, 128, 128, 0.8)',
                    borderColor: 'rgba(128, 128, 128, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Advanced Statistics',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Destroy existing charts
function destroyCharts() {
    if (averagesChart) {
        averagesChart.destroy();
        averagesChart = null;
    }
    if (shootingChart) {
        shootingChart.destroy();
        shootingChart = null;
    }
    if (playingTimeChart) {
        playingTimeChart.destroy();
        playingTimeChart = null;
    }
    if (advancedChart) {
        advancedChart.destroy();
        advancedChart = null;
    }
}

// Download comparison as PDF
function downloadComparison() {
    window.print();
}

// Show loading indicator
function showLoading(message = 'Loading...') {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 10px; text-align: center;">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 mb-0" id="loadingMessage">${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    } else {
        overlay.style.display = 'flex';
        document.getElementById('loadingMessage').textContent = message;
    }
}

// Hide loading indicator
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}
