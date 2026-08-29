/**
 * Hyrost — shared mobile sidebar drawer for dashboard-layout pages.
 */
(function enforceCleanUrl() {
  try {
    if (typeof window === 'undefined' || !window.location || !window.history || !window.history.replaceState) return;
    const p = window.location.pathname;
    let clean = null;

    if (p.endsWith('/index.html')) {
      clean = p.slice(0, -10) || '/';
    } else if (p === '/index.html' || p === 'index.html') {
      clean = '/';
    } else if (p.endsWith('.html')) {
      clean = p.slice(0, -5);
    }

    if (clean !== null && clean !== p) {
      window.history.replaceState(null, '', clean + window.location.search + window.location.hash);
    }
  } catch (_) {}
})();

(function (global) {
  function assetPath(file) {
    const p = window.location.pathname.toLowerCase();
    const nested =
      p.includes('/modules/') ||
      p.includes('/account/') ||
      p.includes('/inventory/') ||
      p.includes('/marketplace/') ||
      p.includes('/auth/');
    return nested ? `../assets/${file}` : `assets/${file}`;
  }

  function getLogoPath() {
    return assetPath('images/hyrost.png');
  }

  function homePath() {
    const p = window.location.pathname.toLowerCase();
    if (p.includes('/modules/') || p.includes('/account/') || p.includes('/inventory/') || p.includes('/marketplace/') || p.includes('/auth/')) {
      return '../index.html';
    }
    return 'index.html';
  }

  function ensureOverlay() {
    let overlay = document.getElementById('sidebarOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sidebarOverlay';
      overlay.className = 'sidebar-overlay';
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function ensureMobileHeader(container) {
    let mobileHeader = document.querySelector('.mobile-header');
    if (mobileHeader || !container) return mobileHeader;

    mobileHeader = document.createElement('div');
    mobileHeader.className = 'mobile-header';
    mobileHeader.innerHTML = `
      <button type="button" id="sidebarToggle" class="btn-header-action" aria-label="Buka menu navigasi">
        <i class="fas fa-bars"></i>
      </button>
      <div class="mobile-logo">
        <img src="${getLogoPath()}" alt="Hyrost" onerror="this.src='https://ui-avatars.com/api/?name=H&background=6366f1&color=fff'">
        <h2>Hyrost</h2>
      </div>
      <button type="button" class="btn-header-action mobile-logout-btn" title="Keluar" aria-label="Keluar">
        <i class="fas fa-sign-out-alt"></i>
      </button>`;
    container.insertBefore(mobileHeader, container.firstChild);

    const logoutBtn = mobileHeader.querySelector('.mobile-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (typeof global.logout === 'function') {
          global.logout();
        } else {
          localStorage.removeItem('hyrostToken');
          localStorage.removeItem('currentUser');
          window.location.href = homePath();
        }
      });
    }
    return mobileHeader;
  }

  let lastToggleTime = 0;

  function closeDrawer(sidebar, overlay) {
    sidebar.classList.remove('active', 'open', 'mobile-open');
    if (overlay) overlay.classList.remove('active', 'open');
    document.body.style.overflow = '';
  }

  function openDrawer(sidebar, overlay) {
    sidebar.classList.add('active', 'open', 'mobile-open');
    if (overlay) overlay.classList.add('active', 'open');
    document.body.style.overflow = 'hidden';
  }

  function toggleDrawer(sidebar, overlay, e) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    const now = Date.now();
    if (now - lastToggleTime < 180) return; // Debounce rapid multi-triggers
    lastToggleTime = now;

    const sb = sidebar || document.querySelector('.sidebar, .admin-sidebar');
    const ov = overlay || document.getElementById('sidebarOverlay') || document.querySelector('.sidebar-overlay');
    if (!sb) return;

    const isOpen =
      sb.classList.contains('active') ||
      sb.classList.contains('open') ||
      sb.classList.contains('mobile-open');
    if (isOpen) closeDrawer(sb, ov);
    else openDrawer(sb, ov);
  }

  function bindNavItems(sidebar, overlay) {
    if (!sidebar) return;
    const ov = overlay || document.getElementById('sidebarOverlay') || document.querySelector('.sidebar-overlay');
    sidebar.querySelectorAll('.nav-item, .nav-link, a').forEach((item) => {
      if (item.dataset.drawerCloseBound) return;
      item.dataset.drawerCloseBound = '1';
      item.addEventListener('click', () => {
        if (window.innerWidth <= 992) closeDrawer(sidebar, ov);
      });
    });
  }

  function bindDrawer(sidebar, overlay) {
    const toggle = (e) => toggleDrawer(sidebar, overlay, e);

    global.toggleMobileSidebar = toggle;

    document.querySelectorAll(
      '#sidebarToggle, #adminSidebarToggle, .sidebar-toggle, .hamburger, [data-toggle="sidebar"], .mobile-header .btn-header-action'
    ).forEach((btn) => {
      if (btn.classList.contains('mobile-logout-btn') || btn.title === 'Keluar') return;
      if (btn.dataset.sidebarBound) return;
      btn.dataset.sidebarBound = '1';
      btn.addEventListener('click', toggle);
    });

    if (overlay && !overlay.dataset.sidebarBound) {
      overlay.dataset.sidebarBound = '1';
      overlay.addEventListener('click', (e) => {
        if (e) e.stopPropagation();
        closeDrawer(sidebar, overlay);
      });
    }

    bindNavItems(sidebar, overlay);

    if (!global.__sidebarResizeBound) {
      global.__sidebarResizeBound = true;
      window.addEventListener('resize', () => {
        if (window.innerWidth > 992) closeDrawer(sidebar, overlay);
      });
    }
  }

  function init(options = {}) {
    const sidebar =
      document.querySelector(options.sidebarSelector || '.sidebar, .admin-sidebar');
    if (!sidebar) return;

    const isAdmin = sidebar.classList.contains('admin-sidebar');
    const container =
      document.querySelector('.dashboard-container') ||
      document.querySelector('.admin-layout') ||
      document.body;

    if (!isAdmin) ensureMobileHeader(container);
    const overlay = ensureOverlay();
    bindDrawer(sidebar, overlay);
  }

  global.HyrostMobileLayout = { init, bindNavItems, open: openDrawer, close: closeDrawer, toggle: toggleDrawer };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }
})(window);


