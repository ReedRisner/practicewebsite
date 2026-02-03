// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const season = urlParams.get('season');
const date = urlParams.get('date');

document.addEventListener('DOMContentLoaded', function() {
    const backButton = document.querySelector('a.btn.btn-primary');
    if (backButton && season) {
        backButton.href = `schedule.html?season=${season}`;
    }
});

// Elements
const loading = document.getElementById('loading');
const boxscoreContent = document.getElementById('boxscore-content');
const errorMessage = document.getElementById('error-message');
const playerStats = document.getElementById('player-stats');
const videoButton = document.getElementById('video-button');

// Game info elements
const opponentName = document.getElementById('opponent-name');
const gameDate = document.getElementById('game-date');
const gameResult = document.getElementById('game-result');
const gameLocation = document.getElementById('game-location');

// Stat elements
const fgPct = document.getElementById('fg-pct');
const threePct = document.getElementById('three-pct');
const ftPct = document.getElementById('ft-pct');

// Sorting state
let currentSort = {
    column: 'rating', // Default to rating column
    direction: 'desc' // Default to descending (highest to lowest)
};

// Global variables to store game data for PDF generation
let gameData = {};
let teamStatsData = {};

// Use the calculateGameRating from players.js instead of local version
function calculateGameRating(game) {
    // Extract stats from game object
    const { min, pts, reb, ast, stl, blk, to, fgm, fga, threeFgm, threeFga, ftm, fta } = game;
    
    // Handle edge cases
    if (min <= 0) return 0.0;
    
    // Calculate shooting percentages
    const fgPct = fga > 0 ? fgm / fga : 0;
    const threePct = threeFga > 0 ? threeFgm / threeFga : 0;
    const ftPct = fta > 0 ? ftm / fta : 0;
    
    // Normalize stats per 36 minutes (standard for comparison)
    const pace = 36 / min;
    const normalizedPoints = pts * pace;
    const normalizedRebounds = reb * pace;
    const normalizedAssists = ast * pace;
    const normalizedSteals = stl * pace;
    const normalizedBlocks = blk * pace;
    const normalizedTurnovers = to * pace;

    // OFFENSIVE RATING (0-5 points)
    let offensiveRating = 0.9; // Base offensive rating boost
    
    // Points component (0-2.5 points) - more generous scaling
    // Excellent: 18+ pts/36min = 2.5, Good: 12+ = 1.8, Average: 8+ = 1.2
    const pointsScore = Math.min(2.5, normalizedPoints / 7.2);
    offensiveRating += pointsScore;
    
    // Shooting efficiency component (0-2 points)
    let efficiencyScore = 0.3; // Base efficiency boost
    // Field Goal Percentage weight - more generous
    if (fga >= 2) { // Lower threshold for meaningful attempts
        efficiencyScore += fgPct * 1.4; // Increased multiplier
    }
    // Three-point shooting bonus
    if (threeFga >= 1) { // Lower threshold
        efficiencyScore += threePct * 0.6; // Increased bonus
    }
    // Free throw efficiency
    if (fta >= 1) { // Lower threshold
        efficiencyScore += ftPct * 0.4; // Increased bonus
    }
    efficiencyScore = Math.min(2.0, efficiencyScore);
    offensiveRating += efficiencyScore;

    // DEFENSIVE/HUSTLE RATING (0-3 points)
    let defensiveRating = 0;
    
    // Rebounds (0-1.5 points)
    const reboundScore = Math.min(1.5, normalizedRebounds / 8); // 8+ reb/36min = max
    defensiveRating += reboundScore;
    
    // Steals and Blocks (0-1.5 points)
    const stealBlockScore = Math.min(1.5, (normalizedSteals + normalizedBlocks) / 3); // 3+ combined = max
    defensiveRating += stealBlockScore;

    // EFFICIENCY/CARE RATING (0-2 points)
    let efficiencyCare = 2.0; // Start at max, deduct for turnovers
    
    // Turnover penalty
    const turnoverPenalty = Math.min(2.0, normalizedTurnovers / 6); // 6+ TO/36min = -2.0
    efficiencyCare -= turnoverPenalty;
    efficiencyCare = Math.max(0, efficiencyCare);

    // TOTAL RATING
    let totalRating = offensiveRating + defensiveRating + efficiencyCare;
    
    // Scale to 0-10 and round to 1 decimal
    return Math.round(Math.min(10.0, Math.max(0.0, totalRating)) * 10) / 10;
}

// PDF Generation Functions
function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Set up document
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let yPos = margin;
    
    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Kentucky Wildcats Box Score', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    // Game info
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`${gameData.opponent}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    doc.text(`${gameData.date} - ${gameData.location}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    doc.text(`${gameData.result}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    // Table headers
    const headers = ['Player', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TO', 'FG', '3PT', 'FT', 'RTG'];
    const colWidths = [35, 12, 10, 10, 10, 10, 10, 10, 18, 18, 18, 12];
    let xPos = margin;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    
    // Draw header row
    headers.forEach((header, i) => {
        doc.text(header, xPos, yPos);
        xPos += colWidths[i];
    });
    yPos += 8;
    
    // Draw line under headers - make it span all columns
    const totalWidth = colWidths.reduce((sum, width) => sum + width, 0);
    doc.line(margin, yPos, margin + totalWidth, yPos);
    yPos += 5;
    
    // Player data
    doc.setFont(undefined, 'normal');
    window.playerData.forEach(player => {
        xPos = margin;
        const rowData = [
            `${player.number}. ${player.data.player}`,
            player.data.min.toFixed(1),
            player.data.pts.toString(),
            player.data.reb.toString(),
            player.data.ast.toString(),
            player.data.stl.toString(),
            player.data.blk.toString(),
            player.data.to.toString(),
            `${player.fgm}-${player.fga}`,
            `${player.threeFgm}-${player.threeFga}`,
            `${player.ftm}-${player.fta}`,
            player.data.rating.toFixed(1)
        ];
        
        rowData.forEach((data, i) => {
            doc.text(data, xPos, yPos);
            xPos += colWidths[i];
        });
        yPos += 6;
        
        // Check if we need a new page
        if (yPos > 250) {
            doc.addPage();
            yPos = margin;
        }
    });
    
    // Team totals
    yPos += 5;
    doc.line(margin, yPos, margin + totalWidth, yPos);
    yPos += 8;
    
    doc.setFont(undefined, 'bold');
    xPos = margin;
    const teamData = [
        'TEAM',
        teamStatsData.min.toFixed(1),
        teamStatsData.pts.toString(),
        teamStatsData.reb.toString(),
        teamStatsData.ast.toString(),
        teamStatsData.stl.toString(),
        teamStatsData.blk.toString(),
        teamStatsData.to.toString(),
        `${teamStatsData.fgm}-${teamStatsData.fga}`,
        `${teamStatsData.threeFgm}-${teamStatsData.threeFga}`,
        `${teamStatsData.ftm}-${teamStatsData.fta}`,
        '-'
    ];
    
    teamData.forEach((data, i) => {
        doc.text(data, xPos, yPos);
        xPos += colWidths[i];
    });
    
    // Team shooting percentages
    yPos += 15;
    doc.setFontSize(12);
    const teamFgPct = teamStatsData.fga > 0 ? (teamStatsData.fgm / teamStatsData.fga * 100).toFixed(1) : '0.0';
    const teamThreePct = teamStatsData.threeFga > 0 ? (teamStatsData.threeFgm / teamStatsData.threeFga * 100).toFixed(1) : '0.0';
    const teamFtPct = teamStatsData.fta > 0 ? (teamStatsData.ftm / teamStatsData.fta * 100).toFixed(1) : '0.0';
    
    doc.text(`Team Shooting: FG ${teamFgPct}% | 3PT ${teamThreePct}% | FT ${teamFtPct}%`, pageWidth / 2, yPos, { align: 'center' });
    
    // Save the PDF
    const filename = `Kentucky ${gameData.opponent}.pdf`;
    doc.save(filename);
}

async function loadBoxScore() {
    try {
        // Load schedule data to get game info
        const scheduleResponse = await fetch(`../data/${season}-schedule.json`);
        if (!scheduleResponse.ok) throw new Error('Schedule data not found');
        const scheduleData = await scheduleResponse.json();
        
        // Find the game in schedule
        const game = scheduleData.find(g => parseGameDate(g.date) === date);
        if (!game) throw new Error('Game not found in schedule');
        
        // Store game data for PDF
        gameData = {
            opponent: game.opponent,
            date: game.date,
            result: game.result,
            location: game.location
        };
        
        // Set game info
        opponentName.textContent = game.opponent;
        gameDate.textContent = game.date;
        gameResult.textContent = game.result;
        gameLocation.textContent = game.location;
        
        
        // Load game logs for this season
        const gameLogsResponse = await fetch('../data/gameLogs.json');
        if (!gameLogsResponse.ok) throw new Error('Game logs not found');
        const gameLogsData = await gameLogsResponse.json();
        
        // Find the specific game log
        const seasonGameLogs = gameLogsData.seasons[season]?.games || [];
        const gameLog = seasonGameLogs.find(g => parseGameDate(g.date) === date);
        if (!gameLog) throw new Error('Game log not found');
        
        // Check for video and show button if available
        if (gameLog.video) {
            videoButton.href = gameLog.video;
            videoButton.style.display = 'block';
        } else {
            videoButton.style.display = 'none';
        }
        
        // Load players data for names
        const playersResponse = await fetch('../data/players.json');
        if (!playersResponse.ok) throw new Error('Players data not found');
        const playersData = await playersResponse.json();
        const seasonPlayers = playersData.seasons[season]?.players || [];
        
        // Process player stats
        let teamStats = {
            min: 0,
            pts: 0,
            reb: 0,
            ast: 0,
            stl: 0,
            blk: 0,
            to: 0,
            fgm: 0,
            fga: 0,
            threeFgm: 0,
            threeFga: 0,
            ftm: 0,
            fta: 0
        };
        
        playerStats.innerHTML = '';
        
        // Store player data for sorting
        window.playerData = [];
        
        gameLog.boxscore.forEach(playerStat => {
            // Find player info
            const player = seasonPlayers.find(p => p.number == playerStat.number);
            if (!player) return;
            
            // Calculate game rating using players.js function
            const gameRating = calculateGameRating(playerStat);
            
            // Add to team totals
            teamStats.min += playerStat.min || 0;
            teamStats.pts += playerStat.pts || 0;
            teamStats.reb += playerStat.reb || 0;
            teamStats.ast += playerStat.ast || 0;
            teamStats.stl += playerStat.stl || 0;
            teamStats.blk += playerStat.blk || 0;
            teamStats.to += playerStat.to || 0;
            teamStats.fgm += playerStat.fgm || 0;
            teamStats.fga += playerStat.fga || 0;
            teamStats.threeFgm += playerStat.threeFgm || 0;
            teamStats.threeFga += playerStat.threeFga || 0;
            teamStats.ftm += playerStat.ftm || 0;
            teamStats.fta += playerStat.fta || 0;
            
            // Calculate shooting percentages
            const fgPctVal = playerStat.fga > 0 ? (playerStat.fgm / playerStat.fga * 100).toFixed(1) : '0.0';
            const threePctVal = playerStat.threeFga > 0 ? (playerStat.threeFgm / playerStat.threeFga * 100).toFixed(1) : '0.0';
            const ftPctVal = playerStat.fta > 0 ? (playerStat.ftm / playerStat.fta * 100).toFixed(1) : '0.0';
            
            // Store player data for sorting
            const playerRowData = {
                element: null, // Will be set when creating the row
                number: parseInt(player.number), // Add number for sorting
                fgm: playerStat.fgm || 0, // Store for PDF
                fga: playerStat.fga || 0,
                threeFgm: playerStat.threeFgm || 0,
                threeFga: playerStat.threeFga || 0,
                ftm: playerStat.ftm || 0,
                fta: playerStat.fta || 0,
                data: {
                    player: player.name,
                    number: parseInt(player.number), // Add number to data for sorting
                    min: playerStat.min || 0,
                    pts: playerStat.pts || 0,
                    reb: playerStat.reb || 0,
                    ast: playerStat.ast || 0,
                    stl: playerStat.stl || 0,
                    blk: playerStat.blk || 0,
                    to: playerStat.to || 0,
                    fg: playerStat.fgm || 0, // Sort by made field goals
                    threept: playerStat.threeFgm || 0, // Sort by made three pointers
                    ft: playerStat.ftm || 0, // Sort by made free throws
                    rating: gameRating
                },
                rowHtml: `
                    <td class="player-name">${player.number}. ${player.name}</td>
                    <td data-value="${playerStat.min || 0}">${playerStat.min ? playerStat.min.toFixed(1) : '0.0'}</td>
                    <td data-value="${playerStat.pts || 0}">${playerStat.pts || 0}</td>
                    <td data-value="${playerStat.reb || 0}">${playerStat.reb || 0}</td>
                    <td data-value="${playerStat.ast || 0}">${playerStat.ast || 0}</td>
                    <td data-value="${playerStat.stl || 0}">${playerStat.stl || 0}</td>
                    <td data-value="${playerStat.blk || 0}">${playerStat.blk || 0}</td>
                    <td data-value="${playerStat.to || 0}">${playerStat.to || 0}</td>
                    <td data-value="${playerStat.fgm || 0}">${playerStat.fgm || 0}-${playerStat.fga || 0}<br><small>${fgPctVal}%</small></td>
                    <td data-value="${playerStat.threeFgm || 0}">${playerStat.threeFgm || 0}-${playerStat.threeFga || 0}<br><small>${threePctVal}%</small></td>
                    <td data-value="${playerStat.ftm || 0}">${playerStat.ftm || 0}-${playerStat.fta || 0}<br><small>${ftPctVal}%</small></td>
                    <td data-value="${gameRating}">
                        <span class="rating-cell rating-${Math.floor(gameRating)}">
                            ${gameRating.toFixed(1)}
                        </span>
                    </td>
                `
            };
            
            window.playerData.push(playerRowData);
        });
        
        // Store team stats for PDF
        teamStatsData = teamStats;
        
        // Sort by rating (highest to lowest) initially
        sortPlayerData(currentSort.column, currentSort.direction);
        
        // Create and append player rows in sorted order
        window.playerData.forEach(playerRowData => {
            const row = document.createElement('tr');
            row.innerHTML = playerRowData.rowHtml;
            playerRowData.element = row;
            playerStats.appendChild(row);
        });
        
        // Add team totals row
        const teamFgPct = teamStats.fga > 0 ? (teamStats.fgm / teamStats.fga * 100).toFixed(1) : '0.0';
        const teamThreePct = teamStats.threeFga > 0 ? (teamStats.threeFgm / teamStats.threeFga * 100).toFixed(1) : '0.0';
        const teamFtPct = teamStats.fta > 0 ? (teamStats.ftm / teamStats.fta * 100).toFixed(1) : '0.0';
        
        const totalsRow = document.createElement('tr');
        totalsRow.innerHTML = `
            <td class="player-name">TEAM</td>
            <td>${teamStats.min.toFixed(1)}</td>
            <td>${teamStats.pts}</td>
            <td>${teamStats.reb}</td>
            <td>${teamStats.ast}</td>
            <td>${teamStats.stl}</td>
            <td>${teamStats.blk}</td>
            <td>${teamStats.to}</td>
            <td>${teamStats.fgm}-${teamStats.fga}<br><small>${teamFgPct}%</small></td>
            <td>${teamStats.threeFgm}-${teamStats.threeFga}<br><small>${teamThreePct}%</small></td>
            <td>${teamStats.ftm}-${teamStats.fta}<br><small>${teamFtPct}%</small></td>
            <td>-</td>
        `;
        playerStats.appendChild(totalsRow);
        
        // Store team row reference
        window.teamRow = totalsRow;
        
        // Update stat cards
        fgPct.textContent = `${teamFgPct}%`;
        threePct.textContent = `${teamThreePct}%`;
        ftPct.textContent = `${teamFtPct}%`;
        
        // Set up sorting
        setupSorting();
        
        // Set initial sort indicator on rating column
        const ratingHeader = document.querySelector('th[data-sort="rating"]');
        if (ratingHeader) {
            ratingHeader.classList.add('sort-desc');
        }
        
        // Add PDF download button
        addPDFButton();
        
        // Hide loading, show content
        loading.style.display = 'none';
        boxscoreContent.style.display = 'block';
        
    } catch (error) {
        loading.style.display = 'none';
        errorMessage.style.display = 'block';
        errorMessage.textContent = `Error loading box score: ${error.message}`;
        console.error('Error loading box score:', error);
    }
}

function addPDFButton() {
    // Create PDF download button
    const pdfButton = document.createElement('button');
    pdfButton.className = 'btn btn-success ms-2';
    pdfButton.innerHTML = '<i class="bi bi-download"></i> Download PDF';
    pdfButton.onclick = generatePDF;
    
    // Add the button next to the video button in the game header
    const gameHeaderButtons = document.querySelector('.game-header .text-end');
    if (gameHeaderButtons) {
        gameHeaderButtons.appendChild(pdfButton);
    }
}

function setupSorting() {
    const headers = document.querySelectorAll('.boxscore-table th[data-sort]');
    
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-sort');
            
            // Remove previous sort indicators
            headers.forEach(h => {
                h.classList.remove('sort-asc', 'sort-desc');
            });
            
            // Determine new sort direction
            if (currentSort.column === column) {
                // Toggle direction if clicking the same column
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                // For a new column, set default direction
                currentSort.column = column;
                // For player name (which includes number), default to ascending for number sorting
                // For all other stats, default to descending (highest first)
                currentSort.direction = column === 'player' ? 'asc' : 'desc';
            }
            
            // Add sort indicator to current header
            header.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
            
            // Sort the data
            sortPlayerData(column, currentSort.direction);
            
            // Re-render the table
            renderSortedData();
        });
    });
}

function sortPlayerData(column, direction) {
    window.playerData.sort((a, b) => {
        let valueA, valueB;
        
        // Special handling for player column - sort by number instead of name
        if (column === 'player') {
            valueA = a.data.number;
            valueB = b.data.number;
        } else {
            valueA = a.data[column];
            valueB = b.data[column];
        }
        
        // For string comparison (if needed)
        if (typeof valueA === 'string') {
            valueA = valueA.toLowerCase();
            valueB = valueB.toLowerCase();
        }
        
        if (valueA < valueB) {
            return direction === 'asc' ? -1 : 1;
        }
        if (valueA > valueB) {
            return direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
}

function renderSortedData() {
    // Clear the table body (except team row)
    const tbody = document.getElementById('player-stats');
    tbody.innerHTML = '';
    
    // Add sorted player rows
    window.playerData.forEach(player => {
        tbody.appendChild(player.element);
    });
    
    // Add team row back at the bottom
    tbody.appendChild(window.teamRow);
}
        
// Date parsing function (same as in schedule.js)
function parseGameDate(dateStr) {
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }

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

// Start loading when page loads
document.addEventListener('DOMContentLoaded', loadBoxScore);