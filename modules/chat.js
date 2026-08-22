// modules/chat.js
document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api';
    const token = localStorage.getItem('hyrostToken');

    let activeFriendId = null;
    let activeFriendName = '';
    let pollingInterval = null;

    // Verify token
    if (!token) {
        showToast('Anda harus masuk terlebih dahulu!', 'error');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1500);
        return;
    }

    // Parse URL parameter to check if we were redirected from the Social Hub to chat a specific friend
    const urlParams = new URLSearchParams(window.location.search);
    const urlFriendId = urlParams.get('friendId');
    if (urlFriendId) {
        activeFriendId = parseInt(urlFriendId);
        setupActiveChatUI(activeFriendId);
    }

    // --- UI bindings ---
    const convListContainer = document.getElementById('conversation-list');
    const chatMainArea = document.getElementById('chat-main-area');
    const chatPlaceholder = document.getElementById('chat-placeholder-area');
    const msgInput = document.getElementById('msgInput');
    const sendBtn = document.getElementById('sendBtn');
    const messagesArea = document.getElementById('messagesArea');
    const newChatBtn = document.querySelector('.new-chat-btn');
    const searchChatInput = document.querySelector('.search-chat input');
    const btnBlockActive = document.getElementById('btn-block-active');

    // Setup input events
    if (sendBtn && msgInput) {
        sendBtn.addEventListener('click', sendMessage);
        msgInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    if (btnBlockActive) {
        btnBlockActive.addEventListener('click', () => {
            if (activeFriendId && confirm(`Apakah Anda yakin ingin memblokir ${activeFriendName}? Percakapan Anda akan ditutup.`)) {
                blockActiveFriend();
            }
        });
    }

    // New chat button: list all friends to start a chat
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            loadFriendsForNewChat();
        });
    }

    // Search filter for recent conversations
    if (searchChatInput) {
        searchChatInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const conversations = convListContainer.querySelectorAll('.conversation');
            conversations.forEach(conv => {
                const name = conv.querySelector('h4').textContent.toLowerCase();
                if (name.includes(query)) {
                    conv.style.display = 'flex';
                } else {
                    conv.style.display = 'none';
                }
            });
        });
    }

    // --- API Request Wrapper ---
    async function makeRequest(endpoint, method = 'GET', body = null) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        const config = { method, headers };
        if (body) config.body = JSON.stringify(body);

        try {
            const res = await fetch(`${API_URL}${endpoint}`, config);
            const data = await res.json();

            if (res.status === 401) {
                localStorage.removeItem('hyrostToken');
                localStorage.removeItem('currentUser');
                window.location.href = '../index.html';
                return null;
            }

            if (!res.ok) {
                throw new Error(data.message || data.error || 'Terjadi kesalahan');
            }

            return data;
        } catch (err) {
            showToast(err.message, 'error');
            console.error(`Chat API error [${endpoint}]:`, err);
            return null;
        }
    }

    // --- Toast System ---
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
        }, 3000);
    }

    // --- Setup UI for Active Chat ---
    async function setupActiveChatUI(friendId) {
        // Fetch specific friendship status or recipient user details
        const res = await makeRequest(`/friends/status/${friendId}`);
        if (!res || res.status !== 'friend') {
            showToast('Anda hanya bisa mengobrol dengan teman aktif.', 'error');
            closeActiveChat();
            return;
        }

        // Get friends details to update the header
        const friendsData = await makeRequest('/friends');
        if (friendsData && friendsData.friends) {
            const friend = friendsData.friends.find(f => f.friend_id === friendId);
            if (friend) {
                activeFriendName = friend.username;
                document.getElementById('active-chat-name').textContent = friend.username;
                const avatar = friend.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.username)}&background=random`;
                document.getElementById('active-chat-avatar').src = avatar;
                document.getElementById('active-chat-status').textContent = 'Online / Terhubung';
            }
        }

        // Display Chat Window
        chatPlaceholder.style.display = 'none';
        chatMainArea.style.display = 'flex';

        // Load messages immediately
        loadMessages(friendId);

        // Reset and establish polling interval
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(() => {
            loadMessages(friendId);
            loadConversationList();
        }, 3000);
    }

    // Close chat helper
    function closeActiveChat() {
        activeFriendId = null;
        chatPlaceholder.style.display = 'flex';
        chatMainArea.style.display = 'none';
        if (pollingInterval) clearInterval(pollingInterval);
    }

    // --- Load Conversations ---
    async function loadConversationList() {
        const conversations = await makeRequest('/chat/messages');
        if (!conversations) return;

        convListContainer.innerHTML = '';
        
        if (conversations.length === 0) {
            convListContainer.innerHTML = `
                <div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.3); font-size: 0.85rem;">
                    Belum ada percakapan aktif. Klik ikon edit di kanan atas untuk memulai obrolan baru dengan teman Anda.
                </div>
            `;
            return;
        }

        conversations.forEach(conv => {
            const avatar = conv.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.username)}&background=random`;
            const isActive = conv.friend_id === activeFriendId;
            const timeFormatted = new Date(conv.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            const div = document.createElement('div');
            div.className = `conversation ${isActive ? 'active' : ''}`;
            div.innerHTML = `
                <img src="${avatar}" alt="${conv.username}" onerror="this.src='https://ui-avatars.com/api/?name=${conv.username}&background=random'">
                <div class="conv-info">
                    <h4>${conv.username}</h4>
                    <p>${conv.last_message || ''}</p>
                </div>
                <span class="time">${timeFormatted}</span>
            `;

            div.addEventListener('click', () => {
                activeFriendId = conv.friend_id;
                setupActiveChatUI(activeFriendId);
                
                // Highlight active item
                document.querySelectorAll('.conversation').forEach(c => c.classList.remove('active'));
                div.classList.add('active');
            });

            convListContainer.appendChild(div);
        });
    }

    // --- Load Friends list to initiate a new chat ---
    async function loadFriendsForNewChat() {
        const friendsData = await makeRequest('/friends');
        if (!friendsData || !friendsData.friends) return;

        convListContainer.innerHTML = `
            <div style="padding: 10px 20px; font-size: 0.8rem; color: var(--accent-indigo, #6366f1); font-weight:700;">
                <i class="fas fa-plus"></i> PILIH TEMAN UNTUK MEMULAI CHAT
            </div>
        `;

        if (friendsData.friends.length === 0) {
            convListContainer.innerHTML += `
                <div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.3); font-size: 0.85rem;">
                    Anda belum memiliki teman. Tambah teman terlebih dahulu di Hub Sosial.
                </div>
            `;
            return;
        }

        friendsData.friends.forEach(friend => {
            const avatar = friend.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.username)}&background=random`;
            const div = document.createElement('div');
            div.className = 'conversation';
            div.innerHTML = `
                <img src="${avatar}" alt="${friend.username}">
                <div class="conv-info">
                    <h4>${friend.username}</h4>
                    <p style="color: #10b981;">Hubungan: Teman Aktif</p>
                </div>
                <span class="time"><i class="fas fa-plus"></i></span>
            `;

            div.addEventListener('click', () => {
                activeFriendId = friend.friend_id;
                setupActiveChatUI(activeFriendId);
                loadConversationList();
            });

            convListContainer.appendChild(div);
        });
    }

    // --- Load Chat Messages History ---
    async function loadMessages(friendId) {
        if (!friendId) return;

        const messages = await makeRequest(`/chat/messages?receiverId=${friendId}`);
        if (!messages) return;

        // Check if messages is an array, if not it might be access restriction
        if (!Array.isArray(messages)) {
            closeActiveChat();
            return;
        }

        const isScrolledToBottom = messagesArea.scrollHeight - messagesArea.clientHeight <= messagesArea.scrollTop + 100;

        messagesArea.innerHTML = '';
        messages.forEach(msg => {
            const isSent = msg.sender_id !== friendId;
            const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            const msgDiv = document.createElement('div');
            msgDiv.className = `message ${isSent ? 'sent' : 'received'}`;
            msgDiv.innerHTML = `
                <p>${escapeHTML(msg.content)}</p>
                <span class="msg-time">${time}</span>
            `;
            messagesArea.appendChild(msgDiv);
        });

        // Autoscroll logic
        if (isScrolledToBottom) {
            scrollToBottom();
        }
    }

    // --- Send Message ---
    async function sendMessage() {
        const text = msgInput.value.trim();
        if (!text || !activeFriendId) return;

        const payload = {
            receiverId: activeFriendId,
            content: text
        };

        msgInput.value = '';
        
        const res = await makeRequest('/chat/send', 'POST', payload);
        if (res) {
            // Append instantly to prevent laggy feeling
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message sent';
            msgDiv.innerHTML = `
                <p>${escapeHTML(text)}</p>
                <span class="msg-time">${time}</span>
            `;
            messagesArea.appendChild(msgDiv);
            scrollToBottom();
            
            // Reload message history to align with server
            loadMessages(activeFriendId);
            loadConversationList();
        }
    }

    // --- Block active friend ---
    async function blockActiveFriend() {
        if (!activeFriendId) return;
        const res = await makeRequest(`/friends/block/${activeFriendId}`, 'POST');
        if (res && res.success) {
            showToast(`${activeFriendName} berhasil diblokir.`, 'success');
            closeActiveChat();
            loadConversationList();
        }
    }

    // --- Utility functions ---
    function scrollToBottom() {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    // --- Initialize ---
    loadConversationList();
    if (activeFriendId) {
        setupActiveChatUI(activeFriendId);
    }
});
