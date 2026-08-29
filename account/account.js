console.log("DEBUG: Account Script Loaded");

document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
    setupEventListeners();
    refreshLinkedAccountsUI();
});

// Global Mobile Sidebar Toggle
function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar') || document.getElementById('sidebar') || document.querySelector('.admin-sidebar');
    const overlay = document.querySelector('.sidebar-overlay') || document.getElementById('sidebarOverlay');
    if (sidebar) {
        sidebar.classList.toggle('active');
        sidebar.classList.toggle('open');
        sidebar.classList.toggle('mobile-open');
    }
    if (overlay) {
        overlay.classList.toggle('active');
    }
}
window.toggleMobileSidebar = toggleMobileSidebar;

function showAccountToast(msg, type = 'info') {
    const existing = document.getElementById('accountToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'accountToast';
    toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; z-index: 99999;
        background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#6366f1'};
        color: #fff; padding: 12px 20px; border-radius: 12px;
        font-weight: 700; font-size: 0.9rem; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        transition: all 0.3s ease;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
window.showAccountToast = showAccountToast;
if (typeof window.showToast !== 'function') window.showToast = showAccountToast;

async function loadUserProfile() {
    const token = localStorage.getItem('hyrostToken');
    const localUserStr = localStorage.getItem('currentUser');

    if (!token && !localUserStr) {
        window.location.href = '/login';
        return;
    }

    function applyAvatarToUI(avatarUrl, username) {
        const av = avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'U')}&background=6366f1&color=fff`;
        const ids = ['bannerAvatar', 'userAvatarHeader', 'userAvatar', 'editAvatarPreview'];
        ids.forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.src = av;
        });
        return av;
    }

    if (localUserStr) {
        try {
            const localUser = JSON.parse(localUserStr);
            applyAvatarToUI(localUser.avatarUrl || localUser.avatar, localUser.username);
        } catch (e) {}
    }

    if (!token) return;

    try {
        const res = await fetch('/api/users/me', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
            if (res.status === 401) {
                localStorage.removeItem('hyrostToken');
                localStorage.removeItem('currentUser');
                window.location.href = '/login';
            }
            return;
        }

        const userData = await res.json();
        const user = {
            id: userData.id,
            username: userData.username,
            email: userData.email,
            role: userData.role,
            avatarUrl: userData.avatarUrl,
            createdAt: userData.createdAt,
            coinBronze: userData.coins?.bronze || 0,
            coinSilver: userData.coins?.silver || 0,
            coinGold: userData.coins?.gold || 0,
        };
        localStorage.setItem('currentUser', JSON.stringify(user));

        const bannerUsername = document.getElementById('bannerUsername');
        const displayUsername = document.getElementById('displayUsername');
        const bannerEmail = document.getElementById('bannerEmail');
        const displayEmail = document.getElementById('displayEmail');
        const displayRole = document.getElementById('displayRole');
        const coinBronze = document.getElementById('coinBronze');
        const coinSilver = document.getElementById('coinSilver');
        const coinGold = document.getElementById('coinGold');
        const adminBtnContainer = document.getElementById('adminPanelBtnContainer');

        if (bannerUsername) bannerUsername.textContent = user.username || 'User';
        if (displayUsername) displayUsername.textContent = user.username || 'User';
        if (bannerEmail) bannerEmail.textContent = user.email || '';
        if (displayEmail) displayEmail.textContent = user.email || '';

        if (displayRole) {
            displayRole.textContent = user.role || 'Member';
            if (user.role === 'Admin' || user.role === 'SuperAdmin') {
                displayRole.style.background = 'rgba(239, 68, 68, 0.2)';
                displayRole.style.color = '#ef4444';
            }
        }

        applyAvatarToUI(user.avatarUrl, user.username);

        if (coinBronze) coinBronze.textContent = user.coinBronze;
        if (coinSilver) coinSilver.textContent = user.coinSilver;
        if (coinGold) coinGold.textContent = user.coinGold;

        if (adminBtnContainer && (user.role === 'Admin' || user.role === 'SuperAdmin')) {
            adminBtnContainer.style.display = 'block';
        }

        if (typeof loadActivities === 'function') loadActivities();
    } catch (err) {
        console.error('Failed to load user profile:', err);
    }
}
window.loadUserProfile = loadUserProfile;

function switchProfileTab(tabId) {
    console.log("Switching profile tab to:", tabId);
    const tabs = document.querySelectorAll('.account-tabs .tab-btn');
    tabs.forEach(t => {
        if (t.getAttribute('data-tab') === tabId) {
            t.classList.add('active');
        } else {
            t.classList.remove('active');
        }
    });

    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(c => {
        if (c.id === `tab-${tabId}`) {
            c.classList.add('active');
            c.style.display = 'block';
        } else {
            c.classList.remove('active');
            c.style.display = 'none';
        }
    });

    if (tabId === 'sessions' && typeof loadActiveSessions === 'function') {
        loadActiveSessions();
    } else if (tabId === 'security' && typeof loadSecurityStatus === 'function') {
        loadSecurityStatus();
    } else if (tabId === 'activity' && typeof loadActivities === 'function') {
        loadActivities(true);
    } else if (tabId === 'minecraft' && typeof loadMinecraftLinkStatus === 'function') {
        loadMinecraftLinkStatus();
    } else if (tabId === 'skin3d' && typeof initProfile3DSkinViewer === 'function') {
        initProfile3DSkinViewer();
    } else if (tabId === 'referral' && typeof loadReferralProgramData === 'function') {
        loadReferralProgramData();
    }
}
window.switchProfileTab = switchProfileTab;

function setupEventListeners() {
    const toggleBtns = document.querySelectorAll('#sidebarToggle, .sidebar-toggle');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleMobileSidebar();
        });
    });

    const overlay = document.getElementById('sidebarOverlay') || document.querySelector('.sidebar-overlay');
    if (overlay) {
        overlay.addEventListener('click', () => {
            toggleMobileSidebar();
        });
    }

    const tabBtns = document.querySelectorAll('.account-tabs .tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = btn.getAttribute('data-tab');
            if (tabId) {
                switchProfileTab(tabId);
            }
        });
    });

    const btnDiscord = document.getElementById('btnDiscordLink');
    if (btnDiscord) btnDiscord.addEventListener('click', handleDiscordConnect);

    const btnMojang = document.getElementById('btnMojangLink');
    if (btnMojang) btnMojang.addEventListener('click', handleMojangConnect);
}
window.setupEventListeners = setupEventListeners;

// Bank / Exchange Modal Handlers
function openExchangeModal() {
    const modal = document.getElementById('exchangeModal');
    if (modal) modal.style.display = 'flex';
}
function closeExchangeModal() {
    const modal = document.getElementById('exchangeModal');
    if (modal) modal.style.display = 'none';
}
function updateExchangePreview() {
    const amount = parseInt(document.getElementById('exAmount')?.value || '0', 10);
    const preview = document.getElementById('exPreview');
    if (preview) {
        preview.textContent = `Hasil Estimasi: ${amount} koin`;
    }
}
async function submitExchange() {
    const from = document.getElementById('exFrom')?.value;
    const to = document.getElementById('exTo')?.value;
    const amount = parseInt(document.getElementById('exAmount')?.value || '0', 10);

    if (!amount || amount <= 0) {
        return showAccountToast("Masukkan jumlah koin yang valid", "error");
    }

    const token = localStorage.getItem('hyrostToken');
    if (!token) return showAccountToast("Silakan login terlebih dahulu", "error");

    try {
        const res = await fetch('/api/economy/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ fromCurrency: from, toCurrency: to, amount })
        });
        const data = await res.json();
        if (data.success) {
            showAccountToast("Tukar koin berhasil!", "success");
            closeExchangeModal();
            loadUserProfile();
        } else {
            showAccountToast(data.message || "Gagal melakukan penukaran", "error");
        }
    } catch (err) {
        showAccountToast("Error: " + err.message, "error");
    }
}
window.openExchangeModal = openExchangeModal;
window.closeExchangeModal = closeExchangeModal;
window.updateExchangePreview = updateExchangePreview;
window.submitExchange = submitExchange;

async function redeemVoucherCode() {
    const input = document.getElementById('voucherCodeInput');
    const code = input ? input.value.trim() : '';
    if (!code) {
        return showAccountToast("Silakan masukkan kode voucher!", "error");
    }

    const token = localStorage.getItem('hyrostToken');
    try {
        const res = await fetch('/api/vouchers/claim', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ code })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showAccountToast(data.message || "Voucher berhasil diklaim!", "success");
            if (input) input.value = '';
            if (typeof loadUserProfile === 'function') loadUserProfile();
        } else {
            showAccountToast(data.message || "Gagal mengklaim voucher", "error");
        }
    } catch (e) {
        showAccountToast("Error: " + e.message, "error");
    }
}
window.redeemVoucherCode = redeemVoucherCode;

// Connection Action Handlers
async function handleDiscordConnect() {
    const token = localStorage.getItem('hyrostToken');
    const discordStatusEl = document.getElementById('discordLinkStatus');
    const isLinked = discordStatusEl && discordStatusEl.textContent.includes('Terhubung');

    if (isLinked) {
        if (!confirm("Yakin ingin melepaskan akun Discord?")) return;
        try {
            const res = await fetch('/api/users/unlink-discord', {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                showAccountToast("Akun Discord berhasil dilepas.", "success");
                refreshLinkedAccountsUI();
            } else {
                showAccountToast(data.message || "Gagal melepas Discord", "error");
            }
        } catch (e) {
            showAccountToast("Error: " + e.message, "error");
        }
    } else {
        const discordTag = prompt("Masukkan Username / Tag Discord Anda:");
        if (!discordTag) return;
        try {
            const res = await fetch('/api/users/link-discord', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ discord_username: discordTag })
            });
            const data = await res.json();
            if (data.success) {
                showAccountToast("Akun Discord berhasil dihubungkan!", "success");
                refreshLinkedAccountsUI();
            } else {
                showAccountToast(data.message || "Gagal menghubungkan Discord", "error");
            }
        } catch (e) {
            showAccountToast("Error: " + e.message, "error");
        }
    }
}

async function handleMojangConnect() {
    const token = localStorage.getItem('hyrostToken');
    const mojangStatusEl = document.getElementById('mojangLinkStatus');
    const isLinked = mojangStatusEl && mojangStatusEl.textContent.includes('Terhubung');

    if (isLinked) {
        if (!confirm("Yakin ingin melepaskan akun Mojang / Minecraft?")) return;
        try {
            const res = await fetch('/api/minecraft/unlink-mojang', {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                showAccountToast("Tautan akun Mojang berhasil dilepas.", "success");
                refreshLinkedAccountsUI();
            } else {
                showAccountToast(data.message || "Gagal melepas Mojang", "error");
            }
        } catch (e) {
            showAccountToast("Error: " + e.message, "error");
        }
    } else {
        const username = prompt("Masukkan Username Resmi Minecraft Mojang Anda:");
        if (!username) return;
        try {
            const res = await fetch('/api/minecraft/link-mojang', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ mojang_username: username })
            });
            const data = await res.json();
            if (data.success) {
                showAccountToast(`Akun Mojang ${data.mojang_username} berhasil terhubung!`, "success");
                refreshLinkedAccountsUI();
            } else {
                showAccountToast(data.message || "Gagal menghubungkan Mojang", "error");
            }
        } catch (e) {
            showAccountToast("Error: " + e.message, "error");
        }
    }
}
window.handleDiscordConnect = handleDiscordConnect;
window.handleMojangConnect = handleMojangConnect;

// Initialize
function init() {
    console.log("DEBUG: Init running check...");
    loadUserProfile();
    setupEventListeners();
    refreshLinkedAccountsUI();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log("DEBUG: DOMContentLoaded fired");
        init();
    });
} else {
    console.log("DEBUG: DOM already ready");
    init();
}

    // Expose to window for HTML onclicks
    window.handleAvatarChange = handleAvatarChange;
    // Admin & UI Functions
    window.openAdminModal = openAdminModal;
    window.closeAdminModal = closeAdminModal;
    window.createNewRole = createNewRole;
    window.assignRoleToUser = assignRoleToUser;

    // --- LIVE PASSWORD STRENGTH VALIDATOR ---
    function validatePasswordStrength(pwd) {
        const seg1 = document.getElementById('pwdSeg1');
        const seg2 = document.getElementById('pwdSeg2');
        const seg3 = document.getElementById('pwdSeg3');
        const txt = document.getElementById('pwdStrengthText');

        if (!seg1 || !seg2 || !seg3 || !txt) return;

        seg1.className = 'password-meter-segment';
        seg2.className = 'password-meter-segment';
        seg3.className = 'password-meter-segment';

        if (!pwd || pwd.trim() === '') {
            txt.textContent = 'Ketik password baru...';
            txt.style.color = '#9ca3af';
            return;
        }

        let score = 0;
        if (pwd.length >= 6) score++;
        if (pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score++;
        if (pwd.length >= 10 && /[^A-Za-z0-9]/.test(pwd)) score++;

        if (pwd.length < 6 || score === 0) {
            seg1.classList.add('active-weak');
            txt.textContent = 'Kekuatan: Sangat Lemah (Minimal 6+ karakter)';
            txt.style.color = '#ef4444';
        } else if (score === 1) {
            seg1.classList.add('active-weak');
            txt.textContent = 'Kekuatan: Lemah (Gunakan minimal 8+ karakter dengan angka & huruf kapital)';
            txt.style.color = '#ef4444';
        } else if (score === 2) {
            seg1.classList.add('active-medium');
            seg2.classList.add('active-medium');
            txt.textContent = 'Kekuatan: Sedang (Bagus! Tambahkan karakter simbol untuk lebih aman)';
            txt.style.color = '#f59e0b';
        } else if (score >= 3) {
            seg1.classList.add('active-strong');
            seg2.classList.add('active-strong');
            seg3.classList.add('active-strong');
            txt.textContent = 'Kekuatan: Sangat Kuat! 🛡️';
            txt.style.color = '#10b981';
        }
    }
    window.validatePasswordStrength = validatePasswordStrength;

    // --- DYNAMIC SECURITY SCORE CALCULATOR ---
    function updateDynamicSecurityScore(scoreValue) {
        const is2FAActive = localStorage.getItem('hyrost_2fa_active') === 'true';
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const isLinked = currentUser.google_id || currentUser.discord_id || currentUser.mc_username;

        let score = scoreValue;
        if (score === undefined || score === null) {
            score = 45; // Base score for email verified
            if (is2FAActive) score += 35;
            if (isLinked) score += 20;
        }

        const scoreEl = document.getElementById('bannerSecurityScore');
        const scoreCircle = document.getElementById('securityScoreCircle');
        const fillBar = document.getElementById('securityProgressBar');

        const text = `${score}%`;
        if (scoreEl) scoreEl.textContent = text;
        if (scoreCircle) scoreCircle.textContent = text;
        if (fillBar) fillBar.style.width = text;
    }

    // --- SECURITY DATA FETCHING ---
    async function loadSecurityStatus() {
        updateDynamicSecurityScore();
        const token = localStorage.getItem('hyrostToken');
        if (!token) return;

        try {
            const res = await fetch('/api/users/security-status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return;

            const data = await res.json();
            if (data && typeof data.score === 'number') {
                updateDynamicSecurityScore(data.score);
            }
        } catch (err) {
            console.warn("Load security error optional fallback:", err);
        }
    }

    async function loadActiveSessions() {
        const container = document.getElementById('activeSessionsContainer');
        if (!container) return;

        const token = localStorage.getItem('hyrostToken');
        try {
            const res = await fetch('/api/users/sessions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return;

            const data = await res.json();
            if (!data.sessions || data.sessions.length === 0) {
                container.innerHTML = '<p style="color:#9ca3af;">Tidak ada sesi aktif lain.</p>';
                return;
            }

            container.innerHTML = data.sessions.map(s => `
                <div class="session-item">
                  <div style="display:flex; align-items:center; gap:14px;">
                    <div class="session-icon"><i class="fas ${s.device.includes('Mobile') ? 'fa-mobile-alt' : 'fa-desktop'}"></i></div>
                    <div class="session-details">
                      <h4>${s.device} (${s.browser})</h4>
                      <p>IP: ${s.ip} • Aktif sekarang</p>
                    </div>
                  </div>
                  <span class="badge-current"><i class="fas fa-circle" style="font-size:0.5rem; vertical-align:middle; margin-right:4px;"></i> Sesi Ini</span>
                </div>
            `).join('');
        } catch (err) {
            console.error("Load sessions error:", err);
        }
    }

    async function handleRevokeSessions() {
        const token = localStorage.getItem('hyrostToken');
        try {
            const res = await fetch('/api/users/revoke-sessions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            showToast(data.message || "Semua sesi lain telah dikeluarkan.", "success");
            loadActiveSessions();
        } catch (err) {
            showToast("Gagal mengeluarkan sesi.", "error");
        }
    }
    window.handleRevokeSessions = handleRevokeSessions;

    function handle2FAToggle(checked) {
        const desc = document.getElementById('twoFactorStatusDesc');
        localStorage.setItem('hyrost_2fa_active', checked ? 'true' : 'false');
        if (checked) {
            if (desc) desc.textContent = "2FA Aktif! Kode OTP akan diminta saat login.";
            showToast("Perlindungan 2FA berhasil diaktifkan!", "success");
        } else {
            if (desc) desc.textContent = "Perlindungan ganda dengan kode OTP saat login.";
            showToast("Perlindungan 2FA dinonaktifkan.", "info");
        }
        if (typeof updateDynamicSecurityScore === 'function') {
            updateDynamicSecurityScore();
        }
    }
    window.handle2FAToggle = handle2FAToggle;

// ─── PROFILE UPDATE & HEAD SYSTEM ────────────────────────────────────────────
let profileHeadsData = { catalog: [], ownedKeys: [], activeAvatarUrl: null };
let selectedHeadKey = null;

async function updateProfile(updates) {
    const token = localStorage.getItem('hyrostToken');
    if (!token) return { success: false, message: 'Silakan login terlebih dahulu' };

    try {
        const res = await fetch('/api/users/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updates),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            return { success: false, message: data.message || 'Gagal memperbarui profil' };
        }

        const cur = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const merged = { ...cur, ...updates };
        if (data.user) {
            merged.avatarUrl = data.user.avatarUrl || merged.avatarUrl;
            merged.email = data.user.email || merged.email;
        }
        localStorage.setItem('currentUser', JSON.stringify(merged));
        await loadUserProfile();
        return { success: true, message: data.message || 'Profil berhasil diperbarui!' };
    } catch (e) {
        return { success: false, message: e.message || 'Gagal terhubung ke server' };
    }
}
window.updateProfile = updateProfile;

async function loadProfileHeadsUI() {
    const token = localStorage.getItem('hyrostToken');
    if (!token) return;

    try {
        const res = await fetch('/api/users/profile-heads', {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        profileHeadsData = await res.json();

        document.querySelectorAll('.avatar-head-card.avatar-option').forEach((card) => {
            const url = card.dataset.url;
            const entry = profileHeadsData.catalog.find((c) => c.url === url);
            if (!entry) return;

            card.dataset.headKey = entry.key;
            card.dataset.unlockCost = entry.unlockCostBronze || 0;

            let lockOverlay = card.querySelector('.head-lock-overlay');
            if (entry.locked) {
                card.classList.add('head-locked');
                if (!lockOverlay) {
                    lockOverlay = document.createElement('div');
                    lockOverlay.className = 'head-lock-overlay';
                    lockOverlay.innerHTML = `<i class="fas fa-lock"></i><span>${entry.unlockCostBronze || 0} 🪙</span>`;
                    card.appendChild(lockOverlay);
                }
            } else {
                card.classList.remove('head-locked');
                if (lockOverlay) lockOverlay.remove();
            }
        });

        if (profileHeadsData.activeAvatarUrl) {
            selectedAvatarUrl = profileHeadsData.activeAvatarUrl;
        }
    } catch (e) {
        console.warn('Profile heads load failed:', e.message);
    }
}

async function unlockProfileHead(headKey) {
    const token = localStorage.getItem('hyrostToken');
    const entry = profileHeadsData.catalog.find((c) => c.key === headKey);
    if (!entry) return;

    if (!confirm(`Buka head "${entry.name}" seharga ${entry.unlockCostBronze} Koin Bronze?`)) return;

    const res = await fetch('/api/users/unlock-head', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ headKey }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
        showAccountToast(data.message, 'success');
        await loadProfileHeadsUI();
        loadUserProfile();
    } else {
        showAccountToast(data.message || 'Gagal membuka head', 'error');
    }
}
window.unlockProfileHead = unlockProfileHead;

    let currentLogs = []; // Store logs globally for toggle

    async function loadActivities(showAll = false) {
        const container = document.getElementById('activityLogsContainer');
        if (!container) return;
        
        const token = localStorage.getItem('hyrostToken');
        try {
            // Fetch only if needed or first load (optimization)
            if (currentLogs.length === 0) {
                 const res = await fetch('/api/users/activities', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                currentLogs = await res.json();
            }

            const logs = currentLogs;
            
            if (logs.length === 0) {
                container.innerHTML = '<p class="text-muted">No recent activity.</p>';
                return;
            }
            
            // Determine items to show
            const itemsToShow = showAll ? logs : logs.slice(0, 3);
            
            let html = '<ul class="activity-list">';
            itemsToShow.forEach(log => {
                const date = new Date(log.created_at).toLocaleDateString() + ' ' + new Date(log.created_at).toLocaleTimeString();
                html += `
                    <li>
                        <div class="act-icon"><i class="fas fa-history"></i></div>
                        <div class="act-details">
                            <span class="act-action">${log.action}</span>
                            <span class="act-desc">${log.details}</span>
                            <span class="act-time">${date}</span>
                        </div>
                    </li>
                `;
            });
            html += '</ul>';

            // Add "Show More" button if hidden items exist
            if (!showAll && logs.length > 3) {
                html += `
                    <div style="text-align: center; margin-top: 10px;">
                        <button id="btnLoadMoreActivity" class="btn-small btn-secondary" style="width: 100%; border: 1px dashed #444;">
                            <i class="fas fa-chevron-down"></i> Lihat Lebih Lengkap
                        </button>
                    </div>
                `;
            } else if (showAll && logs.length > 3) {
                 html += `
                    <div style="text-align: center; margin-top: 10px;">
                        <button id="btnCollapseActivity" class="btn-small btn-secondary" style="width: 100%; border: 1px dashed #444;">
                            <i class="fas fa-chevron-up"></i> Perkecil
                        </button>
                    </div>
                `;
            }

            container.innerHTML = html;

            // Attach Event Listener
            const btnLoadMore = document.getElementById('btnLoadMoreActivity');
            if (btnLoadMore) {
                btnLoadMore.addEventListener('click', () => loadActivities(true));
            }
            const btnCollapse = document.getElementById('btnCollapseActivity');
            if (btnCollapse) {
                btnCollapse.addEventListener('click', () => loadActivities(false));
            }

        } catch (err) {
            console.error(err);
            container.innerHTML = '<p class="text-danger">Failed to load activity.</p>';
        }
    }

    // --- Admin Logic ---
    function openAdminModal() {
        document.getElementById('adminModal').classList.add('active');
        loadRoles();
        loadUsersForAdmin();
    }

    function closeAdminModal() {
        document.getElementById('adminModal').classList.remove('active');
    }

    async function createNewRole() {
        const name = document.getElementById('newRoleName').value;
        if (!name) return showToast('Role name required', 'error');

        const token = localStorage.getItem('hyrostToken');
        try {
            const res = await fetch('/api/admin/role', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ roleName: name })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Role created!', 'success');
                document.getElementById('newRoleName').value = '';
                loadRoles();
            } else {
                showToast(data.message, 'error');
            }
        } catch(err) { showToast('Error creating role', 'error'); }
    }

    async function loadRoles() {
        const list = document.getElementById('rolesList');
        const select = document.getElementById('roleSelect');
        const token = localStorage.getItem('hyrostToken');
        try {
            const res = await fetch('/api/admin/roles', {
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            const roles = await res.json();
            
            // Update List
            list.innerHTML = roles.map(r => `<li>${r.name}</li>`).join('');
            
            // Update Select
            select.innerHTML = roles.map(r => `<option value="${r.name}">${r.name}</option>`).join('');
            
        } catch(err) { console.error(err); }
    }

    async function loadUsersForAdmin() {
        const select = document.getElementById('userSelect');
        const token = localStorage.getItem('hyrostToken');
        try {
            // Need an endpoint for this
            const res = await fetch('/api/admin/users', {
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            const users = await res.json();
            select.innerHTML = users.map(u => `<option value="${u.id}">${u.username} (${u.role})</option>`).join('');
        } catch(err) { console.error(err); }
    }

    async function assignRoleToUser() {
        const userId = document.getElementById('userSelect').value;
        const roleName = document.getElementById('roleSelect').value;
        const token = localStorage.getItem('hyrostToken');
        
        try {
            const res = await fetch('/api/admin/assign-role', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ targetUserId: userId, roleName: roleName })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
                loadUsersForAdmin(); // Refresh list to show new role
            } else {
                showToast(data.message, 'error');
            }
        } catch(err) { showToast('Error assigning role', 'error'); }
    }

    // --- Exchange System Logic ---
    window.openExchangeModal = function() {
        document.getElementById('exchangeModal').classList.add('active');
        updateExchangePreview(); // Initial State
    };

    window.closeExchangeModal = function() {
        document.getElementById('exchangeModal').classList.remove('active');
    };

    window.updateExchangePreview = function() {
        const from = document.getElementById('exFrom').value;
        const to = document.getElementById('exTo').value;
        const amount = parseInt(document.getElementById('exAmount').value) || 0;
        const previewEl = document.getElementById('exPreview');
        const EXCHANGE_RATE = 100;

        if (from === to) {
            previewEl.innerHTML = '<span style="color:#dc3545">Select different currencies</span>';
            return;
        }

        let result = 0;
        let valid = true;
        let msg = "";

        // Logic must match Backend
        if (from === 'bronze' && to === 'silver') {
            if (amount % EXCHANGE_RATE !== 0) { valid = false; msg = `Must be multiple of ${EXCHANGE_RATE}`; }
            else result = amount / EXCHANGE_RATE;
        } 
        else if (from === 'silver' && to === 'bronze') {
            result = amount * EXCHANGE_RATE;
        }
        else if (from === 'silver' && to === 'gold') {
            if (amount % EXCHANGE_RATE !== 0) { valid = false; msg = `Must be multiple of ${EXCHANGE_RATE}`; }
            else result = amount / EXCHANGE_RATE;
        }
        else if (from === 'gold' && to === 'silver') {
            result = amount * EXCHANGE_RATE;
        }
        else {
            valid = false;
            msg = "Conversion not supported directly.";
        }

        if (!valid) {
            previewEl.innerHTML = `<span style="color:#dc3545">${msg || "Invalid"}</span>`;
        } else {
            previewEl.innerHTML = `You will get: <span style="color:#ffd700; font-weight:bold;">${result} ${to.charAt(0).toUpperCase() + to.slice(1)}</span>`;
        }
    };

    window.submitExchange = async function() {
        const from = document.getElementById('exFrom').value;
        const to = document.getElementById('exTo').value;
        const amount = parseInt(document.getElementById('exAmount').value);
        const token = localStorage.getItem('hyrostToken');

        if (!amount || amount <= 0) return showToast("Invalid amount", "error");

        try {
            const res = await fetch('/api/economy/exchange', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ fromCurrency: from, toCurrency: to, amount: amount })
            });

            const data = await res.json();
            
            if (res.ok) {
                showToast(data.message || "Exchange Successful!", "success");
                closeExchangeModal();
                loadUserProfile(); // Refresh coins
            } else {
                showToast(data.message || "Exchange Failed", "error");
            }
        } catch(err) {
            showToast("Server Error", "error");
        }
    };




async function saveUserProfile() {
    const inputEmail = document.getElementById('email');
    
    const updates = {
        email: inputEmail.value
    };
    
    // Password Change Logic
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    
    if (newPass || confirmPass) {
        if (newPass !== confirmPass) {
            showToast("Password baru tidak cocok!", "error");
            return;
        }
        updates.password = newPass;
    }

    // Call API
    showToast('Menyimpan...', 'info');
    const result = await updateProfile(updates);

    if (result.success) {
        showToast('Profil berhasil diperbarui!', 'success');
        loadUserProfile(); 
    } else {
        showToast(result.message || 'Gagal menyimpan profil', 'error');
    }
}

// Variables for Modal Logic
let selectedAvatarUrl = null;
let selectedAvatarName = "Steve";
let selectedAvatarType = "Head Minecraft Default";

function updateAvatarModalPreview(url, name, type) {
    const previewImg = document.getElementById('avatarModalPreviewImg');
    const previewName = document.getElementById('avatarModalPreviewName');
    const previewType = document.getElementById('avatarModalPreviewType');

    if (previewImg) previewImg.src = url;
    if (previewName) previewName.textContent = name || "Head Selected";
    if (previewType) previewType.textContent = type || "Custom Avatar";
}

function handleAvatarChange() {
    const modal = document.getElementById('avatarModal');
    if (modal) {
        modal.classList.add('active');
        loadProfileHeadsUI().then(() => resetModal());
    }
}
window.handleAvatarChange = handleAvatarChange;

function resetModal() {
    selectedAvatarUrl = null;
    selectedHeadKey = null;
    document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
    
    const fileInput = document.getElementById('customAvatarInput');
    if (fileInput) fileInput.value = '';
    
    const fileNameDisplay = document.getElementById('fileName');
    if (fileNameDisplay) fileNameDisplay.textContent = "Tidak ada file dipilih";
    
    const errorMsg = document.getElementById('uploadError');
    if (errorMsg) errorMsg.textContent = "";

    const searchInput = document.getElementById('mcUsernameSearchInput');
    if (searchInput) searchInput.value = '';

    const searchResult = document.getElementById('mcHeadSearchResult');
    if (searchResult) searchResult.style.display = 'none';

    // Reset Subtabs to 'all'
    switchAvatarSubtab('all');
    
    // Select current avatar from saved profile
    const activeUrl = profileHeadsData.activeAvatarUrl;
    const currentUserStr = localStorage.getItem('currentUser');
    const userAvatar = activeUrl || (currentUserStr ? JSON.parse(currentUserStr).avatarUrl : null);

    if (userAvatar) {
        const match = document.querySelector(`.avatar-option[data-url="${userAvatar}"]`);
        if (match && !match.classList.contains('head-locked')) {
            match.classList.add('selected');
            selectedAvatarUrl = userAvatar;
            selectedHeadKey = match.dataset.headKey || null;
            selectedAvatarName = match.dataset.name || 'Head';
            selectedAvatarType = match.dataset.tag || 'Preset';
            updateAvatarModalPreview(selectedAvatarUrl, selectedAvatarName, selectedAvatarType);
            return;
        }
        selectedAvatarUrl = userAvatar;
        selectedHeadKey = null;
        updateAvatarModalPreview(userAvatar, 'Avatar Aktif', 'Head / Custom Tersimpan');
        return;
    }

    // Default Fallback
    selectedAvatarUrl = "https://cravatar.eu/helmavatar/Steve/128.png";
    updateAvatarModalPreview(selectedAvatarUrl, "Steve", "Classic Hero");
}

function switchAvatarSubtab(subtab) {
    const navBtns = document.querySelectorAll('.avatar-nav-btn');
    navBtns.forEach(btn => {
        if (btn.getAttribute('data-subtab') === subtab) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const gridPanel = document.getElementById('avatarPanelGrid');
    const searchPanel = document.getElementById('avatarPanelSearch');
    const uploadPanel = document.getElementById('avatarPanelUpload');
    const cards = document.querySelectorAll('.avatar-head-card');

    if (subtab === 'mcsearch') {
        if (gridPanel) gridPanel.style.display = 'none';
        if (searchPanel) searchPanel.style.display = 'block';
        if (uploadPanel) uploadPanel.style.display = 'none';
    } else if (subtab === 'custom') {
        if (gridPanel) gridPanel.style.display = 'none';
        if (searchPanel) searchPanel.style.display = 'none';
        if (uploadPanel) uploadPanel.style.display = 'block';
    } else {
        if (gridPanel) gridPanel.style.display = 'block';
        if (searchPanel) searchPanel.style.display = 'none';
        if (uploadPanel) uploadPanel.style.display = 'none';

        // Filter cards in grid
        cards.forEach(card => {
            if (subtab === 'all' || card.dataset.category === subtab) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }
}
window.switchAvatarSubtab = switchAvatarSubtab;

function fetchCustomMcHead() {
    const input = document.getElementById('mcUsernameSearchInput');
    const username = input?.value.trim();
    if (!username) {
        showAccountToast("Masukkan username Minecraft terlebih dahulu!", "error");
        return;
    }

    const headUrl = `https://cravatar.eu/helmavatar/${encodeURIComponent(username)}/128.png`;
    const resultBox = document.getElementById('mcHeadSearchResult');
    const foundImg = document.getElementById('foundHeadImg');
    const foundName = document.getElementById('foundHeadName');

    if (foundImg) foundImg.src = headUrl;
    if (foundName) foundName.textContent = username;
    if (resultBox) resultBox.style.display = 'block';

    const btnApply = document.getElementById('btnApplyFoundHead');
    if (btnApply) {
        btnApply.onclick = () => {
            selectedAvatarUrl = headUrl;
            selectedHeadKey = null;
            selectedAvatarName = username;
            selectedAvatarType = "Custom IGN Head";
            updateAvatarModalPreview(headUrl, username, "Mojang Verified IGN Head");
            
            // Clear preset selection
            document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
            showAccountToast(`Head ${username} terpilih! Klik Simpan Avatar untuk menerapkan.`, "info");
        };
    }
}
window.fetchCustomMcHead = fetchCustomMcHead;

function setupEventListeners() {
    // Form Submit
    const form = document.getElementById('profileForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            saveUserProfile();
        });
    }

    // Avatar Change Buttons
    const btnChangeAvatars = document.querySelectorAll('.change-avatar-btn, .change-avatar-btn-mini');
    btnChangeAvatars.forEach(btn => {
        btn.addEventListener('click', handleAvatarChange);
    });
    
    // Subtab Event Listeners
    const subtabBtns = document.querySelectorAll('.avatar-nav-btn');
    subtabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const subtab = btn.getAttribute('data-subtab');
            if (subtab) switchAvatarSubtab(subtab);
        });
    });

    // Modal Event Listeners
    const modal = document.getElementById('avatarModal');
    const closeBtn = document.getElementById('closeAvatarModal');
    const cancelBtn = document.getElementById('cancelAvatarModal');
    const saveBtn = document.getElementById('saveAvatarModal');
    const fileInput = document.getElementById('customAvatarInput');
    
    if (modal) {
        // Close
        const closeModal = () => modal.classList.remove('active');
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        
        // Preset Selection (20 Head Cards)
        document.querySelectorAll('.avatar-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const headKey = opt.dataset.headKey;
                if (opt.classList.contains('head-locked') && headKey) {
                    unlockProfileHead(headKey);
                    return;
                }

                if (fileInput) fileInput.value = '';
                const fileNameDisplay = document.getElementById('fileName');
                if (fileNameDisplay) fileNameDisplay.textContent = "Tidak ada file dipilih";
                const errorMsg = document.getElementById('uploadError');
                if (errorMsg) errorMsg.textContent = "";
                
                document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                
                selectedAvatarUrl = opt.dataset.url;
                selectedHeadKey = headKey || null;
                selectedAvatarName = opt.dataset.name || "Head Minecraft";
                selectedAvatarType = opt.dataset.tag || "Preset Head";
                
                updateAvatarModalPreview(selectedAvatarUrl, selectedAvatarName, selectedAvatarType);
            });
        });
        
        // File Upload
        if (fileInput) {
            fileInput.addEventListener('change', handleFileUpload);
        }
        
        // Save
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (selectedAvatarUrl) {
                    saveNewAvatar(selectedAvatarUrl);
                    closeModal();
                } else {
                    const errorMsg = document.getElementById('uploadError');
                    if (errorMsg) errorMsg.textContent = "Pilih avatar atau upload foto terlebih dahulu.";
                }
            });
        }
        
        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // --- NEW: Integrated Security & Form Listeners ---
    const profileEditForm = document.getElementById('profileEditForm');
    if (profileEditForm) {
        profileEditForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('username');
            const emailInput = document.getElementById('email');

            showToast('Menyimpan profil...', 'info');
            const result = await updateProfile({
                email: emailInput.value
            });

            if (result.success) {
                showToast('Profil berhasil diperbarui!', 'success');
                loadUserProfile();
            } else {
                showToast(result.message || 'Gagal memperbarui profil', 'error');
            }
        });
    }

    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const curPass = document.getElementById('currentPassword').value;
            const newPass = document.getElementById('newPassword').value;
            const confPass = document.getElementById('confirmPassword').value;

            if (newPass !== confPass) {
                showToast('Konfirmasi password baru tidak cocok!', 'error');
                return;
            }

            const token = localStorage.getItem('hyrostToken');
            showToast('Memproses pembaruan password...', 'info');

            try {
                const res = await fetch('/api/users/change-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ currentPassword: curPass, newPassword: newPass })
                });

                const data = await res.json();
                if (res.ok) {
                    showToast(data.message || 'Password berhasil diperbarui!', 'success');
                    changePasswordForm.reset();
                    validatePasswordStrength('');
                    loadSecurityStatus();
                } else {
                    showToast(data.message || 'Gagal memperbarui password', 'error');
                }
            } catch (err) {
                showToast('Gagal menghubungi server.', 'error');
            }
        });
    }

    // 0. Actions Menu & Logout
    const menuToggle = document.getElementById('profileMenuToggle');
    const menuDropdown = document.getElementById('profileActionDropdown');
    const btnLogout = document.getElementById('btnLogout');

    if (menuToggle && menuDropdown) {
        console.log("DEBUG: Menu Toggle Found");
        // Toggle
        menuToggle.addEventListener('click', (e) => {
            console.log("DEBUG: Menu Clicked");
            e.stopPropagation();
            menuDropdown.classList.toggle('active');
        });

        // Click Outside to Close
        document.addEventListener('click', (e) => {
            if (!menuToggle.contains(e.target) && !menuDropdown.contains(e.target)) {
                menuDropdown.classList.remove('active');
            }
        });
    } else {
        console.error("DEBUG: Menu Toggle or Dropdown NOT Found", { menuToggle, menuDropdown });
    }

    // Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
             // 1. Clear Session
             localStorage.removeItem('currentUser');
             localStorage.removeItem('hyrostToken'); // If exists
             
             // 2. Show Toast & Redirect
             showToast('Logout berhasil. Sampai jumpa!', 'success');
             setTimeout(() => {
                 window.location.href = '../'; // Adjust path if needed
             }, 1000);
        });
    }

    // 1. Google Link Button Handler
    const btnGoogleLink = document.getElementById('btnGoogleLink');
    if (btnGoogleLink) {
        btnGoogleLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const token = localStorage.getItem('hyrostToken');
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const isLinked = currentUser.google_id || currentUser.googleId;

            if (isLinked) {
                if (confirm('Apakah Anda yakin ingin memutuskan tautan akun Google?')) {
                    delete currentUser.google_id;
                    delete currentUser.googleId;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    localStorage.removeItem('googleUser');
                    showToast('Tautan akun Google diputus', 'info');
                    refreshLinkedAccountsUI();
                }
            } else {
                if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
                    google.accounts.id.prompt();
                } else {
                    const email = prompt('Masukkan Email Google Anda untuk dihubungkan:');
                    if (email) {
                        try {
                            const res = await fetch('/api/auth/google', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ payload: { email, sub: `g_${Date.now()}` } })
                            });
                            const data = await res.json();
                            if (res.ok && data.user) {
                                currentUser.google_id = data.user.googleId || `g_${Date.now()}`;
                                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                                showToast('Akun Google berhasil dihubungkan!', 'success');
                                refreshLinkedAccountsUI();
                            }
                        } catch (err) {
                            showToast('Gagal menghubungkan Google', 'error');
                        }
                    }
                }
            }
        });
    }

    // 2. Discord Link Button Handler
    const btnDiscordLink = document.getElementById('btnDiscordLink');
    if (btnDiscordLink) {
        btnDiscordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const token = localStorage.getItem('hyrostToken');
            if (!token) return showToast('Silakan login terlebih dahulu', 'error');

            const isLinked = btnDiscordLink.textContent.trim() === 'Putuskan';

            if (isLinked) {
                if (confirm('Apakah Anda yakin ingin memutuskan tautan Discord?')) {
                    try {
                        const res = await fetch('/api/users/unlink-discord', {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        const data = await res.json();
                        if (res.ok) {
                            showToast(data.message || 'Koneksi Discord diputus', 'info');
                            refreshLinkedAccountsUI();
                        }
                    } catch (err) {
                        showToast('Gagal memutuskan Discord', 'error');
                    }
                }
            } else {
                const username = prompt('Masukkan Username / Tag Discord Anda (Contoh: Alex#1234 atau alex_hyrost):');
                if (username) {
                    try {
                        const res = await fetch('/api/users/link-discord', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify({ discordUsername: username })
                        });
                        const data = await res.json();
                        if (res.ok) {
                            showToast(data.message, 'success');
                            refreshLinkedAccountsUI();
                        } else {
                            showToast(data.message || 'Gagal menghubungkan Discord', 'error');
                        }
                    } catch (err) {
                        showToast('Gagal menghubungi server', 'error');
                    }
                }
            }
        });
    }

    // 3. Mojang / Minecraft Link Button Handler
    const btnMojangLink = document.getElementById('btnMojangLink');
    if (btnMojangLink) {
        btnMojangLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const token = localStorage.getItem('hyrostToken');
            if (!token) return showToast('Silakan login terlebih dahulu', 'error');

            const isLinked = btnMojangLink.textContent.trim() === 'Putuskan';

            if (isLinked) {
                if (confirm('Apakah Anda yakin ingin memutuskan tautan akun Mojang/Minecraft?')) {
                    try {
                        const res = await fetch('/api/minecraft/unlink-mojang', {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        const data = await res.json();
                        if (res.ok) {
                            showToast(data.message || 'Tautan Mojang diputus', 'info');
                            refreshLinkedAccountsUI();
                            if (typeof loadMinecraftLinkStatus === 'function') loadMinecraftLinkStatus();
                        }
                    } catch (err) {
                        showToast('Gagal memutuskan tautan Mojang', 'error');
                    }
                }
            } else {
                const mcUsername = prompt('Masukkan Username Resmi Mojang / Minecraft Java Edition Anda:');
                if (mcUsername) {
                    try {
                        btnMojangLink.disabled = true;
                        btnMojangLink.textContent = 'Mencari Mojang...';

                        const res = await fetch('/api/minecraft/link-mojang', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify({ mcUsername })
                        });
                        const data = await res.json();
                        btnMojangLink.disabled = false;

                        if (res.ok && data.success) {
                            showToast(data.message, 'success');
                            refreshLinkedAccountsUI();
                            if (typeof loadMinecraftLinkStatus === 'function') loadMinecraftLinkStatus();
                        } else {
                            showToast(data.message || 'Gagal menghubungkan akun Mojang', 'error');
                            btnMojangLink.textContent = 'Hubungkan Mojang';
                        }
                    } catch (err) {
                        btnMojangLink.disabled = false;
                        btnMojangLink.textContent = 'Hubungkan Mojang';
                        showToast('Gagal memverifikasi ke API Mojang', 'error');
                    }
                }
            }
        });
    }

    // 2. Delete Account Logic
    const btnDelete = document.getElementById('btnTriggerDelete'); // Changed ID
    const deleteModal = document.getElementById('deleteAccountModal');
    const closeDeleteBtn = document.getElementById('closeDeleteModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteAccount');

    if (btnDelete && deleteModal) {
        const closeDel = () => deleteModal.classList.remove('active');
        
        btnDelete.addEventListener('click', () => deleteModal.classList.add('active'));
        if (closeDeleteBtn) closeDeleteBtn.addEventListener('click', closeDel);
        if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDel);
        
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', async () => {
                 // PERFORM DELETE logic
                 const token = localStorage.getItem('hyrostToken');
                 try {
                     const res = await fetch(`${window.location.origin}/api/users/delete`, {
                         method: 'DELETE', // or POST if you prefer
                         headers: {
                             'Authorization': `Bearer ${token}`
                         }
                     });
                     
                     const data = await res.json();
                     if (res.ok) {
                        showToast(data.message, 'success');
                        localStorage.removeItem('currentUser');
                        localStorage.removeItem('hyrostToken');
                        setTimeout(() => {
                            window.location.href = '/login'; 
                        }, 2000);
                     } else {
                        showToast(data.message || 'Gagal menghapus akun', 'error');
                     }
                 } catch (err) {
                     showToast('Connection Error', 'error');
                 }
            });
        }
        
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) closeDel();
        });
    }

    // 3. Password Validation Visuals
    const newPassInput = document.getElementById('newPassword');
    const confirmPassInput = document.getElementById('confirmPassword');
    
    function validatePasswords() {
        if (!newPassInput.value || !confirmPassInput.value) {
            confirmPassInput.style.borderColor = '#333';
            return;
        }
        if (newPassInput.value === confirmPassInput.value) {
            confirmPassInput.style.borderColor = '#4caf50'; // Green
        } else {
            confirmPassInput.style.borderColor = '#dc3545'; // Red
        }
    }
    
    if (newPassInput && confirmPassInput) {
        newPassInput.addEventListener('input', validatePasswords);
        confirmPassInput.addEventListener('input', validatePasswords);
    }
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    const errorMsg = document.getElementById('uploadError');
    const fileNameDisplay = document.getElementById('fileName');
    
    // Reset preset selection
    document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
    selectedAvatarUrl = null;
    
    if (!file) {
        fileNameDisplay.textContent = "Tidak ada file dipilih";
        return;
    }
    
    // Validate Type
    if (!file.type.startsWith('image/')) {
        errorMsg.textContent = "Mohon upload file gambar valid.";
        fileNameDisplay.textContent = "File tidak valid";
        return;
    }
    
    fileNameDisplay.textContent = file.name;
    
    // Read Image for Compression and Validation
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            // 1. Validation Logic
            if (this.width < 16 || this.height < 16) {
                errorMsg.textContent = `Ukuran foto terlalu kecil (${this.width}x${this.height}). Minimal 16x16 pixel.`;
                selectedAvatarUrl = null;
                return;
            }

            // 2. Client-Side Resizing & Compression (Max 512px, JPEG 0.7)
            const MAX_SIZE = 512;
            let width = this.width;
            let height = this.height;

            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(this, 0, 0, width, height);

            // Compress to JPEG 0.7 quality to reduce size significantly
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);

            // Success
            errorMsg.textContent = "";
            selectedAvatarUrl = compressedDataUrl;
            selectedHeadKey = null;
            selectedAvatarName = file.name;
            selectedAvatarType = "Custom Upload Photo";
            
            updateAvatarModalPreview(compressedDataUrl, file.name, "Unggahan Gambar Custom");

            // Upload directly to Hosting & Google Drive / MySQL backend
            const token = localStorage.getItem('hyrostToken');
            if (token) {
                const formData = new FormData();
                formData.append('avatar', file);
                fetch('/api/upload/avatar', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData
                })
                .then(r => r.json())
                .then(uploadRes => {
                    if (uploadRes.success && uploadRes.avatarUrl) {
                        selectedAvatarUrl = uploadRes.avatarUrl;
                        const storageLabel = uploadRes.storage === 'gdrive' ? 'Tersimpan di Google Drive' : 'Tersimpan di MySQL & Hosting';
                        updateAvatarModalPreview(uploadRes.avatarUrl, file.name, storageLabel);
                    }
                })
                .catch(err => console.warn('Avatar cloud upload fallback to local:', err));
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

async function saveNewAvatar(url) {
    showToast('Menyimpan avatar...', 'info');
    const token = localStorage.getItem('hyrostToken');
    if (!token) return showToast('Silakan login terlebih dahulu', 'error');

    const body = selectedHeadKey
        ? { headKey: selectedHeadKey }
        : { avatarUrl: url, headName: selectedAvatarName || 'Custom Head' };

    try {
        const res = await fetch('/api/users/select-head', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
            showToast(data.message || 'Gagal menyimpan avatar', 'error');
            return;
        }

        const savedUrl = data.avatarUrl || url;
        const cur = JSON.parse(localStorage.getItem('currentUser') || '{}');
        cur.avatarUrl = savedUrl;
        localStorage.setItem('currentUser', JSON.stringify(cur));

        showToast('Avatar berhasil disimpan!', 'success');
        await loadUserProfile();

        ['editAvatarPreview', 'userAvatar', 'bannerAvatar'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.src = savedUrl;
        });

        window.dispatchEvent(new Event('userProfileUpdated'));
    } catch (err) {
        showToast('Gagal menyimpan avatar: ' + err.message, 'error');
    }
}

// Helper: Toast Notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';
    
    toast.innerHTML = `
        <i class="fas ${iconClass} toast-icon"></i>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Remove after 3s
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}

// Helper: Update Link Status in Storage
function updateUserLinkStatus(linked) {
    if (typeof refreshLinkedAccountsUI === 'function') {
        refreshLinkedAccountsUI();
    }
    if (linked && typeof loadUserProfile === 'function') {
        loadUserProfile();
    }
}

// ─── MINECRAFT ACCOUNT LINKING ───────────────────────────────────────────────

async function loadMinecraftLinkStatus() {
    const token = localStorage.getItem('hyrostToken');
    if (!token) return;

    try {
        const res  = await fetch('/api/minecraft/link-status', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        const linkedWrap   = document.getElementById('mcLinkedState');
        const unlinkedWrap = document.getElementById('mcUnlinkedState');

        if (data.linked) {
            if (linkedWrap)   linkedWrap.style.display   = 'block';
            if (unlinkedWrap) unlinkedWrap.style.display = 'none';

            document.getElementById('mcLinkedUsername').textContent = data.mcUsername || 'Player';
            document.getElementById('mcLinkedUuid').textContent     = `UUID: ${data.mcUuid || '-'}`;
            document.getElementById('mcHeadAvatar').src = `https://cravatar.eu/helmavatar/${encodeURIComponent(data.mcUsername || 'Steve')}/64.png`;
        } else {
            if (linkedWrap)   linkedWrap.style.display   = 'none';
            if (unlinkedWrap) unlinkedWrap.style.display = 'block';
        }
    } catch (err) {
        console.error("Minecraft link status error:", err);
    }
}
window.loadMinecraftLinkStatus = loadMinecraftLinkStatus;

async function requestMinecraftLinkCode() {
    const token = localStorage.getItem('hyrostToken');
    if (!token) return showAccountToast("Silakan login terlebih dahulu", "error");

    const btn = document.getElementById('btnGenMcCode');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...'; }

    try {
        const res  = await fetch('/api/minecraft/link-request', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            document.getElementById('mcCodeDisplay').style.display = 'block';
            document.getElementById('mcGeneratedCode').textContent = data.linkCode;
            document.getElementById('mcFullCommand').textContent   = `/link ${data.linkCode}`;
            document.getElementById('mcCommandSample').textContent = `/link ${data.linkCode}`;
            showAccountToast("Kode verifikasi berhasil dibuat! Ketik di server Minecraft.", "success");
        } else {
            showAccountToast(data.message || "Gagal membuat kode", "error");
        }
    } catch (err) {
        showAccountToast("Error: " + err.message, "error");
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-key"></i> Buat Kode Verifikasi Baru'; }
    }
}
window.requestMinecraftLinkCode = requestMinecraftLinkCode;

async function unlinkMinecraftAccount() {
    if (!confirm("Yakin ingin melepas tautan akun Minecraft dari profil ini?")) return;
    const token = localStorage.getItem('hyrostToken');

    try {
        const res  = await fetch('/api/minecraft/unlink', {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            showAccountToast("Tautan akun Minecraft berhasil dilepas.", "success");
            loadMinecraftLinkStatus();
        } else {
            showAccountToast(data.message || "Gagal", "error");
        }
    } catch (err) {
        showAccountToast("Error: " + err.message, "error");
    }
}
window.unlinkMinecraftAccount = unlinkMinecraftAccount;

// ─── REFRESH LINKED ACCOUNTS UI (GOOGLE, DISCORD, MOJANG) ─────────────────────
async function refreshLinkedAccountsUI() {
    const token = localStorage.getItem('hyrostToken');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

    // 1. Google UI
    const googleStatusEl = document.getElementById('googleLinkStatus');
    const btnGoogle = document.getElementById('btnGoogleLink');
    const isGoogleLinked = currentUser.google_id || currentUser.googleId;
    if (googleStatusEl) {
        googleStatusEl.textContent = isGoogleLinked ? `Terhubung (${currentUser.email || 'Google'})` : 'Belum Terhubung';
        googleStatusEl.style.color = isGoogleLinked ? '#10b981' : '#9ca3af';
    }
    if (btnGoogle) {
        btnGoogle.textContent = isGoogleLinked ? 'Putuskan' : 'Hubungkan';
    }

    if (!token) return;

    // 2. Discord UI
    try {
        const res = await fetch('/api/users/discord-status', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            const discordStatusEl = document.getElementById('discordLinkStatus');
            const btnDiscord = document.getElementById('btnDiscordLink');
            if (discordStatusEl) {
                discordStatusEl.textContent = data.linked ? `Terhubung (${data.discordUsername})` : 'Belum Terhubung';
                discordStatusEl.style.color = data.linked ? '#10b981' : '#9ca3af';
            }
            if (btnDiscord) {
                btnDiscord.textContent = data.linked ? 'Putuskan' : 'Hubungkan';
            }
        }
    } catch (e) {}

    // 3. Mojang UI
    try {
        const res = await fetch('/api/minecraft/link-status', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            const mojangStatusEl = document.getElementById('mojangLinkStatus');
            const btnMojang = document.getElementById('btnMojangLink');
            const mojangAvatarContainer = document.getElementById('mojangAvatarContainer');

            if (mojangStatusEl) {
                mojangStatusEl.textContent = data.linked ? `Terhubung (${data.mcUsername})` : 'Belum Terhubung';
                mojangStatusEl.style.color = data.linked ? '#10b981' : '#9ca3af';
            }
            if (btnMojang) {
                btnMojang.textContent = data.linked ? 'Putuskan' : 'Hubungkan Mojang';
            }
            if (mojangAvatarContainer && data.linked && data.mcUsername) {
                mojangAvatarContainer.innerHTML = `<img src="https://mc-heads.net/avatar/${encodeURIComponent(data.mcUsername)}/64" style="width:36px; height:36px; border-radius:6px;">`;
            }
        }
    } catch (e) {}
}
window.refreshLinkedAccountsUI = refreshLinkedAccountsUI;

// ─── 3D MINECRAFT SKIN VIEWER INTEGRATION ────────────────────────────────────
let skinViewerInitialized = false;

function initProfile3DSkinViewer() {
    const canvas = document.getElementById('profileSkinCanvas');
    if (!canvas || !window.HyrostSkinViewer) return;

    const userStr = localStorage.getItem('currentUser');
    let username = 'Steve';
    if (userStr) {
        try {
            const u = JSON.parse(userStr);
            username = u.mojang_username || u.username || 'Steve';
        } catch (e) {}
    }

    if (!skinViewerInitialized) {
        skinViewerInitialized = true;
        window.HyrostSkinViewer.init(canvas, {
            username: username,
            height: 380,
            animation: true
        });
    }
}
window.initProfile3DSkinViewer = initProfile3DSkinViewer;

function setSkinViewerAnim(type) {
    if (window.HyrostSFX) window.HyrostSFX.playClick();
    if (window.HyrostSkinViewer) {
        window.HyrostSkinViewer.setAnimation('profileSkinCanvas', type);
    }
}
window.setSkinViewerAnim = setSkinViewerAnim;

function applyCustomSkinViewer() {
    const input = document.getElementById('customSkinInput');
    const val = (input ? input.value : '').trim();
    if (!val) return;

    if (window.HyrostSFX) window.HyrostSFX.playOrb();
    if (window.HyrostSkinViewer) {
        window.HyrostSkinViewer.setSkin('profileSkinCanvas', val);
        showAccountToast(`Skin berhasil diterapkan untuk: ${val}`, 'success');
    }
}
window.applyCustomSkinViewer = applyCustomSkinViewer;

// ─── REFERRAL & AFFILIATE PROGRAM ───────────────────────────────────────────
async function loadReferralProgramData() {
    const token = localStorage.getItem('hyrostToken');
    if (!token) return;

    try {
        const res = await fetch('/api/referrals/stats', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();

        if (result.success && result.data) {
            const d = result.data;
            const linkInput = document.getElementById('myReferralLinkInput');
            if (linkInput) linkInput.value = d.invite_url || `${window.location.origin}/register?ref=${d.referral_code}`;

            // Render Milestones
            const milestoneList = document.getElementById('referralMilestoneList');
            if (milestoneList && Array.isArray(d.milestones)) {
                milestoneList.innerHTML = d.milestones.map(m => `
                    <div style="background:var(--bg-surface-1); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:16px; display:flex; flex-direction:column; justify-content:space-between;">
                        <div>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                <span style="font-size:0.75rem; font-weight:800; color:var(--accent-gold); text-transform:uppercase;">Tier ${m.tier}</span>
                                <span style="font-size:0.75rem; color:var(--text-dim);">${m.progress}/${m.required} Teman</span>
                            </div>
                            <h4 style="margin:0 0 4px; font-size:0.95rem; color:#fff;">${escapeAccountHtml(m.name)}</h4>
                            <p style="font-size:0.8rem; color:var(--accent-emerald-light); font-weight:700; margin:0 0 14px;">${escapeAccountHtml(m.rewardDesc)}</p>
                        </div>
                        <div>
                            ${m.is_claimed 
                                ? '<button class="btn-action-outline" disabled style="width:100%; justify-content:center; opacity:0.6; cursor:not-allowed;"><i class="fas fa-check"></i> Sudah Diklaim</button>'
                                : m.is_completed 
                                    ? `<button class="btn-save" onclick="claimReferralReward(${m.tier})" style="width:100%; justify-content:center; margin:0; padding:8px 12px; background:linear-gradient(135deg, var(--accent-gold), #d97706);"><i class="fas fa-gift"></i> Klaim Hadiah</button>`
                                    : `<button class="btn-action-outline" disabled style="width:100%; justify-content:center; opacity:0.5; cursor:not-allowed;">Belum Tercapai</button>`
                            }
                        </div>
                    </div>
                `).join('');
            }

            // Render Invited Friends List
            const friendsList = document.getElementById('invitedFriendsList');
            if (friendsList) {
                if (!d.invited_users || d.invited_users.length === 0) {
                    friendsList.innerHTML = `
                        <div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">
                            Belum ada teman yang bergabung via link Anda. Bagikan link di atas untuk mulai mendapatkan reward!
                        </div>
                    `;
                } else {
                    friendsList.innerHTML = `
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            ${d.invited_users.map(u => `
                                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--bg-surface-1); border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        <img src="${escapeAccountHtml(u.avatar_url || 'https://cravatar.eu/avatar/Steve/32.png')}" style="width:28px; height:28px; border-radius:4px;">
                                        <div>
                                            <div style="font-size:0.85rem; font-weight:800; color:#fff;">${escapeAccountHtml(u.username)}</div>
                                            <div style="font-size:0.72rem; color:var(--text-dim);">Bergabung: ${new Date(u.created_at).toLocaleDateString('id-ID')}</div>
                                        </div>
                                    </div>
                                    <span style="font-size:0.75rem; background:rgba(16,185,129,0.15); color:var(--accent-emerald-light); padding:3px 8px; border-radius:4px; font-weight:700;">Aktif</span>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
            }
        }
    } catch (e) {
        console.error('Error loading referral data:', e);
    }
}
window.loadReferralProgramData = loadReferralProgramData;

function copyMyReferralLink() {
    const input = document.getElementById('myReferralLinkInput');
    if (!input) return;
    navigator.clipboard.writeText(input.value).then(() => {
        if (window.HyrostSFX) window.HyrostSFX.playOrb();
        showAccountToast('Link referral disalin ke clipboard!', 'success');
    }).catch(() => {
        prompt('Salin link undangan Anda:', input.value);
    });
}
window.copyMyReferralLink = copyMyReferralLink;

async function claimReferralReward(tier) {
    const token = localStorage.getItem('hyrostToken');
    if (!token) return;

    if (window.HyrostSFX) window.HyrostSFX.playClick();

    try {
        const res = await fetch('/api/referrals/claim-milestone', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tier })
        });
        const data = await res.json();
        if (data.success) {
            if (window.HyrostSFX) window.HyrostSFX.playLevelUp();
            showAccountToast(data.message, 'success');
            loadUserProfile();
            loadReferralProgramData();
        } else {
            showAccountToast(data.message || 'Gagal mengklaim reward', 'error');
        }
    } catch (e) {
        showAccountToast('Terjadi kesalahan', 'error');
    }
}
window.claimReferralReward = claimReferralReward;

function escapeAccountHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


