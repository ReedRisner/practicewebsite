document.addEventListener('DOMContentLoaded', function() {
    const seasonSelect = document.getElementById('seasonSelect');
    let rankingsData = {};

    // Fetch data from data/update.json
    fetch('../data/update.json')
        .then(response => response.json())
        .then(data => {
            rankingsData = data;
            updateRankings(seasonSelect.value);
        })
        .catch(error => console.error('Error loading data:', error));

    seasonSelect.addEventListener('change', function() {
        updateRankings(this.value);
    });

    function updateRankings(season) {
        if (!rankingsData[season]) return;
        
        document.querySelectorAll('.ranking-card').forEach(card => {
            const title = card.querySelector('h3').textContent;
            const valueElement = card.querySelector('.ranking-value');
            valueElement.textContent = rankingsData[season].rankings[title] || '-';
        });
    }
});