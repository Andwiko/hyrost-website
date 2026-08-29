/**
 * Hyrost Notification Center & Web Push Notification Handler
 */
(function (global) {
  let notifications = [];
  let isPanelOpen = false;

  function initNotificationHub() {
    ensureNotificationBellInHeaders();
    loadNotifications();
  }

  function ensureNotificationBellInHeaders() {
    const mobileHeaders = document.querySelectorAll('.mobile-header');
    mobileHeaders.forEach(header => {
      if (header.querySelector('.btn-notification-bell')) return;
      const bellBtn = document.createElement('button');
      bellBtn.className = 'btn-header-action btn-notification-bell';
      bellBtn.setAttribute('aria-label', 'Notifikasi');
      bellBtn.style.position = 'relative';
      bellBtn.innerHTML = `
        <i class="fas fa-bell"></i>
        <span class="notification-badge" id="mobileNotificationBadge" style="display:none; position:absolute; top:4px; right:4px; width:8px; height:8px; background:#ef4444; border-radius:50%;"></span>
      `;
      bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleNotificationDropdown(bellBtn);
      });

      // Insert before logout button or at end
      const logoutBtn = header.querySelector('.mobile-logout-btn');
      if (logoutBtn) {
        header.insertBefore(bellBtn, logoutBtn);
      } else {
        header.appendChild(bellBtn);
      }
    });

    // Also inject dropdown panel to body if not present
    if (!document.getElementById('hyrostNotificationPanel')) {
      const panel = document.createElement('div');
      panel.id = 'hyrostNotificationPanel';
      panel.style.cssText = `
        display: none;
        position: fixed;
        top: 64px;
        right: 18px;
        width: 320px;
        max-width: 90vw;
        background: var(--bg-surface-1, #0d121f);
        border: 1px solid var(--border-subtle, rgba(255,255,255,0.1));
        border-radius: var(--radius-lg, 14px);
        box-shadow: 0 16px 40px rgba(0,0,0,0.7);
        z-index: 10000;
        overflow: hidden;
        animation: fadeIn 0.2s ease;
      `;
      panel.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 16px; border-bottom:1px solid var(--border-subtle, rgba(255,255,255,0.1)); background:var(--bg-surface-2, #141b2d);">
          <div style="font-size:0.88rem; font-weight:800; color:#fff; display:flex; align-items:center; gap:8px;">
            <i class="fas fa-bell" style="color:var(--accent-cyan, #06b6d4);"></i> Notifikasi Realm
          </div>
          <button onclick="HyrostNotifications.requestWebPush()" style="background:none; border:none; color:var(--text-dim, #888); font-size:0.75rem; cursor:pointer; font-weight:700;">
            <i class="fas fa-cog"></i> Push
          </button>
        </div>
        <div id="notificationListContainer" style="max-height:300px; overflow-y:auto; padding:8px 0;">
          <div style="text-align:center; padding:24px 16px; color:var(--text-muted, #888); font-size:0.8rem;">
            <i class="fas fa-check-circle" style="margin-bottom:6px; color:var(--accent-emerald-light, #10b981); display:block; font-size:1.4rem;"></i>
            Semua notifikasi telah dibaca
          </div>
        </div>
      `;
      document.body.appendChild(panel);

      document.addEventListener('click', (e) => {
        if (panel && isPanelOpen && !panel.contains(e.target) && !e.target.closest('.btn-notification-bell')) {
          panel.style.display = 'none';
          isPanelOpen = false;
        }
      });
    }
  }

  function toggleNotificationDropdown(btn) {
    const panel = document.getElementById('hyrostNotificationPanel');
    if (!panel) return;
    isPanelOpen = !isPanelOpen;
    panel.style.display = isPanelOpen ? 'block' : 'none';
    if (isPanelOpen && window.HyrostSFX) {
      window.HyrostSFX.playClick();
    }
  }

  async function loadNotifications() {
    const token = localStorage.getItem('hyrostToken');
    if (!token) return;

    try {
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data && Array.isArray(data.notifications)) {
        notifications = data.notifications;
        renderNotifications();
      }
    } catch (e) {}
  }

  function renderNotifications() {
    const list = document.getElementById('notificationListContainer');
    const badge = document.getElementById('mobileNotificationBadge');
    if (!list) return;

    if (notifications.length === 0) {
      if (badge) badge.style.display = 'none';
      return;
    }

    if (badge) badge.style.display = 'block';

    list.innerHTML = notifications.map(n => `
      <div style="padding:10px 16px; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; gap:10px; align-items:flex-start;">
        <i class="fas fa-info-circle" style="color:var(--accent-indigo-light, #818cf8); margin-top:2px;"></i>
        <div style="flex:1;">
          <div style="font-size:0.8rem; font-weight:700; color:#fff;">${escapeHtml(n.title || 'Pemberitahuan')}</div>
          <div style="font-size:0.75rem; color:var(--text-muted, #aaa); line-height:1.4;">${escapeHtml(n.message || '')}</div>
        </div>
      </div>
    `).join('');
  }

  function requestWebPush() {
    if (!('Notification' in window)) {
      alert('Browser Anda tidak mendukung Web Push Notifications.');
      return;
    }

    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        if (window.HyrostSFX) window.HyrostSFX.playLevelUp();
        new Notification('Hyrost Realm', {
          body: '🔔 Notifikasi Web Push Hyrost telah aktif!',
          icon: '/assets/images/hyrost.png'
        });
        alert('Notifikasi Push berhasil diaktifkan!');
      } else {
        alert('Izin notifikasi ditolak.');
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  global.HyrostNotifications = {
    init: initNotificationHub,
    requestWebPush,
    load: loadNotifications
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotificationHub);
  } else {
    initNotificationHub();
  }
})(window);
