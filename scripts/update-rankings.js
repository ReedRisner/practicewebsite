/**
 * AP Rankings Update Script
 * Fetches current AP rankings and updates schedule and rankings data
 * Run this script periodically (e.g., weekly after new AP poll releases)
 */

const fs = require('fs').promises;
const path = require('path');

// Configuration
const API_BASE_URL = 'https://ncaa-api.henrygd.me';
const SCHEDULE_FILE = '../data/2025-schedule.json';
const UPDATE_FILE = '../data/update.json';

// Team name mapping - maps NCAA API names to your opponent names
const TEAM_NAME_MAPPING = {
    'purdue': 'vs Purdue',
    'georgetown': 'vs Georgetown',
    'louisville': 'at Louisville',
    'michigan state': 'vs Michigan State',
    'michigan st.': 'vs Michigan State',
    'north carolina': 'vs North Carolina',
    'n. carolina': 'vs North Carolina',
    'unc': 'vs North Carolina',
    'gonzaga': 'vs Gonzaga',
    'indiana': 'vs Indiana',
    'st. john\'s': 'vs St. Johns',
    'st johns': 'vs St. Johns',
    'alabama': 'at Alabama',
    'tennessee': 'at Tennessee',
    'vanderbilt': 'at Vanderbilt',
    'arkansas': 'at Arkansas',
    'oklahoma': 'vs Oklahoma',
    'florida': 'at Florida',
    'georgia': 'vs Georgia',
    'auburn': 'at Auburn',
    'texas a&m': 'at Texas A&M',
    'texas am': 'at Texas A&M'
};

/**
 * Fetch current AP Top 25 rankings
 */
async function fetchAPRankings() {
    try {
        const response = await fetch(`${API_BASE_URL}/rankings/basketball-men/d1/associated-press`);
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✓ Successfully fetched AP rankings');
        console.log(`  Updated: ${data.updated || 'N/A'}`);
        
        return data;
    } catch (error) {
        console.error('✗ Error fetching AP rankings:', error.message);
        throw error;
    }
}

/**
 * Parse rankings data into a usable format
 */
function parseRankings(rankingsData) {
    const rankings = new Map();
    
    if (rankingsData.data && Array.isArray(rankingsData.data)) {
        rankingsData.data.forEach(team => {
            const rank = parseInt(team.RANK);
            const school = team.SCHOOL.toLowerCase()
                .replace(/\s*\(\d+\)/, '') // Remove vote counts in parentheses
                .trim();
            
            rankings.set(school, rank);
        });
    }
    
    console.log(`✓ Parsed ${rankings.size} ranked teams`);
    return rankings;
}

/**
 * Find team rank by opponent name
 */
function findTeamRank(opponentName, rankings) {
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
        cleanName.replace(/\./g, ''), // Remove periods
        cleanName.replace(/st\./g, 'st'), // St. -> st
        cleanName.replace(/&/g, 'and'), // & -> and
        cleanName.replace(/\'/g, ''), // Remove apostrophes
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
}

/**
 * Update schedule with current rankings
 * - For games not yet played (result: "TBD"), update to current ranking
 * - For games already played, keep the ranking they had at game time (frozen)
 */
async function updateSchedule(rankings, scheduleFilePath) {
    try {
        const scheduleData = await fs.readFile(scheduleFilePath, 'utf8');
        const schedule = JSON.parse(scheduleData);
        
        let updatedCount = 0;
        let frozenCount = 0;
        
        schedule.forEach(game => {
            // Only update rankings for games that haven't been played yet
            if (game.result === 'TBD') {
                const rank = findTeamRank(game.opponent, rankings);
                
                if (rank !== null && rank <= 25) {
                    game.opponentRank = rank;
                    updatedCount++;
                } else {
                    // Team is unranked
                    game.opponentRank = 0;
                }
            } else {
                // Game already played - keep existing rank (frozen)
                if (game.opponentRank && game.opponentRank > 0) {
                    frozenCount++;
                }
            }
        });
        
        // Write updated schedule
        await fs.writeFile(
            scheduleFilePath,
            JSON.stringify(schedule, null, 4)
        );
        
        console.log(`✓ Updated schedule:`);
        console.log(`  - ${updatedCount} upcoming games updated with current rankings`);
        console.log(`  - ${frozenCount} completed games with frozen rankings`);
        
        return schedule;
    } catch (error) {
        console.error('✗ Error updating schedule:', error.message);
        throw error;
    }
}

/**
 * Update the update.json file with current AP Poll ranking
 * Finds Kentucky's current ranking in the AP Poll
 */
async function updateAPPollRanking(rankings, updateFilePath) {
    try {
        const updateData = await fs.readFile(updateFilePath, 'utf8');
        const data = JSON.parse(updateData);
        
        // Find Kentucky's ranking
        const kentuckyRank = rankings.get('kentucky');
        
        if (data['2025'] && data['2025'].rankings) {
            if (kentuckyRank && kentuckyRank <= 25) {
                data['2025'].rankings['AP Poll'] = `#${kentuckyRank}`;
                console.log(`✓ Updated Kentucky AP Poll ranking to #${kentuckyRank}`);
            } else {
                data['2025'].rankings['AP Poll'] = 'N/A';
                console.log(`✓ Kentucky is currently unranked in AP Poll`);
            }
            
            // Write updated data
            await fs.writeFile(
                updateFilePath,
                JSON.stringify(data, null, 4)
            );
        }
        
        return data;
    } catch (error) {
        console.error('✗ Error updating AP Poll ranking:', error.message);
        throw error;
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('🏀 Starting AP Rankings Update...\n');
    
    try {
        // Step 1: Fetch current AP rankings
        console.log('Step 1: Fetching AP rankings...');
        const rankingsData = await fetchAPRankings();
        const rankings = parseRankings(rankingsData);
        console.log('');
        
        // Step 2: Update schedule file
        console.log('Step 2: Updating schedule...');
        await updateSchedule(rankings, SCHEDULE_FILE);
        console.log('');
        
        // Step 3: Update rankings file
        console.log('Step 3: Updating rankings data...');
        await updateAPPollRanking(rankings, UPDATE_FILE);
        console.log('');
        
        console.log('✅ All updates completed successfully!');
        console.log('\nNext steps:');
        console.log('  1. Review the updated files');
        console.log('  2. Commit changes to your repository');
        console.log('  3. Run this script weekly when new AP polls are released');
        
    } catch (error) {
        console.error('\n❌ Update failed:', error.message);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}

module.exports = { fetchAPRankings, parseRankings, updateSchedule, updateAPPollRanking };
