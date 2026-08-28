document.addEventListener('DOMContentLoaded', () => {
  const notificationBtn = document.getElementById('notificationBtn');
  const notificationDropdown = document.getElementById('notificationDropdown');
  const notificationBadge = document.getElementById('notificationBadge');
  const notificationList = document.getElementById('notificationList');

  if (!notificationBtn || !notificationDropdown || !notificationList) return;

  let notifications = [];

  loadNotifications();

  notificationBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notificationDropdown.classList.toggle('active');
    if (notificationDropdown.classList.contains('active')) {
      markAllAsSeen();
    }
  });

  document.addEventListener('click', (e) => {
    if (!notificationBtn.contains(e.target) && !notificationDropdown.contains(e.target)) {
      notificationDropdown.classList.remove('active');
    }
  });

  async function loadNotifications() {
    const token = localStorage.getItem('hyrostToken');
    if (!token) {
      notifications = [];
      updateBadge();
      renderNotifications();
      return;
    }

    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      notifications = (data.notifications || []).map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        time: formatTime(n.created_at),
        read: !!n.is_read,
        icon: 'fas fa-bell',
        color: '#60a5fa',
      }));
    } catch (e) {
      notifications = [];
    }

    updateBadge();
    renderNotifications();
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins} mnt lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    return `${Math.floor(hours / 24)} hari lalu`;
  }

  function updateBadge() {
    if (!notificationBadge) return;
    const unreadCount = notifications.filter((n) => !n.read).length;
    if (unreadCount > 0) {
      notificationBadge.style.display = 'block';
      notificationBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    } else {
      notificationBadge.style.display = 'none';
    }
  }

  function renderNotifications() {
    notificationList.innerHTML = '';

    if (notifications.length === 0) {
      notificationList.innerHTML = '<div class="empty-notif">Tidak ada notifikasi</div>';
      return;
    }

    notifications.forEach((notif) => {
      const item = document.createElement('div');
      item.className = `notification-item ${notif.read ? 'read' : 'unread'}`;

      const icon = document.createElement('div');
      icon.className = 'notif-icon';
      icon.style.cssText = `background:${notif.color}20;color:${notif.color}`;
      icon.innerHTML = `<i class="${notif.icon}"></i>`;

      const content = document.createElement('div');
      content.className = 'notif-content';
      const title = document.createElement('span');
      title.className = 'notif-title';
      title.textContent = notif.title;
      const time = document.createElement('span');
      time.className = 'notif-time';
      time.textContent = notif.time;
      const header = document.createElement('div');
      header.className = 'notif-header';
      header.append(title, time);
      const msg = document.createElement('p');
      msg.className = 'notif-message';
      msg.textContent = notif.message;

      content.append(header, msg);
      item.append(icon, content);
      notificationList.appendChild(item);
    });
  }

  async function markAllAsSeen() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    notifications.forEach((n) => { n.read = true; });
    updateBadge();
    renderNotifications();

    const token = localStorage.getItem('hyrostToken');
    if (token && unreadIds.length) {
      try {
        await fetch('/api/features/notifications/read', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationIds: unreadIds }),
        });
      } catch (_) {}
    }
  }
});
