/* =====================================================
   HYROST ADMIN PANEL — JavaScript v2.0
   Fully rebuilt: 10 tabs, Toast system, all features
   ===================================================== */

'use strict';

// ─── GLOBALS ────────────────────────────────────────────
const API = '/api';
const token = localStorage.getItem('hyrostToken');
const authHeaders = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

let allUsers = [];
let allRoles = [];
let allLogs  = [];
let allThreads = [];
let allTickets = [];
let allEconUsers = [];
let currentRoleId = null;
let currentRoleAction = 'create';
let ticketStatusFilter = '';

// ─── INIT ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!token) { window.location.href = '../auth/login.html'; return; }

  loadAdminProfile();
  await Promise.all([loadRoles(), refreshServerStatus()]);
  loadOverview();

  const hashTab = (window.location.hash || '').replace('#', '');
  if (hashTab && document.getElementById(`tab-${hashTab}`)) {
    showTab(hashTab);
  }
});

// ─── TOAST SYSTEM ────────────────────────────────────────
function toast(msg, type = 'info', duration = 3500) {
  const icons = { success:'fas fa-check-circle', error:'fas fa-times-circle', warning:'fas fa-exclamation-triangle', info:'fas fa-info-circle' };
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<i class="${icons[type] || icons.info}"></i><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ─── LOGOUT ──────────────────────────────────────────────
window.logout = () => {
  localStorage.removeItem('hyrostToken');
  localStorage.removeItem('currentUser');
  window.location.href = '../auth/login.html';
};

// Mobile sidebar handled by mobileLayout.js (HyrostMobileLayout)

// ─── LOAD ADMIN PROFILE ──────────────────────────────────
async function loadAdminProfile() {
  try {
    const res = await fetch(`${API}/users/me`, { headers: authHeaders });
    if (res.status === 401) { logout(); return; }
    const data = await res.json();
    if ((data.role || '').toLowerCase() !== 'admin') {
      toast('Akses ditolak. Anda bukan Admin.', 'error');
      setTimeout(() => window.location.href = '../dashboard.html', 2000);
      return;
    }
    const el = document.getElementById('adminUsername');
    const av = document.getElementById('adminAvatar');
    if (el) el.textContent = data.username;
    if (av) av.src = data.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.username)}&background=6366f1&color=fff`;
  } catch (err) { console.warn('Profile load failed:', err); }
}

// ─── TAB SWITCHING ───────────────────────────────────────
const tabMeta = {
  overview:  { title: 'Overview — Command Center',     sub: 'Pantau dan kelola ekosistem Hyrost Realm' },
  users:     { title: 'Manajemen User',                sub: 'Kelola akun, role, dan akses member' },
  roles:     { title: 'Role & Badge Editor',           sub: 'Buat dan konfigurasi role serta badge kustom' },
  economy:   { title: 'Ekonomi & Koin',                sub: 'Kelola saldo koin setiap member' },
  forum:     { title: 'Moderasi Forum',                sub: 'Pin, hapus, dan kelola thread forum' },
  tickets:   { title: 'Tiket Support',                 sub: 'Tangani laporan dan permintaan bantuan member' },
  rewards:   { title: 'Konfigurasi Daily Rewards',     sub: 'Atur jumlah koin harian yang dapat diklaim' },
  cosmetics: { title: 'Manajemen Shop Kosmetik',       sub: 'Buat, edit, dan hapus item kosmetik' },
  settings:  { title: 'Pengaturan Server & Sistem',    sub: 'IP server, pengumuman, dan mode maintenance' },
  logs:      { title: 'Log Aktivitas Sistem',          sub: 'Riwayat lengkap semua aksi yang terjadi' },
  backup:    { title: 'Cadangan & Pemulihan Database', sub: 'Ekspor dan impor berkas cadangan data JSON' },
  broadcast: { title: 'Siaran Pesan Massal (Broadcast)',sub: 'Kirim notifikasi langsung ke seluruh member' },
  wiki:      { title: 'Pengelola Artikel Wiki & Guide',sub: 'Buat, edit, dan hapus panduan realm' },
  ipblock:   { title: 'Pemblokiran IP (IP Blacklist)',  sub: 'Kelola pemblokiran alamat IP terlarang' },
  vouchers:  { title: 'Pengelola Kode Voucher',        sub: 'Buat dan kelola kode voucher promo koin' },
  payments:  { title: 'Metode Pembayaran',           sub: 'Kelola metode pembayaran toko pangkat & checkout' },
  health:    { title: 'System Health',               sub: 'Status MySQL, plugin, backup, dan integrasi' },
  'payments-admin': { title: 'Order Pembayaran',     sub: 'Setujui atau tolak pembayaran IDR manual' },
};

window.showTab = (name) => {
  document.querySelectorAll('.tab-panel').forEach(el => el.classList.remove('active'));
  const panel = document.getElementById(`tab-${name}`);
  if (panel) panel.classList.add('active');

  document.querySelectorAll('.admin-tab-nav .tab-btn').forEach(btn => btn.classList.remove('active'));
  const tabBtn = document.querySelector(`.admin-tab-nav .tab-btn[data-tab="${name}"]`);
  if (tabBtn) tabBtn.classList.add('active');

  const meta = tabMeta[name] || {};
  const title = document.getElementById('tabPageTitle');
  const sub   = document.getElementById('tabPageSubtitle');
  if (title) title.textContent = meta.title || '';
  if (sub)   sub.textContent   = meta.sub   || '';

  if (history.replaceState) {
    history.replaceState(null, '', `#${name}`);
  }

  if (tabBtn && window.matchMedia('(max-width: 992px)').matches) {
    tabBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  // Lazy load per tab
  if (name === 'overview')  loadOverview();
  if (name === 'users')     loadUsers();
  if (name === 'roles')     loadRoles();
  if (name === 'economy')   loadEconomy();
  if (name === 'forum')     loadForum();
  if (name === 'tickets')   loadTickets();
  if (name === 'rewards')   loadRewardsConfig();
  if (name === 'cosmetics') loadCosmetics();
  if (name === 'settings')  { loadSettings(); loadServerConfig(); loadBannedWords(); loadPaymentSettings(); }
  if (name === 'logs')      loadLogs();
  if (name === 'wiki')      loadWikiManager();
  if (name === 'ipblock')   loadIPBlacklist();
  if (name === 'vouchers')  loadVouchersManager();
  if (name === 'payments')  loadPaymentMethodsManager();
  if (name === 'health')    loadSystemHealth();
  if (name === 'payments-admin') loadPaymentOrders();
};

// ─── SERVER STATUS ───────────────────────────────────────
async function refreshServerStatus() {
  try {
    const res = await fetch(`${API}/server-status`);
    if (!res.ok) return;
    const data = await res.json();

    const ip      = data.serverIp || 'play.hyrost.net';
    const port      = data.serverPort || '25565';
    const address   = data.serverAddress || (port !== '25565' ? `${ip}:${port}` : ip);
    const queried   = data.queriedHost || address;
    const players   = data.onlinePlayers ?? '--';
    const online    = data.isOnline;
    const source    = data.statusSource || 'api';

    setEl('serverIpDisplay', address);
    setEl('serverPlayerCount', players);
    setEl('overviewServerIp', address);
    setEl('overviewOnlinePlayers', players);
    setEl('serverQueryTarget', queried);
    setEl('serverStatusSource', source === 'plugin' ? 'Plugin Bridge' : source === 'mcsrvstat' ? `Query ${queried}` : 'Default');

    const dot = document.getElementById('serverStatusDot');
    if (dot) { dot.className = 'status-dot' + (online ? '' : ' offline'); }

    const statusText = document.getElementById('overviewServerStatusText');
    if (statusText) {
      statusText.textContent = online ? '🟢 Online' : '🔴 Offline';
      statusText.style.color = online ? 'var(--accent-emerald)' : 'var(--accent-red)';
    }

    const statText = document.getElementById('stat-server-status-text');
    if (statText) {
      statText.innerHTML = online ? '<i class="fas fa-circle"></i> Online' : '<i class="fas fa-circle"></i> Offline';
      statText.className = 'stat-card-change ' + (online ? 'up' : 'down');
    }
    setEl('stat-online-players', players);
  } catch (e) {}
}

window.refreshServerStatus = refreshServerStatus;

// ─── OVERVIEW ────────────────────────────────────────────
async function loadOverview() {
  refreshServerStatus();

  // User count
  try {
    const res = await fetch(`${API}/admin/users`, { headers: authHeaders });
    if (res.ok) {
      const users = await res.json();
      setEl('stat-total-users', users.length);
      setEl('badge-users', users.length);
      document.getElementById('badge-users').style.display = users.length > 0 ? 'inline' : 'none';

      // Recent users
      const list = document.getElementById('recentUsersList');
      if (list) {
        const recent = users.slice(0, 6);
        list.innerHTML = recent.length ? recent.map(u => `
          <div class="recent-item">
            <img class="r-avatar" src="${u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=6366f1&color=fff`}" alt="${u.username}" />
            <div class="r-info">
              <strong>${escHtml(u.username)}</strong>
              <small>${escHtml(u.email)} • <span class="badge badge-${u.role.toLowerCase()}">${u.role}</span></small>
            </div>
            <span class="r-time">${u.created_at ? timeAgo(u.created_at) : ''}</span>
          </div>
        `).join('') : '<div class="empty-state"><i class="fas fa-users"></i><p>Belum ada member</p></div>';
      }
    }
  } catch(e) {}

  // Roles count
  try {
    setEl('stat-total-roles', allRoles.length || '--');
  } catch(e) {}

  // Tickets count
  try {
    const res = await fetch(`${API}/admin/tickets`, { headers: authHeaders });
    if (res.ok) {
      const tickets = await res.json();
      const openCount = tickets.filter(t => t.status === 'open').length;
      setEl('stat-open-tickets', openCount);
      const badge = document.getElementById('badge-tickets');
      if (badge) { badge.textContent = openCount; badge.style.display = openCount > 0 ? 'inline' : 'none'; }
      const changeBadge = document.getElementById('ticket-change-badge');
      if (changeBadge) changeBadge.className = 'stat-card-change ' + (openCount > 0 ? 'down' : 'up');
    }
  } catch(e) {}

  // Activity
  try {
    const res = await fetch(`${API}/admin/logs`, { headers: authHeaders });
    if (res.ok) {
      const logs = await res.json();
      const el = document.getElementById('overviewActivityList');
      if (el) {
        const recent = logs.slice(0, 8);
        el.innerHTML = recent.length ? recent.map(log => `
          <div class="activity-item">
            <div class="activity-icon" style="background:rgba(99,102,241,0.15); color:var(--accent-indigo);">
              <i class="${logIcon(log.action)}"></i>
            </div>
            <div class="activity-body">
              <strong>${escHtml(log.username || '?')}</strong>
              <p>${escHtml(log.action)} — ${escHtml(log.details || '')}</p>
            </div>
            <span class="activity-time">${timeAgo(log.created_at)}</span>
          </div>
        `).join('') : '<div class="empty-state"><i class="fas fa-history"></i><p>Belum ada aktivitas</p></div>';
      }
    }
  } catch(e) {}
}

function logIcon(action = '') {
  action = action.toUpperCase();
  if (action.includes('LOGIN'))  return 'fas fa-sign-in-alt';
  if (action.includes('CLAIM'))  return 'fas fa-gift';
  if (action.includes('BUY'))    return 'fas fa-shopping-cart';
  if (action.includes('DELETE')) return 'fas fa-trash';
  if (action.includes('UPDATE')) return 'fas fa-edit';
  return 'fas fa-bolt';
}

// ─── USERS ───────────────────────────────────────────────
async function loadUsers() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5"><div class="loading-spinner"><i class="fas fa-spinner"></i> Memuat data user...</div></td></tr>`;
  try {
    const res = await fetch(`${API}/admin/users`, { headers: authHeaders });
    if (res.status === 403) { handleAccessDenied(); return; }
    allUsers = await res.json();
    renderUsersTable(allUsers);
    setEl('userCountLabel', `${allUsers.length} member terdaftar`);

    // Populate role filter
    const filter = document.getElementById('userRoleFilter');
    if (filter) {
      const existing = Array.from(filter.options).map(o => o.value);
      allRoles.forEach(r => {
        if (!existing.includes(r.name)) {
          const opt = document.createElement('option');
          opt.value = r.name; opt.textContent = r.name;
          filter.appendChild(opt);
        }
      });
    }
  } catch(err) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-exclamation-triangle" style="color:var(--accent-red)"></i><p>Gagal memuat data user</p></div></td></tr>`;
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-users"></i><p>Tidak ada user ditemukan</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>
        <div class="user-cell">
          <img src="${u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=6366f1&color=fff`}" alt="${escHtml(u.username)}" />
          <div class="cell-info">
            <span>${escHtml(u.username)}</span>
            <small>${escHtml(u.email)}</small>
          </div>
        </div>
      </td>
      <td><span class="badge badge-${(u.role||'member').toLowerCase()}">${escHtml(u.role || 'Member')}</span></td>
      <td>
        <div class="coin-row">
          <span class="coin-pill coin-bronze"><i class="fas fa-coins"></i>${u.coin_bronze||0}</span>
          <span class="coin-pill coin-silver"><i class="fas fa-coins"></i>${u.coin_silver||0}</span>
          <span class="coin-pill coin-gold"><i class="fas fa-coins"></i>${u.coin_gold||0}</span>
        </div>
      </td>
      <td style="font-size:0.78rem; color:var(--text-dim);">${u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '-'}</td>
      <td style="text-align:right;">
        <button class="btn btn-sm btn-secondary" onclick="openUserModal(${u.id})"><i class="fas fa-edit"></i> Edit</button>
      </td>
    </tr>
  `).join('');
}

window.filterUsers = () => {
  const q = (document.getElementById('userSearchInput')?.value || '').toLowerCase();
  const r = document.getElementById('userRoleFilter')?.value || '';
  const filtered = allUsers.filter(u =>
    (u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
    (!r || u.role === r)
  );
  renderUsersTable(filtered);
};

window.openUserModal = (id) => {
  const user = allUsers.find(u => u.id === id);
  if (!user) return;
  setEl('userModalName', user.username);
  document.getElementById('editUserId').value = id;
  const sel = document.getElementById('editUserRole');
  sel.innerHTML = allRoles.map(r => `<option value="${r.name}" ${r.name === user.role ? 'selected' : ''}>${r.name}</option>`).join('');
  openModal('userModal');
};

window.closeUserModal = () => closeModal('userModal');

window.saveUserRole = async () => {
  const id   = document.getElementById('editUserId').value;
  const role = document.getElementById('editUserRole').value;
  try {
    const res = await fetch(`${API}/admin/assign-role`, { method:'POST', headers: authHeaders, body: JSON.stringify({ targetUserId: id, roleName: role }) });
    const data = await res.json();
    if (res.ok) { toast('Role berhasil diperbarui!', 'success'); closeUserModal(); loadUsers(); }
    else toast(data.message || 'Gagal update role', 'error');
  } catch(e) { toast('Error server', 'error'); }
};

window.deleteUserConfirm = async () => {
  const id = document.getElementById('editUserId').value;
  if (!confirm('Hapus user ini secara permanen dari Hyrost?')) return;
  try {
    const res = await fetch(`${API}/admin/user/${id}`, { method:'DELETE', headers: authHeaders });
    if (res.ok) { toast('User berhasil dihapus', 'success'); closeUserModal(); loadUsers(); }
    else toast('Gagal menghapus user', 'error');
  } catch(e) { toast('Error server', 'error'); }
};

// ─── ROLES ───────────────────────────────────────────────
async function loadRoles() {
  const grid = document.getElementById('roleGrid');
  if (grid) grid.innerHTML = `<div class="loading-spinner" style="grid-column:1/-1;"><i class="fas fa-spinner"></i> Memuat role...</div>`;
  try {
    const res = await fetch(`${API}/admin/roles`, { headers: authHeaders });
    if (res.status === 403) { handleAccessDenied(); return; }
    allRoles = await res.json();
    setEl('stat-total-roles', allRoles.length);
    renderRoleGrid();
  } catch(err) {
    if (grid) grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fas fa-exclamation-triangle"></i><p>Gagal memuat role</p></div>`;
  }
}

function renderRoleGrid() {
  const grid = document.getElementById('roleGrid');
  if (!grid) return;
  if (!allRoles.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fas fa-id-badge"></i><p>Belum ada role</p></div>`;
    return;
  }
  grid.innerHTML = allRoles.map(role => {
    const fontClass = role.badge_style || 'normal';
    return `
      <div class="role-card" onclick="openRoleModal(${role.id})">
        <div class="role-badge-preview ${fontClass}" style="background:${role.badge_color||'#6366f1'};">
          ${escHtml(role.badge_text || role.name)}
        </div>
        <h4>${escHtml(role.name)}</h4>
        <p>${escHtml(role.description || 'Tidak ada deskripsi')}</p>
        <div class="role-price">
          ${role.price_coin > 0 ? `<i class="fas fa-coins" style="color:#ffd700;"></i> ${role.price_coin} Koin` : ''}
          ${role.price_idr  > 0 ? ` | IDR ${role.price_idr.toLocaleString('id-ID')}` : ''}
          ${role.price_coin === 0 && role.price_idr === 0 ? 'Gratis / Assign Manual' : ''}
        </div>
        <button class="btn btn-sm btn-secondary" style="width:100%;" onclick="event.stopPropagation(); openRoleModal(${role.id})">
          <i class="fas fa-cog"></i> Konfigurasi
        </button>
      </div>
    `;
  }).join('');
}

window.openRoleModal = (roleId) => {
  currentRoleId = roleId;
  currentRoleAction = roleId ? 'update' : 'create';
  const deleteBtn = document.getElementById('deleteRoleBtn');
  const nameInput = document.getElementById('roleNameInput');
  const modalTitle = document.getElementById('roleModalTitle');

  if (roleId) {
    const role = allRoles.find(r => r.id === roleId);
    if (!role) return;
    modalTitle.textContent = `Edit Role: ${role.name}`;
    nameInput.value = role.name;
    nameInput.readOnly = true;
    document.getElementById('badgeTextInput').value  = role.badge_text  || '';
    document.getElementById('badgeColorInput').value = role.badge_color || '#6366f1';
    document.getElementById('badgeStyleInput').value = role.badge_style || 'normal';
    document.getElementById('roleCoinPrice').value   = role.price_coin  || 0;
    document.getElementById('roleIdrPrice').value    = role.price_idr   || 0;
    document.getElementById('roleDescInput').value   = role.description || '';
    if (deleteBtn) deleteBtn.style.display = ['Admin','Member'].includes(role.name) ? 'none' : 'flex';
  } else {
    modalTitle.textContent = 'Buat Role Baru';
    nameInput.value = ''; nameInput.readOnly = false;
    document.getElementById('badgeTextInput').value  = '';
    document.getElementById('badgeColorInput').value = '#6366f1';
    document.getElementById('badgeStyleInput').value = 'normal';
    document.getElementById('roleCoinPrice').value   = 0;
    document.getElementById('roleIdrPrice').value    = 0;
    document.getElementById('roleDescInput').value   = '';
    if (deleteBtn) deleteBtn.style.display = 'none';
  }
  updateRoleBadgePreview();
  openModal('roleModal');
};

window.closeRoleModal = () => closeModal('roleModal');

// Live badge preview
document.addEventListener('DOMContentLoaded', () => {
  ['badgeTextInput','badgeColorInput','badgeStyleInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateRoleBadgePreview);
  });
});

function updateRoleBadgePreview() {
  const preview = document.getElementById('roleBadgePreview');
  if (!preview) return;
  const text  = document.getElementById('badgeTextInput')?.value || 'ROLE';
  const color = document.getElementById('badgeColorInput')?.value || '#6366f1';
  const style = document.getElementById('badgeStyleInput')?.value || 'normal';
  preview.textContent = text || 'ROLE';
  preview.style.background = color;
  preview.className = `role-badge-preview ${style}`;
}

window.saveRole = async () => {
  const name  = document.getElementById('roleNameInput').value.trim();
  const badge = document.getElementById('badgeTextInput').value.trim();
  const color = document.getElementById('badgeColorInput').value;
  const style = document.getElementById('badgeStyleInput').value;
  const coin  = document.getElementById('roleCoinPrice').value;
  const idr   = document.getElementById('roleIdrPrice').value;
  const desc  = document.getElementById('roleDescInput').value;

  if (!name) { toast('Nama role wajib diisi!', 'warning'); return; }

  try {
    if (currentRoleAction === 'create') {
      const res = await fetch(`${API}/admin/role`, { method:'POST', headers: authHeaders, body: JSON.stringify({ name }) });
      if (!res.ok) { const d = await res.json(); toast(d.message || 'Gagal membuat role', 'error'); return; }
      await loadRoles();
      const newRole = allRoles.find(r => r.name === name);
      if (newRole) currentRoleId = newRole.id;
    }
    if (currentRoleId) {
      const res2 = await fetch(`${API}/admin/role/${currentRoleId}`, {
        method:'PUT', headers: authHeaders,
        body: JSON.stringify({ badgeText: badge, badgeColor: color, badgeStyle: style, coinPrice: coin, idrPrice: idr, description: desc })
      });
      if (!res2.ok) { toast('Gagal menyimpan kustomisasi', 'error'); return; }
    }
    toast('Role berhasil disimpan!', 'success');
    closeRoleModal();
    loadRoles();
  } catch(err) { toast('Error server', 'error'); }
};

window.deleteRole = async () => {
  if (!currentRoleId) return;
  if (!confirm('Hapus role ini secara permanen?')) return;
  try {
    const res = await fetch(`${API}/admin/role/${currentRoleId}`, { method:'DELETE', headers: authHeaders });
    const d = await res.json();
    if (res.ok) { toast('Role berhasil dihapus', 'success'); closeRoleModal(); loadRoles(); }
    else toast(d.message || 'Gagal menghapus role', 'error');
  } catch(err) { toast('Error server', 'error'); }
};

// ─── ECONOMY ─────────────────────────────────────────────
async function loadEconomy() {
  const tbody = document.getElementById('econTableBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5"><div class="loading-spinner"><i class="fas fa-spinner"></i> Memuat data ekonomi...</div></td></tr>`;
  try {
    const res = await fetch(`${API}/admin/users`, { headers: authHeaders });
    allEconUsers = await res.json();
    renderEconTable(allEconUsers);
  } catch(err) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Gagal memuat data</p></div></td></tr>`;
  }
}

function renderEconTable(users) {
  const tbody = document.getElementById('econTableBody');
  if (!tbody) return;
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>
        <div class="user-cell">
          <img src="${u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=6366f1&color=fff`}" alt="" />
          <div class="cell-info"><span>${escHtml(u.username)}</span><small>${escHtml(u.email)}</small></div>
        </div>
      </td>
      <td><span class="coin-pill coin-bronze"><i class="fas fa-coins"></i> ${u.coin_bronze||0}</span></td>
      <td><span class="coin-pill coin-silver"><i class="fas fa-coins"></i> ${u.coin_silver||0}</span></td>
      <td><span class="coin-pill coin-gold"><i class="fas fa-coins"></i> ${u.coin_gold||0}</span></td>
      <td>
        <div style="display:flex; gap:6px; align-items:center;">
          <select id="econType-${u.id}" style="padding:5px 8px; background:rgba(255,255,255,0.05); border:1px solid var(--border-subtle); border-radius:6px; color:#fff; font-size:0.78rem; outline:none;">
            <option value="bronze">Bronze</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
          </select>
          <input type="number" id="econAmt-${u.id}" placeholder="Jumlah" style="width:80px; padding:5px 8px; background:rgba(255,255,255,0.05); border:1px solid var(--border-subtle); border-radius:6px; color:#fff; font-size:0.78rem; outline:none;" />
          <button class="btn btn-sm btn-gold" onclick="updateCoins(${u.id})"><i class="fas fa-check"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.filterEcon = () => {
  const q = (document.getElementById('econSearchInput')?.value || '').toLowerCase();
  renderEconTable(allEconUsers.filter(u => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
};

window.updateCoins = async (userId) => {
  const type   = document.getElementById(`econType-${userId}`)?.value;
  const amount = document.getElementById(`econAmt-${userId}`)?.value;
  if (!amount) { toast('Masukkan jumlah koin', 'warning'); return; }
  try {
    const res = await fetch(`${API}/admin/update-coins`, { method:'POST', headers: authHeaders, body: JSON.stringify({ targetUserId: userId, type, amount: parseInt(amount) }) });
    if (res.ok) { toast(`Koin ${type} berhasil diperbarui!`, 'success'); document.getElementById(`econAmt-${userId}`).value = ''; loadEconomy(); }
    else toast('Gagal update koin', 'error');
  } catch(e) { toast('Error server', 'error'); }
};

// ─── FORUM ───────────────────────────────────────────────
async function loadForum() {
  const list = document.getElementById('forumThreadList');
  if (!list) return;
  list.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner"></i> Memuat thread...</div>`;
  try {
    const res = await fetch(`${API}/admin/forum/threads`, { headers: authHeaders });
    allThreads = await res.json();
    const badge = document.getElementById('badge-forum');
    if (badge) { badge.textContent = allThreads.length; badge.style.display = allThreads.length ? 'inline' : 'none'; }
    renderForumList(allThreads);
  } catch(err) {
    list.innerHTML = `<div class="empty-state"><i class="fas fa-comments"></i><p>Gagal memuat thread</p></div>`;
  }
}

function renderForumList(threads) {
  const list = document.getElementById('forumThreadList');
  if (!list) return;
  if (!threads.length) {
    list.innerHTML = `<div class="empty-state"><i class="fas fa-comments"></i><p>Tidak ada thread ditemukan</p></div>`;
    return;
  }
  list.innerHTML = threads.map(t => `
    <div style="display:flex; align-items:flex-start; gap:14px; padding:14px 0; border-bottom:1px solid var(--border-subtle);">
      <div style="flex:1;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:5px;">
          <strong style="color:#fff; font-size:0.9rem;">${escHtml(t.title)}</strong>
          ${t.is_pinned ? '<span class="badge badge-pinned"><i class="fas fa-thumbtack"></i> Pinned</span>' : ''}
        </div>
        <p style="color:var(--text-secondary); font-size:0.8rem; margin-bottom:6px;">${escHtml((t.content||'').substring(0,120))}...</p>
        <small style="color:var(--text-dim);">oleh <strong style="color:var(--text-secondary);">${escHtml(t.username||'?')}</strong> • ${t.created_at ? timeAgo(t.created_at) : ''}</small>
      </div>
      <div style="display:flex; gap:7px; flex-shrink:0;">
        <button class="btn btn-sm btn-secondary" onclick="pinThread(${t.id}, ${t.is_pinned ? 1 : 0})">
          <i class="fas fa-thumbtack"></i> ${t.is_pinned ? 'Unpin' : 'Pin'}
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteThread(${t.id})">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
}

window.filterForum = () => {
  const q = (document.getElementById('forumSearchInput')?.value || '').toLowerCase();
  renderForumList(allThreads.filter(t => t.title.toLowerCase().includes(q)));
};

window.pinThread = async (id, current) => {
  try {
    await fetch(`${API}/admin/forum/thread/${id}/pin`, { method:'POST', headers: authHeaders });
    toast(`Thread berhasil di-${current ? 'unpin' : 'pin'}!`, 'success');
    loadForum();
  } catch(e) { toast('Error server', 'error'); }
};

window.deleteThread = async (id) => {
  if (!confirm('Hapus thread ini secara permanen?')) return;
  try {
    await fetch(`${API}/admin/forum/thread/${id}`, { method:'DELETE', headers: authHeaders });
    toast('Thread berhasil dihapus', 'success');
    loadForum();
  } catch(e) { toast('Error server', 'error'); }
};

// ─── REWARDS CONFIG ──────────────────────────────────────
async function loadRewardsConfig() {
  try {
    const res = await fetch(`${API}/admin/rewards-config`, { headers: authHeaders });
    if (!res.ok) return;
    const cfg = await res.json();
    setInputVal('cfgRewardBronze',   cfg.reward_bronze   || 100);
    setInputVal('cfgRewardSilver',   cfg.reward_silver   || 50);
    setInputVal('cfgRewardGold',     cfg.reward_gold     || 10);
    setInputVal('cfgRewardCooldown', cfg.reward_cooldown || 24);
  } catch(e) {}
}

window.saveRewardsConfig = async () => {
  const body = {
    reward_bronze:   document.getElementById('cfgRewardBronze')?.value,
    reward_silver:   document.getElementById('cfgRewardSilver')?.value,
    reward_gold:     document.getElementById('cfgRewardGold')?.value,
    reward_cooldown: document.getElementById('cfgRewardCooldown')?.value
  };
  try {
    const res = await fetch(`${API}/admin/rewards-config`, { method:'POST', headers: authHeaders, body: JSON.stringify(body) });
    if (res.ok) toast('Konfigurasi rewards berhasil disimpan!', 'success');
    else toast('Gagal menyimpan konfigurasi', 'error');
  } catch(e) { toast('Error server', 'error'); }
};

// ─── COSMETICS ───────────────────────────────────────────
async function loadCosmetics() {
  const grid = document.getElementById('cosmeticGrid');
  if (!grid) return;
  grid.innerHTML = `<div class="loading-spinner" style="grid-column:1/-1;"><i class="fas fa-spinner"></i> Memuat item...</div>`;
  try {
    const res = await fetch(`${API}/admin/cosmetics`, { headers: authHeaders });
    const items = await res.json();
    if (!items.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fas fa-magic"></i><p>Belum ada item kosmetik</p></div>`;
      return;
    }
    grid.innerHTML = items.map(item => {
      const css = item.css_style || '';
      const anim = item.animation_data || '';
      let previewHTML = '';
      if (item.type === 'nametag')   previewHTML = `<span style="${css}" class="${anim}">Username</span>`;
      else if (item.type === 'badge') previewHTML = `<span>Username <i class="fas fa-star" style="${css}" class="${anim}"></i></span>`;
      else if (item.type === 'nameplate') previewHTML = `<div style="padding:4px 10px; border-radius:5px; ${css}" class="${anim}">Username</div>`;
      return `
        <div class="cosmetic-card">
          <div class="cosmetic-preview-box">${previewHTML}</div>
          <h5>${escHtml(item.name)}</h5>
          <div class="cos-type">${item.type}</div>
          <div class="cos-price">
            ${item.price_bronze ? `<span class="coin-pill coin-bronze" style="font-size:0.7rem;"><i class="fas fa-coins"></i> ${item.price_bronze}</span> ` : ''}
            ${item.price_silver ? `<span class="coin-pill coin-silver" style="font-size:0.7rem;"><i class="fas fa-coins"></i> ${item.price_silver}</span> ` : ''}
            ${item.price_gold   ? `<span class="coin-pill coin-gold"   style="font-size:0.7rem;"><i class="fas fa-coins"></i> ${item.price_gold}</span>` : ''}
          </div>
          <button class="btn btn-sm btn-danger" style="width:100%;" onclick="deleteCosmetic(${item.id})"><i class="fas fa-trash"></i> Hapus</button>
        </div>
      `;
    }).join('');
  } catch(err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fas fa-exclamation-triangle"></i><p>Gagal memuat item</p></div>`;
  }
}

window.openCosmeticModal = () => {
  ['cosNameInput','cosCssInput','cosColorHex'].forEach(id => setInputVal(id, ''));
  setInputVal('cosColorPicker', '#ffffff');
  setInputVal('cosTypeInput', 'nametag');
  setInputVal('cosAnimInput', '');
  ['cosPriceBronze','cosPriceSilver','cosPriceGold','cosPriceIdr'].forEach(id => setInputVal(id, 0));
  updateCosPreview();
  openModal('cosmeticModal');
};
window.closeCosmeticModal = () => closeModal('cosmeticModal');

window.applyCosPicker = () => {
  const hex = document.getElementById('cosColorPicker')?.value;
  setInputVal('cosColorHex', hex);
  const css = document.getElementById('cosCssInput');
  if (css && !css.value.includes('color:')) {
    css.value = `color: ${hex};`;
    updateCosPreview();
  }
};
window.applyCosHex = () => {
  const hex = document.getElementById('cosColorHex')?.value;
  setInputVal('cosColorPicker', hex);
  updateCosPreview();
};

window.updateCosPreview = () => {
  const type   = document.getElementById('cosTypeInput')?.value || 'nametag';
  const style  = document.getElementById('cosCssInput')?.value || '';
  const anim   = document.getElementById('cosAnimInput')?.value || '';
  const target = document.getElementById('cosPreviewTarget');
  const cont   = document.getElementById('cosPreviewContainer');
  if (!target || !cont) return;

  target.style.cssText = 'font-size:1.1rem; font-weight:700; color:#fff;';
  target.className = '';
  cont.style.background = '#111';
  target.innerHTML = 'Username';

  if (type === 'nametag') {
    target.style.cssText += style;
    if (anim) target.classList.add(anim);
  } else if (type === 'badge') {
    target.innerHTML = `Username <i class="fas fa-star" style="${style}"></i>`;
    if (anim && target.querySelector('i')) target.querySelector('i').classList.add(anim);
  } else if (type === 'nameplate') {
    cont.style.cssText += '; ' + style;
    if (anim) cont.classList.add(anim);
  }
};

window.saveCosmetic = async () => {
  const body = {
    name:          document.getElementById('cosNameInput')?.value,
    type:          document.getElementById('cosTypeInput')?.value,
    priceBronze:   document.getElementById('cosPriceBronze')?.value || 0,
    priceSilver:   document.getElementById('cosPriceSilver')?.value || 0,
    priceGold:     document.getElementById('cosPriceGold')?.value   || 0,
    priceIdr:      document.getElementById('cosPriceIdr')?.value    || 0,
    cssStyle:      document.getElementById('cosCssInput')?.value    || '',
    animationData: document.getElementById('cosAnimInput')?.value   || ''
  };
  if (!body.name) { toast('Nama item wajib diisi!', 'warning'); return; }
  try {
    const res = await fetch(`${API}/admin/cosmetic`, { method:'POST', headers: authHeaders, body: JSON.stringify(body) });
    if (res.ok) { toast('Item kosmetik berhasil dibuat!', 'success'); closeCosmeticModal(); loadCosmetics(); }
    else toast('Gagal membuat item', 'error');
  } catch(e) { toast('Error server', 'error'); }
};

window.deleteCosmetic = async (id) => {
  if (!confirm('Hapus item kosmetik ini secara permanen?')) return;
  try {
    await fetch(`${API}/admin/cosmetic/${id}`, { method:'DELETE', headers: authHeaders });
    toast('Item berhasil dihapus', 'success');
    loadCosmetics();
  } catch(e) { toast('Error', 'error'); }
};

// ─── SETTINGS ────────────────────────────────────────────
async function loadSettings() {
  try {
    const res = await fetch(`${API}/admin/settings`, { headers: authHeaders });
    if (!res.ok) return;
    const settings = await res.json();
    if (settings.announcement) setInputVal('globalAnnouncement', settings.announcement);
    if (settings.maintenance) {
      const toggle = document.getElementById('maintenanceToggle');
      if (toggle) toggle.checked = settings.maintenance === 'true';
    }
  } catch(e) {}
}

async function loadServerConfig() {
  try {
    const res = await fetch(`${API}/admin/server-config`, { headers: authHeaders });
    if (!res.ok) return;
    const cfg = await res.json();
    if (cfg.serverIp)   setInputVal('cfgServerIp',   cfg.serverIp);
    if (cfg.serverPort) setInputVal('cfgServerPort',  cfg.serverPort);
    if (cfg.serverName) setInputVal('cfgServerName',  cfg.serverName);
  } catch(e) {}
}

window.saveServerConfig = async () => {
  const ip   = document.getElementById('cfgServerIp')?.value?.trim();
  const port = document.getElementById('cfgServerPort')?.value?.trim();
  const name = document.getElementById('cfgServerName')?.value?.trim();
  const auto = document.getElementById('cfgServerAutoPing')?.checked ? 'true' : 'false';
  if (!ip) { toast('IP Server tidak boleh kosong!', 'warning'); return; }
  try {
    const res = await fetch(`${API}/admin/server-config`, { method:'POST', headers: authHeaders, body: JSON.stringify({ server_ip: ip, server_port: port, server_name: name, server_status_auto: auto }) });
    if (res.ok) { toast('Konfigurasi server berhasil disimpan!', 'success'); refreshServerStatus(); }
    else toast('Gagal menyimpan konfigurasi server', 'error');
  } catch(e) { toast('Error server', 'error'); }
};

window.saveAnnouncement = async () => {
  const val = document.getElementById('globalAnnouncement')?.value || '';
  try {
    await fetch(`${API}/admin/setting`, { method:'POST', headers: authHeaders, body: JSON.stringify({ key: 'announcement', value: val }) });
    toast('Banner pengumuman diperbarui!', 'success');
  } catch(e) { toast('Gagal menyimpan', 'error'); }
};

window.toggleMaintenance = async () => {
  const checked = document.getElementById('maintenanceToggle')?.checked;
  try {
    await fetch(`${API}/admin/setting`, { method:'POST', headers: authHeaders, body: JSON.stringify({ key: 'maintenance', value: checked ? 'true' : 'false' }) });
    toast(`Mode maintenance ${checked ? 'diaktifkan' : 'dinonaktifkan'}`, checked ? 'warning' : 'success');
  } catch(e) { toast('Gagal mengubah mode', 'error'); }
};

// ─── BANNED WORDS ────────────────────────────────────────
async function loadBannedWords() {
  const list = document.getElementById('bannedWordsList');
  if (!list) return;
  try {
    const res = await fetch(`${API}/admin/banned-words`, { headers: authHeaders });
    const words = await res.json();
    if (!words.length) { list.innerHTML = `<span style="color:var(--text-dim); font-size:0.82rem;">Belum ada kata terlarang.</span>`; return; }
    list.innerHTML = words.map(bw => `
      <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); color:var(--accent-red); padding:5px 12px; border-radius:99px; font-size:0.82rem; font-weight:600;">
        <span>${escHtml(bw.word)}</span>
        <i class="fas fa-times" style="cursor:pointer; opacity:0.7;" onclick="deleteBannedWord(${bw.id})" title="Hapus"></i>
      </div>
    `).join('');
  } catch(e) {}
}

window.addBannedWord = async () => {
  const input = document.getElementById('newBannedWord');
  const word  = input?.value?.trim();
  if (!word) return;
  try {
    const res = await fetch(`${API}/admin/banned-word`, { method:'POST', headers: authHeaders, body: JSON.stringify({ word }) });
    if (res.ok) { toast(`Kata "${word}" berhasil diblokir`, 'success'); input.value = ''; loadBannedWords(); }
    else toast('Gagal menambah kata', 'error');
  } catch(e) {}
};

window.deleteBannedWord = async (id) => {
  try {
    const res = await fetch(`${API}/admin/banned-word/${id}`, { method:'DELETE', headers: authHeaders });
    if (res.ok) { toast('Kata berhasil dihapus', 'success'); loadBannedWords(); }
  } catch(e) {}
};

// ─── LOGS ────────────────────────────────────────────────
async function loadLogs() {
  const tbody = document.getElementById('logsTableBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="4"><div class="loading-spinner"><i class="fas fa-spinner"></i> Memuat log...</div></td></tr>`;
  try {
    const res = await fetch(`${API}/admin/logs`, { headers: authHeaders });
    allLogs = await res.json();
    renderLogsTable(allLogs);
  } catch(err) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="fas fa-clipboard-list"></i><p>Gagal memuat log</p></div></td></tr>`;
  }
}

function renderLogsTable(logs) {
  const tbody = document.getElementById('logsTableBody');
  if (!tbody) return;
  if (!logs.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="fas fa-history"></i><p>Belum ada aktivitas</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = logs.map(log => `
    <tr>
      <td style="font-size:0.78rem; color:var(--text-dim); white-space:nowrap;">
        ${log.created_at ? new Date(log.created_at).toLocaleString('id-ID') : '-'}
      </td>
      <td>
        <div style="font-weight:600; color:#fff; font-size:0.875rem;">${escHtml(log.username||'?')}</div>
        <small style="color:var(--text-dim);">${escHtml(log.email||'')}</small>
      </td>
      <td>
        <span style="background:rgba(99,102,241,0.15); color:var(--accent-indigo); padding:3px 9px; border-radius:99px; font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">
          ${escHtml(log.action||'')}
        </span>
      </td>
      <td style="font-size:0.82rem; color:var(--text-secondary);">${escHtml(log.details||'-')}</td>
    </tr>
  `).join('');
}

window.filterLogs = () => {
  const q = (document.getElementById('logSearchInput')?.value || '').toLowerCase();
  renderLogsTable(allLogs.filter(log =>
    (log.username||'').toLowerCase().includes(q) ||
    (log.action||'').toLowerCase().includes(q) ||
    (log.details||'').toLowerCase().includes(q)
  ));
};

// ─── ACCESS DENIED ───────────────────────────────────────
function handleAccessDenied() {
  toast('Akses ditolak. Hanya Admin yang dapat mengakses panel ini.', 'error', 5000);
  setTimeout(() => window.location.href = '../dashboard.html', 3000);
}

// ─── MODAL HELPERS ───────────────────────────────────────
function openModal(id)  { const m = document.getElementById(id); if(m) m.classList.add('active'); }
function closeModal(id) { const m = document.getElementById(id); if(m) m.classList.remove('active'); }

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

// ─── UTILITY ─────────────────────────────────────────────
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function setInputVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'baru saja';
  if (mins < 60)  return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days} hari lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID');
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...authHeaders, ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

// ─── TICKETS MANAGING ─────────────────────────────────────
let adminAllTickets = [];

async function loadTickets() {
  const container = document.getElementById('adminTicketsList');
  if (!container) return;

  container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner"></i> Memuat tiket support...</div>';

  try {
    const data = await apiFetch('/support/admin/tickets');
    if (!data || !data.tickets) {
      container.innerHTML = '<div style="color:var(--text-dim); padding:20px; text-align:center;">Gagal memuat tiket support</div>';
      return;
    }

    adminAllTickets = data.tickets;

    // Update stat card if present
    const openCount = adminAllTickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;
    const statEl = document.getElementById('stat-open-tickets');
    if (statEl) statEl.textContent = openCount;

    const badgeEl = document.getElementById('badge-tickets');
    if (badgeEl) {
      badgeEl.textContent = openCount;
      badgeEl.style.display = openCount > 0 ? 'inline-block' : 'none';
    }

    renderAdminTickets(adminAllTickets);
  } catch (err) {
    container.innerHTML = `<div style="color:var(--accent-red); padding:20px; text-align:center;">Error: ${escHtml(err.message)}</div>`;
  }
}

window.filterAdminTickets = () => {
  const status = document.getElementById('adminTicketFilterStatus')?.value || 'ALL';
  if (status === 'ALL') {
    renderAdminTickets(adminAllTickets);
  } else {
    renderAdminTickets(adminAllTickets.filter(t => t.status === status));
  }
};

function renderAdminTickets(tickets) {
  const container = document.getElementById('adminTicketsList');
  if (!container) return;

  if (tickets.length === 0) {
    container.innerHTML = '<div style="color:var(--text-dim); padding:30px; text-align:center;">Tidak ada tiket support ditemukan.</div>';
    return;
  }

  let html = `<table class="admin-table">
    <thead>
      <tr>
        <th>Kode & Subjek</th>
        <th>Pengirim</th>
        <th>Kategori</th>
        <th>Prioritas</th>
        <th>Status</th>
        <th>Tanggal</th>
        <th>Aksi</th>
      </tr>
    </thead>
    <tbody>`;

  tickets.forEach(t => {
    let statusBadge = '<span class="badge badge-success">OPEN</span>';
    if (t.status === 'In Progress') statusBadge = '<span class="badge badge-warning">IN PROGRESS</span>';
    if (t.status === 'Resolved') statusBadge = '<span class="badge badge-info">RESOLVED</span>';
    if (t.status === 'Closed') statusBadge = '<span class="badge badge-secondary">CLOSED</span>';

    html += `<tr>
      <td>
        <strong style="color:var(--accent-cyan);">${escHtml(t.ticket_code)}</strong><br>
        <span style="font-weight:600;">${escHtml(t.subject)}</span>
      </td>
      <td>${escHtml(t.creator_name || 'Member')}</td>
      <td>${escHtml(t.category)}</td>
      <td>${escHtml(t.priority)}</td>
      <td>${statusBadge}</td>
      <td>${timeAgo(t.created_at)}</td>
      <td>
        <select style="background:rgba(0,0,0,0.4); color:#fff; border:1px solid rgba(255,255,255,0.1); border-radius:4px; padding:4px 8px; font-size:0.8rem;" onchange="updateTicketStatus(${t.id}, this.value)">
          <option value="Open" ${t.status === 'Open' ? 'selected' : ''}>Open</option>
          <option value="In Progress" ${t.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Resolved" ${t.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
          <option value="Closed" ${t.status === 'Closed' ? 'selected' : ''}>Closed</option>
        </select>
      </td>
    </tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

async function updateTicketStatus(ticketId, newStatus) {
  try {
    const res = await apiFetch(`/support/admin/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    if (res && res.success) {
      toast(`Status tiket berhasil diubah ke ${newStatus}`, 'success');
      loadTickets();
    }
  } catch (err) {
    toast(err.message || 'Gagal mengubah status tiket', 'error');
  }
}
window.updateTicketStatus = updateTicketStatus;

// ─── MODULE 1: BACKUP & RESTORE ──────────────────────────
window.downloadDatabaseBackup = async () => {
  try {
    const res = await fetch(`${API}/admin/backup`, { headers: authHeaders });
    if (!res.ok) {
      toast('Gagal mengunduh backup', 'error');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hyrost_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Backup berhasil diunduh', 'success');
  } catch (e) {
    toast('Gagal mengunduh backup', 'error');
  }
};

async function safeFetchJson(url, options = {}) {
    try {
        const res = await fetch(url, options);
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const data = await res.json();
            return { ok: res.ok, status: res.status, data };
        } else {
            return { ok: false, status: res.status, data: { message: `Gagal memperproses tanggapan server (HTTP ${res.status})` } };
        }
    } catch (e) {
        return { ok: false, status: 500, data: { message: e.message || "Gagal menghubungkan ke server" } };
    }
}

window.uploadRestoreBackup = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const backupObj = JSON.parse(e.target.result);
      if (!confirm("Peringatan: Restorasi data akan memperbarui database. Lanjutkan?")) return;

      const { ok, data } = await safeFetchJson(`${API}/admin/restore`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ backup: backupObj })
      });

      if (ok && data.success) {
        toast(data.message || "Restorasi berhasil!", "success");
      } else {
        toast(data.message || "Restorasi gagal", "error");
      }
    } catch (err) {
      toast("Berkas JSON tidak valid", "error");
    }
  };
  reader.readAsText(file);
};

// ─── MODULE 2: MASS BROADCAST ─────────────────────────────
window.submitMassBroadcast = async () => {
  const title = document.getElementById('broadcastTitle')?.value;
  const message = document.getElementById('broadcastMessage')?.value;
  const targetRole = document.getElementById('broadcastTargetRole')?.value;

  if (!title || !message) {
    return toast("Judul dan pesan broadcast wajib diisi!", "warning");
  }

  const { ok, data } = await safeFetchJson(`${API}/admin/broadcast`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ title, message, targetRole })
  });

  if (ok && data.success) {
    toast(data.message || "Pesan broadcast berhasil dikirim!", "success");
    if (document.getElementById('broadcastTitle')) document.getElementById('broadcastTitle').value = '';
    if (document.getElementById('broadcastMessage')) document.getElementById('broadcastMessage').value = '';
  } else {
    toast(data.message || "Gagal mengirimkan pesan broadcast", "error");
  }
};

// ─── MODULE 3: WIKI CMS MANAGER ───────────────────────────
async function loadWikiManager() {
  const tbody = document.getElementById('wikiTableBody');
  if (!tbody) return;

  const { ok, data } = await safeFetchJson(`${API}/admin/wiki`, { headers: authHeaders });
  if (!ok || !data.articles) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#ef4444; padding:20px;">Gagal memuat artikel wiki.</td></tr>';
    return;
  }

  if (data.articles.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#9ca3af; padding:20px;">Belum ada artikel wiki. Klik "Artikel Baru" untuk membuat.</td></tr>';
    return;
  }

  tbody.innerHTML = data.articles.map(a => `
    <tr>
      <td><strong>${escHtml(a.title)}</strong></td>
      <td><span class="badge" style="background:rgba(99,102,241,0.2); color:#6366f1;">${escHtml(a.category || 'Guide')}</span></td>
      <td><i class="fas ${escHtml(a.icon || 'fa-book')}"></i> ${escHtml(a.icon || 'fa-book')}</td>
      <td style="max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escHtml(a.content || '')}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteWikiArticle(${a.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}
window.loadWikiManager = loadWikiManager;

window.openCreateWikiModal = async () => {
  const title = prompt("Masukkan Judul Artikel Wiki Baru:");
  if (!title) return;
  const category = prompt("Masukkan Kategori (Contoh: Guide, Rules, Commands):", "Guide");
  const content = prompt("Masukkan Isi Konten Artikel:");
  if (!content) return;

  const { ok, data } = await safeFetchJson(`${API}/admin/wiki`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ title, category: category || 'Guide', icon: 'fa-book', content })
  });

  if (ok && data.success) {
    toast(data.message || "Artikel Wiki berhasil ditambahkan!", "success");
    loadWikiManager();
  } else {
    toast(data.message || "Gagal membuat artikel wiki", "error");
  }
};

window.deleteWikiArticle = async (id) => {
  if (!confirm("Yakin ingin menghapus artikel wiki ini?")) return;
  const { ok, data } = await safeFetchJson(`${API}/admin/wiki/${id}`, {
    method: 'DELETE',
    headers: authHeaders
  });

  if (ok && data.success) {
    toast("Artikel Wiki berhasil dihapus", "success");
    loadWikiManager();
  } else {
    toast(data.message || "Gagal menghapus", "error");
  }
};

// ─── MODULE 4: IP BLACKLIST MANAGER ───────────────────────
async function loadIPBlacklist() {
  const tbody = document.getElementById('ipBlacklistTableBody');
  if (!tbody) return;

  const { ok, data } = await safeFetchJson(`${API}/admin/ip-blacklist`, { headers: authHeaders });
  if (!ok || !data.blacklist) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#ef4444; padding:20px;">Gagal memuat daftar pemblokiran IP.</td></tr>';
    return;
  }

  if (data.blacklist.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#9ca3af; padding:20px;">Tidak ada alamat IP yang diblokir.</td></tr>';
    return;
  }

  tbody.innerHTML = data.blacklist.map(b => `
    <tr>
      <td><code style="color:#ef4444; font-weight:700;">${escHtml(b.ip_address)}</code></td>
      <td>${escHtml(b.reason || '-')}</td>
      <td>${escHtml(b.blocked_by || 'Admin')}</td>
      <td style="color:#9ca3af; font-size:0.8rem;">${new Date(b.created_at).toLocaleString()}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="unblockIPAddress('${escHtml(b.ip_address)}')"><i class="fas fa-unlock"></i> Buka Blokir</button>
      </td>
    </tr>
  `).join('');
}
window.loadIPBlacklist = loadIPBlacklist;

window.submitBlockIP = async () => {
  const ip_address = document.getElementById('blockIpAddress')?.value;
  const reason = document.getElementById('blockIpReason')?.value;

  if (!ip_address) {
    return toast("Alamat IP wajib diisi!", "warning");
  }

  const { ok, data } = await safeFetchJson(`${API}/admin/ip-blacklist`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ ip_address, reason })
  });

  if (ok && data.success) {
    toast(data.message || "IP berhasil diblokir!", "success");
    if (document.getElementById('blockIpAddress')) document.getElementById('blockIpAddress').value = '';
    if (document.getElementById('blockIpReason')) document.getElementById('blockIpReason').value = '';
    loadIPBlacklist();
  } else {
    toast(data.message || "Gagal memblokir IP", "error");
  }
};

window.unblockIPAddress = async (ip) => {
  if (!confirm(`Yakin ingin membuka blokir IP ${ip}?`)) return;
  const { ok, data } = await safeFetchJson(`${API}/admin/ip-blacklist/${encodeURIComponent(ip)}`, {
    method: 'DELETE',
    headers: authHeaders
  });

  if (ok && data.success) {
    toast("Pemblokiran IP berhasil dibuka.", "success");
    loadIPBlacklist();
  } else {
    toast(data.message || "Gagal membuka pemblokiran", "error");
  }
};

// ─── MODULE 5: VOUCHER & PROMO CODE MANAGER ─────────────────────────────
function toggleVoucherFormCategory(cat) {
  const discountGrp = document.getElementById('voucherDiscountFieldsGroup');
  const rewardGrp = document.getElementById('voucherRewardFieldsGroup');

  if (cat === 'discount') {
    if (discountGrp) discountGrp.style.display = 'contents';
    if (rewardGrp) rewardGrp.style.display = 'none';
  } else {
    if (discountGrp) discountGrp.style.display = 'none';
    if (rewardGrp) rewardGrp.style.display = 'contents';
  }
}
window.toggleVoucherFormCategory = toggleVoucherFormCategory;

async function loadVouchersManager() {
  const tbody = document.getElementById('vouchersTableBody');
  if (!tbody) return;

  const { ok, data } = await safeFetchJson(`${API}/admin/vouchers`, { headers: authHeaders });
  if (!ok || !data.vouchers) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#ef4444; padding:20px;">Gagal memuat daftar voucher.</td></tr>';
    return;
  }

  if (data.vouchers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#9ca3af; padding:20px;">Belum ada kode voucher / promo aktif.</td></tr>';
    return;
  }

  tbody.innerHTML = data.vouchers.map(v => {
    const isDiscount = (v.type === 'discount' || v.discount_value > 0);
    const valueDisplay = isDiscount 
      ? (v.discount_type === 'percent' ? `🏷️ Diskon ${v.discount_value}%` : `🏷️ Potongan Rp ${Number(v.discount_value).toLocaleString('id-ID')}`)
      : `🎁 +${v.reward_amount} Koin ${(v.reward_type || 'gold').toUpperCase()}`;

    return `
      <tr>
        <td><code style="color:#10b981; font-weight:800; font-size:0.95rem;">${escHtml(v.code)}</code></td>
        <td><span style="font-weight:700; color:${isDiscount ? '#10b981' : '#f59e0b'};">${valueDisplay}</span></td>
        <td>${v.current_uses || v.used_count || 0} / ${v.max_uses || '100'} Klaim</td>
        <td><span class="badge badge-success">AKTIF</span></td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteVoucherAdmin(${v.id})"><i class="fas fa-trash"></i> Hapus</button>
        </td>
      </tr>
    `;
  }).join('');
}
window.loadVouchersManager = loadVouchersManager;

window.submitCreateVoucher = async () => {
  const code = document.getElementById('voucherCodeInputAdmin')?.value;
  const categoryRadio = document.querySelector('input[name="voucherCategoryAdmin"]:checked');
  const type = categoryRadio ? categoryRadio.value : 'discount';

  const discount_type = document.getElementById('voucherDiscountTypeAdmin')?.value || 'percent';
  const discount_value = document.getElementById('voucherDiscountValueAdmin')?.value || 20;

  const reward_type = document.getElementById('voucherRewardTypeAdmin')?.value || 'gold';
  const reward_amount = document.getElementById('voucherRewardAmountAdmin')?.value || 100;
  const max_uses = document.getElementById('voucherMaxUsesAdmin')?.value || 100;

  if (!code) {
    return toast("Kode promo / voucher wajib diisi!", "warning");
  }

  const { ok, data } = await safeFetchJson(`${API}/admin/voucher`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ code, type, reward_type, reward_amount, discount_type, discount_value, max_uses })
  });

  if (ok && data.success) {
    toast(data.message || "Kode promo / voucher berhasil diterbitkan!", "success");
    if (document.getElementById('voucherCodeInputAdmin')) document.getElementById('voucherCodeInputAdmin').value = '';
    loadVouchersManager();
  } else {
    toast(data.message || "Gagal membuat voucher", "error");
  }
};

window.deleteVoucherAdmin = async (id) => {
  if (!confirm("Yakin ingin menghapus kode voucher ini?")) return;
  const { ok, data } = await safeFetchJson(`${API}/admin/voucher/${id}`, {
    method: 'DELETE',
    headers: authHeaders
  });

  if (ok && data.success) {
    toast("Voucher berhasil dihapus.", "success");
    loadVouchersManager();
  } else {
    toast(data.message || "Gagal menghapus voucher", "error");
  }
};

// ─── MODULE 6: PAYMENT SETTINGS & MIDTRANS MANAGER ─────────────────────────
function updateMidtransModeBadge() {
  const isProd = document.getElementById('payMidtransIsProduction')?.checked;
  const label = document.getElementById('midtransModeLabel');
  if (label) {
    label.innerHTML = isProd 
      ? '<strong style="color:#ef4444;">🔴 PRODUCTION (Live Transaksi Nyata)</strong>' 
      : '<strong style="color:#38bdf8;">🟢 SANDBOX (Mode Pengujian / Simulasi)</strong>';
  }
}
window.updateMidtransModeBadge = updateMidtransModeBadge;

function toggleKeyVisibility(inputId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById('btnToggleServerKey');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (btn) btn.innerHTML = '<i class="fas fa-eye-slash"></i> Sembunyikan';
  } else {
    input.type = 'password';
    if (btn) btn.innerHTML = '<i class="fas fa-eye"></i> Tampilkan';
  }
}
window.toggleKeyVisibility = toggleKeyVisibility;

function copyWebhookUrl(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const text = el.textContent || el.innerText;
  navigator.clipboard.writeText(text).then(() => {
    toast("📋 URL Webhook berhasil disalin!", "success");
  }).catch(() => {
    toast("Gagal menyalin URL", "error");
  });
}
window.copyWebhookUrl = copyWebhookUrl;

async function testMidtransConnection() {
  const serverKey = document.getElementById('payMidtransServerKey')?.value;
  const isProduction = document.getElementById('payMidtransIsProduction')?.checked;
  const resultBox = document.getElementById('midtransTestResult');

  if (!serverKey || serverKey.includes('GANTI_DENGAN_SERVER_KEY')) {
    toast("⚠️ Masukkan Midtrans Server Key terlebih dahulu!", "warning");
    if (resultBox) {
      resultBox.style.display = 'block';
      resultBox.style.background = 'rgba(239, 68, 68, 0.15)';
      resultBox.style.border = '1px solid rgba(239, 68, 68, 0.4)';
      resultBox.style.color = '#f87171';
      resultBox.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Masukkan Server Key Midtrans valid sebelum melakukan pengetesan koneksi.';
    }
    return;
  }

  if (resultBox) {
    resultBox.style.display = 'block';
    resultBox.style.background = 'rgba(99, 102, 241, 0.15)';
    resultBox.style.border = '1px solid rgba(99, 102, 241, 0.4)';
    resultBox.style.color = '#a5b4fc';
    resultBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghubungi API Midtrans... Mohon tunggu.';
  }

  const { ok, data } = await safeFetchJson(`${API}/admin/payment-settings/test-midtrans`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ serverKey, isProduction })
  });

  if (resultBox) {
    if (ok && data.success) {
      resultBox.style.background = 'rgba(16, 185, 129, 0.15)';
      resultBox.style.border = '1px solid rgba(16, 185, 129, 0.4)';
      resultBox.style.color = '#34d399';
      resultBox.innerHTML = `<i class="fas fa-check-circle"></i> ${data.message}`;
      toast(data.message, "success");
    } else {
      resultBox.style.background = 'rgba(239, 68, 68, 0.15)';
      resultBox.style.border = '1px solid rgba(239, 68, 68, 0.4)';
      resultBox.style.color = '#f87171';
      resultBox.innerHTML = `<i class="fas fa-times-circle"></i> ${data.message || 'Koneksi Midtrans gagal'}`;
      toast(data.message || "Koneksi Midtrans gagal", "error");
    }
  }
function updateTripayModeBadge() {
  const isProd = document.getElementById('payTripayIsProduction')?.checked;
  const label = document.getElementById('tripayModeLabel');
  if (label) {
    label.innerHTML = isProd 
      ? '<strong style="color:#ef4444;">🔴 PRODUCTION (Live Transaksi Nyata)</strong>' 
      : '<strong style="color:#38bdf8;">🟢 SANDBOX (Mode Pengujian / Simulasi)</strong>';
  }
}
window.updateTripayModeBadge = updateTripayModeBadge;

async function testTripayConnection() {
  const apiKey = document.getElementById('payTripayApiKey')?.value;
  const privateKey = document.getElementById('payTripayPrivateKey')?.value;
  const merchantCode = document.getElementById('payTripayMerchantCode')?.value;
  const isProduction = document.getElementById('payTripayIsProduction')?.checked;
  const resultBox = document.getElementById('tripayTestResult');

  if (!apiKey || !privateKey || !merchantCode) {
    toast("⚠️ Masukkan API Key, Private Key, dan Kode Merchant Tripay terlebih dahulu!", "warning");
    if (resultBox) {
      resultBox.style.display = 'block';
      resultBox.style.background = 'rgba(239, 68, 68, 0.15)';
      resultBox.style.border = '1px solid rgba(239, 68, 68, 0.4)';
      resultBox.style.color = '#f87171';
      resultBox.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Masukkan kredensial Tripay lengkap sebelum melakukan pengetesan koneksi.';
    }
    return;
  }

  if (resultBox) {
    resultBox.style.display = 'block';
    resultBox.style.background = 'rgba(14, 165, 233, 0.15)';
    resultBox.style.border = '1px solid rgba(14, 165, 233, 0.4)';
    resultBox.style.color = '#38bdf8';
    resultBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghubungi API Tripay... Mohon tunggu.';
  }

  const { ok, data } = await safeFetchJson(`${API}/admin/payment-settings/test-tripay`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ apiKey, privateKey, merchantCode, isProduction })
  });

  if (resultBox) {
    if (ok && data.success) {
      resultBox.style.background = 'rgba(16, 185, 129, 0.15)';
      resultBox.style.border = '1px solid rgba(16, 185, 129, 0.4)';
      resultBox.style.color = '#34d399';
      resultBox.innerHTML = `<i class="fas fa-check-circle"></i> ${data.message}`;
      toast(data.message, "success");
    } else {
      resultBox.style.background = 'rgba(239, 68, 68, 0.15)';
      resultBox.style.border = '1px solid rgba(239, 68, 68, 0.4)';
      resultBox.style.color = '#f87171';
      resultBox.innerHTML = `<i class="fas fa-times-circle"></i> ${data.message || 'Koneksi Tripay gagal'}`;
      toast(data.message || "Koneksi Tripay gagal", "error");
    }
  }
}
window.testTripayConnection = testTripayConnection;

async function loadPaymentSettings() {
  const { ok, data } = await safeFetchJson(`${API}/admin/payment-settings`, { headers: authHeaders });
  if (!ok || !data.settings) return;

  const s = data.settings;

  // Midtrans Settings
  if (document.getElementById('payMidtransEnabled')) {
    document.getElementById('payMidtransEnabled').checked = s.midtrans_enabled !== false;
  }
  if (document.getElementById('payMidtransIsProduction')) {
    document.getElementById('payMidtransIsProduction').checked = s.midtrans_is_production === true;
    updateMidtransModeBadge();
  }
  if (document.getElementById('payMidtransServerKey') && s.midtrans_server_key !== undefined) {
    document.getElementById('payMidtransServerKey').value = s.midtrans_server_key;
  }
  if (document.getElementById('payMidtransClientKey') && s.midtrans_client_key !== undefined) {
    document.getElementById('payMidtransClientKey').value = s.midtrans_client_key;
  }
  if (document.getElementById('payMidtransMerchantId') && s.midtrans_merchant_id !== undefined) {
    document.getElementById('payMidtransMerchantId').value = s.midtrans_merchant_id;
  }

  // Tripay Settings
  if (document.getElementById('payTripayEnabled')) {
    document.getElementById('payTripayEnabled').checked = s.tripay_enabled !== false;
  }
  if (document.getElementById('payTripayIsProduction')) {
    document.getElementById('payTripayIsProduction').checked = s.tripay_is_production === true;
    updateTripayModeBadge();
  }
  if (document.getElementById('payTripayApiKey') && s.tripay_api_key !== undefined) {
    document.getElementById('payTripayApiKey').value = s.tripay_api_key;
  }
  if (document.getElementById('payTripayPrivateKey') && s.tripay_private_key !== undefined) {
    document.getElementById('payTripayPrivateKey').value = s.tripay_private_key;
  }
  if (document.getElementById('payTripayMerchantCode') && s.tripay_merchant_code !== undefined) {
    document.getElementById('payTripayMerchantCode').value = s.tripay_merchant_code;
  }

  // Manual QRIS & Bank Transfer Settings
  if (document.getElementById('payManualEnabled')) {
    document.getElementById('payManualEnabled').checked = s.manual_enabled !== false;
  }
  if (document.getElementById('payManualQrisImage') && s.manual_qris_image !== undefined) {
    document.getElementById('payManualQrisImage').value = s.manual_qris_image;
  }
  if (document.getElementById('payManualBankName') && s.manual_bank_name !== undefined) {
    document.getElementById('payManualBankName').value = s.manual_bank_name;
  }
  if (document.getElementById('payManualAccountNumber') && s.manual_account_number !== undefined) {
    document.getElementById('payManualAccountNumber').value = s.manual_account_number;
  }
  if (document.getElementById('payManualAccountName') && s.manual_account_name !== undefined) {
    document.getElementById('payManualAccountName').value = s.manual_account_name;
  }
  if (document.getElementById('payManualWhatsapp') && s.manual_whatsapp !== undefined) {
    document.getElementById('payManualWhatsapp').value = s.manual_whatsapp;
  }
  if (document.getElementById('payManualInstructions') && s.manual_instructions !== undefined) {
    document.getElementById('payManualInstructions').value = s.manual_instructions;
  }

  // Update Dynamic Webhook URLs in UI
  const origin = window.location.origin;
  if (document.getElementById('webhookStudioUrl')) {
    document.getElementById('webhookStudioUrl').textContent = `${origin}/api/studio/payment-webhook`;
  }
  if (document.getElementById('webhookStoreUrl')) {
    document.getElementById('webhookStoreUrl').textContent = `${origin}/api/features/payments/midtrans-webhook`;
  }
  if (document.getElementById('webhookTripayStudioUrl')) {
    document.getElementById('webhookTripayStudioUrl').textContent = `${origin}/api/studio/tripay-webhook`;
  }
  if (document.getElementById('webhookTripayStoreUrl')) {
    document.getElementById('webhookTripayStoreUrl').textContent = `${origin}/api/features/payments/tripay-webhook`;
  }

  // Store & Manual Gateways
  if (document.getElementById('payCfgQris')) document.getElementById('payCfgQris').checked = s.qris_active !== false;
  if (document.getElementById('payCfgBca')) document.getElementById('payCfgBca').checked = s.bca_active !== false;
  if (document.getElementById('payCfgMandiri')) document.getElementById('payCfgMandiri').checked = s.mandiri_active !== false;
  if (document.getElementById('payCfgBni')) document.getElementById('payCfgBni').checked = s.bni_active !== false;
  if (document.getElementById('payCfgCc')) document.getElementById('payCfgCc').checked = s.credit_card_active !== false;
  if (document.getElementById('payCfgIndomaret')) document.getElementById('payCfgIndomaret').checked = s.indomaret_active !== false;

  if (document.getElementById('payCfgMerchantName') && s.merchant_name) document.getElementById('payCfgMerchantName').value = s.merchant_name;
  if (document.getElementById('payCfgBcaNum') && s.bca_va_number) document.getElementById('payCfgBcaNum').value = s.bca_va_number;
  if (document.getElementById('payCfgMandiriNum') && s.mandiri_va_number) document.getElementById('payCfgMandiriNum').value = s.mandiri_va_number;
  if (document.getElementById('payCfgTaxRate') && s.tax_rate !== undefined) document.getElementById('payCfgTaxRate').value = s.tax_rate;
  if (document.getElementById('payCfgSaweriaUrl') && s.saweria_url !== undefined) document.getElementById('payCfgSaweriaUrl').value = s.saweria_url;
}
window.loadPaymentSettings = loadPaymentSettings;

async function savePaymentSettings() {
  const payload = {
    // Midtrans Settings
    midtrans_enabled: document.getElementById('payMidtransEnabled')?.checked ?? true,
    midtrans_is_production: document.getElementById('payMidtransIsProduction')?.checked ?? false,
    midtrans_server_key: document.getElementById('payMidtransServerKey')?.value || '',
    midtrans_client_key: document.getElementById('payMidtransClientKey')?.value || '',
    midtrans_merchant_id: document.getElementById('payMidtransMerchantId')?.value || '',

    // Tripay Settings
    tripay_enabled: document.getElementById('payTripayEnabled')?.checked ?? true,
    tripay_is_production: document.getElementById('payTripayIsProduction')?.checked ?? false,
    tripay_api_key: document.getElementById('payTripayApiKey')?.value || '',
    tripay_private_key: document.getElementById('payTripayPrivateKey')?.value || '',
    tripay_merchant_code: document.getElementById('payTripayMerchantCode')?.value || '',

    // Manual QRIS & Bank Transfer Settings
    manual_enabled: document.getElementById('payManualEnabled')?.checked ?? true,
    manual_qris_image: document.getElementById('payManualQrisImage')?.value || '',
    manual_bank_name: document.getElementById('payManualBankName')?.value || 'BCA / DANA / GoPay',
    manual_account_number: document.getElementById('payManualAccountNumber')?.value || '08123456789',
    manual_account_name: document.getElementById('payManualAccountName')?.value || 'Hyrost Admin',
    manual_whatsapp: document.getElementById('payManualWhatsapp')?.value || '628123456789',
    manual_instructions: document.getElementById('payManualInstructions')?.value || 'Transfer nominal tepat lalu kirim bukti ke WhatsApp.',

    saweria_url: document.getElementById('payCfgSaweriaUrl')?.value || 'https://saweria.co/meilabs',

    // Store & Manual Gateways
    qris_active: document.getElementById('payCfgQris')?.checked ?? true,
    bca_active: document.getElementById('payCfgBca')?.checked ?? true,
    mandiri_active: document.getElementById('payCfgMandiri')?.checked ?? true,
    bni_active: document.getElementById('payCfgBni')?.checked ?? true,
    credit_card_active: document.getElementById('payCfgCc')?.checked ?? true,
    indomaret_active: document.getElementById('payCfgIndomaret')?.checked ?? true,
    merchant_name: document.getElementById('payCfgMerchantName')?.value || 'PT HYROST MEDIA REALM',
    bca_va_number: document.getElementById('payCfgBcaNum')?.value || '88009442808943',
    mandiri_va_number: document.getElementById('payCfgMandiriNum')?.value || '88012398471230',
    tax_rate: Number(document.getElementById('payCfgTaxRate')?.value || 0)
  };

  const { ok, data } = await safeFetchJson(`${API}/admin/payment-settings`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(payload)
  });

  if (ok && data.success) {
    toast("✅ Pengaturan gateway Tripay, Midtrans, & Transfer Manual berhasil disimpan!", "success");
    loadPaymentSettings();
  } else {
    toast(data.message || "Gagal menyimpan pengaturan pembayaran", "error");
  }
}
window.savePaymentSettings = savePaymentSettings;

// ─── MODULE 7: PAYMENT METHODS MANAGEMENT CENTER ──────────────────────────────
let allPaymentMethods = [];
let currentPayMethodKey = null;

async function loadPaymentMethodsManager() {
  const grid = document.getElementById('paymentMethodsAdminGrid');
  if (!grid) return;

  const { ok, data } = await safeFetchJson(`${API}/admin/payment-methods`, { headers: authHeaders });
  if (!ok || !data.methods) {
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#ef4444; padding:30px;">Gagal memuat jenis pembayaran.</div>';
    return;
  }

  allPaymentMethods = data.methods;

  if (allPaymentMethods.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#9ca3af; padding:30px;">Belum ada jenis pembayaran. Klik "+ Tambah Metode Pembayaran Baru".</div>';
    return;
  }

  grid.innerHTML = allPaymentMethods.map(m => {
    const isActive = m.is_active !== false;
    const color = m.color || '#10b981';
    const icon = m.icon || 'fa-credit-card';

    return `
      <div class="card" style="border: 1px solid ${isActive ? color + '44' : 'rgba(255,255,255,0.08)'}; background:rgba(18, 24, 38, 0.7); position:relative;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:38px; height:38px; border-radius:10px; background:${color}22; color:${color}; display:flex; align-items:center; justify-content:center; font-size:1.2rem; border:1px solid ${color}44;">
              <i class="fas ${escHtml(icon)}"></i>
            </div>
            <div>
              <h4 style="margin:0; color:#fff; font-size:0.95rem; font-weight:800;">${escHtml(m.name)}</h4>
              <span style="font-size:0.72rem; color:#9ca3af; font-family:monospace;">ID: ${escHtml(m.key)}</span>
            </div>
          </div>
          <span class="badge ${isActive ? 'badge-success' : 'badge-danger'}">${isActive ? 'AKTIF' : 'NONAKTIF'}</span>
        </div>

        <div style="background:rgba(0,0,0,0.4); padding:10px 12px; border-radius:8px; font-size:0.78rem; color:#d1d5db; margin-bottom:12px; min-height:40px; word-break:break-all;">
          <div style="font-weight:700; color:${color}; margin-bottom:2px;">Kode Rekening / VA / QRIS:</div>
          <div>${escHtml(m.account || 'Sistem Otomatis')}</div>
        </div>

        <div style="display:flex; gap:8px;">
          <button class="btn btn-sm btn-secondary" onclick="openPaymentMethodModal('${escHtml(m.key)}')" style="flex:1;">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deletePaymentMethodAdmin('${escHtml(m.key)}')" style="padding:6px 10px;">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}
window.loadPaymentMethodsManager = loadPaymentMethodsManager;

function openPaymentMethodModal(key) {
  currentPayMethodKey = key;
  const title = document.getElementById('paymentModalTitle');
  const deleteBtn = document.getElementById('btnDeletePayMethod');

  if (key) {
    const item = allPaymentMethods.find(m => m.key === key);
    if (!item) return;
    if (title) title.textContent = `Edit Jenis Pembayaran: ${item.name}`;
    document.getElementById('payMethodKeyInput').value = item.key;
    document.getElementById('payMethodKeyInput').readOnly = true;
    document.getElementById('payMethodNameInput').value = item.name;
    document.getElementById('payMethodIconInput').value = item.icon || 'fa-credit-card';
    document.getElementById('payMethodColorInput').value = item.color || '#10b981';
    document.getElementById('payMethodAccountInput').value = item.account || '';
    document.getElementById('payMethodInstructInput').value = item.instructions || '';
    document.getElementById('payMethodActiveInput').checked = item.is_active !== false;
    if (deleteBtn) deleteBtn.style.display = 'inline-block';
  } else {
    if (title) title.textContent = 'Tambah Jenis Pembayaran Baru';
    document.getElementById('payMethodKeyInput').value = '';
    document.getElementById('payMethodKeyInput').readOnly = false;
    document.getElementById('payMethodNameInput').value = '';
    document.getElementById('payMethodIconInput').value = 'fa-credit-card';
    document.getElementById('payMethodColorInput').value = '#10b981';
    document.getElementById('payMethodAccountInput').value = '';
    document.getElementById('payMethodInstructInput').value = '';
    document.getElementById('payMethodActiveInput').checked = true;
    if (deleteBtn) deleteBtn.style.display = 'none';
  }

  openModal('paymentMethodModal');
}
window.openPaymentMethodModal = openPaymentMethodModal;

function closePaymentMethodModal() {
  closeModal('paymentMethodModal');
}
window.closePaymentMethodModal = closePaymentMethodModal;

async function savePaymentMethodAdmin() {
  const key = document.getElementById('payMethodKeyInput')?.value?.trim()?.toLowerCase();
  const name = document.getElementById('payMethodNameInput')?.value?.trim();
  const icon = document.getElementById('payMethodIconInput')?.value?.trim();
  const color = document.getElementById('payMethodColorInput')?.value;
  const account = document.getElementById('payMethodAccountInput')?.value?.trim();
  const instructions = document.getElementById('payMethodInstructInput')?.value?.trim();
  const is_active = document.getElementById('payMethodActiveInput')?.checked ?? true;

  if (!key || !name) {
    return toast("Kode ID Unik (Key) dan Nama Jenis Pembayaran Wajib Diisi!", "warning");
  }

  const { ok, data } = await safeFetchJson(`${API}/admin/payment-method`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key, name, icon, color, account, instructions, is_active })
  });

  if (ok && data.success) {
    toast(data.message || "Jenis pembayaran berhasil disimpan!", "success");
    closePaymentMethodModal();
    loadPaymentMethodsManager();
  } else {
    toast(data.message || "Gagal menyimpan jenis pembayaran", "error");
  }
}
window.savePaymentMethodAdmin = savePaymentMethodAdmin;

async function deletePaymentMethodAdmin(keyTarget) {
  const key = keyTarget || currentPayMethodKey;
  if (!key) return;

  if (!confirm(`Yakin ingin menghapus jenis pembayaran '${key}'?`)) return;

  const { ok, data } = await safeFetchJson(`${API}/admin/payment-method/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: authHeaders
  });

  if (ok && data.success) {
    toast("Jenis pembayaran berhasil dihapus.", "success");
    closePaymentMethodModal();
    loadPaymentMethodsManager();
  } else {
    toast(data.message || "Gagal menghapus jenis pembayaran", "error");
  }
}

async function loadSystemHealth() {
  const el = document.getElementById('healthDashboard');
  if (!el) return;
  try {
    const res = await fetch(`${API}/features/admin/health`, { headers: authHeaders });
    const data = await res.json();
    if (!data.success) throw new Error('Failed');
    const h = data;
    el.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-card-label">MySQL</div><div class="stat-card-value">${h.mysql ? '🟢' : '🔴'}</div></div>
        <div class="stat-card"><div class="stat-card-label">Storage</div><div class="stat-card-value" style="font-size:1rem;">${h.storage || '—'}</div></div>
        <div class="stat-card"><div class="stat-card-label">Minecraft Plugin</div><div class="stat-card-value">${h.minecraft?.online ? '🟢 Online' : '🔴 Offline'}</div></div>
        <div class="stat-card"><div class="stat-card-label">Pemain MC</div><div class="stat-card-value">${h.minecraft?.playerCount ?? 0}</div></div>
        <div class="stat-card"><div class="stat-card-label">Google Drive</div><div class="stat-card-value">${h.googleDrive?.ok ? '🟢' : '⚪'}</div></div>
        <div class="stat-card"><div class="stat-card-label">SMTP Email</div><div class="stat-card-value">${h.smtp ? '🟢' : '⚪'}</div></div>
        <div class="stat-card"><div class="stat-card-label">Midtrans</div><div class="stat-card-value">${h.midtrans ? '🟢' : '⚪'}</div></div>
        <div class="stat-card"><div class="stat-card-label">Web Online</div><div class="stat-card-value">${h.webOnline ?? 0}</div></div>
      </div>`;
  } catch (e) {
    el.innerHTML = '<p style="color:var(--accent-red);">Gagal memuat health dashboard</p>';
  }
}
window.loadSystemHealth = loadSystemHealth;

async function loadPaymentOrders() {
  const el = document.getElementById('paymentOrdersTable');
  if (!el) return;
  try {
    const res = await fetch(`${API}/features/admin/payment-orders`, { headers: authHeaders });
    const data = await res.json();
    const orders = data.orders || [];
    if (!orders.length) {
      el.innerHTML = '<p style="color:var(--text-dim);">Tidak ada order pending</p>';
      return;
    }
    el.innerHTML = `<table class="admin-table"><thead><tr><th>Order</th><th>User</th><th>Item</th><th>Amount</th><th>Method</th><th>Aksi</th></tr></thead><tbody>${
      orders.map(o => `<tr>
        <td>${o.order_code}</td><td>${o.username}</td><td>${o.item_name}</td>
        <td>Rp ${Number(o.amount_idr).toLocaleString('id-ID')}</td><td>${o.payment_method}</td>
        <td>
          <button class="btn btn-sm btn-success" onclick="approvePaymentOrder(${o.id})">Approve</button>
          <button class="btn btn-sm btn-danger" onclick="rejectPaymentOrder(${o.id})">Reject</button>
        </td></tr>`).join('')
    }</tbody></table>`;
  } catch (e) {
    el.innerHTML = '<p style="color:var(--accent-red);">Gagal memuat orders</p>';
  }
}
window.loadPaymentOrders = loadPaymentOrders;

window.approvePaymentOrder = async (id) => {
  const res = await fetch(`${API}/features/admin/payment-orders/${id}/approve`, { method: 'POST', headers: authHeaders });
  const data = await res.json();
  toast(data.message || (data.success ? 'Disetujui' : 'Gagal'), data.success ? 'success' : 'error');
  loadPaymentOrders();
};

window.rejectPaymentOrder = async (id) => {
  const res = await fetch(`${API}/features/admin/payment-orders/${id}/reject`, { method: 'POST', headers: authHeaders });
  const data = await res.json();
  toast(data.message || (data.success ? 'Ditolak' : 'Gagal'), data.success ? 'success' : 'error');
  loadPaymentOrders();
};
window.deletePaymentMethodAdmin = deletePaymentMethodAdmin;


