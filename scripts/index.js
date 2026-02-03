const CURRENT_SEASON = '2025'; // Define current season

// ==================== Line Background System ====================
class LinePoint {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.reset();
    }
    
    reset() {
        this.x = Math.random() * this.canvas.width;
        this.y = Math.random() * this.canvas.height;
        this.speedX = (Math.random() - 0.5) * 0.8;
        this.speedY = (Math.random() - 0.5) * 0.8;
        this.size = Math.random() * 2 + 1;
        this.alpha = Math.random() * 0.3 + 0.1;
    }
    
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Reset points that move off screen
        if (this.x < 0 || this.x > this.canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > this.canvas.height) this.speedY *= -1;
    }
    
    draw() {
        this.ctx.globalAlpha = this.alpha;
        this.ctx.fillStyle = '#0033A0';
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        this.ctx.fill();
    }
}

function initLineBackground() {
    const canvas = document.getElementById('line-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Set canvas styles for background visibility
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '-1'; // Ensure canvas is behind content

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        // Make background transparent for mobile
        canvas.style.backgroundColor = 'transparent';

        // Fireworks effect for mobile
        const fireworks = [];
        const particles = [];
        const UK_BLUE = '#0033A0';

        class Particle {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 5;
                this.vy = (Math.random() - 0.5) * 5;
                this.alpha = 1;
                this.decay = Math.random() * 0.03 + 0.015;
                this.size = Math.random() * 2 + 1;
                this.color = UK_BLUE;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.05; // gravity
                this.vx *= 0.99; // friction
                this.vy *= 0.99;
                this.alpha -= this.decay;
            }

            draw() {
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }

            isAlive() {
                return this.alpha > 0;
            }
        }

        class Firework {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = canvas.height;
                this.targetY = Math.random() * canvas.height * 0.6;
                this.speed = 2 + Math.random() * 2;
                this.particles = [];
                this.exploded = false;
            }

            update() {
                if (!this.exploded) {
                    this.y -= this.speed;
                    if (this.y <= this.targetY) {
                        this.explode();
                    }
                } else {
                    this.particles.forEach((particle, index) => {
                        particle.update();
                        if (!particle.isAlive()) {
                            this.particles.splice(index, 1);
                        }
                    });
                }
            }

            explode() {
                this.exploded = true;
                const particleCount = Math.floor(Math.random() * 50) + 50;
                for (let i = 0; i < particleCount; i++) {
                    this.particles.push(new Particle(this.x, this.y));
                }
            }

            draw() {
                if (!this.exploded) {
                    ctx.globalAlpha = 0.8;
                    ctx.fillStyle = UK_BLUE;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    this.particles.forEach(particle => particle.draw());
                }
            }

            isAlive() {
                return !this.exploded || this.particles.length > 0;
            }
        }

        function animateFireworks() {
            // REMOVED: White background fill
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Launch new fireworks occasionally
            if (Math.random() < 0.02) {
                fireworks.push(new Firework());
            }

            // Update and draw fireworks
            fireworks.forEach((firework, index) => {
                firework.update();
                firework.draw();
                if (!firework.isAlive()) {
                    fireworks.splice(index, 1);
                }
            });

            requestAnimationFrame(animateFireworks);
        }

        animateFireworks();
    } else {
        // Desktop - keep white background
        canvas.style.backgroundColor = 'white';
        
        // Desktop - connect-the-dots design
        const points = [];
        const pointCount = 80;

        for (let i = 0; i < pointCount; i++) {
            points.push(new LinePoint(canvas));
        }

        function animateLines() {
            requestAnimationFrame(animateLines);
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            points.forEach(p => {
                p.update();
                p.draw();
            });

            ctx.strokeStyle = '#0033A0';
            ctx.lineWidth = 0.5;
            ctx.globalAlpha = 0.1;

            for (let i = 0; i < points.length; i++) {
                for (let j = i; j < points.length; j++) {
                    const dx = points[i].x - points[j].x;
                    const dy = points[i].y - points[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 150) {
                        ctx.beginPath();
                        ctx.moveTo(points[i].x, points[i].y);
                        ctx.lineTo(points[j].x, points[j].y);
                        ctx.stroke();
                    }
                }
            }
        }

        animateLines();
    }
}




// ==================== Existing Functions ====================
async function loadStatsFromUpdateJson() {
    try {
        const response = await fetch('../data/update.json');
        if (!response.ok) throw new Error('Update data not found');
        const data = await response.json();
        
        const currentSeason = '2025';
        const rankings = data[currentSeason].rankings;
        
        if (rankings) {
            // Update Overall Record
            document.getElementById('indexTotalRecord').textContent = rankings['Overall Record'];
            
            // Update AP Poll
            document.getElementById('indexAPPoll').textContent = rankings['AP Poll'];
            
            // Update KenPom
            document.getElementById('indexKenPom').textContent = rankings['KenPom'];
            
            // Update Bracketology (extract just the seed number)
            const bracketologyText = rankings['Bracketology'];
            const seedMatch = bracketologyText.match(/\d+/);
            if (seedMatch) {
                document.getElementById('indexBracketology').textContent = seedMatch[0];
            } else {
                document.getElementById('indexBracketology').textContent = bracketologyText;
            }
        }
        
        // Find next game from schedule
        const scheduleResponse = await fetch(`../data/${currentSeason}-schedule.json`);
        if (!scheduleResponse.ok) throw new Error('Schedule not found');
        const games = await scheduleResponse.json();
        
        // Find next game (first TBD game)
        const nextGame = games.find(game => 
            game.result === 'TBD' || !game.result
        );
        
        if (nextGame) {
            // Add "vs" prefix to opponent name
            const opponent = nextGame.opponent.replace('vs ', '').replace('at ', '');
            document.getElementById('nextGame').textContent = `vs ${opponent}`;
            document.getElementById('nextGameDate').textContent = 
                nextGame.date.replace('October', 'Oct').replace('November', 'Nov');
        }

    } catch (error) {
        console.error('Error loading data:', error);
        // Set fallback values
        document.getElementById('indexTotalRecord').textContent = 'N/A';
        document.getElementById('indexAPPoll').textContent = '#N/A';
        document.getElementById('indexKenPom').textContent = '#N/A';
        document.getElementById('indexBracketology').textContent = 'N/A';
        
        // Clear next game info on error
        document.getElementById('nextGame').textContent = '';
        document.getElementById('nextGameDate').textContent = '';
    }
};

async function loadSeasonLeaders() {
    try {
        // Load player data for names
        const playersResponse = await fetch('../data/players.json');
        if (!playersResponse.ok) throw new Error('Player data not found');
        const playerData = await playersResponse.json();
        
        // Load game logs data
        const gameLogsResponse = await fetch('../data/gameLogs.json');
        if (!gameLogsResponse.ok) throw new Error('Game logs not found');
        const gameLogsData = await gameLogsResponse.json();
        
        // Load schedule data for current season to identify exhibition games
        let scheduleData = [];
        try {
            const scheduleResponse = await fetch(`../data/${CURRENT_SEASON}-schedule.json`);
            if (scheduleResponse.ok) {
                scheduleData = await scheduleResponse.json();
            }
        } catch (error) {
            console.error(`Error loading schedule for ${CURRENT_SEASON}:`, error);
        }
        
        // Create a map of exhibition games by opponent and date
        const exhibitionGames = {};
        scheduleData.forEach(game => {
            if (game.exh) {
                try {
                    if (!game.date || isNaN(new Date(game.date).getTime())) {
                        console.warn(`Invalid date in schedule: ${game.date}`);
                        return;
                    }
                    
                    const gameDate = new Date(game.date);
                    const normalizedDate = gameDate.toISOString().split('T')[0];
                    
                    const key = `${game.opponent.toLowerCase().replace('vs ', '').replace(' (exh)', '')}_${normalizedDate}`;
                    exhibitionGames[key] = true;
                } catch (error) {
                    console.error(`Error processing schedule game date: ${game.date}`, error);
                }
            }
        });
        
        // Get games for current season
        const seasonGames = gameLogsData.seasons?.[CURRENT_SEASON]?.games || [];
        if (seasonGames.length === 0) {
            throw new Error('No games found for current season');
        }
        
        // Aggregate player stats from game logs, skipping exhibition games
        const playerStats = {};
        
        seasonGames.forEach(game => {
            try {
                // Check if this is an exhibition game
                if (!game.date || isNaN(new Date(game.date).getTime())) {
                    console.warn(`Invalid date in game log: ${game.date}`);
                    return;
                }
                
                const gameDate = new Date(game.date);
                const normalizedDate = gameDate.toISOString().split('T')[0];
                
                const opponentKey = `${game.opponent.toLowerCase().replace('vs ', '').replace(' (exh)', '')}_${normalizedDate}`;
                const isExhibition = exhibitionGames[opponentKey] || false;
                
                // Skip exhibition games
                if (isExhibition) {
                    return;
                }
                
                game.boxscore.forEach(playerGame => {
                    const number = playerGame.number.toString();
                    
                    if (!playerStats[number]) {
                        playerStats[number] = {
                            pts: 0,
                            ast: 0,
                            reb: 0,
                            gp: 0  // Games played
                        };
                    }
                    
                    // Accumulate stats
                    playerStats[number].pts += playerGame.pts || 0;
                    playerStats[number].ast += playerGame.ast || 0;
                    playerStats[number].reb += playerGame.reb || 0;
                    playerStats[number].gp += 1;
                });
            } catch (error) {
                console.error(`Error processing game: ${game.opponent} on ${game.date}`, error);
            }
        });
        
        // Create player objects with calculated averages
        const playersWithStats = Object.entries(playerStats).map(([number, stats]) => {
            // Find player info from players.json
            const playerInfo = findPlayerInfo(playerData, number, CURRENT_SEASON);
            
            return {
                number: number,
                name: playerInfo?.name || `Player #${number}`,
                ppg: stats.gp > 0 ? stats.pts / stats.gp : 0,
                apg: stats.gp > 0 ? stats.ast / stats.gp : 0,
                rpg: stats.gp > 0 ? stats.reb / stats.gp : 0
            };
        });
        
        if (playersWithStats.length === 0) {
            throw new Error('No player stats calculated');
        }
        
        // Find leaders
        const ppgLeader = [...playersWithStats].sort((a, b) => b.ppg - a.ppg)[0];
        const apgLeader = [...playersWithStats].sort((a, b) => b.apg - a.apg)[0];
        const rpgLeader = [...playersWithStats].sort((a, b) => b.rpg - a.rpg)[0];
        
        // Display leaders
        displayLeader('ppgLeader', ppgLeader, 'ppg');
        displayLeader('apgLeader', apgLeader, 'apg');
        displayLeader('rpgLeader', rpgLeader, 'rpg');
        
     } catch (error) {
        if (error.message === 'No games found for current season') {
            console.error('No Games Played Yet This Season');
        } else {
            console.error('Error loading season leaders:', error);
        }
        // Show placeholders
        document.querySelectorAll('.leader-content').forEach(el => {
            el.innerHTML = '<p>No Games Played...</p>';
        });
    }
}

function findPlayerInfo(playerData, number, season) {
    const seasonPlayers = playerData.seasons?.[season]?.players || [];
    return seasonPlayers.find(p => p.number.toString() === number);
}

function displayLeader(elementId, player, statType) {
    const container = document.getElementById(elementId);
    if (!container || !player) return;
    
    const statValue = player[statType].toFixed(1);
    const statLabel = statType.toUpperCase();
    
    container.innerHTML = `
        <img src="images/${CURRENT_SEASON}/players/${player.number}.jpg" 
            class="leader-img" 
            alt="${player.name}"
            onerror="this.src='images/players/default.jpg'">
        <div class="leader-name">${player.name}</div>
        <div class="leader-stat">${statValue} ${statLabel}</div>
    `;
}

async function loadRecentGames() {
    try {
        const response = await fetch(`../data/${CURRENT_SEASON}-schedule.json`);
        if (!response.ok) throw new Error('Schedule not found');
        const games = await response.json();
        
        // Filter completed games and sort by date (newest first)
        const completedGames = games.filter(game => 
            game.result && game.result !== 'TBD' && 
            (game.result.startsWith('W') || game.result.startsWith('L'))
        ).sort((a, b) => {
            return new Date(parseGameDate(b.date)) - new Date(parseGameDate(a.date));
        });
        
        // Take the 3 most recent games
        const recentGames = completedGames.slice(0, 3);
        
        // Update the recent games table
        updateRecentGamesTable(recentGames);
        
    } catch (error) {
        console.error('Error loading recent games:', error);
        // Show error message in table
        document.getElementById('recent-games').innerHTML = `
            <tr><td colspan="4" class="text-center text-danger">Error loading recent games</td></tr>
        `;
    }
}

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

function updateRecentGamesTable(games) {
    const tbody = document.getElementById('recent-games');
    tbody.innerHTML = '';
    
    games.forEach(game => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
            const parsedDate = parseGameDate(game.date);
            window.location.href = `pages/boxscore.html?season=${CURRENT_SEASON}&date=${parsedDate}`;
        });
        
        // Extract result and score
        const [result, score] = game.result.split(' ');
        const isWin = result === 'W';
        
        // Add opponent rank if available
        let opponentDisplay = game.opponent;
        if (game.opponentRank) {
            opponentDisplay = `vs ${game.opponentRank} ${game.opponent.replace('vs ', '').replace('at ', '')}`;
        }
        
        row.innerHTML = `
            <td>${game.date}</td>
            <td>${opponentDisplay}</td>
            <td><span class="badge ${isWin ? 'bg-success uk-badge' : 'bg-danger'}">${result}</span></td>
            <td>${score}</td>
        `;
        tbody.appendChild(row);
    });
}

// Combined DOMContentLoaded handler
document.addEventListener('DOMContentLoaded', () => {
    initLineBackground(); // Initialize background
    loadStatsFromUpdateJson(); // Load all stats from data/update.json and next game
    loadSeasonLeaders();
    loadRecentGames();
    
    // Recent games click handler
    const recentGames = document.getElementById('recent-games');
    if (recentGames) {
        recentGames.addEventListener('click', function(e) {
            const row = e.target.closest('tr');
            if (!row) return;
            
            const dateCell = row.cells[0];
            const gameDate = dateCell.textContent.trim();
            const parsedDate = parseGameDate(gameDate);
            window.location.href = `pages/boxscore.html?season=${CURRENT_SEASON}&date=${parsedDate}`;
        });
    }
});



