document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    loadUserProfile();
    loadUserActivities();
    loadQuests();
    initDashboardLiveHub();
});

function initDashboardLiveHub() {
    if (!window.HyrostLiveHub) {
        updateServerStatus();
        loadLiveChat();
        loadLiveRealmActivities();
        setInterval(updateServerStatus, 15000);
        setInterval(loadLiveChat, 5000);
        setInterval(loadLiveRealmActivities, 12000);
        return;
    }

    HyrostLiveHub.init({
        chatContainerId: 'liveChatMessages',
        activityContainerId: 'liveRealmActivityFeed',
        playersContainerId: 'livePlayersList',
        playerCountSelector: '#sidebarOnlinePlayers, #onlinePlayers',
        serverIpSelector: '.server-ip, #sidebarServerIp',
        statusDotSelector: '.status-dot',
        intervals: { snapshot: 8000, presence: 15000 },
    });
}

async function updateServerStatus() {
    if (window.HyrostMCServer) {
        await HyrostMCServer.refresh();
        const data = HyrostMCServer.data;
        if (data && data.playerList) renderLivePlayersList(data.playerList);
        return;
    }
    try {
        const res = await fetch('/api/server-status');
        if (res.ok) {
            const data = await res.json();
            
            const ipElements = document.querySelectorAll('.server-ip, #sidebarServerIp');
            ipElements.forEach(el => el.textContent = data.serverIp || 'play.hyrost.net');

            const countElements = document.querySelectorAll('#sidebarOnlinePlayers, #onlinePlayers');
            countElements.forEach(el => el.textContent = data.onlinePlayers || 12);

            const dots = document.querySelectorAll('.status-dot');
            dots.forEach(el => {
                if (data.isOnline) {
                    el.classList.add('online');
                    el.style.background = '#10b981';
                } else {
                    el.classList.remove('online');
                    el.style.background = '#ef4444';
                }
            });

            if (data.playerList) {
                renderLivePlayersList(data.playerList);
            }
        }
    } catch (err) {}
}

// 1. Verify User Session & Token
function checkAuthentication() {
    const token = localStorage.getItem('hyrostToken');
    const currentUserStr = localStorage.getItem('currentUser');
    
    if (!token || !currentUserStr) {
        window.location.href = '/login';
        return;
    }

    try {
        const u = JSON.parse(currentUserStr);
        if (u && u.role && u.role.toLowerCase() === 'admin') {
            document.body.classList.add('is-admin');
        } else {
            document.body.classList.remove('is-admin');
        }
    } catch(e) {}
}

// 2. Render Fresh Profile & Coins Data with Instant Resilient Session Fallback
async function loadUserProfile() {
    const token = localStorage.getItem('hyrostToken');
    const localUserStr = localStorage.getItem('currentUser');

    const displayUsername = document.getElementById('displayUsername');
    const displayEmail = document.getElementById('displayEmail');
    const displayRole = document.getElementById('displayRole');
    const userAvatar = document.getElementById('userAvatar');
    const coinBronze = document.getElementById('coinBronze');
    const coinSilver = document.getElementById('coinSilver');
    const coinGold = document.getElementById('coinGold');

    function applyUserToDOM(userObj) {
        if (!userObj) return;
        const resolvedUsername = userObj.username || userObj.name || userObj.user_name || userObj.user || (userObj.email ? userObj.email.split('@')[0] : 'User');
        const resolvedEmail = userObj.email || '-';
        const resolvedRole = userObj.role || 'Member';
        const resolvedAvatar = userObj.avatarUrl || userObj.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(resolvedUsername)}&background=6366f1&color=fff`;

        if (displayUsername) displayUsername.textContent = resolvedUsername;
        if (displayEmail) displayEmail.textContent = resolvedEmail;
        if (displayRole) {
            displayRole.textContent = resolvedRole;
            if (resolvedRole.toLowerCase() === 'admin') {
                displayRole.style.background = 'rgba(239, 68, 68, 0.2)';
                displayRole.style.color = '#ef4444';
                displayRole.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            } else {
                displayRole.style.background = '';
                displayRole.style.color = '';
                displayRole.style.borderColor = '';
            }
        }
        if (userAvatar) {
            userAvatar.src = resolvedAvatar;
        }
        if (coinBronze) coinBronze.textContent = userObj.coinBronze || userObj.coin_bronze || userObj.coins?.bronze || 0;
        if (coinSilver) coinSilver.textContent = userObj.coinSilver || userObj.coin_silver || userObj.coins?.silver || 0;
        if (coinGold) coinGold.textContent = userObj.coinGold || userObj.coin_gold || userObj.coins?.gold || 0;

        if (resolvedRole && resolvedRole.toLowerCase() === 'admin') {
            document.body.classList.add('is-admin');
        } else {
            document.body.classList.remove('is-admin');
        }
    }

    // 1. Instant Initial Render from LocalStorage Session (100% Instant & Resilient)
    if (localUserStr) {
        try {
            const localUser = JSON.parse(localUserStr);
            applyUserToDOM(localUser);
        } catch(e) {}
    }

    if (!token && !localUserStr) {
        window.location.href = '/login';
        return;
    }

    // 2. Try fetching fresh data from API if available
    try {
        const res = await fetch('/api/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 401) {
            logout();
            return;
        }

        if (res.ok) {
            const userData = await res.json();
            const updatedUser = {
                username: userData.username,
                email: userData.email,
                role: userData.role,
                avatarUrl: userData.avatarUrl,
                coinBronze: userData.coins?.bronze || 0,
                coinSilver: userData.coins?.silver || 0,
                coinGold: userData.coins?.gold || 0
            };
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            applyUserToDOM(updatedUser);
            updateClaimButtonState(userData.lastClaimTime);
        }
    } catch (err) {
        console.warn("API profile fetch optional, using resilient local session.");
    }
}

// 3. Daily Claim Cooldown Logic
function updateClaimButtonState(lastClaimTimeStr) {
    const btnClaim = document.getElementById('btnClaimDaily');
    const claimTimer = document.getElementById('claimTimer');
    if (!btnClaim || !claimTimer) return;

    if (!lastClaimTimeStr) {
        btnClaim.disabled = false;
        claimTimer.textContent = "Siap diklaim!";
        return;
    }

    const lastClaim = new Date(lastClaimTimeStr).getTime();
    const now = Date.now();
    const cooldownMs = 24 * 60 * 60 * 1000;
    const diff = now - lastClaim;

    if (diff < cooldownMs) {
        btnClaim.disabled = true;
        btnClaim.style.opacity = '0.5';
        btnClaim.style.cursor = 'not-allowed';

        const hoursLeft = Math.ceil((cooldownMs - diff) / (1000 * 60 * 60));
        claimTimer.textContent = `Tersedia dalam ${hoursLeft} jam lagi.`;
    } else {
        btnClaim.disabled = false;
        btnClaim.style.opacity = '1';
        btnClaim.style.cursor = 'pointer';
        claimTimer.textContent = "Siap diklaim!";
    }
}

// 4. Claim Daily Reward API Action
async function claimDailyReward() {
    const token = localStorage.getItem('hyrostToken');
    if (!token) return;

    const btnClaim = document.getElementById('btnClaimDaily');
    if (btnClaim) btnClaim.disabled = true;

    try {
        const res = await fetch('/api/users/claim-daily-reward', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await res.json();

        if (res.ok && data.success) {
            alert(`🎉 ${data.message}`);
            loadUserProfile(); // Refresh coins
            loadUserActivities(); // Refresh activities
        } else {
            alert(`⚠️ ${data.message || 'Gagal mengklaim hadiah.'}`);
        }
    } catch (err) {
        alert('Terjadi kesalahan koneksi.');
    } finally {
        if (btnClaim) btnClaim.disabled = false;
    }
}

// 5. Fetch User Recent Activities
async function loadUserActivities() {
    const token = localStorage.getItem('hyrostToken');
    const activityList = document.getElementById('activityList');
    if (!token || !activityList) return;

    try {
        const res = await fetch('/api/users/activities', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) return;

        const activities = await res.json();

        if (activities.length === 0) {
            activityList.innerHTML = `
                <div class="activity-item">
                    <span class="activity-desc">Belum ada aktivitas tercatat.</span>
                    <span class="activity-time">-</span>
                </div>
            `;
            return;
        }

        activityList.innerHTML = activities.map(act => {
            const timeStr = act.created_at ? new Date(act.created_at).toLocaleString() : '-';
            return `
                <div class="activity-item">
                    <div>
                        <span class="activity-desc">${escapeHTML(act.action)}</span>
                        <div style="font-size: 0.8rem; color: var(--text-dim);">${escapeHTML(act.details || '')}</div>
                    </div>
                    <span class="activity-time">${timeStr}</span>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("LOAD ACTIVITIES ERROR:", err);
    }
}

// 6. Utility Functions
function copyIP() {
    if (window.HyrostMCServer) {
        HyrostMCServer.copyIp();
        return;
    }
    const ip = "play.hyrost.net";
    navigator.clipboard.writeText(ip).then(() => {
        alert(`IP Server (${ip}) berhasil disalin!`);
    });
}

function logout() {
    localStorage.removeItem('hyrostToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('googleUser');
    window.location.href = 'index.html';
}

function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar') || document.querySelector('.admin-sidebar');
    const overlay = document.getElementById('sidebarOverlay') || document.querySelector('.sidebar-overlay');
    if (sidebar) {
        sidebar.classList.toggle('active');
        sidebar.classList.toggle('mobile-open');
    }
    if (overlay) {
        overlay.classList.toggle('active');
    }
}

function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Global scope bindings for HTML onclicks
window.claimDailyReward = claimDailyReward;
window.copyIP = copyIP;
window.logout = logout;
window.toggleMobileSidebar = toggleMobileSidebar;

// 7. Live Online Players List
async function renderLivePlayersList(playerList) {
    const container = document.getElementById('livePlayersList');
    if (!container) return;

    if (!playerList || playerList.length === 0) {
        container.innerHTML = '<span style="color:var(--text-dim); font-size:0.85rem;">Tidak ada pemain online saat ini.</span>';
        return;
    }

    container.innerHTML = playerList.map(p => `
        <div style="display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.05); padding:4px 10px; border-radius:20px; border:1px solid rgba(255,255,255,0.1);">
            <img src="${p.avatar}" alt="" style="width:20px; height:20px; border-radius:4px;" onerror="this.src='https://mc-heads.net/avatar/Steve/20'" />
            <span style="font-size:0.8rem; font-weight:600; color:#fff;">${escapeHTML(p.username)}</span>
        </div>
    `).join('');
}

// 8. Quests & Achievements
async function loadQuests() {
    const container = document.getElementById('questsListContainer');
    if (!container) return;

    const token = localStorage.getItem('hyrostToken');
    try {
        const res = await fetch('/api/quests', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok && data.success && data.quests) {
            container.innerHTML = data.quests.map(q => `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:rgba(0,0,0,0.3); border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <i class="fas ${q.icon || 'fa-trophy'}" style="color:var(--accent-gold); font-size:1.1rem;"></i>
                        <div>
                            <div style="font-size:0.85rem; font-weight:700; color:#fff;">${escapeHTML(q.title)}</div>
                            <div style="font-size:0.75rem; color:var(--text-dim);">${escapeHTML(q.description)}</div>
                        </div>
                    </div>
                    <div>
                        ${q.is_claimed ? 
                            `<span style="font-size:0.75rem; color:#10b981; font-weight:700;"><i class="fas fa-check"></i> Selesai</span>` : 
                            `<button class="btn-header-action" style="padding:4px 10px; font-size:0.75rem; background:var(--accent-gold); color:#000; font-weight:800;" onclick="claimQuestReward(${q.id})">Klaim +${q.reward_amount} ${q.reward_type.toUpperCase()}</button>`
                        }
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error("LOAD QUESTS ERROR:", err);
    }
}

async function claimQuestReward(questId) {
    const token = localStorage.getItem('hyrostToken');
    try {
        const res = await fetch(`/api/quests/claim/${questId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
            alert(data.message);
            loadQuests();
            loadUserProfile();
        } else {
            alert(data.message || "Gagal mengklaim misi");
        }
    } catch (e) {
        alert("Error: " + e.message);
    }
}

// 9. Community Web Live Chatbox
async function loadLiveChat() {
    const container = document.getElementById('liveChatMessages');
    if (!container) return;

    try {
        const res = await fetch('/api/live-chat');
        const data = await res.json();
        if (res.ok && data.messages) {
            if (data.messages.length === 0) {
                container.innerHTML = '<span style="color:var(--text-dim); font-size:0.85rem;">Belum ada pesan. Mulai obrolan sekarang!</span>';
                return;
            }
            container.innerHTML = data.messages.map(m => `
                <div style="display:flex; align-items:flex-start; gap:8px; font-size:0.8rem;">
                    <img src="${m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.username)}&background=6366f1&color=fff`}" style="width:22px; height:22px; border-radius:50%; margin-top:2px;" alt="" />
                    <div>
                        <strong style="color:var(--accent-cyan);">${escapeHTML(m.username)}:</strong>
                        <span style="color:#e2e8f0; margin-left:4px;">${escapeHTML(m.message)}</span>
                    </div>
                </div>
            `).join('');
            container.scrollTop = container.scrollHeight;
        }
    } catch (err) {
        console.error("LOAD LIVE CHAT ERROR:", err);
    }
}

async function sendLiveChat() {
    const input = document.getElementById('liveChatInput');
    const message = input ? input.value.trim() : '';
    if (!message) return;

    if (window.HyrostLiveHub) {
        const data = await HyrostLiveHub.sendChat(message);
        if (data.success) {
            if (input) input.value = '';
        } else {
            alert(data.message || 'Gagal mengirim pesan chat');
        }
        return;
    }

    const token = localStorage.getItem('hyrostToken');
    try {
        const res = await fetch('/api/live-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            if (input) input.value = '';
            loadLiveChat();
        } else {
            alert(data.message || "Gagal mengirim pesan chat");
        }
    } catch (e) {
        alert("Error: " + e.message);
    }
}

let lastDashboardToggle = 0;

function toggleMobileSidebar(e) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    const now = Date.now();
    if (now - lastDashboardToggle < 180) return;
    lastDashboardToggle = now;

    const sidebar = document.querySelector('.sidebar') || document.getElementById('sidebar') || document.querySelector('.admin-sidebar');
    const overlay = document.querySelector('.sidebar-overlay') || document.getElementById('sidebarOverlay');
    if (!sidebar) return;

    const isOpen = sidebar.classList.contains('active') || sidebar.classList.contains('open') || sidebar.classList.contains('mobile-open');
    if (isOpen) {
        sidebar.classList.remove('active', 'open', 'mobile-open');
        if (overlay) overlay.classList.remove('active', 'open');
        document.body.style.overflow = '';
    } else {
        sidebar.classList.add('active', 'open', 'mobile-open');
        if (overlay) overlay.classList.add('active', 'open');
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar') || document.getElementById('sidebar') || document.querySelector('.admin-sidebar');
    const overlay = document.querySelector('.sidebar-overlay') || document.getElementById('sidebarOverlay');
    if (sidebar) {
        sidebar.classList.remove('active', 'open', 'mobile-open');
    }
    if (overlay) {
        overlay.classList.remove('active', 'open');
    }
    document.body.style.overflow = '';
}

// Auto-close sidebar on scroll or click outside
let lastMobileScrollY = window.scrollY;

window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    const mobileHeader = document.querySelector('.mobile-header');
    const sidebar = document.querySelector('.sidebar') || document.getElementById('sidebar') || document.querySelector('.admin-sidebar');

    // 1. Auto-Close Mobile Sidebar when user scrolls page
    if (sidebar && (sidebar.classList.contains('active') || sidebar.classList.contains('open') || sidebar.classList.contains('mobile-open'))) {
        closeMobileSidebar();
    }

    // 2. Auto-Hide Mobile Header on Scroll Down, Show on Scroll Up
    if (mobileHeader && window.innerWidth <= 1024) {
        if (currentScrollY > lastMobileScrollY && currentScrollY > 50) {
            mobileHeader.style.transform = 'translateY(-100%)';
        } else {
            mobileHeader.style.transform = 'translateY(0)';
        }
    }
    lastMobileScrollY = currentScrollY;
}, { passive: true });

document.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar') || document.getElementById('sidebar') || document.querySelector('.admin-sidebar');
    const isToggleClick = e.target.closest('#sidebarToggle, #adminSidebarToggle, .sidebar-toggle, .hamburger, [data-toggle="sidebar"], .mobile-header .btn-header-action');
    
    if (sidebar && (sidebar.classList.contains('active') || sidebar.classList.contains('open') || sidebar.classList.contains('mobile-open'))) {
        // Close if click is outside sidebar & outside hamburger button
        if (!sidebar.contains(e.target) && !isToggleClick) {
            closeMobileSidebar();
        }
        // Close if click is on a navigation link item
        if (e.target.closest('.nav-item') || e.target.closest('a')) {
            closeMobileSidebar();
        }
    }
});

window.toggleMobileSidebar = toggleMobileSidebar;
window.closeMobileSidebar = closeMobileSidebar;
window.claimQuestReward = claimQuestReward;
window.sendLiveChat = sendLiveChat;

// ─── PWA SERVICE WORKER & INSTALL PROMPT ─────────────────────────────────────
let deferredPwaPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
});

function openPwaInstallModal() {
    const modal = document.getElementById('pwaInstallModal');
    if (modal) modal.classList.add('active');
}
window.openPwaInstallModal = openPwaInstallModal;
window.promptPWAInstall = openPwaInstallModal;

function closePwaInstallModal() {
    const modal = document.getElementById('pwaInstallModal');
    if (modal) modal.classList.remove('active');
}
window.closePwaInstallModal = closePwaInstallModal;

function executePwaInstall() {
    if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        deferredPwaPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted PWA installation');
                closePwaInstallModal();
            }
            deferredPwaPrompt = null;
        });
    } else {
        alert("📲 Silakan ikuti petunjuk manual di bawah untuk menyelesaikan instalasi pada browser Anda!");
    }
}
window.executePwaInstall = executePwaInstall;

function downloadDesktopShortcut() {
    const shortcutContent = `[InternetShortcut]\nURL=${window.location.protocol}//${window.location.host}/dashboard\nIconIndex=0\nIconFile=${window.location.protocol}//${window.location.host}/favicon.ico\n`;
    const blob = new Blob([shortcutContent], { type: 'application/x-ms-shortcut' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Hyrost Realm.url';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert("✅ File pintasan 'Hyrost Realm.url' berhasil diunduh! Klik file tersebut di komputer Anda untuk membuka Hyrost secara langsung.");
}
window.downloadDesktopShortcut = downloadDesktopShortcut;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((reg) => {
            console.log('⚡ PWA Service Worker Registered:', reg.scope);
        }).catch((err) => {
            console.warn('PWA SW registration failed:', err);
        });
    });
}

// ─── LIVE REALM ACTIVITY FEED (fallback when liveHub unavailable) ─────────────
async function loadLiveRealmActivities() {
    try {
        const res = await fetch('/api/live-activity');
        if (!res.ok) return;
        const data = await res.json();
        if (!data.activities || data.activities.length === 0) return;

        const container = document.getElementById('liveRealmActivityFeed');
        if (!container) return;

        container.innerHTML = data.activities.map(a => `
            <div style="display:flex; align-items:center; gap:10px; padding:10px 14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; margin-bottom:8px;">
                <div style="width:34px; height:34px; border-radius:10px; background:${a.color}22; color:${a.color}; display:flex; align-items:center; justify-content:center; font-size:0.95rem; border:1px solid ${a.color}44;">
                    <i class="fas ${a.icon}"></i>
                </div>
                <div style="flex:1;">
                    <h5 style="margin:0; color:#fff; font-size:0.82rem; font-weight:700;">${escapeHTML(a.title)}</h5>
                    <p style="margin:2px 0 0; color:#9ca3af; font-size:0.75rem;">${escapeHTML(a.details)}</p>
                </div>
            </div>
        `).join('');
    } catch(e) {}
}