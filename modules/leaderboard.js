const API_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.filter-tab');
    const rankingList = document.getElementById('rankingList');
    
    // Initial Render
    fetchLeaderboard('wealth');

    // Tab Switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            fetchLeaderboard(tab.dataset.filter);
        });
    });

    async function fetchLeaderboard(criteria) {
        if (rankingList) {
            rankingList.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:24px; color:#9ca3af;"><i class="fas fa-spinner fa-spin"></i> Memuat data leaderboard...</td></tr>';
        }

        let registeredUsers = [];
        try {
            const res = await fetch(`${API_URL}/users/leaderboard?type=${criteria}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    registeredUsers = data;
                }
            }
        } catch (e) {}

        // Show empty state when API has no data
        if (registeredUsers.length === 0) {
            updatePodium([], criteria);
            if (rankingList) {
                rankingList.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:24px; color:#9ca3af;"><i class="fas fa-info-circle"></i> Belum ada data leaderboard.</td></tr>';
            }
            return;
        }

        const uniqueUsersMap = new Map();
        registeredUsers.forEach(p => {
            const nameKey = (p.name || p.username || '').toLowerCase().trim();
            if (nameKey && !uniqueUsersMap.has(nameKey)) {
                uniqueUsersMap.set(nameKey, {
                    id: p.id,
                    name: p.name || p.username || 'User',
                    role: p.role || 'Member',
                    wealth: parseInt(p.wealth || 0),
                    level: p.level || 1,
                    quests: p.quests || 0,
                    avatar_url: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || 'User')}&background=6366f1&color=fff`
                });
            }
        });

        const finalUsersList = Array.from(uniqueUsersMap.values());

        // Sort dynamically based on selected criteria
        finalUsersList.sort((a, b) => {
            if (criteria === 'wealth') return (b.wealth || 0) - (a.wealth || 0);
            if (criteria === 'level') return (b.level || 1) - (a.level || 1);
            if (criteria === 'quests') return (b.quests || 0) - (a.quests || 0);
            return (b.wealth || 0) - (a.wealth || 0);
        });

        updatePodium(finalUsersList.slice(0, 3), criteria);
        renderRankingTable(finalUsersList, criteria);
    }

    function renderRankingTable(players, criteria) {
        if (!rankingList) return;
        rankingList.innerHTML = '';
        const listPlayers = players.slice(3);
        if (listPlayers.length === 0) {
            rankingList.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#6b7280; font-size:0.85rem;"><i class="fas fa-info-circle"></i> Belum ada pemain tambahan di luar 3 Besar Podium.</td></tr>';
            return;
        }

        listPlayers.forEach((player, index) => {
            const rank = 4 + index;
            const row = document.createElement('tr');
            
            let statDisplay = '';
            if (criteria === 'wealth') statDisplay = `${parseInt(player.wealth || 0).toLocaleString()} Koin`;
            else if (criteria === 'level') statDisplay = `Level ${player.level || 1}`;
            else if (criteria === 'quests') statDisplay = `${player.quests || 0} Quests`;

            const userRole = player.role || 'Member';
            let roleBadgeStyle = 'background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3);';
            if (userRole.toLowerCase() === 'admin') {
                roleBadgeStyle = 'background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);';
            } else if (userRole.toLowerCase() === 'vip') {
                roleBadgeStyle = 'background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);';
            }

            const avatar = player.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || 'P')}&background=6366f1&color=fff`;

            row.innerHTML = `
                <td style="font-weight:700; color:var(--text-dim, #9ca3af);">#${rank}</td>
                <td>
                    <div class="player-cell">
                        <img src="${avatar}" alt="${player.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || 'P')}&background=6366f1&color=fff'">
                        <div style="display:flex; flex-direction:column; gap:2px;">
                            <span style="font-weight:700; color:#fff;">${player.name}</span>
                            <span style="font-size:0.75rem; color:#9ca3af; font-weight:600;">${userRole}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:6px; text-transform:uppercase; ${roleBadgeStyle}">
                        ${userRole}
                    </span>
                </td>
                <td style="font-weight:700; color:var(--accent-gold, #f59e0b);">${statDisplay}</td>
            `;
            rankingList.appendChild(row);
        });
    }

    function updatePodium(top3, criteria) {
        const getStat = (p) => {
            if (criteria === 'wealth') return `${parseInt(p.wealth || 0).toLocaleString()} Koin`;
            if (criteria === 'level') return `Level ${p.level || 1}`;
            if (criteria === 'quests') return `${p.quests || 0} Quests`;
        };

        const gold = document.querySelector('.podium-item.rank-1');
        const silver = document.querySelector('.podium-item.rank-2');
        const bronze = document.querySelector('.podium-item.rank-3');

        if (gold) updatePodiumCard(gold, top3[0], getStat);
        if (silver) updatePodiumCard(silver, top3[1], getStat);
        if (bronze) updatePodiumCard(bronze, top3[2], getStat);
    }

    function updatePodiumCard(card, player, getStatFn) {
        if (!card) return;
        if (!player) {
            card.style.opacity = '0.3';
            const nameEl = card.querySelector('.podium-name');
            const scoreEl = card.querySelector('.podium-score');
            if (nameEl) nameEl.textContent = 'Kosong';
            if (scoreEl) scoreEl.textContent = '-';
            return;
        }
        card.style.opacity = '1';

        const nameEl = card.querySelector('.podium-name');
        const roleEl = card.querySelector('.podium-role');
        const scoreEl = card.querySelector('.podium-score');
        const img = card.querySelector('img');

        if (nameEl) nameEl.textContent = player.name;
        if (scoreEl) scoreEl.textContent = getStatFn(player);

        const userRole = player.role || 'Member';
        if (roleEl) {
            roleEl.textContent = userRole;
            roleEl.className = 'podium-role';
            if (userRole.toLowerCase() === 'admin') roleEl.classList.add('role-admin');
            else if (userRole.toLowerCase() === 'vip') roleEl.classList.add('role-vip');
        }

        if (img) {
            img.src = player.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=6366f1&color=fff`;
            img.onerror = () => { img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=6366f1&color=fff`; };
        }
    }
});
