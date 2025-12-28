document.addEventListener('DOMContentLoaded', () => {
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const notificationBadge = document.getElementById('notificationBadge');
    const notificationList = document.getElementById('notificationList');

    // Mock Notifications Data
    let notifications = [
        {
            id: 1,
            title: "Welcome to Hyrost!",
            message: "Thanks for joining our community.",
            time: "2 mins ago",
            read: false,
            icon: "fas fa-smile",
            color: "#4ade80"
        },
        {
            id: 2,
            title: "New Quest Available",
            message: "Check out the 'Dragon Slayer' quest in World.",
            time: "1 hour ago",
            read: false,
            icon: "fas fa-scroll",
            color: "#fbbf24"
        },
        {
            id: 3,
            title: "System Update",
            message: "Server maintenance scheduled for tonight.",
            time: "5 hours ago",
            read: true,
            icon: "fas fa-cog",
            color: "#60a5fa"
        }
    ];

    // Initialize
    updateBadge();
    renderNotifications();

    // Toggle Dropdown
    notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notificationDropdown.classList.toggle('active');
        if (notificationDropdown.classList.contains('active')) {
            markAllAsSeen();
        }
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!notificationBtn.contains(e.target) && !notificationDropdown.contains(e.target)) {
            notificationDropdown.classList.remove('active');
        }
    });

    function updateBadge() {
        const unreadCount = notifications.filter(n => !n.read).length;
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
            notificationList.innerHTML = '<div class="empty-notif">No new notifications</div>';
            return;
        }

        notifications.forEach(notif => {
            const item = document.createElement('div');
            item.className = `notification-item ${notif.read ? 'read' : 'unread'}`;
            item.innerHTML = `
                <div class="notif-icon" style="background: ${notif.color}20; color: ${notif.color}">
                    <i class="${notif.icon}"></i>
                </div>
                <div class="notif-content">
                    <div class="notif-header">
                        <span class="notif-title">${notif.title}</span>
                        <span class="notif-time">${notif.time}</span>
                    </div>
                    <p class="notif-message">${notif.message}</p>
                </div>
            `;
            notificationList.appendChild(item);
        });
    }

    function markAllAsSeen() {
        // Visual update only, in real app sends API request
        // notifications.forEach(n => n.read = true);
        // updateBadge();
        // renderNotifications();
        
        // For UX, maybe just hide badge on open, but keep 'unread' style until clicked?
        // Let's just update badge for now
        setTimeout(() => {
             notifications.forEach(n => n.read = true);
             updateBadge();
             renderNotifications();
        }, 1000);
    }
});
