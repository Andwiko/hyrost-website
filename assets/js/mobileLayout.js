/**
 * Hyrost & Mei Labs — Universal Header, Navigation & Mobile Hamburger Drawer Engine
 * Seamlessly manages mobile navigation, sidebar drawers, overlays, and responsive toggles.
 */

// Global Mobile Sidebar Controls (Available Immediately)
(function (global) {
  let lastToggleTime = 0;

  function getSidebar() {
    return document.querySelector('#sidebar, .sidebar, #adminSidebar, .admin-sidebar');
  }

  function getOverlay() {
    let ov = document.querySelector('#sidebarOverlay, .sidebar-overlay');
    if (!ov && (document.querySelector('#sidebar, .sidebar, #adminSidebar, .admin-sidebar'))) {
      ov = document.createElement('div');
      ov.id = 'sidebarOverlay';
      ov.className = 'sidebar-overlay';
      document.body.appendChild(ov);
    }
    return ov;
  }

  function openDrawer() {
    const sb = getSidebar();
    const ov = getOverlay();
    if (!sb) return;
    sb.classList.add('active', 'open', 'mobile-open');
    if (ov) ov.classList.add('active', 'open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    const sb = getSidebar();
    const ov = getOverlay();
    if (sb) sb.classList.remove('active', 'open', 'mobile-open');
    if (ov) ov.classList.remove('active', 'open');
    document.body.style.overflow = '';
  }

  function toggleDrawer(e) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    const now = Date.now();
    if (now - lastToggleTime < 180) return;
    lastToggleTime = now;

    const sb = getSidebar();
    if (!sb) return;

    const isOpen =
      sb.classList.contains('active') ||
      sb.classList.contains('open') ||
      sb.classList.contains('mobile-open');

    if (isOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }

  // Export functions to window immediately
  global.toggleMobileSidebar = toggleDrawer;
  global.closeMobileSidebar = closeDrawer;
  global.openMobileSidebar = openDrawer;

  function initUniversalNav() {
    // 1. Module / Dashboard Sidebar Toggle Binding
    const sidebarToggleBtns = document.querySelectorAll(
      '#sidebarToggle, #adminSidebarToggle, .sidebar-toggle, .admin-menu-toggle, [data-toggle="sidebar"]'
    );
    sidebarToggleBtns.forEach((btn) => {
      if (btn.dataset.sidebarBound) return;
      btn.dataset.sidebarBound = '1';
      btn.addEventListener('click', (e) => toggleDrawer(e));
    });

    const overlay = getOverlay();
    if (overlay && !overlay.dataset.sidebarBound) {
      overlay.dataset.sidebarBound = '1';
      overlay.addEventListener('click', (e) => {
        if (e) e.stopPropagation();
        closeDrawer();
      });
    }

    // Auto-close sidebar drawer when navigating
    const sidebar = getSidebar();
    if (sidebar) {
      sidebar.querySelectorAll('.nav-item, .nav-link, a').forEach((item) => {
        if (item.dataset.drawerCloseBound) return;
        item.dataset.drawerCloseBound = '1';
        item.addEventListener('click', () => {
          if (window.innerWidth <= 1024) closeDrawer();
        });
      });
    }

    // 2. Landing / Public Page Hamburger (#hamburger -> #navLinksContainer / #navbarMenuWrapper)
    const publicHamburger = document.getElementById('hamburger');
    const publicNavMenu = document.getElementById('navLinksContainer') || document.getElementById('navbarMenuWrapper');

    if (publicHamburger && publicNavMenu && !publicHamburger.dataset.navBound) {
      publicHamburger.dataset.navBound = '1';
      publicHamburger.addEventListener('click', (e) => {
        if (e) e.stopPropagation();
        const isActive = publicNavMenu.classList.toggle('active');
        publicHamburger.classList.toggle('active');
        publicHamburger.setAttribute('aria-expanded', isActive ? 'true' : 'false');
      });

      // Close menu when clicking any nav link
      publicNavMenu.querySelectorAll('a, button').forEach((link) => {
        link.addEventListener('click', () => {
          publicNavMenu.classList.remove('active');
          publicHamburger.classList.remove('active');
          publicHamburger.setAttribute('aria-expanded', 'false');
        });
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (publicNavMenu.classList.contains('active')) {
          if (!publicNavMenu.contains(e.target) && !publicHamburger.contains(e.target)) {
            publicNavMenu.classList.remove('active');
            publicHamburger.classList.remove('active');
            publicHamburger.setAttribute('aria-expanded', 'false');
          }
        }
      });
    }

    // 3. Bot Ecosystem Hamburger (#mobileNavToggle -> #botNavMenu)
    const botNavToggle = document.getElementById('mobileNavToggle');
    const botNavMenu = document.getElementById('botNavMenu');

    if (botNavToggle && botNavMenu && !botNavToggle.dataset.botNavBound) {
      botNavToggle.dataset.botNavBound = '1';
      botNavToggle.addEventListener('click', (e) => {
        if (e) e.stopPropagation();
        const isOpen = botNavMenu.classList.toggle('open');
        botNavToggle.classList.toggle('open');
        botNavToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      botNavMenu.querySelectorAll('.nav-link, a, button').forEach((link) => {
        link.addEventListener('click', () => {
          botNavMenu.classList.remove('open');
          botNavToggle.classList.remove('open');
          botNavToggle.setAttribute('aria-expanded', 'false');
        });
      });

      document.addEventListener('click', (e) => {
        if (botNavMenu.classList.contains('open')) {
          if (!botNavMenu.contains(e.target) && !botNavToggle.contains(e.target)) {
            botNavMenu.classList.remove('open');
            botNavToggle.classList.remove('open');
            botNavToggle.setAttribute('aria-expanded', 'false');
          }
        }
      });
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUniversalNav);
  } else {
    initUniversalNav();
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) {
      closeDrawer();
    }
  });

  global.HyrostUniversalNav = {
    init: initUniversalNav,
    openSidebar: openDrawer,
    closeSidebar: closeDrawer,
    toggleSidebar: toggleDrawer
  };
})(window);
