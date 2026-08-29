// modules/social.js
document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api';
    const token = localStorage.getItem('hyrostToken');

    // Verification check on page load
    if (!token) {
        showToast('Anda harus masuk terlebih dahulu!', 'error');
        setTimeout(() => {
            window.location.href = '../';
        }, 1500);
        return;
    }

    // --- Tab Switching Navigation ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Toggle active classes
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Toggle content display
            tabContents.forEach(content => {
                content.style.display = 'none';
            });
            
            const targetEl = document.getElementById(`${targetTab}Tab`);
            if (targetEl) targetEl.style.display = 'block';

            // Fetch target tab data
            loadTabData(targetTab);
        });
    });

    // --- Dynamic Tab Loading Router ---
    function loadTabData(tabName) {
        switch (tabName) {
            case 'friends':
                loadFriendsList();
                break;
            case 'pending':
                loadPendingRequests();
                break;
            case 'sent':
                loadSentRequests();
                break;
            case 'blocked':
                loadBlockedList();
                break;
        }
    }

    // --- API Helper Function ---
    async function makeRequest(endpoint, method = 'GET', body = null) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        const config = {
            method,
            headers
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        try {
            const res = await fetch(`${API_URL}${endpoint}`, config);
            const data = await res.json();
            
            if (res.status === 401) {
                localStorage.removeItem('hyrostToken');
                localStorage.removeItem('currentUser');
                window.location.href = '../';
                return null;
            }

            if (!res.ok) {
                throw new Error(data.error || data.message || 'Terjadi kesalahan sistem');
            }

            return data;
        } catch (err) {
            showToast(err.message, 'error');
            console.error(`API Error [${endpoint}]:`, err);
            return null;
        }
    }

    // --- UI Toast Notification System ---
    function showToast(message, type = 'success') {
        const toast = document.getElementById('global-toast');
        const icon = document.getElementById('toast-icon');
        const text = document.getElementById('toast-message');

        if (!toast || !icon || !text) return;

        text.textContent = message;
        toast.className = 'toast-notification show ' + type;

        if (type === 'success') {
            icon.className = 'fas fa-check-circle';
            icon.style.color = '#10b981';
        } else if (type === 'error') {
            icon.className = 'fas fa-exclamation-circle';
            icon.style.color = '#ef4444';
        } else {
            icon.className = 'fas fa-info-circle';
            icon.style.color = '#3b82f6';
        }

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    }

    // --- Load Badge Counters ---
    async function updateCounters() {
        // Friends
        const friendsData = await makeRequest('/friends');
        if (friendsData && friendsData.friends) {
            document.getElementById('count-friends').textContent = friendsData.friends.length;
        }

        // Incoming
        const incomingData = await makeRequest('/friends/pending');
        if (incomingData && incomingData.requests) {
            const count = incomingData.requests.length;
            const badge = document.getElementById('count-incoming');
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-block' : 'none';
        }

        // Sent
        const sentData = await makeRequest('/friends/sent');
        if (sentData && sentData.requests) {
            document.getElementById('count-outgoing').textContent = sentData.requests.length;
        }

        // Blocked
        const blockedData = await makeRequest('/friends/blocked');
        if (blockedData && blockedData.blocked) {
            document.getElementById('count-blocked').textContent = blockedData.blocked.length;
        }
    }

    // --- Tab 1: Friends list ---
    async function loadFriendsList() {
        const container = document.getElementById('friends-list-container');
        if (!container) return;

        container.innerHTML = '<div style="color: rgba(255,255,255,0.4); text-align: center; width: 100%; padding: 40px;">Memuat daftar teman...</div>';

        const data = await makeRequest('/friends');
        if (!data || !data.friends) {
            container.innerHTML = '';
            return;
        }

        const countFriends = data.friends.length;
        document.getElementById('count-friends').textContent = countFriends;

        if (countFriends === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-user-friends"></i>
                    <p>Belum ada teman terdaftar. Cari pemain lain di tab "Cari Pemain" untuk mulai berteman!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        data.friends.forEach(friend => {
            const avatar = friend.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.username)}&background=random`;
            const roleClass = (friend.role || 'member').toLowerCase();
            const roleText = friend.role || 'MEMBER';

            const card = document.createElement('div');
            card.className = 'friend-card';
            card.innerHTML = `
                <div class="friend-meta">
                    <img src="${avatar}" alt="${friend.username}" onerror="this.src='https://ui-avatars.com/api/?name=${friend.username}&background=random'">
                    <div class="friend-details">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <h4>${friend.username}</h4>
                            <span class="role-badge ${roleClass}">${roleText}</span>
                        </div>
                        <p>Berteman sejak: ${new Date(friend.friends_since).toLocaleDateString('id-ID')}</p>
                    </div>
                </div>
                <div class="friend-actions">
                    <button class="friend-btn chat-trigger" data-id="${friend.friend_id}" title="Kirim Obrolan">
                        <i class="fas fa-comment-dots"></i>
                    </button>
                    <button class="friend-btn warning block-trigger" data-id="${friend.friend_id}" title="Blokir Pemain">
                        <i class="fas fa-ban"></i>
                    </button>
                    <button class="friend-btn danger remove-trigger" data-id="${friend.friend_id}" title="Hapus Teman">
                        <i class="fas fa-user-minus"></i>
                    </button>
                </div>
            `;

            // Wire actions
            card.querySelector('.chat-trigger').addEventListener('click', () => {
                window.location.href = `chat.html?friendId=${friend.friend_id}`;
            });

            card.querySelector('.block-trigger').addEventListener('click', () => {
                if (confirm(`Apakah Anda yakin ingin memblokir ${friend.username}? Pertemanan Anda akan terhapus secara permanen.`)) {
                    blockUser(friend.friend_id);
                }
            });

            card.querySelector('.remove-trigger').addEventListener('click', () => {
                if (confirm(`Hapus ${friend.username} dari daftar teman Anda?`)) {
                    removeFriend(friend.friend_id);
                }
            });

            container.appendChild(card);
        });
    }

    // --- Tab 2: Incoming Requests ---
    async function loadPendingRequests() {
        const container = document.getElementById('incoming-list-container');
        if (!container) return;

        container.innerHTML = '<div style="color: rgba(255,255,255,0.4); padding: 20px;">Memuat permintaan masuk...</div>';

        const data = await makeRequest('/friends/pending');
        if (!data || !data.requests) {
            container.innerHTML = '';
            return;
        }

        const count = data.requests.length;
        const badge = document.getElementById('count-incoming');
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';

        if (count === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-envelope-open"></i>
                    <p>Tidak ada permintaan pertemanan masuk.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        data.requests.forEach(req => {
            const avatar = req.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.username)}&background=random`;
            const roleClass = (req.role || 'member').toLowerCase();
            
            const item = document.createElement('div');
            item.className = 'request-item';
            item.innerHTML = `
                <div class="request-user-info">
                    <img src="${avatar}" alt="${req.username}">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <h4>${req.username}</h4>
                            <span class="role-badge ${roleClass}">${req.role || 'MEMBER'}</span>
                        </div>
                        <p>Mengirimkan permintaan pada: ${new Date(req.created_at).toLocaleString('id-ID')}</p>
                    </div>
                </div>
                <div class="request-actions">
                    <button class="btn-action-primary accept-trigger" data-id="${req.request_id}">Terima</button>
                    <button class="btn-action-secondary decline-trigger" data-id="${req.request_id}">Tolak</button>
                </div>
            `;

            item.querySelector('.accept-trigger').addEventListener('click', () => respondRequest(req.request_id, 1));
            item.querySelector('.decline-trigger').addEventListener('click', () => respondRequest(req.request_id, 2));

            container.appendChild(item);
        });
    }

    // --- Tab 3: Sent Requests ---
    async function loadSentRequests() {
        const container = document.getElementById('outgoing-list-container');
        if (!container) return;

        container.innerHTML = '<div style="color: rgba(255,255,255,0.4); padding: 20px;">Memuat permintaan terkirim...</div>';

        const data = await makeRequest('/friends/sent');
        if (!data || !data.requests) {
            container.innerHTML = '';
            return;
        }

        const count = data.requests.length;
        document.getElementById('count-outgoing').textContent = count;

        if (count === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-paper-plane" style="opacity:0.4;"></i>
                    <p>Tidak ada permintaan pertemanan terkirim yang tertunda.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        data.requests.forEach(req => {
            const avatar = req.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.username)}&background=random`;
            const roleClass = (req.role || 'member').toLowerCase();

            const item = document.createElement('div');
            item.className = 'request-item';
            item.innerHTML = `
                <div class="request-user-info">
                    <img src="${avatar}" alt="${req.username}">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <h4>${req.username}</h4>
                            <span class="role-badge ${roleClass}">${req.role || 'MEMBER'}</span>
                        </div>
                        <p>Dikirimkan pada: ${new Date(req.created_at).toLocaleString('id-ID')}</p>
                    </div>
                </div>
                <div class="request-actions">
                    <button class="btn-action-secondary cancel-trigger" data-id="${req.request_id}">Batalkan</button>
                </div>
            `;

            item.querySelector('.cancel-trigger').addEventListener('click', () => cancelRequest(req.request_id));

            container.appendChild(item);
        });
    }

    // --- Tab 5: Blocked Users ---
    async function loadBlockedList() {
        const container = document.getElementById('blocked-list-container');
        if (!container) return;

        container.innerHTML = '<div style="color: rgba(255,255,255,0.4); padding: 20px;">Memuat daftar blokir...</div>';

        const data = await makeRequest('/friends/blocked');
        if (!data || !data.blocked) {
            container.innerHTML = '';
            return;
        }

        const count = data.blocked.length;
        document.getElementById('count-blocked').textContent = count;

        if (count === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-shield"></i>
                    <p>Anda belum memblokir pengguna manapun.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        data.blocked.forEach(user => {
            const avatar = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`;

            const item = document.createElement('div');
            item.className = 'request-item';
            item.innerHTML = `
                <div class="request-user-info">
                    <img src="${avatar}" alt="${user.username}">
                    <div>
                        <h4>${user.username}</h4>
                        <p>Diblokir pada: ${new Date(user.created_at).toLocaleString('id-ID')}</p>
                    </div>
                </div>
                <div class="request-actions">
                    <button class="btn-action-primary unblock-trigger" data-id="${user.user_id}">Buka Blokir</button>
                </div>
            `;

            item.querySelector('.unblock-trigger').addEventListener('click', () => unblockUser(user.user_id));

            container.appendChild(item);
        });
    }

    // --- Search Interactive Logic ---
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('btn-search-trigger');
    const searchContainer = document.getElementById('search-results-container');

    if (searchBtn && searchInput && searchContainer) {
        searchBtn.addEventListener('click', triggerSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') triggerSearch();
        });
    }

    async function triggerSearch() {
        const query = searchInput.value.trim();
        if (query.length < 2) {
            showToast('Username minimal harus 2 karakter!', 'info');
            return;
        }

        searchContainer.innerHTML = '<div style="color: rgba(255,255,255,0.4); text-align:center; padding: 40px;">Mencari pemain...</div>';

        const data = await makeRequest(`/friends/search?q=${encodeURIComponent(query)}`);
        if (!data || !data.users) {
            searchContainer.innerHTML = '';
            return;
        }

        if (data.users.length === 0) {
            searchContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-times"></i>
                    <p>Pemain dengan kata kunci "${query}" tidak ditemukan.</p>
                </div>
            `;
            return;
        }

        searchContainer.innerHTML = '';
        data.users.forEach(user => {
            const avatar = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`;
            const roleClass = (user.role || 'member').toLowerCase();

            const item = document.createElement('div');
            item.className = 'request-item';
            
            // Build action buttons contextually
            let actionHtml = '';
            if (user.friendship_status === 'none') {
                actionHtml = `<button class="btn-action-primary add-friend-btn" data-id="${user.id}"><i class="fas fa-user-plus"></i> Tambah Teman</button>`;
            } else if (user.friendship_status === 'friend') {
                actionHtml = `<span style="color:#10b981; font-weight:600;"><i class="fas fa-check-double"></i> Berteman</span>`;
            } else if (user.friendship_status === 'sent_pending') {
                actionHtml = `<button class="btn-action-secondary cancel-req-btn" data-req-id="${user.request_id}"><i class="fas fa-spinner fa-spin"></i> Menunggu Persetujuan</button>`;
            } else if (user.friendship_status === 'received_pending') {
                actionHtml = `
                    <div style="display:flex; gap:8px;">
                        <button class="btn-action-primary accept-req-btn" data-req-id="${user.request_id}">Terima</button>
                        <button class="btn-action-secondary decline-req-btn" data-req-id="${user.request_id}">Tolak</button>
                    </div>
                `;
            }

            item.innerHTML = `
                <div class="request-user-info">
                    <img src="${avatar}" alt="${user.username}">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <h4>${user.username}</h4>
                            <span class="role-badge ${roleClass}">${user.role || 'MEMBER'}</span>
                        </div>
                    </div>
                </div>
                <div class="request-actions">
                    ${actionHtml}
                </div>
            `;

            // Wire actions
            const addBtn = item.querySelector('.add-friend-btn');
            if (addBtn) addBtn.addEventListener('click', () => sendFriendRequest(user.id));

            const cancelBtn = item.querySelector('.cancel-req-btn');
            if (cancelBtn) cancelBtn.addEventListener('click', () => cancelRequest(user.request_id, true));

            const acceptBtn = item.querySelector('.accept-req-btn');
            if (acceptBtn) acceptBtn.addEventListener('click', () => respondRequest(user.request_id, 1, true));

            const declineBtn = item.querySelector('.decline-req-btn');
            if (declineBtn) declineBtn.addEventListener('click', () => respondRequest(user.request_id, 2, true));

            searchContainer.appendChild(item);
        });
    }

    // --- Action Implementations ---
    async function sendFriendRequest(recipientId) {
        const res = await makeRequest('/friends/request', 'POST', { recipient: recipientId });
        if (res && res.success) {
            showToast(res.message || 'Permintaan pertemanan berhasil dikirim!');
            // Re-trigger search or update count
            triggerSearch();
            updateCounters();
        }
    }

    async function respondRequest(requestId, status, isFromSearch = false) {
        const res = await makeRequest(`/friends/respond/${requestId}`, 'POST', { status });
        if (res && res.success) {
            showToast(res.message || 'Pemberitahuan pertemanan diperbarui');
            if (isFromSearch) triggerSearch();
            else loadPendingRequests();
            updateCounters();
        }
    }

    async function cancelRequest(requestId, isFromSearch = false) {
        const res = await makeRequest(`/friends/cancel/${requestId}`, 'DELETE');
        if (res && res.success) {
            showToast(res.message || 'Permintaan pertemanan dibatalkan');
            if (isFromSearch) triggerSearch();
            else loadSentRequests();
            updateCounters();
        }
    }

    async function removeFriend(friendId) {
        const res = await makeRequest(`/friends/remove/${friendId}`, 'DELETE');
        if (res && res.success) {
            showToast(res.message || 'Teman berhasil dihapus');
            loadFriendsList();
            updateCounters();
        }
    }

    async function blockUser(userId) {
        const res = await makeRequest(`/friends/block/${userId}`, 'POST');
        if (res && res.success) {
            showToast(res.message || 'Pengguna berhasil diblokir');
            loadFriendsList();
            updateCounters();
        }
    }

    async function unblockUser(userId) {
        const res = await makeRequest(`/friends/unblock/${userId}`, 'POST');
        if (res && res.success) {
            showToast(res.message || 'Pemblokiran dibuka');
            loadBlockedList();
            updateCounters();
        }
    }

    // --- Initialize Data ---
    loadFriendsList();
    updateCounters();
});
