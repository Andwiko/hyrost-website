document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    setupSidebar();
    
    // Listen for updates from other scripts
    window.addEventListener('userProfileUpdated', () => {
        checkAuthentication();
    });
    loadInventory();
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

// Sidebar Functionality
function setupSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }
}

// Comprehensive Sidebar Management
function refreshSidebar(role) {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;

    const currentPath = window.location.pathname;
    
    // Define all standard links and their requirements
    const links = [
        { name: 'Beranda', icon: 'fa-home', href: '/dashboard.html', altHrefs: ['/index.html', '/'] },
        { name: 'Profil Saya', icon: 'fa-user-circle', href: '/account/index.html' },
        { name: 'World', icon: 'fa-globe-asia', href: '/question/index.html' },
        { name: 'Forum', icon: 'fa-comments', href: '/modules/forum.html' },
        { name: 'Storage', icon: 'fa-briefcase', href: '/inventory/inventory.html' },
        { name: 'Shop (Market)', icon: 'fa-shopping-bag', href: '/marketplace/shop.html' },
        { name: 'Role Shop', icon: 'fa-store', href: '/modules/role_shop.html', color: '#e98a22' },
        { name: 'Info', icon: 'fa-info-circle', href: '#' },
        { name: 'Admin Panel', icon: 'fa-user-shield', href: '/modules/admin.html', color: '#ff4d4d', adminOnly: true }
    ];

    // Clear and rebuild to ensure consistency and order
    nav.innerHTML = '';
    
    links.forEach(link => {
        // Check permissions
        if (link.adminOnly && (!role || role.toLowerCase() !== 'admin')) return;
        
        const a = document.createElement('a');
        a.href = link.href;
        a.className = 'nav-item';
        
        // Active state detection
        const isCurrent = (link.href !== '#' && currentPath.endsWith(link.href)) || 
                          (link.altHrefs && link.altHrefs.some(alt => currentPath.endsWith(alt))) ||
                          (currentPath === '/' && link.href === '/dashboard.html');
        
        if (isCurrent) a.classList.add('active');
        
        a.innerHTML = `
            <i class="fas ${link.icon}" style="${link.color ? `color: ${link.color};` : ''}"></i>
            <span>${link.name}</span>
        `;
        nav.appendChild(a);
    });
}

// Mock Inventory Loading
function loadInventory() {
    const inventoryGrid = document.getElementById('inventoryGrid');
    if (!inventoryGrid) return;

    // Simulate fetching items
    const items = [
        { name: "Iron Sword", desc: "A trusty weapon.", icon: "fa-khanda", type: "weapon" },
        { name: "Golden Apple", desc: "Restores health.", icon: "fa-apple-alt", type: "food" },
        { name: "Diamond Pickaxe", desc: "Mines everything.", icon: "fa-hammer", type: "tool" },
        { name: "Mystic Potion", desc: "Unknown effects.", icon: "fa-flask", type: "potion" },
        { name: "Ancient Scroll", desc: "Contains wisdom.", icon: "fa-scroll", type: "quest" },
        { name: "Shield", desc: "Blocks attacks.", icon: "fa-shield-alt", type: "armor" },
    ];

    inventoryGrid.innerHTML = ''; // Clear loading/placeholder

    items.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'inventory-item';
        itemCard.innerHTML = `
            <div class="item-visual">
                <i class="fas ${item.icon}"></i>
            </div>
            <h3>${item.name}</h3>
            <p>${item.desc}</p>
            <button class="btn-use">Use</button>
        `;
        inventoryGrid.appendChild(itemCard);
    });
}

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
            banner.style.cssText = `
                background: linear-gradient(90deg, #e98a22, #d07a1e);
                color: white;
                text-align: center;
                padding: 10px;
                font-weight: bold;
                position: fixed;
                top: 0; left: 0; right: 0;
                z-index: 9999;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            `;
            banner.innerHTML = `<i class="fas fa-bullhorn"></i> ${settings.announcement}`;
            
            document.body.appendChild(banner);
            
            // Adjust sidebar or main content if necessary to not hide behind banner
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.style.top = '40px';
            const mainContent = document.querySelector('.main-content') || document.querySelector('.dashboard-container');
            if (mainContent) mainContent.style.marginTop = '40px';
        }

    } catch (err) {
        console.error("Failed to load settings");
    }
}
