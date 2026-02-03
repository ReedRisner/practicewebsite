/**
 * Fetch AP Rankings and Save to JSON
 * This avoids CORS issues by saving rankings data to a static JSON file
 * that your website can load without cross-origin restrictions
 */

const fs = require('fs').promises;

const API_BASE_URL = 'https://ncaa-api.henrygd.me';
const OUTPUT_FILE = '../data/ap-rankings.json';

async function fetchAndSaveRankings() {
    console.log('🏀 Fetching AP Rankings...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/rankings/basketball-men/d1/associated-press`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Create a simplified format optimized for your website
        const rankings = {
            lastUpdated: new Date().toISOString(),
            apPollDate: data.updated || 'Unknown',
            teams: {}
        };
        
        // Parse teams into an easy-to-lookup object
        if (data.data && Array.isArray(data.data)) {
            data.data.forEach(team => {
                const school = team.SCHOOL.toLowerCase()
                    .replace(/\s*\(\d+\)/, '')
                    .trim();
                
                rankings.teams[school] = {
                    rank: parseInt(team.RANK),
                    school: team.SCHOOL,
                    record: team.RECORD,
                    points: team.POINTS,
                    previous: team.PREVIOUS
                };
            });
        }
        
        // Save to JSON file
        await fs.writeFile(
            OUTPUT_FILE,
            JSON.stringify(rankings, null, 2)
        );
        
        console.log('✓ Successfully saved rankings to', OUTPUT_FILE);
        console.log(`  Teams ranked: ${Object.keys(rankings.teams).length}`);
        console.log(`  Last updated: ${rankings.apPollDate}`);
        
        return rankings;
        
    } catch (error) {
        console.error('✗ Error fetching rankings:', error.message);
        throw error;
    }
}

// Run if executed directly
if (require.main === module) {
    fetchAndSaveRankings()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { fetchAndSaveRankings };
