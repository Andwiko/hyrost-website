// Index page functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeIndex();
    setupEventListeners();
    checkAuthStatus();
});

// Initialize index page
function initializeIndex() {
    initVisitorLiveHub();
}

function initVisitorLiveHub() {
    if (!window.HyrostLiveHub) return;

    const token = localStorage.getItem('hyrostToken');
    const chatHint = document.getElementById('visitorChatHint');
    const chatInput = document.getElementById('visitorLiveChatInput');
    const chatSend = document.getElementById('visitorLiveChatSend');

    if (chatHint) {
        chatHint.textContent = token
            ? 'Anda terhubung — pesan akan tampil langsung ke seluruh pengunjung.'
            : 'Masuk untuk ikut berdiskusi dengan komunitas.';
    }

    HyrostLiveHub.init({
        chatContainerId: 'visitorLiveChat',
        activityContainerId: 'visitorLiveActivity',
        playerCountSelector: '#livePlayersCount',
        statusTextSelector: '#liveStatusText',
        statusDotSelector: '.hero-preview-card .badge-dot, .preview-status .badge-dot',
        serverIpSelector: '#ipText',
        forumCountSelector: '#liveForumCount',
        webOnlineSelector: '#liveWebOnlineCount',
        maxPlayers: 500,
        chatReadOnly: !token,
        intervals: { snapshot: 8000, presence: 15000 },
    });

    if (chatSend && chatInput) {
        const submitChat = async () => {
            const msg = chatInput.value.trim();
            if (!msg) return;
            chatSend.disabled = true;
            const result = await HyrostLiveHub.sendChat(msg);
            chatSend.disabled = false;
            if (result.success) {
                chatInput.value = '';
                if (typeof showToast === 'function') {
                    showToast("Pesan Anda dikirim ke obrolan komunitas!");
                }
            } else {
                if (typeof showToast === 'function') {
                    showToast(result.message || 'Gagal mengirim pesan');
                }
            }
        };
        chatSend.addEventListener('click', submitChat);
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitChat();
        });
    }
}

// Setup event listeners
function setupEventListeners() {
    // Mobile menu toggle
    const hamburger = document.getElementById('hamburger');
    const navLinksContainer = document.getElementById('navLinksContainer');
    
    if (hamburger && navLinksContainer) {
        hamburger.addEventListener('click', function() {
            navLinksContainer.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }
}

// Check authentication status
function checkAuthStatus() {
    const googleUser = localStorage.getItem('googleUser');
    const token = localStorage.getItem('hyrostToken');
    
    if (googleUser || token) {
        updateUIForLoggedInUser();
    }
}

// Handle Google Login
async function handleGoogleLogin(response) {
    console.log('Google Login Response:', response);
    
    try {
        let payload = null;
        if (response.credential) {
            try {
                payload = JSON.parse(atob(response.credential.split('.')[1]));
            } catch (e) {}
        }

        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: response.credential,
                payload: payload
            })
        });

        const data = await res.json();
        if (!res.ok || !data.token) {
            alert(data.message || 'Google Login Gagal');
            return;
        }

        // Store authentic JWT token & user profile
        localStorage.setItem('hyrostToken', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        if (payload) {
            localStorage.setItem('googleUser', JSON.stringify({
                username: data.user.username,
                email: data.user.email,
                avatar: data.user.avatarUrl,
                googleId: data.user.googleId || payload.sub,
                loginType: 'google'
            }));
        }

        // Close modal & update UI
        closeLoginModal();
        updateUIForLoggedInUser();

        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 800);
    } catch (err) {
        console.error('Google Login Error:', err);
        alert('Gagal menghubungkan ke server untuk Google Login.');
    }
}

// Update UI for logged in user
function updateUIForLoggedInUser() {
    const googleUser = JSON.parse(localStorage.getItem('googleUser'));
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (googleUser || currentUser) {
        const user = googleUser || currentUser;
        
        // Update navbar buttons
        const navbarButtons = document.querySelector('.navbar-buttons');
        if (navbarButtons) {
            navbarButtons.innerHTML = `
                <button class="btn-secondary" onclick="logout()" style="display:flex; align-items:center; gap:6px;">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Keluar</span>
                </button>
                <button class="btn-primary" onclick="goToDashboard()" style="display:flex; align-items:center; gap:6px;">
                    <span>Dashboard</span>
                    <i class="fas fa-arrow-right"></i>
                </button>
            `;
        }
        
        // Update hero buttons while preserving Server IP Box
        const heroButtons = document.querySelector('.hero-buttons');
        if (heroButtons) {
            heroButtons.innerHTML = `
                <button class="btn-primary" onclick="goToDashboard()">
                    <i class="fas fa-compass"></i>
                    <span>Buka Dashboard</span>
                </button>
                <button class="btn-secondary" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Keluar</span>
                </button>
                <div class="server-ip-box" onclick="copyServerIP()" title="Klik untuk menyalin IP Server">
                    <i class="fas fa-server" style="color: var(--accent-cyan);"></i>
                    <span class="ip-text" id="ipText">play.hyrost.net</span>
                    <i class="far fa-copy" style="color: var(--text-dim);"></i>
                </div>
            `;
        }
        
        // Show user info
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        
        if (userInfo && userName && userAvatar && googleUser) {
            userName.textContent = googleUser.username;
            userAvatar.src = googleUser.avatar;
            userInfo.style.display = 'flex';
        }
    }
}

// Navigate to dashboard
function goToDashboard() {
    if (!isUserAuthenticated()) {
        showLoginModal();
        return;
    }
    
    window.location.href = '/dashboard';
}

// Show login page (formerly modal)
function showLoginModal() {
    window.location.href = '/login';
}

// Close login modal (Deprecated)
function closeLoginModal() {
    // Modal removed
}

// Handle regular login form
function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (username && password) {
        fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: username, password: password })
        })
        .then(response => {
            if (!response.ok) throw new Error('Login failed');
            return response.json();
        })
        .then(data => {
            if (data.token) {
                const userData = {
                    username: data.user.username,
                    email: data.user.email,
                    role: data.user.role,
                    loginType: 'regular',
                    loggedInAt: new Date().toISOString()
                };
                
                localStorage.setItem('currentUser', JSON.stringify(userData));
                localStorage.setItem('hyrostToken', data.token);
                
                closeLoginModal();
                window.location.href = '/dashboard';
            } else {
                throw new Error(data.message || 'Login failed');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('loginError').textContent = error.message || 'Login failed. Please check your credentials.';
        });
    } else {
        document.getElementById('loginError').textContent = 'Please enter both email and password';
    }
}

// Check if user is authenticated
function isUserAuthenticated() {
    const googleUser = localStorage.getItem('googleUser');
    const token = localStorage.getItem('hyrostToken');
    const currentUser = localStorage.getItem('currentUser');
    
    return googleUser || (token && currentUser);
}

// Logout function
function logout() {
    localStorage.removeItem('googleUser');
    localStorage.removeItem('hyrostToken');
    localStorage.removeItem('currentUser');
    
    // Hide user info
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.style.display = 'none';
    }
    
    // Reset UI
    location.reload();
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('loginModal');
    if (event.target == modal) {
        closeLoginModal();
    }
}