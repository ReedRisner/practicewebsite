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
        showError('Failed to load players from API. Please check your connection and try again.');
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
    const player1Season = document.getElementById('player1Season');
    const player2Season = document.getElementById('player2Season');
    const player1Filter = document.getElementById('player1Filter');
    const player2Filter = document.getElementById('player2Filter');
    const per30Toggle = document.getElementById('per30Toggle');
    
    player1Select.addEventListener('change', handlePlayerSelection);
    player2Select.addEventListener('change', handlePlayerSelection);
    player1Season.addEventListener('change', handlePlayerSelection);
    player2Season.addEventListener('change', handlePlayerSelection);
    player1Filter.addEventListener('change', handlePlayerSelection);
    player2Filter.addEventListener('change', handlePlayerSelection);
    per30Toggle.addEventListener('change', handlePlayerSelection);
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
        }
    } else {
        // Clear comparison if not both selected
        document.getElementById('player1Card').innerHTML = '';
        document.getElementById('player2Card').innerHTML = '';
        document.getElementById('downloadBtn').style.display = 'none';
        destroyCharts();
    }
}

// Display player comparison
function displayComparison() {
    const per30 = document.getElementById('per30Toggle').checked;
    
    renderPlayerCard('player1Card', player1Data, per30);
    renderPlayerCard('player2Card', player2Data, per30);
    renderCharts(player1Data, player2Data, per30);
}

// Render individual player card
function renderPlayerCard(cardId, playerData, per30 = false) {
    const card = document.getElementById(cardId);
    
    const multiplier = per30 ? (30 / playerData.minutes * playerData.games) : 1;
    
    card.innerHTML = `
        <div class="card h-100">
            <div class="card-header bg-primary text-white">
                <h3 class="mb-0">${playerData.name}</h3>
                <p class="mb-0">${playerData.position} | #${playerData.athleteSourceId}</p>
            </div>
            <div class="card-body">
                <div class="stats-grid">
                    <div class="stat-category">
                        <h5>Season Overview</h5>
                        <div class="stat-row">
                            <span class="stat-label">Games Played</span>
                            <span class="stat-value">${playerData.games}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Starts</span>
                            <span class="stat-value">${playerData.starts}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Minutes</span>
                            <span class="stat-value">${playerData.minutes}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Minutes/Game</span>
                            <span class="stat-value">${(playerData.minutes / playerData.games).toFixed(1)}</span>
                        </div>
                    </div>

                    <div class="stat-category">
                        <h5>Scoring ${per30 ? '(Per 30 min)' : '(Total)'}</h5>
                        <div class="stat-row ${getHighlightClass('points', playerData, player1Data === playerData ? player2Data : player1Data)}">
                            <span class="stat-label">Points</span>
                            <span class="stat-value">${per30 ? (playerData.points * multiplier).toFixed(1) : playerData.points}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Points/Game</span>
                            <span class="stat-value">${(playerData.points / playerData.games).toFixed(1)}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">FG%</span>
                            <span class="stat-value">${playerData.fieldGoals.pct.toFixed(1)}%</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">3P%</span>
                            <span class="stat-value">${playerData.threePointFieldGoals.pct.toFixed(1)}%</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">FT%</span>
                            <span class="stat-value">${playerData.freeThrows.pct.toFixed(1)}%</span>
                        </div>
                    </div>

                    <div class="stat-category">
                        <h5>Per Game Averages</h5>
                        <div class="stat-row ${getHighlightClass('rebounds', playerData, player1Data === playerData ? player2Data : player1Data)}">
                            <span class="stat-label">Rebounds</span>
                            <span class="stat-value">${(playerData.rebounds.total / playerData.games).toFixed(1)}</span>
                        </div>
                        <div class="stat-row ${getHighlightClass('assists', playerData, player1Data === playerData ? player2Data : player1Data)}">
                            <span class="stat-label">Assists</span>
                            <span class="stat-value">${(playerData.assists / playerData.games).toFixed(1)}</span>
                        </div>
                        <div class="stat-row ${getHighlightClass('steals', playerData, player1Data === playerData ? player2Data : player1Data)}">
                            <span class="stat-label">Steals</span>
                            <span class="stat-value">${(playerData.steals / playerData.games).toFixed(1)}</span>
                        </div>
                        <div class="stat-row ${getHighlightClass('blocks', playerData, player1Data === playerData ? player2Data : player1Data)}">
                            <span class="stat-label">Blocks</span>
                            <span class="stat-value">${(playerData.blocks / playerData.games).toFixed(1)}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Turnovers</span>
                            <span class="stat-value">${(playerData.turnovers / playerData.games).toFixed(1)}</span>
                        </div>
                    </div>

                    <div class="stat-category">
                        <h5>Advanced Stats</h5>
                        <div class="stat-row ${getHighlightClass('offensiveRating', playerData, player1Data === playerData ? player2Data : player1Data)}">
                            <span class="stat-label">Offensive Rating</span>
                            <span class="stat-value">${playerData.offensiveRating.toFixed(1)}</span>
                        </div>
                        <div class="stat-row ${getHighlightClass('defensiveRating', playerData, player1Data === playerData ? player2Data : player1Data, true)}">
                            <span class="stat-label">Defensive Rating</span>
                            <span class="stat-value">${playerData.defensiveRating.toFixed(1)}</span>
                        </div>
                        <div class="stat-row ${getHighlightClass('netRating', playerData, player1Data === playerData ? player2Data : player1Data)}">
                            <span class="stat-label">Net Rating</span>
                            <span class="stat-value">${playerData.netRating > 0 ? '+' : ''}${playerData.netRating.toFixed(1)}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Usage Rate</span>
                            <span class="stat-value">${playerData.usage.toFixed(1)}%</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">True Shooting%</span>
                            <span class="stat-value">${(playerData.trueShootingPct * 100).toFixed(1)}%</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Assist/TO Ratio</span>
                            <span class="stat-value">${playerData.assistsTurnoverRatio.toFixed(2)}</span>
                        </div>
                        <div class="stat-row ${getHighlightClass('winShares', playerData, player1Data === playerData ? player2Data : player1Data)}">
                            <span class="stat-label">Win Shares</span>
                            <span class="stat-value">${playerData.winShares.total.toFixed(1)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Get highlight class for better player (green) or worse player (none)
function getHighlightClass(stat, player1, player2, lowerIsBetter = false) {
    let val1, val2;
    
    switch(stat) {
        case 'points':
            val1 = player1.points / player1.games;
            val2 = player2.points / player2.games;
            break;
        case 'rebounds':
            val1 = player1.rebounds.total / player1.games;
            val2 = player2.rebounds.total / player2.games;
            break;
        case 'assists':
            val1 = player1.assists / player1.games;
            val2 = player2.assists / player2.games;
            break;
        case 'steals':
            val1 = player1.steals / player1.games;
            val2 = player2.steals / player2.games;
            break;
        case 'blocks':
            val1 = player1.blocks / player1.games;
            val2 = player2.blocks / player2.games;
            break;
        case 'offensiveRating':
            val1 = player1.offensiveRating;
            val2 = player2.offensiveRating;
            break;
        case 'defensiveRating':
            val1 = player1.defensiveRating;
            val2 = player2.defensiveRating;
            break;
        case 'netRating':
            val1 = player1.netRating;
            val2 = player2.netRating;
            break;
        case 'winShares':
            val1 = player1.winShares.total;
            val2 = player2.winShares.total;
            break;
        default:
            return '';
    }
    
    if (lowerIsBetter) {
        return val1 < val2 ? 'highlight-better' : '';
    } else {
        return val1 > val2 ? 'highlight-better' : '';
    }
}

// Render comparison charts
function renderCharts(player1, player2, per30 = false) {
    destroyCharts();
    
    const p1Games = player1.games;
    const p2Games = player2.games;
    
    const p1Mult = per30 ? (30 / player1.minutes * p1Games) : 1;
    const p2Mult = per30 ? (30 / player2.minutes * p2Games) : 1;
    
    // Averages Chart (Points, Rebounds, Assists)
    const ctx1 = document.getElementById('averagesChart').getContext('2d');
    averagesChart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: ['Points/G', 'Rebounds/G', 'Assists/G', 'Steals/G', 'Blocks/G'],
            datasets: [{
                label: player1.name,
                data: [
                    player1.points / p1Games,
                    player1.rebounds.total / p1Games,
                    player1.assists / p1Games,
                    player1.steals / p1Games,
                    player1.blocks / p1Games
                ],
                backgroundColor: 'rgba(0, 51, 160, 0.8)',
                borderColor: 'rgba(0, 51, 160, 1)',
                borderWidth: 2
            }, {
                label: player2.name,
                data: [
                    player2.points / p2Games,
                    player2.rebounds.total / p2Games,
                    player2.assists / p2Games,
                    player2.steals / p2Games,
                    player2.blocks / p2Games
                ],
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                borderColor: 'rgba(0, 51, 160, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Per Game Averages',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: { size: 12 }
                    }
                },
                x: {
                    ticks: {
                        font: { size: 11 }
                    }
                }
            }
        }
    });
    
    // Shooting Chart
    const ctx2 = document.getElementById('shootingChart').getContext('2d');
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
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderColor: 'rgba(0, 51, 160, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(255, 255, 255, 1)',
                pointBorderColor: 'rgba(0, 51, 160, 1)'
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
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20,
                        font: { size: 11 }
                    }
                }
            }
        }
    });
    
    // Playing Time Chart
    const ctx3 = document.getElementById('playingTimeChart').getContext('2d');
    playingTimeChart = new Chart(ctx3, {
        type: 'bar',
        data: {
            labels: ['Games', 'Starts', 'Total Minutes', 'Minutes/Game'],
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
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                borderColor: 'rgba(0, 51, 160, 1)',
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
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: { size: 12 }
                    }
                }
            }
        }
    });
    
    // Advanced Stats Chart
    const ctx4 = document.getElementById('advancedChart').getContext('2d');
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
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                borderColor: 'rgba(0, 51, 160, 1)',
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
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: { size: 12 }
                    }
                }
            }
        }
    });
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

// Download comparison as image/PDF
function downloadComparison() {
    // Simple implementation: open print dialog
    window.print();
}

// Show loading indicator
function showLoading(message = 'Loading...') {
    // Create or show loading overlay
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
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

// Show error message
function showError(message) {
    alert(message);
}
