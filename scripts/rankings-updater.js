/**
 * Browser-Compatible AP Rankings Updater
 * This version can be called from your schedule.js to fetch live rankings
 * when the page loads for upcoming games
 */

const RankingsUpdater = {
    API_BASE_URL: 'https://ncaa-api.henrygd.me',
    cache: {
        rankings: null,
        timestamp: null,
        expiryMinutes: 60 // Cache for 1 hour
    },

    /**
     * Fetch current AP Top 25 rankings
     */
    async fetchAPRankings() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/rankings/basketball-men/d1/associated-press`);
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching AP rankings:', error);
            return null;
        }
    },

    /**
     * Parse rankings data into a usable Map
     */
    parseRankings(rankingsData) {
        const rankings = new Map();
        
        if (rankingsData && rankingsData.data && Array.isArray(rankingsData.data)) {
            rankingsData.data.forEach(team => {
                const rank = parseInt(team.RANK);
                const school = team.SCHOOL.toLowerCase()
                    .replace(/\s*\(\d+\)/, '') // Remove vote counts
                    .trim();
                
                rankings.set(school, rank);
            });
        }
        
        return rankings;
    },

    /**
     * Get rankings with caching
     */
    async getRankings() {
        const now = Date.now();
        
        // Check cache
        if (this.cache.rankings && this.cache.timestamp) {
            const ageMinutes = (now - this.cache.timestamp) / (1000 * 60);
            if (ageMinutes < this.cache.expiryMinutes) {
                return this.cache.rankings;
            }
        }
        
        // Fetch fresh data
        const data = await this.fetchAPRankings();
        if (data) {
            this.cache.rankings = this.parseRankings(data);
            this.cache.timestamp = now;
        }
        
        return this.cache.rankings;
    },

    /**
     * Find team rank by opponent name
     */
    findTeamRank(opponentName, rankings) {
        if (!rankings) return null;
        
        // Remove "vs" or "at" prefix and convert to lowercase
        const cleanName = opponentName
            .replace(/^(vs|at)\s+/i, '')
            .toLowerCase()
            .trim();
        
        // Direct lookup
        if (rankings.has(cleanName)) {
            return rankings.get(cleanName);
        }
        
        // Try variations
        const variations = [
            cleanName,
            cleanName.replace(/\./g, ''),
            cleanName.replace(/st\./g, 'st'),
            cleanName.replace(/&/g, 'and'),
            cleanName.replace(/\'/g, ''),
            cleanName.replace(/-/g, ' '),
        ];
        
        for (const variation of variations) {
            if (rankings.has(variation)) {
                return rankings.get(variation);
            }
        }
        
        // Try partial match
        for (const [teamName, rank] of rankings) {
            if (teamName.includes(cleanName) || cleanName.includes(teamName)) {
                return rank;
            }
        }
        
        return null;
    },

    /**
     * Update games with live rankings
     * Only updates games that haven't been played yet
     */
    async updateGameRankings(games) {
        const rankings = await this.getRankings();
        
        if (!rankings) {
            console.warn('Could not fetch rankings, using existing data');
            return games;
        }
        
        games.forEach(game => {
            // Only update upcoming games
            if (game.result === 'TBD') {
                const rank = this.findTeamRank(game.opponent, rankings);
                
                if (rank !== null && rank <= 25) {
                    game.opponentRank = rank;
                    game.currentRank = true; // Flag to indicate this is a live ranking
                } else {
                    game.opponentRank = 0;
                }
            }
            // For completed games, keep the frozen ranking from the JSON file
        });
        
        return games;
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RankingsUpdater;
}
