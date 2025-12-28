const mockPlayers = [
    { name: "TopPlayer", level: 50, wealth: 1000000, quests: 120, guild: "Kings" },
    { name: "PlayerTwo", level: 48, wealth: 850000, quests: 110, guild: "Knights" },
    { name: "PlayerThree", level: 45, wealth: 720000, quests: 95, guild: "Mages" },
    { name: "Miner99", level: 42, wealth: 600000, quests: 80, guild: "Miners" },
    { name: "PvPGod", level: 41, wealth: 550000, quests: 75, guild: "Warriors" },
    { name: "TraderJoe", level: 40, wealth: 900000, quests: 50, guild: "Merchants" },
    { name: "ExplorerX", level: 38, wealth: 300000, quests: 150, guild: "Scouts" },
    { name: "NoobMaster", level: 20, wealth: 50000, quests: 10, guild: "None" },
    { name: "BuilderBob", level: 35, wealth: 450000, quests: 60, guild: "Builders" },
    { name: "RedstonePro", level: 39, wealth: 480000, quests: 85, guild: "Engineers" }
];

document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.filter-tab');
    const rankingList = document.getElementById('rankingList');
    
    // Initial Render
    renderLeaderboard('wealth');

    // Tab Switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderLeaderboard(tab.dataset.filter);
        });
    });

    function renderLeaderboard(criteria) {
        // Sort players
        let sortedPlayers = [...mockPlayers].sort((a, b) => b[criteria] - a[criteria]);

        // Update Podium (Top 3)
        // Note: For simplicity we update text content of existing podium elements
        // In a real expanded app, we might re-render these dynamically too if structure differs
        updatePodium(sortedPlayers.slice(0, 3), criteria);

        // Render List (Rank 4+)
        rankingList.innerHTML = '';
        sortedPlayers.slice(3).forEach((player, index) => {
            const rank = index + 4;
            const item = document.createElement('div');
            item.className = 'rank-item';
            
            let statDisplay = '';
            if (criteria === 'wealth') statDisplay = `$${player.wealth.toLocaleString()}`;
            if (criteria === 'level') statDisplay = `Lvl ${player.level}`;
            if (criteria === 'quests') statDisplay = `${player.quests} Quests`;

            item.innerHTML = `
                <div class="rank-number">#${rank}</div>
                <div class="rank-user">
                    <img src="https://cravatar.eu/avatar/${player.name}/40.png" alt="${player.name}">
                    <div class="rank-details">
                        <span class="rank-username">${player.name}</span>
                        <span class="rank-guild">${player.guild}</span>
                    </div>
                </div>
                <div class="rank-stat">${statDisplay}</div>
            `;
            rankingList.appendChild(item);
        });
    }

    function updatePodium(top3, criteria) {
        // Map criteria to display text
        const getStat = (p) => {
            if (criteria === 'wealth') return `$${p.wealth.toLocaleString()}`;
            if (criteria === 'level') return `Level ${p.level}`;
            if (criteria === 'quests') return `${p.quests} Quests`;
        };

        // Selectors for podium items (assuming order: silver(1), gold(0), bronze(2) in DOM is actually 2, 1, 3 physically but lets match by class)
        const gold = document.querySelector('.podium-item.gold');
        const silver = document.querySelector('.podium-item.silver');
        const bronze = document.querySelector('.podium-item.bronze');

        if (top3[0]) updatePodiumCard(gold, top3[0], getStat(top3[0]));
        if (top3[1]) updatePodiumCard(silver, top3[1], getStat(top3[1]));
        if (top3[2]) updatePodiumCard(bronze, top3[2], getStat(top3[2]));
    }

    function updatePodiumCard(card, player, stat) {
        card.querySelector('.player-name').textContent = player.name;
        card.querySelector('.player-score').textContent = stat;
        card.querySelector('img').src = `https://cravatar.eu/avatar/${player.name}/80.png`;
    }
});
