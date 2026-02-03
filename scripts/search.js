// Search functionality for BBN Stats
let searchData = {};
let isSearchInitialized = false;

// Determine the base path based on current location
function getBasePath() {
    const path = window.location.pathname;
    // If we're in the pages folder, go up one level
    if (path.includes('/pages/')) {
        return '../';
    }
    // If we're at root
    return '';
}

// Date parsing function (same as in boxscore.js and schedule.js)
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

// Initialize search when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeSearch();
    setupSearchInput();
});

async function initializeSearch() {
    if (isSearchInitialized) return;
    
    try {
        await loadSearchData();
        isSearchInitialized = true;
    } catch (error) {
        console.error('Failed to initialize search:', error);
    }
}

async function loadSearchData() {
    const basePath = getBasePath();
    
    searchData = {
        players: [],
        staff: [],
        schedule: [],
        pages: []
    };

    // Load players data from players.json (new structure)
    try {
        const playersResponse = await fetch(`${basePath}data/players.json`);
        if (playersResponse.ok) {
            const playersData = await playersResponse.json();
            
            // Load 2025 players
            if (playersData.seasons && playersData.seasons["2025"] && playersData.seasons["2025"].players) {
                playersData.seasons["2025"].players.forEach(player => {
                    searchData.players.push({
                        title: player.name,
                        description: `${player.pos} • ${player.grade} • #${player.number}`,
                        url: `${basePath}pages/players.html?player=${encodeURIComponent(player.name)}`,
                        category: 'players',
                        searchTerms: [player.name, player.pos, player.grade, player.number, 'player', 'basketball'].join(' ').toLowerCase()
                    });
                });
            }
            
            // Load 2024 players with season indicator
            if (playersData.seasons && playersData.seasons["2024"] && playersData.seasons["2024"].players) {
                playersData.seasons["2024"].players.forEach(player => {
                    searchData.players.push({
                        title: player.name + ' (2024-25)',
                        description: `${player.pos} • ${player.grade} • #${player.number} (2024-25 Season)`,
                        url: `${basePath}pages/players.html?player=${encodeURIComponent(player.name)}&season=2024`,
                        category: 'players',
                        searchTerms: [player.name, player.pos, player.grade, player.number, 'player', 'basketball', '2024'].join(' ').toLowerCase()
                    });
                });
            }
        }
    } catch (error) {
        console.error('Failed to load players:', error);
        // Fallback: try old format
        try {
            const players2025Response = await fetch(`${basePath}data/2025-players.json`);
            if (players2025Response.ok) {
                const players = await players2025Response.json();
                searchData.players = players.map(player => ({
                    title: player.name,
                    description: `${player.pos} • ${player.grade} • ${player.ppg || 0} PPG`,
                    url: `${basePath}pages/players.html?player=${encodeURIComponent(player.name)}`,
                    category: 'players',
                    searchTerms: [player.name, player.pos, player.grade, 'player', 'basketball'].join(' ').toLowerCase()
                }));
            }
        } catch (fallbackError) {
            console.error('Failed to load fallback players:', fallbackError);
        }
    }

    // Add staff data
    searchData.staff = [
        {
            title: 'Mark Pope',
            description: 'Head Coach',
            url: `${basePath}pages/staff.html`,
            category: 'staff',
            searchTerms: 'mark pope head coach basketball staff'
        },
        {
            title: 'Alvin Brooks III',
            description: 'Associate Head Coach',
            url: `${basePath}pages/staff.html`,
            category: 'staff',
            searchTerms: 'alvin brooks associate head coach basketball staff'
        },
        {
            title: 'Mark Fox',
            description: 'Associate Coach',
            url: `${basePath}pages/staff.html`,
            category: 'staff',
            searchTerms: 'mark fox associate coach basketball staff'
        },
        {
            title: 'Cody Fueger',
            description: 'Assistant Coach',
            url: `${basePath}pages/staff.html`,
            category: 'staff',
            searchTerms: 'cody fueger assistant coach basketball staff'
        },
        {
            title: 'Jason Hart',
            description: 'Assistant Coach',
            url: `${basePath}pages/staff.html`,
            category: 'staff',
            searchTerms: 'jason hart assistant coach basketball staff'
        },
        {
            title: 'Mikhail McLean',
            description: 'Assistant Coach',
            url: `${basePath}pages/staff.html`,
            category: 'staff',
            searchTerms: 'mikhail mclean assistant coach basketball staff'
        },
        {
            title: 'Nick Robinson',
            description: 'Director of Men\'s Basketball Operations',
            url: `${basePath}pages/staff.html`,
            category: 'staff',
            searchTerms: 'nick robinson director operations basketball staff'
        },
        {
            title: 'Randy Towner',
            description: 'Head Strength Coach',
            url: `${basePath}pages/staff.html`,
            category: 'staff',
            searchTerms: 'randy towner strength coach basketball staff'
        },
        {
            title: 'Brandon Wells',
            description: 'Head Athletic Trainer',
            url: `${basePath}pages/staff.html`,
            category: 'staff',
            searchTerms: 'brandon wells athletic trainer basketball staff'
        }
    ];

    // Load schedule data
    try {
        const scheduleResponse = await fetch(`${basePath}data/2025-schedule.json`);
        if (scheduleResponse.ok) {
            const schedule = await scheduleResponse.json();
            searchData.schedule = schedule.map(game => ({
                title: ` ${game.opponent}`,
                description: `${game.date} • ${game.location || 'TBD'} • ${game.result || 'Upcoming'}`,
                url: game.result && game.result !== 'TBD' ? `${basePath}pages/boxscore.html?season=2025&date=${parseGameDate(game.date)}` : `${basePath}pages/schedule.html`,
                category: 'schedule',
                searchTerms: [game.opponent, game.date, game.location || '', 'game', 'schedule', 'basketball'].join(' ').toLowerCase()
            }));
        }
    } catch (error) {
        console.error('Failed to load schedule:', error);
    }

    // Try to load 2024 schedule as well
    try {
        const schedule2024Response = await fetch(`${basePath}data/2024-schedule.json`);
        if (schedule2024Response.ok) {
            const schedule2024 = await schedule2024Response.json();
            schedule2024.forEach(game => {
                searchData.schedule.push({
                    title: ` ${game.opponent} (2024-25)`,
                    description: `${game.date} • ${game.location || 'TBD'} • ${game.result || 'Past Game'}`,
                    url: game.result && game.result !== 'TBD' ? `${basePath}pages/boxscore.html?season=2024&date=${parseGameDate(game.date)}` : `${basePath}pages/schedule.html`,
                    category: 'schedule',
                    searchTerms: [game.opponent, game.date, game.location || '', 'game', 'schedule', 'basketball', '2024'].join(' ').toLowerCase()
                });
            });
        }
    } catch (error) {
        console.error('Failed to load 2024 schedule:', error);
    }

    // Add page navigation
    searchData.pages = [
        {
            title: 'Players',
            description: 'View all Kentucky basketball players and their stats',
            url: `${basePath}pages/players.html`,
            category: 'pages',
            searchTerms: 'players roster team stats basketball kentucky wildcats'
        },
        {
            title: 'Schedule',
            description: 'Kentucky basketball schedule and game results',
            url: `${basePath}pages/schedule.html`,
            category: 'pages',
            searchTerms: 'schedule games calendar fixtures results basketball kentucky'
        },
        {
            title: 'Rankings',
            description: 'Team rankings and polls (AP, KenPom, NET)',
            url: `${basePath}pages/rankings.html`,
            category: 'pages',
            searchTerms: 'rankings polls ap kenpom net bracketology basketball kentucky'
        },
        {
            title: 'Team Statistics',
            description: 'Kentucky team statistics and advanced metrics',
            url: `${basePath}pages/stats.html`,
            category: 'pages',
            searchTerms: 'statistics stats metrics efficiency offensive defensive kentucky basketball'
        },
        {
            title: 'Player Comparison',
            description: 'Compare Kentucky basketball players side by side',
            url: `${basePath}pages/comparison.html`,
            category: 'pages',
            searchTerms: 'comparison compare players vs stats basketball kentucky'
        },
        {
            title: 'History',
            description: 'Kentucky basketball history, records, and championships',
            url: `${basePath}pages/history.html`,
            category: 'pages',
            searchTerms: 'history records championships tradition kentucky wildcats basketball'
        },
        {
            title: 'News',
            description: 'Kentucky basketball news sources and media',
            url: `${basePath}pages/news.html`,
            category: 'pages',
            searchTerms: 'news media ksr articles kentucky sports radio basketball'
        },
        {
            title: 'Coaching Staff',
            description: 'Kentucky basketball coaches and support staff',
            url: `${basePath}pages/staff.html`,
            category: 'pages',
            searchTerms: 'coaches staff pope brooks fox basketball kentucky wildcats'
        },
        {
            title: 'About BBN Stats',
            description: 'Learn more about this Kentucky basketball statistics website',
            url: `${basePath}pages/about.html`,
            category: 'pages',
            searchTerms: 'about bbn stats kentucky basketball website information'
        }
    ];
}

function openSearch() {
    const modal = document.getElementById('searchModal');
    const input = document.getElementById('searchInput');
    
    if (!modal || !input) return;
    
    modal.classList.add('show');
    setTimeout(() => input.focus(), 100);
    
    // Add keyboard listeners
    document.addEventListener('keydown', handleSearchKeydown);
}

function closeSearch() {
    const modal = document.getElementById('searchModal');
    const input = document.getElementById('searchInput');
    
    if (!modal || !input) return;
    
    modal.classList.remove('show');
    input.value = '';
    const resultsContainer = document.getElementById('searchResults');
    if (resultsContainer) {
        resultsContainer.innerHTML = '<div class="no-results">Start typing to search for players, staff, games, and more...</div>';
    }
    
    // Remove keyboard listeners
    document.removeEventListener('keydown', handleSearchKeydown);
}

function handleSearchKeydown(e) {
    if (e.key === 'Escape') {
        closeSearch();
    }
}

function setupSearchInput() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const results = document.querySelectorAll('.search-result-item');
                if (results.length > 0) {
                    results[0].click(); // Click the first result
                }
            }
        });
    }
}

function handleSearchInput(e) {
    const query = e.target.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('searchResults');
    
    if (!resultsContainer) return;
    
    if (query.length < 1) {
        resultsContainer.innerHTML = '<div class="no-results">Start typing to search for players, staff, games, and more...</div>';
        return;
    }
    
    const results = performSearch(query);
    displayResults(results);
}

function performSearch(query) {
    const allItems = [
        ...searchData.players,
        ...searchData.staff,
        ...searchData.schedule,
        ...searchData.pages
    ];
    
    // Score results based on relevance
    const scoredResults = allItems.map(item => {
        let score = 0;
        const lowerTitle = item.title.toLowerCase();
        const lowerDescription = item.description.toLowerCase();
        const searchTerms = item.searchTerms;
        
        // Higher score for exact title match
        if (lowerTitle === query) score += 100;
        else if (lowerTitle.includes(query)) score += 50;
        
        // Medium score for description match
        if (lowerDescription.includes(query)) score += 25;
        
        // Lower score for search terms match
        if (searchTerms.includes(query)) score += 10;
        
        // Bonus for starting with query
        if (lowerTitle.startsWith(query)) score += 30;
        
        return { ...item, score };
    });
    
    // Filter and sort by score
    return scoredResults
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20); // Limit to 20 results
}

function displayResults(results) {
    const resultsContainer = document.getElementById('searchResults');
    
    if (!resultsContainer) return;
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No results found. Try different search terms.</div>';
        return;
    }
    
    // Group results by category
    const groupedResults = {};
    results.forEach(result => {
        if (!groupedResults[result.category]) {
            groupedResults[result.category] = [];
        }
        groupedResults[result.category].push(result);
    });
    
    let html = '';
    const categoryOrder = ['players', 'staff', 'schedule', 'pages', 'stats', 'rankings', 'history', 'news'];
    const categoryLabels = {
        players: 'Players',
        staff: 'Coaching Staff',
        schedule: 'Games & Schedule',
        stats: 'Statistics',
        rankings: 'Rankings',
        history: 'History',
        news: 'News',
        pages: 'Pages'
    };
    
    categoryOrder.forEach(category => {
        if (groupedResults[category] && groupedResults[category].length > 0) {
            html += `<div class="search-category">${categoryLabels[category]}</div>`;
            groupedResults[category].forEach(result => {
                html += createResultHTML(result);
            });
        }
    });
    
    resultsContainer.innerHTML = html;
}

function createResultHTML(result) {
    const iconMap = {
        players: 'fas fa-user',
        staff: 'fas fa-user-tie',
        schedule: 'fas fa-calendar',
        stats: 'fas fa-chart-bar',
        rankings: 'fas fa-trophy',
        history: 'fas fa-history',
        news: 'fas fa-newspaper',
        pages: 'fas fa-file'
    };
    
    // Escape HTML to prevent XSS
    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
    
    const title = escapeHtml(result.title);
    const description = escapeHtml(result.description);
    const url = escapeHtml(result.url);
    
    return `
        <div class="search-result-item" onclick="navigateToResult('${url}')">
            <div class="search-result-icon category-${result.category}">
                <i class="${iconMap[result.category] || 'fas fa-file'}"></i>
            </div>
            <div class="search-result-content">
                <p class="search-result-title">${title}</p>
                <p class="search-result-description">${description}</p>
            </div>
        </div>
    `;
}

function navigateToResult(url) {
    closeSearch();
    window.location.href = url;
}

// Global keyboard shortcut (Ctrl/Cmd + K)
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
    }
});

// Close search when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('searchModal');
    const searchContainer = document.querySelector('.search-container');
    const searchBtn = document.querySelector('.search-btn');
    
    if (modal && modal.classList.contains('show') && 
        !searchContainer.contains(e.target) && 
        !searchBtn.contains(e.target)) {
        closeSearch();
    }
});