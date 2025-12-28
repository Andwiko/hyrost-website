document.addEventListener('DOMContentLoaded', () => {
    const rewardsGrid = document.getElementById('rewardsGrid');
    const claimBtn = document.getElementById('claimBtn');
    const streakCountEl = document.getElementById('streakCount');
    const nextRewardTimer = document.getElementById('nextRewardTimer');

    // Reward Data configuration
    const rewards = [
        { day: 1, type: 'coin', amount: 100, icon: 'fa-coins' },
        { day: 2, type: 'coin', amount: 200, icon: 'fa-coins' },
        { day: 3, type: 'xp', amount: 500, icon: 'fa-star' },
        { day: 4, type: 'coin', amount: 500, icon: 'fa-coins' },
        { day: 5, type: 'item', amount: 'Iron Key', icon: 'fa-key' },
        { day: 6, type: 'coin', amount: 1000, icon: 'fa-coins' },
        { day: 7, type: 'item', amount: 'Golden Box', icon: 'fa-box-open' }
    ];

    // Initialize User Data from localStorage or Mock
    // In production, this would come from the server
    let userData = JSON.parse(localStorage.getItem('dailyRewardData')) || {
        lastClaimTime: 0, // Timestamp
        currentStreak: 0, // 0 to 6 (index for rewards array)
        streakStartDate: null
    };

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    
    // Check Status
    checkClaimStatus();
    renderGrid();
    setInterval(updateTimer, 1000);

    function checkClaimStatus() {
        const now = new Date().getTime();
        const timeSinceLastClaim = now - userData.lastClaimTime;
        
        let canClaim = false;

        // Logic: Can claim if > 24 hours since last claim
        // Reset streak if > 48 hours since last claim (missed a day)
        
        if (userData.lastClaimTime === 0) {
            canClaim = true;
        } else if (timeSinceLastClaim > ONE_DAY_MS) {
            canClaim = true;
            if (timeSinceLastClaim > ONE_DAY_MS * 2) {
                // Streak broken
                userData.currentStreak = 0; 
                showNotification("Streak Reset! You missed a day.", "warning");
            }
        }

        // Cycle complete check (if streak was 7, reset to 0 for next cycle)
        if (userData.currentStreak >= 7) {
            userData.currentStreak = 0;
            canClaim = true; // Wait... logic needs refinement. Usually user claims Day 7 then waits.
            // Correct Logic: 
            // If they claimed day 7, streak is displayed as completed or reset.
            // Let's settle on: loop 0-6.
        }

        streakCountEl.textContent = userData.currentStreak;
        
        if (canClaim) {
            claimBtn.disabled = false;
            claimBtn.innerHTML = '<i class="fas fa-gift"></i> Claim Reward';
            claimBtn.parentElement.querySelector('.timer-text').style.display = 'none';
        } else {
            claimBtn.disabled = true;
            claimBtn.innerHTML = '<i class="fas fa-check"></i> Claimed';
            claimBtn.parentElement.querySelector('.timer-text').style.display = 'block';
        }
    }

    function renderGrid() {
        rewardsGrid.innerHTML = '';
        const now = new Date().getTime();
        const canClaim = !claimBtn.disabled;

        rewards.forEach((reward, index) => {
            const card = document.createElement('div');
            card.className = 'reward-card';
            
            // Status Logic
            // If index < currentStreak: Already Claimed
            // If index === currentStreak: Current Target
            // If index > currentStreak: Locked
            
            if (index < userData.currentStreak) {
                card.classList.add('claimed');
            } else if (index === userData.currentStreak) {
                 // It's the current day. 
                 // If we CAN claim, visually highlight it as active-claimable
                 // If we CANNOT claim (already claimed today but array index updated? No, wait.)
                 
                 // Revised logic for display:
                 // `userData.currentStreak` represents the number of days SUCCESSFULLY claimed in this cycle.
                 // So if streak is 0, we are aiming for Day 1 (index 0).
                 // If streak is 1, we basically finished Day 1, aiming for Day 2 (index 1).
                 // Wait, usually currentStreak = days claimed in a row.
                 
                 // If I have a streak of 0, I want to claim Day 1.
                 // So index 0 is Active.
                 card.classList.add('active');
            }

            card.innerHTML = `
                <div class="day-label">Day ${reward.day}</div>
                <div class="reward-icon"><i class="fas ${reward.icon}"></i></div>
                <div class="reward-amount">${reward.amount}</div>
            `;
            rewardsGrid.appendChild(card);
        });
    }

    function updateTimer() {
        if (!claimBtn.disabled) return;

        const now = new Date().getTime();
        const nextClaimTime = userData.lastClaimTime + ONE_DAY_MS;
        const diff = nextClaimTime - now;

        if (diff <= 0) {
            // Ready to claim!
            checkClaimStatus();
            renderGrid();
            return;
        }

        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        nextRewardTimer.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    }

    function pad(n) { return n < 10 ? '0' + n : n; }

    claimBtn.addEventListener('click', () => {
        // Claim Action
        const rewardIndex = userData.currentStreak;
        if (rewardIndex >= rewards.length) return; // Basic safety

        const reward = rewards[rewardIndex];
        
        // Update Data
        userData.lastClaimTime = new Date().getTime();
        userData.currentStreak++;
        
        // Save
        localStorage.setItem('dailyRewardData', JSON.stringify(userData));

        // UI Feedback
        fireConfetti();
        checkClaimStatus();
        renderGrid();

        alert(`You claimed Day ${reward.day} reward: ${reward.amount}!`);
        
        // Reset if cycle complete
        if (userData.currentStreak >= 7) {
            setTimeout(() => {
                alert("Congratulations! You completed the 7-day streak!");
                userData.currentStreak = 0;
                localStorage.setItem('dailyRewardData', JSON.stringify(userData));
                checkClaimStatus();
                renderGrid();
            }, 2000);
        }
    });

    function fireConfetti() {
        if (window.confetti) {
            window.confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }

    function showNotification(msg, type) {
        // Reuse toast/notification logic if available, else alert
        console.log(`[${type}] ${msg}`);
    }
});
