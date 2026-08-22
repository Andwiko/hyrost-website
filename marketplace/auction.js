document.addEventListener('DOMContentLoaded', () => {
    const auctionGrid = document.getElementById('auctionGrid');
    const bidModal = document.getElementById('bidModal');
    const closeModalBtn = document.querySelector('.close-modal');
    const confirmBidBtn = document.getElementById('confirmBidBtn');
    const bidAmountInput = document.getElementById('bidAmount');

    let items = [];
    let activeItem = null;

    loadAuctions();
    
    // Start Timer Loop
    setInterval(updateTimers, 1000);

    async function loadAuctions() {
        if (!auctionGrid) return;
        auctionGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#9ca3af;padding:40px;"><i class="fas fa-spinner fa-spin"></i> Memuat lelang...</p>';

        try {
            const res = await fetch('/api/features/auctions');
            if (res.ok) {
                const data = await res.json();
                const rows = data.auctions || [];
                items = rows.map((row) => ({
                        id: row.id,
                        name: row.item_name,
                        image: row.image_url || 'https://mc-heads.net/avatar/Steve/128.png',
                        rarity: row.price_type || 'bronze',
                        currentBid: row.current_bid || row.price_coin || 0,
                        bidder: row.seller_name || '-',
                        endTime: row.auction_ends_at ? new Date(row.auction_ends_at).getTime() : Date.now() + 86400000,
                    }));
            }
        } catch (_) {}

        renderAuctions();
    }

    function renderAuctions() {
        if(!auctionGrid) return;
        auctionGrid.innerHTML = '';

        if (!items.length) {
            auctionGrid.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:48px 24px;color:#9ca3af;">
                    <i class="fas fa-gavel" style="font-size:2.5rem;margin-bottom:12px;color:#6366f1;"></i>
                    <p>Belum ada lelang aktif saat ini.</p>
                    <p style="font-size:0.85rem;margin-top:8px;">Listing lelang akan muncul di sini setelah fitur backend tersedia.</p>
                </div>`;
            return;
        }

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
        confirmBidBtn.addEventListener('click', async () => {
            if(!activeItem) return;

            const bidVal = parseInt(bidAmountInput.value, 10);
            if(bidVal <= activeItem.currentBid) {
                alert('Tawaran harus lebih tinggi dari harga saat ini!');
                return;
            }

            const token = localStorage.getItem('hyrostToken');
            if (!token) { alert('Login diperlukan untuk bid'); return; }

            try {
                const res = await fetch(`/api/features/auctions/${activeItem.id}/bid`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: bidVal }),
                });
                const data = await res.json();
                if (data.success) {
                    alert(data.message || 'Bid berhasil!');
                    bidModal.classList.remove('active');
                    loadAuctions();
                } else {
                    alert(data.message || 'Bid gagal');
                }
            } catch (_) {
                alert('Gagal mengirim bid');
            }
        });
    }
});
