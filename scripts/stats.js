document.addEventListener('DOMContentLoaded', function() {
    const seasonSelect = document.getElementById('seasonSelect');
    let statsData = {};

    // Fetch data from data/update.json
    fetch('../data/update.json')
        .then(response => response.json())
        .then(data => {
            statsData = data;
            updateStats(seasonSelect.value);
        })
        .catch(error => console.error('Error loading data:', error));

    seasonSelect.addEventListener('change', function() {
        updateStats(this.value);
    });

    function updateStats(season) {
        if (!statsData[season]) return;
        
        document.querySelectorAll('.stat-card').forEach(card => {
            const title = card.querySelector('h3').textContent;
            const valueElement = card.querySelector('.stat-value');
            const rankElement = card.querySelector('.stat-ranking');
            const data = statsData[season].stats[title] || { value: '-', rank: '-' };
            
            // Update value
            let displayValue = data.value;
            if (title.includes('%') || ['3P%', '2P%', 'FT%', 'Offensive TOV%', 'Defensive TOV%'].includes(title)) {
                displayValue = displayValue.replace('%', '');
                valueElement.classList.add('percent-value');
            } else {
                valueElement.classList.remove('percent-value');
            }
            valueElement.textContent = displayValue;
            
            // Update ranking
            rankElement.textContent = `(#${data.rank})`;
        });
    }
});