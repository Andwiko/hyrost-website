// Index page functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeIndex();
    setupEventListeners();
    checkAuthStatus();
});

// Initialize index page
function initializeIndex() {
    console.log('Initializing Hyrost Index Page...');
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
function handleGoogleLogin(response) {
    console.log('Google Login Response:', response);
    
    // Decode JWT token
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    console.log('Google User Info:', payload);
    
    // Store user info
    const userData = {
        username: payload.name,
        email: payload.email,
        avatar: payload.picture,
        googleId: payload.sub,
        loginType: 'google',
        loggedInAt: new Date().toISOString()
    };
    
    localStorage.setItem('googleUser', JSON.stringify(userData));
    localStorage.setItem('hyrostToken', 'google-' + Date.now());
    
    // Close modal and update UI
    closeLoginModal();
    updateUIForLoggedInUser();
    
    // Redirect to dashboard
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1000);
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
                <button class="btn-secondary" onclick="logout()">LOGOUT</button>
                <button class="btn-primary" onclick="goToDashboard()">DASHBOARD</button>
            `;
        }
        
        // Update hero buttons
        const heroButtons = document.querySelector('.hero-buttons');
        if (heroButtons) {
            heroButtons.innerHTML = `
                <button class="btn-primary" onclick="goToDashboard()">ACCESS DASHBOARD</button>
                <button class="btn-secondary" onclick="logout()">LOGOUT</button>
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
    
    window.location.href = 'dashboard.html';
}

// Show login page (formerly modal)
function showLoginModal() {
    window.location.href = 'login.html';
}

// Close login modal
// Close login modal (Deprecated)
function closeLoginModal() {
    // Modal removed
}

// Handle regular login form
function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value; // This input might be used for email if label says "Username/Email"
    const password = document.getElementById('password').value;
    
    if (username && password) {
        // Real login logic directly to backend
        fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: username, password: password }) // Backend expects email
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
                window.location.href = 'dashboard.html';
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