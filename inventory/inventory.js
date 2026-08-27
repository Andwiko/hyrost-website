document.addEventListener('DOMContentLoaded', function() {
    window.scrollTo(0, 0);
    checkAuthentication();
    setupSidebar();
    
    // Listen for updates from other scripts
    window.addEventListener('userProfileUpdated', () => {
        checkAuthentication();
        renderMinecraftConnectionStatus();
    });
    loadInventory();
    renderMinecraftConnectionStatus();
    checkGlobalSettings();
});

// Check authentication and load user data
function checkAuthentication() {
    const token = localStorage.getItem('hyrostToken');
    const currentUserStr = localStorage.getItem('currentUser');
    
    // Sync user data with server to get latest role/coins
    syncUserProfile();

    if (currentUserStr) {
        try {
            const currentUser = JSON.parse(currentUserStr);
            console.log('User loaded:', currentUser);
            
            if (currentUser && currentUser.role && currentUser.role.toString().toLowerCase() === 'admin') {
                document.body.classList.add('is-admin');
            } else {
                document.body.classList.remove('is-admin');
            }

            // Update UI with user info
            const userNameEl = document.getElementById('userName');
            const userRoleEl = document.getElementById('userRole');
            const userAvatarEl = document.getElementById('userAvatar');

            if (userNameEl) userNameEl.textContent = currentUser.username || currentUser.name || 'User';
            if (userRoleEl) userRoleEl.textContent = currentUser.role || 'Member';
            
            // Generate avatar if not present (simple using cravatar or similar)
            if (userAvatarEl) {
                userAvatarEl.src = currentUser.avatarUrl || `https://cravatar.eu/avatar/${currentUser.username || 'Steve'}/64.png`;
            }

            // Refresh sidebar with full link set
            refreshSidebar(currentUser.role);

        } catch (e) {
            console.error('Error parsing user data', e);
        }
    } else {
        // GUEST STATE
        const userNameEl = document.getElementById('userName');
        const userRoleEl = document.getElementById('userRole');
        const userAvatarEl = document.getElementById('userAvatar');

        if (userNameEl) userNameEl.textContent = 'Tamu';
        if (userRoleEl) userRoleEl.textContent = 'Penjelajah';
        if (userAvatarEl) userAvatarEl.src = 'https://cravatar.eu/avatar/Steve/64.png';
        
        refreshSidebar('guest');
    }
}

// Sidebar Functionality & Mobile Drawer Management
function setupSidebar() {
    if (window.HyrostMobileLayout) {
        HyrostMobileLayout.init();
        return;
    }
    const sidebar = document.querySelector('.sidebar') || document.getElementById('sidebar');
    if (!sidebar) return;

    let overlay = document.getElementById('sidebarOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebarOverlay';
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }

    let lastToggle = 0;
    const toggleSidebar = (e) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        const now = Date.now();
        if (now - lastToggle < 180) return;
        lastToggle = now;

        const isOpen = sidebar.classList.contains('active') || sidebar.classList.contains('open') || sidebar.classList.contains('mobile-open');
        if (isOpen) {
            sidebar.classList.remove('active', 'open', 'mobile-open');
            overlay.classList.remove('active', 'open');
            document.body.style.overflow = '';
        } else {
            sidebar.classList.add('active', 'open', 'mobile-open');
            overlay.classList.add('active', 'open');
            document.body.style.overflow = 'hidden';
        }
    };

    window.toggleMobileSidebar = toggleSidebar;

    const toggleBtns = document.querySelectorAll('#sidebarToggle, .sidebar-toggle, .hamburger, [data-toggle="sidebar"], .mobile-header .btn-header-action');
    
    toggleBtns.forEach(btn => {
        if (btn.classList.contains('mobile-logout-btn') || btn.title === 'Keluar') return;
        if (btn.getAttribute('data-bound')) return;
        btn.setAttribute('data-bound', 'true');
        btn.addEventListener('click', toggleSidebar);
    });

    overlay.addEventListener('click', (e) => {
        if (e) e.stopPropagation();
        sidebar.classList.remove('active', 'open', 'mobile-open');
        overlay.classList.remove('active', 'open');
        document.body.style.overflow = '';
    });

    const navItems = sidebar.querySelectorAll('.nav-item, a');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 992) {
                sidebar.classList.remove('active', 'open', 'mobile-open');
                overlay.classList.remove('active', 'open');
                document.body.style.overflow = '';
            }
        });
    });
}

// Comprehensive Sidebar Management (Matching Admin Design)
function refreshSidebar(role) {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    const path = window.location.pathname.toLowerCase().replace(/\\/g, '/');
    const isSubdir = path.includes('/account/') || path.includes('/modules/') || path.includes('/inventory/') || path.includes('/marketplace/') || path.includes('/auth/');
    const logoSrc = isSubdir ? '../assets/images/hyrost.png' : 'assets/images/hyrost.png';

    // Upgrade header branding to match admin sidebar header
    let header = sidebar.querySelector('.sidebar-header');
    if (header) {
        header.className = 'sidebar-header';
        header.innerHTML = `
            <img src="${logoSrc}" alt="Hyrost Logo" onerror="this.src='https://ui-avatars.com/api/?name=H&background=6366f1&color=fff'">
            <div class="brand-text">
                <h2>Hyrost</h2>
                <span>Member Realm</span>
            </div>
        `;
    }

    const nav = sidebar.querySelector('.sidebar-nav');
    if (!nav) return;

    if (role && role.toString().toLowerCase() === 'admin') {
        document.body.classList.add('is-admin');
    } else {
        document.body.classList.remove('is-admin');
    }

    const links = [
        { name: 'Dashboard', icon: 'fa-chart-pie', href: '/dashboard.html', pageKey: 'dashboard' },
        { name: 'Profil Saya', icon: 'fa-user-circle', href: '/account/index.html', pageKey: 'account' },
        { name: 'Toko Pangkat', icon: 'fa-crown', href: '/modules/store.html', pageKey: 'store', iconStyle: 'color:var(--accent-gold);' },
        { name: 'Forum', icon: 'fa-comments', href: '/modules/forum.html', pageKey: 'forum' },
        { name: 'Galeri Build', icon: 'fa-cubes-stacked', href: '/modules/showcase.html', pageKey: 'showcase', iconStyle: 'color:var(--accent-cyan);' },
        { name: '3D Skin Studio', icon: 'fa-person-running', href: '/modules/skin-studio.html', pageKey: 'skin-studio', iconStyle: 'color:var(--accent-pink, #ec4899);' },
        { name: 'Live Map', icon: 'fa-map-location-dot', href: '/modules/map.html', pageKey: 'map', iconStyle: 'color:var(--accent-emerald-light);' },
        { name: 'Leaderboard', icon: 'fa-trophy', href: '/modules/leaderboard.html', pageKey: 'leaderboard' },
        { name: 'Inventaris', icon: 'fa-box', href: '/inventory/inventory.html', pageKey: 'inventory' },
        { name: 'Marketplace', icon: 'fa-store', href: '/marketplace/index.html', pageKey: 'marketplace' },
        { name: 'Daily Rewards', icon: 'fa-gift', href: '/modules/rewards.html', pageKey: 'rewards' },
        { name: 'Wiki & Guide', icon: 'fa-book', href: '/modules/wiki.html', pageKey: 'wiki' },
        { name: 'Pertemanan', icon: 'fa-users', href: '/modules/social.html', pageKey: 'social' },
        { name: 'Pusat Bantuan', icon: 'fa-headset', href: '/modules/support.html', pageKey: 'support' },
        { name: 'Admin Panel', icon: 'fa-user-shield', href: '/modules/admin.html', pageKey: 'admin', adminOnly: true }
    ];

    nav.innerHTML = '';

    // Determine active menu key
    let activeKey = 'dashboard';
    if (path.includes('/account/')) activeKey = 'account';
    else if (path.includes('/marketplace/')) activeKey = 'marketplace';
    else if (path.includes('/inventory/')) activeKey = 'inventory';
    else if (path.includes('store')) activeKey = 'store';
    else if (path.includes('forum')) activeKey = 'forum';
    else if (path.includes('showcase')) activeKey = 'showcase';
    else if (path.includes('map')) activeKey = 'map';
    else if (path.includes('leaderboard')) activeKey = 'leaderboard';
    else if (path.includes('rewards')) activeKey = 'rewards';
    else if (path.includes('social')) activeKey = 'social';
    else if (path.includes('support')) activeKey = 'support';
    else if (path.includes('admin')) activeKey = 'admin';
    else if (path.includes('wiki')) activeKey = 'wiki';

    let hasAdminSection = false;

    links.forEach(link => {
        if (link.adminOnly) {
            if (!role || role.toLowerCase() !== 'admin') return;
            if (!hasAdminSection) {
                const label = document.createElement('div');
                label.className = 'nav-section-label';
                label.style.marginTop = '12px';
                label.textContent = 'ADMIN PANEL';
                nav.appendChild(label);
                hasAdminSection = true;
            }
        }

        let relativeHref = link.href;
        if (isSubdir) {
            if (link.href.startsWith('/')) relativeHref = '..' + link.href;
        } else {
            if (link.href.startsWith('/')) relativeHref = link.href.substring(1);
        }

        const a = document.createElement('a');
        a.href = relativeHref;
        a.className = 'nav-item';
        if (link.adminOnly) a.classList.add('nav-admin');
        if (link.pageKey === activeKey) a.classList.add('active');

        a.innerHTML = `
            <i class="fas ${link.icon}" ${link.iconStyle ? `style="${link.iconStyle}"` : ''}></i>
            <span>${link.name}</span>
        `;
        nav.appendChild(a);
    });

    if (window.HyrostMobileLayout && typeof window.HyrostMobileLayout.bindNavItems === 'function') {
        window.HyrostMobileLayout.bindNavItems(sidebar);
    }

    // Upgrade bottom server status widget to match admin design
    let serverWidget = sidebar.querySelector('.server-status-widget, .sidebar-bottom');
    if (!serverWidget) {
        serverWidget = document.createElement('div');
        sidebar.appendChild(serverWidget);
    }
    serverWidget.className = 'sidebar-bottom';
    serverWidget.innerHTML = `
        <div class="sidebar-server-pill">
            <div class="server-pill-row">
                <span><i class="fas fa-server" style="margin-right:5px; color:var(--accent-cyan);"></i>Status Server</span>
                <span class="status-dot" id="sidebarStatusDot"></span>
            </div>
            <div class="server-pill-ip">play.hyrost.net</div>
            <div class="server-pill-players">
                <i class="fas fa-users"></i> <span id="sidebarOnlinePlayers">128</span> Online
            </div>
        </div>
    `;
}

// Comprehensive Inventory Data & State Management
let userInventoryItems = [];
let activeCategory = 'all';

function getCurrentUserId() {
    try {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            const user = JSON.parse(userStr);
            return user.id || user.username || 'default_user';
        }
    } catch(e) {}
    return 'default_user';
}

function loadUserInventoryFromStorage() {
    // Legacy localStorage removed — inventory is server-side only
    userInventoryItems = [];
}

async function loadInventoryFromAPI() {
    const token = localStorage.getItem('hyrostToken');
    if (!token) {
        userInventoryItems = [];
        return;
    }

    try {
        const res = await fetch('/api/inventory', {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            userInventoryItems = await res.json();
        } else {
            userInventoryItems = [];
        }
    } catch (e) {
        console.error('Failed to load inventory:', e);
        userInventoryItems = [];
    }
}

function saveUserInventoryToStorage() {
    // No-op: inventory persisted on server
}

async function loadInventory() {
    await loadInventoryFromAPI();
    setupCategoryTabs();
    filterInventoryItems();
}

function setupCategoryTabs() {
    const tabs = document.querySelectorAll('.inv-tab-btn');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeCategory = tab.getAttribute('data-cat');
            filterInventoryItems();
        };
    });
}

function filterInventoryItems() {
    const grid = document.getElementById('inventoryGrid');
    if (!grid) return;

    const searchInput = document.getElementById('invSearchInput');
    const query = (searchInput?.value || '').toLowerCase().trim();
    const sortVal = document.getElementById('invSortSelect')?.value || 'newest';

    const rarityOrder = { mythic: 5, legendary: 4, epic: 3, rare: 2, common: 1 };

    let filtered = userInventoryItems.filter(item => {
        const matchesCat = (activeCategory === 'all') || (item.type === activeCategory);
        const matchesQuery = item.name.toLowerCase().includes(query) || (item.desc || '').toLowerCase().includes(query);
        return matchesCat && matchesQuery;
    });

    // Sorting
    if (sortVal === 'rarity-desc') {
        filtered.sort((a, b) => (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0));
    } else if (sortVal === 'name-asc') {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortVal === 'qty-desc') {
        filtered.sort((a, b) => b.qty - a.qty);
    }

    renderInventoryGrid(filtered);
    updateStorageStats();
}

function getMcClaimButtonHtml(item) {
    const status = item.mcClaimStatus || 'none';
    if (status === 'queued') {
        return `<button class="btn-equip" style="flex:1; opacity:0.7; cursor:not-allowed; background:#f59e0b33; border-color:#f59e0b;" disabled>
            <i class="fas fa-clock"></i> Antrean MC
        </button>`;
    }
    if (status === 'delivered') {
        return `<button class="btn-equip" style="flex:1; opacity:0.6; cursor:not-allowed; background:#6b728033;" disabled>
            <i class="fas fa-check"></i> Sudah Diklaim
        </button>`;
    }
    return `<button class="btn-equip" style="flex:1; background: linear-gradient(135deg, #84cc16, #65a30d); border-color:#84cc16;" onclick="claimItemToMinecraft(${item.id})">
        <i class="fas fa-cube"></i> Claim MC
    </button>`;
}

function renderInventoryGrid(items) {
    const grid = document.getElementById('inventoryGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (items.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding: 40px 20px; background: rgba(18, 24, 38, 0.6); border-radius: 20px; border: 1px dashed rgba(99, 102, 241, 0.4);">
                <i class="fas fa-box-open" style="font-size:3.5rem; color:#6366f1; margin-bottom:14px;"></i>
                <h3 style="color:#fff; margin:0 0 6px; font-weight:800;">Inventaris Anda Masih Kosong</h3>
                <p style="color:#9ca3af; font-size:0.9rem; max-width:480px; margin:0 auto 20px;">
                    Item muncul di sini setelah Anda membeli dari toko admin atau marketplace user lain.
                </p>
                <a href="../marketplace/shop.html" class="btn-equip" style="display:inline-flex; max-width:320px; margin:0 auto; padding:12px 24px; font-size:0.95rem; background: linear-gradient(135deg, #6366f1, #4f46e5); color:#fff; font-weight:800; text-decoration:none; border-radius:12px; justify-content:center; gap:8px;">
                    <i class="fas fa-store"></i> Buka Toko Kosmetik
                </a>
            </div>
        `;
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = `inventory-item rarity-${item.rarity || 'common'}`;
        
        const equippedHtml = item.equipped ? `<span class="equipped-badge"><i class="fas fa-check"></i> TERPASANG</span>` : '';

        const claimBtnHtml = getMcClaimButtonHtml(item);

        card.innerHTML = `
            ${equippedHtml}
            <div class="item-visual" onclick="openItemDetailModal(${item.id})">
                <i class="fas ${item.icon}"></i>
            </div>
            <span class="rarity-badge ${item.rarity || 'common'}">${(item.rarity || 'common').toUpperCase()}</span>
            <h3 class="item-title" style="margin-top:6px;">${item.name}</h3>
            <div class="item-category">${item.type} • Qty: ${item.qty}x • ${item.pluginId || 'hyrost_bridge'}</div>
            <div style="display:flex; gap:8px; width:100%; margin-top:12px;">
                <button class="btn-equip" style="flex:1;" onclick="openItemDetailModal(${item.id})">
                    <i class="fas fa-info-circle"></i> Detail
                </button>
                ${claimBtnHtml}
            </div>
        `;
        grid.appendChild(card);
    });
}

function updateStorageStats() {
    const totalSlots = 50;
    const usedSlots = userInventoryItems.length;
    const percentage = Math.min(100, Math.round((usedSlots / totalSlots) * 100));

    const capacityText = document.getElementById('slotCapacityText');
    if (capacityText) capacityText.textContent = `${usedSlots} / ${totalSlots} Slot`;

    const progressFill = document.getElementById('slotProgressBar');
    if (progressFill) progressFill.style.width = `${percentage}%`;

    const equippedCount = userInventoryItems.filter(i => i.equipped).length;
    const equippedText = document.getElementById('equippedCountText');
    if (equippedText) equippedText.textContent = `${equippedCount} Item Aktif`;

    const totalVal = userInventoryItems.reduce((acc, curr) => acc + (curr.value * curr.qty), 0);
    const totalValText = document.getElementById('totalValueText');
    if (totalValText) totalValText.textContent = `~ ${totalVal.toLocaleString('id-ID')} Koin`;
}

function openItemDetailModal(id) {
    const item = userInventoryItems.find(i => i.id === id);
    if (!item) return;

    const modal = document.getElementById('itemDetailModal');
    if (!modal) return;

    document.getElementById('modalItemVisual').innerHTML = `<i class="fas ${item.icon}"></i>`;
    document.getElementById('modalItemRarity').className = `rarity-badge ${item.rarity || 'common'}`;
    document.getElementById('modalItemRarity').textContent = (item.rarity || 'common').toUpperCase();
    document.getElementById('modalItemName').textContent = item.name;
    document.getElementById('modalItemCategory').textContent = `Tipe: ${item.type.toUpperCase()}`;
    document.getElementById('modalItemDesc').textContent = item.desc;
    document.getElementById('modalItemQty').textContent = `${item.qty}x Unit`;
    document.getElementById('modalItemCode').textContent = item.itemCode;
    
    const equippedStatus = document.getElementById('modalItemEquippedStatus');
    if (equippedStatus) {
        equippedStatus.textContent = item.equipped ? "Terpasang (Aktif)" : "Belum Terpasang";
        equippedStatus.style.color = item.equipped ? "#10b981" : "#9ca3af";
    }

    const btnEquip = document.getElementById('btnModalEquip');
    if (btnEquip) {
        btnEquip.innerHTML = item.equipped ? '<i class="fas fa-times"></i> Lepas Kosmetik' : '<i class="fas fa-tshirt"></i> Pasang Kosmetik';
        btnEquip.onclick = async () => {
            const token = localStorage.getItem('hyrostToken');
            if (!token) return alert('Silakan login terlebih dahulu');
            try {
                const res = await fetch(`/api/inventory/${item.id}/equip`, {
                    method: 'PATCH',
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    item.equipped = !item.equipped;
                    openItemDetailModal(id);
                    filterInventoryItems();
                    if (typeof showToast === 'function') {
                        showToast(item.equipped ? `Berhasil memasang ${item.name}` : `Berhasil melepas ${item.name}`, 'success');
                    }
                }
            } catch (e) {
                alert('Gagal memperbarui item');
            }
        };
    }

    const btnClaim = document.getElementById('btnModalClaimMC');
    if (btnClaim) {
        btnClaim.onclick = () => {
            claimItemToMinecraft(item.id);
            closeItemDetailModal();
        };
    }

    modal.classList.add('active');
}

function closeItemDetailModal() {
    const modal = document.getElementById('itemDetailModal');
    if (modal) modal.classList.remove('active');
}
window.openItemDetailModal = openItemDetailModal;
window.closeItemDetailModal = closeItemDetailModal;

async function checkMinecraftLinkStatus() {
    const token = localStorage.getItem('hyrostToken');
    if (!token) return null;
    try {
        const res = await fetch('/api/minecraft/link-status', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            return data.isLinked ? data : null;
        }
    } catch (e) {}
    return null;
}

async function renderMinecraftConnectionStatus() {
    const statusData = await checkMinecraftLinkStatus();
    const bannerContainer = document.querySelector('.top-user-banner');
    if (!bannerContainer) return;

    let linkBadge = document.getElementById('mcLinkStatusBadge');
    if (!linkBadge) {
        linkBadge = document.createElement('div');
        linkBadge.id = 'mcLinkStatusBadge';
        linkBadge.style.marginTop = '6px';
        bannerContainer.querySelector('div')?.appendChild(linkBadge);
    }

    if (statusData && statusData.isLinked) {
        linkBadge.innerHTML = `
            <span style="display:inline-flex; align-items:center; gap:6px; font-size:0.78rem; font-weight:700; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); padding:4px 10px; border-radius:9999px;">
                <i class="fas fa-cube"></i> Terhubung ke MC: <strong>${statusData.mcUsername}</strong>
            </span>
        `;
    } else {
        linkBadge.innerHTML = `
            <a href="../account/index.html" style="display:inline-flex; align-items:center; gap:6px; font-size:0.78rem; font-weight:700; background:rgba(245,158,11,0.15); color:#f59e0b; border:1px solid rgba(245,158,11,0.3); padding:4px 10px; border-radius:9999px; text-decoration:none;">
                <i class="fas fa-exclamation-triangle"></i> Akun MC Belum Ditautkan • Klik untuk Tautkan
            </a>
        `;
    }
}

async function claimAllItemsToMinecraft() {
    const token = localStorage.getItem('hyrostToken');
    if (!token) return alert("Silakan login terlebih dahulu!");

    const mcStatus = await checkMinecraftLinkStatus();
    if (!mcStatus || !mcStatus.isLinked) {
        if (confirm("⚠️ Akun Minecraft Anda belum ditautkan!\nApakah Anda ingin membuka Halaman Profil untuk menautkan Username Minecraft sekarang?")) {
            window.location.href = '../account/index.html';
        }
        return;
    }

    if (userInventoryItems.length === 0) {
        return alert("Inventaris Anda kosong. Tidak ada item yang bisa diklaim.");
    }

    if (!confirm(`Apakah Anda yakin ingin mengklaim seluruh (${userInventoryItems.length}) item ke server Minecraft (${mcStatus.mcUsername})?`)) return;

    try {
        let successCount = 0;
        const remainingItems = [];

        for (const item of userInventoryItems) {
            if (!item.canClaimToMc && item.mcClaimStatus !== 'none') continue;
            const res = await fetch(`/api/inventory/${item.id}/claim-mc`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                successCount++;
            } else {
                remainingItems.push(item);
            }
        }

        userInventoryItems = remainingItems;
        await loadInventoryFromAPI();
        filterInventoryItems();

        alert(`✅ Sukses mengirim ${successCount} paket item ke antrean /claim server Minecraft (${mcStatus.mcUsername})!`);
    } catch (err) {
        alert(`Gagal memproses klaim massal: ${err.message}`);
    }
}
window.claimAllItemsToMinecraft = claimAllItemsToMinecraft;

async function claimItemToMinecraft(id) {
    const token = localStorage.getItem('hyrostToken');
    if (!token) return alert("Silakan login terlebih dahulu!");

    const mcStatus = await checkMinecraftLinkStatus();
    if (!mcStatus || !mcStatus.isLinked) {
        if (confirm("⚠️ Akun Minecraft Anda belum ditautkan!\nApakah Anda ingin membuka Halaman Profil untuk menautkan Username Minecraft Anda sekarang?")) {
            window.location.href = '../account/index.html';
        }
        return;
    }

    try {
        const res = await fetch(`/api/inventory/${id}/claim-mc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (res.ok && data.success) {
            await loadInventoryFromAPI();
            filterInventoryItems();
            alert(`✅ ${data.message}`);
        } else {
            alert(`⚠️ ${data.message || "Gagal memproses klaim."}`);
        }
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
}
window.claimItemToMinecraft = claimItemToMinecraft;
window.filterInventoryItems = filterInventoryItems;


// Sync User Profile with Server
async function syncUserProfile() {
    const token = localStorage.getItem('hyrostToken');
    if (!token) return;

    try {
        const res = await fetch('/api/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const userData = await res.json();
            localStorage.setItem('currentUser', JSON.stringify(userData));
            
            // Re-run UI updates if role changed
            const userNameEl = document.getElementById('userName');
            if (userNameEl) userNameEl.textContent = userData.username;
            const userRoleEl = document.getElementById('userRole');
            if (userRoleEl) userRoleEl.textContent = userData.role;
            
            refreshSidebar(userData.role);
        }
    } catch (e) {
        console.error("Sync failed", e);
    }
}

// Global Settings Check (Banner & Maintenance)
async function checkGlobalSettings() {
    try {
        const res = await fetch('/api/public-settings'); // Use public endpoint
        const settings = await res.json();

        // 1. Maintenance Mode Check
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'admin';
        
        if (settings.maintenance === 'true' && !isAdmin && !window.location.pathname.includes('maintenance.html')) {
            // Redirect to maintenance page (create one later or simple alert for now)
            document.body.innerHTML = `
                <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#0f0f0f; color:#e98a22; flex-direction:column; text-align:center;">
                    <i class="fas fa-tools fa-3x" style="margin-bottom:20px;"></i>
                    <h1>Sedang Dalam Perbaikan</h1>
                    <p style="color:#888;">Kami sedang meningkatkan server Hyrost. Silakan kembali lagi nanti.</p>
                </div>
            `;
            return; // Stop execution
        }

        // 2. Global Announcement Banner
        if (settings.announcement && settings.announcement.trim() !== '') {
            const banner = document.createElement('div');
            banner.id = 'hyrostGlobalAnnouncementBanner';
            banner.style.cssText = `
                background: linear-gradient(90deg, rgba(99, 102, 241, 0.95), rgba(6, 182, 212, 0.95));
                backdrop-filter: blur(10px);
                color: #ffffff;
                text-align: center;
                padding: 7px 16px;
                font-size: 0.85rem;
                font-weight: 700;
                position: fixed;
                top: 0; left: 0; right: 0;
                z-index: 9999;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                transition: opacity 0.5s ease, transform 0.5s ease;
                opacity: 1;
                transform: translateY(0);
            `;
            banner.innerHTML = `<i class="fas fa-bullhorn"></i> ${settings.announcement}`;
            
            document.body.appendChild(banner);
            
            // Adjust sidebar or main content
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.style.top = '34px';
            const mainContent = document.querySelector('.main-content');
            if (mainContent) mainContent.style.marginTop = '34px';

            // Auto hide banner 5 seconds after entering
            setTimeout(() => {
                banner.style.opacity = '0';
                banner.style.transform = 'translateY(-100%)';

                if (sidebar) sidebar.style.top = '0px';
                if (mainContent) mainContent.style.marginTop = '0px';

                setTimeout(() => {
                    if (banner && banner.parentNode) {
                        banner.parentNode.removeChild(banner);
                    }
                }, 500);
            }, 5000);
        }

    } catch (err) {
        console.error("Failed to load settings");
    }
}

// ─── 3D MINECRAFT SKIN VIEWER MODAL ──────────────────────────────────────────
let invSkinViewerInitialized = false;

function openInventory3DSkinModal() {
    const modal = document.getElementById('skinPreviewModal');
    if (!modal) return;
    modal.classList.add('active');

    if (window.HyrostSFX) window.HyrostSFX.playClick();

    const canvas = document.getElementById('invSkinCanvas');
    if (canvas && window.HyrostSkinViewer && !invSkinViewerInitialized) {
        invSkinViewerInitialized = true;
        const userStr = localStorage.getItem('currentUser');
        let username = 'Steve';
        if (userStr) {
            try {
                const u = JSON.parse(userStr);
                username = u.mojang_username || u.username || 'Steve';
            } catch (e) {}
        }

        window.HyrostSkinViewer.init(canvas, {
            username: username,
            height: 340,
            animation: true
        });
    }
}
window.openInventory3DSkinModal = openInventory3DSkinModal;

function closeInventory3DSkinModal() {
    const modal = document.getElementById('skinPreviewModal');
    if (modal) modal.classList.remove('active');
}
window.closeInventory3DSkinModal = closeInventory3DSkinModal;

