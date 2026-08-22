/**
 * Hyrost — shared mobile sidebar drawer for dashboard-layout pages.
 */
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

  function closeDrawer(sidebar, overlay) {
    sidebar.classList.remove('active', 'open', 'mobile-open');
    overlay.classList.remove('active', 'open');
    document.body.style.overflow = '';
  }

  function openDrawer(sidebar, overlay) {
    sidebar.classList.add('active', 'open', 'mobile-open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function bindDrawer(sidebar, overlay) {
    const toggle = (e) => {
      if (e) e.stopPropagation();
      const isOpen =
        sidebar.classList.contains('active') ||
        sidebar.classList.contains('open') ||
        sidebar.classList.contains('mobile-open');
      if (isOpen) closeDrawer(sidebar, overlay);
      else openDrawer(sidebar, overlay);
    };

    global.toggleMobileSidebar = toggle;

    document.querySelectorAll(
      '#sidebarToggle, #adminSidebarToggle, .sidebar-toggle, .hamburger, [data-toggle="sidebar"]'
    ).forEach((btn) => {
      if (btn.dataset.sidebarBound) return;
      btn.dataset.sidebarBound = '1';
      btn.addEventListener('click', toggle);
    });

    if (!overlay.dataset.sidebarBound) {
      overlay.dataset.sidebarBound = '1';
      overlay.addEventListener('click', () => closeDrawer(sidebar, overlay));
    }

    sidebar.querySelectorAll('.nav-item, .nav-link, a').forEach((item) => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 992) closeDrawer(sidebar, overlay);
      });
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 992) closeDrawer(sidebar, overlay);
    });
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

  global.HyrostMobileLayout = { init };
  document.addEventListener('DOMContentLoaded', () => init());
})(window);
