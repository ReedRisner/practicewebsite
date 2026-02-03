#!/usr/bin/env node

/**
 * Kentucky Basketball Data Auto-Updater
 * 
 * This script automatically updates:
 * 1. Team stats and rankings in update.json
 * 2. Game results in 2025-schedule.json
 * 
 * Usage:
 * - Run manually: node update-basketball-data.js
 * - Schedule with cron: 0 */6 * * * /path/to/update-basketball-data.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  apiKey: '0/5PdgRvOqvcUo9VqUAcXFUEYqXxU3T26cGqt9c6FFArBcyqE4BD3njMuwOnQz+3',
  apiBaseUrl: 'api.collegebasketballdata.com',
  kentuckyTeamId: 'KENT', // You may need to verify this ID
  dataDir: path.join(__dirname, 'data'),
  updateJsonPath: path.join(__dirname, 'data', 'update.json'),
  scheduleJsonPath: path.join(__dirname, 'data', '2025-schedule.json'),
  season: '2025'
};

/**
 * Make HTTPS request to the API
 */
function makeApiRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: CONFIG.apiBaseUrl,
      path: endpoint,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse JSON response'));
          }
        } else {
          reject(new Error(`API returned status code ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Fetch Kentucky team stats and rankings
 */
async function fetchTeamStats() {
  console.log('Fetching Kentucky team stats...');
  
  try {
    // Try different common endpoints
    const endpoints = [
      `/teams/${CONFIG.kentuckyTeamId}/stats?season=${CONFIG.season}`,
      `/v1/teams/${CONFIG.kentuckyTeamId}/stats?season=${CONFIG.season}`,
      `/api/teams/${CONFIG.kentuckyTeamId}?season=${CONFIG.season}`,
      `/teams/stats?team=${CONFIG.kentuckyTeamId}&season=${CONFIG.season}`
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const data = await makeApiRequest(endpoint);
        return data;
      } catch (error) {
        console.log(`Endpoint failed: ${endpoint} - ${error.message}`);
      }
    }

    throw new Error('All endpoints failed');
  } catch (error) {
    console.error('Error fetching team stats:', error.message);
    return null;
  }
}

/**
 * Fetch team schedule and results
 */
async function fetchSchedule() {
  console.log('Fetching Kentucky schedule...');
  
  try {
    const endpoints = [
      `/teams/${CONFIG.kentuckyTeamId}/schedule?season=${CONFIG.season}`,
      `/v1/teams/${CONFIG.kentuckyTeamId}/schedule?season=${CONFIG.season}`,
      `/api/schedule?team=${CONFIG.kentuckyTeamId}&season=${CONFIG.season}`,
      `/schedule/${CONFIG.kentuckyTeamId}?season=${CONFIG.season}`
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const data = await makeApiRequest(endpoint);
        return data;
      } catch (error) {
        console.log(`Endpoint failed: ${endpoint} - ${error.message}`);
      }
    }

    throw new Error('All endpoints failed');
  } catch (error) {
    console.error('Error fetching schedule:', error.message);
    return null;
  }
}

/**
 * Update the update.json file with new stats
 */
function updateStatsFile(statsData) {
  console.log('Updating stats file...');
  
  try {
    // Read existing data
    const existingData = JSON.parse(fs.readFileSync(CONFIG.updateJsonPath, 'utf8'));
    
    // Update 2025 stats (you'll need to map the API response to your format)
    // This is a template - adjust based on actual API response structure
    if (statsData && statsData.stats) {
      existingData['2025'].stats = {
        "Offensive Rating": { 
          "value": statsData.stats.offensiveRating || existingData['2025'].stats['Offensive Rating'].value,
          "rank": statsData.stats.offensiveRatingRank || existingData['2025'].stats['Offensive Rating'].rank
        },
        "Defensive Rating": { 
          "value": statsData.stats.defensiveRating || existingData['2025'].stats['Defensive Rating'].value,
          "rank": statsData.stats.defensiveRatingRank || existingData['2025'].stats['Defensive Rating'].rank
        },
        // Add other stats mappings here
        ...existingData['2025'].stats
      };
    }

    if (statsData && statsData.rankings) {
      existingData['2025'].rankings = {
        "Overall Record": statsData.rankings.record || existingData['2025'].rankings['Overall Record'],
        "KenPom": statsData.rankings.kenpom || existingData['2025'].rankings.KenPom,
        "NET Rankings": statsData.rankings.net || existingData['2025'].rankings['NET Rankings'],
        // Add other ranking mappings here
        ...existingData['2025'].rankings
      };
    }

    // Write updated data
    fs.writeFileSync(CONFIG.updateJsonPath, JSON.stringify(existingData, null, 4));
    console.log('Stats file updated successfully!');
    return true;
  } catch (error) {
    console.error('Error updating stats file:', error.message);
    return false;
  }
}

/**
 * Update the 2025-schedule.json file with game results
 */
function updateScheduleFile(scheduleData) {
  console.log('Updating schedule file...');
  
  try {
    // Read existing schedule
    const existingSchedule = JSON.parse(fs.readFileSync(CONFIG.scheduleJsonPath, 'utf8'));
    
    if (!scheduleData || !Array.isArray(scheduleData.games)) {
      console.log('No schedule data to update');
      return false;
    }

    // Update each game with results from API
    for (const apiGame of scheduleData.games) {
      // Find matching game in schedule
      const scheduleGame = existingSchedule.find(game => {
        // Match by date and opponent
        const gameDate = new Date(game.date);
        const apiDate = new Date(apiGame.date);
        return gameDate.toDateString() === apiDate.toDateString();
      });

      if (scheduleGame && apiGame.status === 'completed') {
        // Game has been played, update result
        const kentuckyScore = apiGame.homeTeam === 'Kentucky' ? apiGame.homeScore : apiGame.awayScore;
        const opponentScore = apiGame.homeTeam === 'Kentucky' ? apiGame.awayScore : apiGame.homeScore;
        
        scheduleGame.result = kentuckyScore > opponentScore 
          ? `W ${kentuckyScore}-${opponentScore}`
          : `L ${kentuckyScore}-${opponentScore}`;
        
        console.log(`Updated: ${scheduleGame.date} - ${scheduleGame.result}`);
      }
    }

    // Write updated schedule
    fs.writeFileSync(CONFIG.scheduleJsonPath, JSON.stringify(existingSchedule, null, 4));
    console.log('Schedule file updated successfully!');
    return true;
  } catch (error) {
    console.error('Error updating schedule file:', error.message);
    return false;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('=== Kentucky Basketball Data Updater ===');
  console.log(`Started at: ${new Date().toLocaleString()}`);
  console.log('');

  // Ensure data directory exists
  if (!fs.existsSync(CONFIG.dataDir)) {
    fs.mkdirSync(CONFIG.dataDir, { recursive: true });
  }

  try {
    // Fetch and update stats
    const statsData = await fetchTeamStats();
    if (statsData) {
      updateStatsFile(statsData);
    }

    // Fetch and update schedule
    const scheduleData = await fetchSchedule();
    if (scheduleData) {
      updateScheduleFile(scheduleData);
    }

    console.log('');
    console.log('=== Update Complete ===');
    console.log(`Finished at: ${new Date().toLocaleString()}`);
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, fetchTeamStats, fetchSchedule, updateStatsFile, updateScheduleFile };
