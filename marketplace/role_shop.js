
const API_URL = '/api';
const token = localStorage.getItem('hyrostToken');
const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
};

document.addEventListener('DOMContentLoaded', async () => {
    if (!token) {
        window.location.href = '../';
        return;
    }

    console.log('Role Shop Initializing...');
    await loadUserProfile();
    await loadShopRoles();
});

async function loadUserProfile() {
    // We reuse the basic info if available, or fetch it
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (user.id) {
        document.getElementById('userGold').textContent = user.coinGold || user.coin_gold || 0;
    }
}

async function loadShopRoles() {
    const grid = document.getElementById('roleShopGrid');
    if (!grid) return;

    try {
        const res = await fetch(`${API_URL}/store/ranks`);
        const data = await res.json();
        const roles = (data.ranks || []).filter(r => r.name !== 'Admin' && r.name !== 'Member');

        grid.innerHTML = '';

        if (roles.length === 0) {
            grid.innerHTML = '<p style="color:#888; text-align:center; padding:50px;">Belum ada gelar yang tersedia untuk dibeli.</p>';
            return;
        }

        roles.forEach(role => {
            const card = document.createElement('div');
            card.className = 'role-card';
            
            card.innerHTML = `
                <div class="role-content">
                    <div class="badge-preview" style="background: ${role.badge_color || '#888'}; color: white;">
                        ${role.badge_text || role.name}
                    </div>
                    <div class="role-name">${role.name}</div>
                    <div class="role-desc">${role.description || 'Gelar eksklusif untuk member Hyrost.'}</div>
                    
                    <div class="price-tag">
                        ${role.price_coin > 0 ? `
                        <div class="price-item">
                            <span class="price-label">Website Coins</span>
                            <span class="price-value"><i class="fas fa-coins"></i> ${role.price_coin} Gold</span>
                        </div>` : ''}
                        
                        ${role.price_idr > 0 ? `
                        <div class="price-item">
                            <span class="price-label">Donasi Server</span>
                            <span class="price-value">Rp ${parseInt(role.price_idr).toLocaleString()}</span>
                        </div>` : ''}
                    </div>

                    <div style="display:flex; flex-direction:column; gap:10px;">
                        ${role.price_coin > 0 ? `<button class="btn-buy btn-coin" onclick="openPurchase('coin', ${JSON.stringify(role).replace(/"/g, '&quot;')})">BELI DENGAN KOIN</button>` : ''}
                        ${role.price_idr > 0 ? `<button class="btn-buy btn-real" onclick="openPurchase('real', ${JSON.stringify(role).replace(/"/g, '&quot;')})">BELI DENGAN RUPIAH</button>` : ''}
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p style="color:red">Terjadi kesalahan saat memuat data toko.</p>';
    }
}

let selectedRole = null;
let selectedMethod = null;

window.openPurchase = (method, role) => {
    selectedRole = role;
    selectedMethod = method;
    
    const modal = document.getElementById('purchaseModal');
    const preview = document.getElementById('purchasePreview');
    
    preview.innerHTML = `
        <div class="badge-preview" style="background: ${role.badge_color || '#888'}; color: white; transform: scale(1.2);">
            ${role.badge_text || role.name}
        </div>
    `;
    
    document.getElementById('purchaseRoleName').textContent = role.name;
    document.getElementById('purchaseRoleDesc').textContent = role.description || 'Gelar eksklusif untuk warga Hyrost.';
    
    const coinOpt = document.getElementById('paymentOptionCoin');
    const realOpt = document.getElementById('paymentOptionReal');
    
    if (method === 'coin') {
        coinOpt.style.display = 'block';
        realOpt.style.display = 'none';
        document.getElementById('purchasePriceCoin').textContent = role.price_coin;
    } else {
        coinOpt.style.display = 'none';
        realOpt.style.display = 'block';
        document.getElementById('purchasePriceReal').textContent = parseInt(role.price_idr).toLocaleString();
    }
    
    modal.classList.add('active');
};

window.closePurchaseModal = () => {
    document.getElementById('purchaseModal').classList.remove('active');
};

document.getElementById('confirmPurchaseBtn').addEventListener('click', async () => {
    if (!selectedRole || !selectedMethod) return;

    try {
        const endpoint = selectedMethod === 'coin' ? '/store/buy-rank' : '/store/buy-rank-idr';
        const body = selectedMethod === 'coin'
            ? { rankName: selectedRole.name }
            : { rankName: selectedRole.name, paymentMethod: 'qris' };

        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        const data = await res.json();
        
        if (res.ok) {
            alert(data.message);
            // Update local UI
            closePurchaseModal();
            // Refresh coins display
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (selectedMethod === 'coin') {
                user.coin_gold -= selectedRole.price_coin;
                localStorage.setItem('currentUser', JSON.stringify(user));
                document.getElementById('userGold').textContent = user.coin_gold;
            }
            window.location.reload(); // Refresh to update role in all parts
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert("Gagal memproses pembelian. Silakan coba lagi.");
    }
});
