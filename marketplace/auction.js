document.addEventListener('DOMContentLoaded', () => {
    const auctionGrid = document.getElementById('auctionGrid');
    const bidModal = document.getElementById('bidModal');
    const closeModalBtn = document.querySelector('.close-modal');
    const confirmBidBtn = document.getElementById('confirmBidBtn');
    const bidAmountInput = document.getElementById('bidAmount');
    
    // Mock Data
    let items = [
        {
            id: 1,
            name: "Dragon Slayer Sword",
            image: "https://minecraft.wiki/images/Netherite_Sword_JE2_BE2.png",
            rarity: "legendary",
            currentBid: 5000,
            bidder: "TopG_Player",
            endTime: new Date().getTime() + 1000 * 60 * 60 * 2 // 2 hours from now
        },
        {
            id: 2,
            name: "Elytra Wings",
            image: "https://minecraft.wiki/images/Elytra_JE2_BE2.png",
            rarity: "epic",
            currentBid: 12500,
            bidder: "FlyMaster99",
            endTime: new Date().getTime() + 1000 * 60 * 45 // 45 mins from now
        },
        {
            id: 3,
            name: "Enchanted Golden Apple",
            image: "https://minecraft.wiki/images/Enchanted_Golden_Apple_JE2_BE2.png",
            rarity: "rare",
            currentBid: 800,
            bidder: "NoobKiller",
            endTime: new Date().getTime() + 1000 * 60 * 5 // 5 mins (Urgent!)
        },
        {
            id: 4,
            name: "Netherite Chestplate",
            image: "https://minecraft.wiki/images/Netherite_Chestplate_JE2_BE2.png",
            rarity: "epic",
            currentBid: 4500,
            bidder: "TankBuild",
            endTime: new Date().getTime() + 1000 * 60 * 60 * 24 // 24 hours
        }
    ];

    let activeItem = null;

    // Initial Render
    renderAuctions();
    
    // Start Timer Loop
    setInterval(updateTimers, 1000);

    function renderAuctions() {
        if(!auctionGrid) return;
        auctionGrid.innerHTML = '';

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'auction-card';
            card.innerHTML = `
                <div class="card-image">
                    <span class="rarity-badge rarity-${item.rarity}">${item.rarity}</span>
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="card-body">
                    <h3>${item.name}</h3>
                    <div class="auction-stats">
                        <div class="stat-item">
                            <label>Current Bid</label>
                            <span class="price-current">${item.currentBid.toLocaleString()} G</span>
                        </div>
                        <div class="stat-item">
                            <label>Bidder</label>
                            <span>${item.bidder}</span>
                        </div>
                    </div>
                    <div class="timer-wrapper">
                        <div class="timer" id="timer-${item.id}" data-end="${item.endTime}">Loading...</div>
                    </div>
                    <button class="btn-bid" onclick="openBidModal(${item.id})">Place Bid</button>
                </div>
            `;
            auctionGrid.appendChild(card);
        });
    }

    function updateTimers() {
        items.forEach(item => {
            const timerEl = document.getElementById(`timer-${item.id}`);
            if (!timerEl) return;

            const now = new Date().getTime();
            const distance = item.endTime - now;

            if (distance < 0) {
                timerEl.innerHTML = "ENDED";
                timerEl.classList.add('urgent');
                return;
            }

            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            timerEl.innerHTML = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

            // Urgent styling if < 10 mins
            if (distance < 1000 * 60 * 10) {
                timerEl.classList.add('urgent');
            }
        });
    }

    function pad(num) {
        return num.toString().padStart(2, '0');
    }

    // Modal Application - Expose to global scope for onclick HTML
    window.openBidModal = function(id) {
        const item = items.find(i => i.id === id);
        if(!item) return;

        activeItem = item;
        
        document.getElementById('modalItemName').textContent = item.name;
        document.getElementById('modalItemImg').src = item.image;
        document.getElementById('modalCurrentBid').textContent = item.currentBid.toLocaleString();
        
        const minBid = item.currentBid + 50;
        document.getElementById('modalMinBid').textContent = minBid.toLocaleString();
        
        bidAmountInput.value = minBid;
        bidAmountInput.min = minBid;

        bidModal.classList.add('active');
    };

    if(closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            bidModal.classList.remove('active');
        });
    }
    
    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === bidModal) {
            bidModal.classList.remove('active');
        }
    });

    if(confirmBidBtn) {
        confirmBidBtn.addEventListener('click', () => {
            if(!activeItem) return;

            const bidVal = parseInt(bidAmountInput.value);
            if(bidVal <= activeItem.currentBid) {
                alert('Tawaran harus lebih tinggi dari harga saat ini!');
                return;
            }

            // Update Mock Data
            activeItem.currentBid = bidVal;
            activeItem.bidder = "You"; // In real app, current user
            
            // Re-render
            renderAuctions();
            updateTimers(); // Immediate update

            bidModal.classList.remove('active');
            alert(`Berhasil menawar ${activeItem.name} seharga ${bidVal} Gold!`);
        });
    }
});
