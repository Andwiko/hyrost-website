const API_URL = '/api';
const token = localStorage.getItem('hyrostToken');

document.addEventListener('DOMContentLoaded', async () => {
    const claimBtn = document.getElementById('claimBtn');
    const streakCountEl = document.getElementById('streakCount');
    const rewardsGrid = document.getElementById('rewardsGrid');
    const timerText = document.getElementById('nextRewardTimer');
    const timerContainer = document.getElementById('timerText');
    const streakProgressFill = document.getElementById('streakProgressFill');
    const streakPercentText = document.getElementById('streakPercentText');

    let isClaimable = false;
    let timeUntilNext = 0;
    let currentStreakDay = 1;

    const streakConfig = [
        { day: 1, title: "Hari 1", reward: "5 Bronze", icon: "fa-coins", color: "#cd7f32" },
        { day: 2, title: "Hari 2", reward: "10 Bronze", icon: "fa-coins", color: "#cd7f32" },
        { day: 3, title: "Hari 3", reward: "15 Bronze", icon: "fa-coins", color: "#cd7f32" },
        { day: 4, title: "Hari 4", reward: "1 Silver", icon: "fa-coins", color: "#c0c0c0" },
        { day: 5, title: "Hari 5", reward: "25 Bronze", icon: "fa-coins", color: "#cd7f32" },
        { day: 6, title: "Hari 6", reward: "2 Silver", icon: "fa-coins", color: "#c0c0c0" },
        { day: 7, title: "Hari 7 (Bonus)", reward: "1 Gold + Mystery Chest", icon: "fa-gem", color: "#ffd700" }
    ];

    // Load Initial Status
    await checkRewardStatus();

    // Start Live Timer
    setInterval(updateTimer, 1000);

    async function checkRewardStatus() {
        try {
            if (token) {
                const res = await fetch(`${API_URL}/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (res.ok) {
                    const user = await res.json();
                    
                    const lastClaim = user.lastClaimTime ? new Date(user.lastClaimTime).getTime() : 0;
                    const now = new Date().getTime();
                    const diff = now - lastClaim;
                    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
                    const TWO_DAYS_MS = 48 * 60 * 60 * 1000;

                    if (lastClaim === 0) {
                        currentStreakDay = 1;
                    } else if (diff < TWO_DAYS_MS) {
                        currentStreakDay = (user.streakCount || 1) % 7;
                        if (currentStreakDay === 0) currentStreakDay = 7;
                    } else {
                        currentStreakDay = 1;
                    }

                    if (diff >= ONE_DAY_MS || lastClaim === 0) {
                        isClaimable = true;
                        timeUntilNext = 0;
                    } else {
                        isClaimable = false;
                        timeUntilNext = ONE_DAY_MS - diff;
                    }
                    
                    updateUI();
                    return;
                }
            }
        } catch (e) {
            console.warn('Reward status unavailable:', e.message);
        }

        isClaimable = false;
        timeUntilNext = 0;
        updateUI();
    }

    function updateUI() {
        if (streakCountEl) streakCountEl.textContent = `${currentStreakDay} Hari`;
        const percent = Math.round((currentStreakDay / 7) * 100);
        if (streakProgressFill) streakProgressFill.style.width = `${percent}%`;
        if (streakPercentText) streakPercentText.textContent = `${percent}%`;

        if (isClaimable) {
            if (claimBtn) {
                claimBtn.disabled = false;
                claimBtn.innerHTML = '<i class="fas fa-hand-holding-usd"></i> KLAIM HADIAH HARIAN SEKARANG';
            }
            if (timerContainer) timerContainer.style.display = 'none';
        } else {
            if (claimBtn) {
                claimBtn.disabled = true;
                claimBtn.innerHTML = '<i class="fas fa-check-circle"></i> HADIAH SUDAH DIAMBIL HARI INI';
            }
            if (timerContainer) timerContainer.style.display = 'block';
        }
        
        // Render 7-Day Rewards Grid
        if (rewardsGrid) {
            rewardsGrid.innerHTML = '';
            streakConfig.forEach(item => {
                const isPast = item.day < currentStreakDay || (!isClaimable && item.day === currentStreakDay);
                const isCurrent = item.day === currentStreakDay && isClaimable;

                const card = document.createElement('div');
                card.className = `reward-card ${isCurrent ? 'active' : ''} ${isPast ? 'claimed' : ''}`;
                card.innerHTML = `
                    <div class="day-label">${item.title}</div>
                    <div class="reward-icon"><i class="fas ${item.icon}" style="color: ${item.color};"></i></div>
                    <div class="reward-amount" style="color:#fff; font-weight:700;">${item.reward}</div>
                `;
                rewardsGrid.appendChild(card);
            });
        }
    }

    function updateTimer() {
        if (isClaimable) return;
        
        if (timeUntilNext > 0) {
            timeUntilNext -= 1000;
            
            const h = Math.floor((timeUntilNext % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((timeUntilNext % (1000 * 60)) / 1000);
            
            const pad = (n) => String(n).padStart(2, '0');
            if (timerText) timerText.textContent = `${pad(h)}j ${pad(m)}m ${pad(s)}d`;
        } else {
            isClaimable = true;
            updateUI();
        }
    }

    if (claimBtn) {
        claimBtn.addEventListener('click', async () => {
            if (!isClaimable) return;

            claimBtn.disabled = true;
            claimBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengklaim Hadiah...';

            try {
                if (token) {
                    const res = await fetch(`${API_URL}/users/daily-claim`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (res.ok) {
                        const data = await res.json();
                        isClaimable = false;
                        if (typeof confetti === 'function') {
                            confetti({ particleCount: 180, spread: 90, origin: { y: 0.6 } });
                        }
                        await checkRewardStatus();
                        alert(`🎉 ${data.message || 'Hadiah harian berhasil diklaim!'}`);
                        return;
                    }
                    const errData = await res.json().catch(() => ({}));
                    alert(errData.message || 'Gagal mengklaim hadiah.');
                } else {
                    alert('Silakan login terlebih dahulu.');
                }
            } catch (e) {
                alert('Gagal terhubung ke server. Coba lagi nanti.');
            }

            claimBtn.disabled = false;
            claimBtn.innerHTML = '<i class="fas fa-hand-holding-usd"></i> KLAIM HADIAH HARIAN SEKARANG';
        });
    }
});
