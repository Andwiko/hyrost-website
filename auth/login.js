// API Configuration - Update this to match your backend port
const API_BASE_URL = window.location.origin;

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            if (!username || !password) {
                showMessage('Please enter both email/username and password', 'error');
                return;
            }
            
            // Disable button
            const btn = loginForm.querySelector('button');
            const originalBtnContent = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span>LOGGING IN...</span>';

            fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: username, password: password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.token) {
                    showMessage('Login successful! Redirecting...', 'success');
                    
                    const userData = {
                        username: data.user.username,
                        email: data.user.email,
                        role: data.user.role,
                        avatarUrl: data.user.avatarUrl,
                        loginType: 'regular',
                        loggedInAt: new Date().toISOString()
                    };
                    
                    localStorage.setItem('currentUser', JSON.stringify(userData));
                    localStorage.setItem('hyrostToken', data.token);
                    
                    console.log('Login success - User role:', data.user.role);
                    
                    setTimeout(() => {
                        window.location.href = '../dashboard.html';
                    }, 1000);
                } else {
                    showMessage(data.message || 'Login failed', 'error');
                    btn.disabled = false;
                    btn.innerHTML = originalBtnContent;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('Connection error. Please check if backend is running.', 'error');
                btn.disabled = false;
                btn.innerHTML = originalBtnContent;
            });
        });
    }

    function showMessage(text, type) {
        const messageDiv = document.getElementById('message');
        if (messageDiv) {
            messageDiv.style.display = 'block';
            messageDiv.textContent = text;
            if (type === 'success') {
                messageDiv.style.color = '#4cd137';
            } else {
                messageDiv.style.color = '#ff6b6b';
            }
        }
    }
});

// Google Login Callback (Global function)
window.handleCredentialResponse = function(response) {
    console.log("Encoded JWT ID token: " + response.credential);

    // Disable UI
    const btn = document.querySelector('.register-btn');
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>SIGNING IN WITH GOOGLE...</span>';
    }

    fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: response.credential })
    })
    .then(res => res.json())
    .then(data => {
        if (data.token) {
            // Save token
            localStorage.setItem('hyrostToken', data.token);
            
            const userData = {
                ...data.user,
                loginType: 'google',
                loggedInAt: new Date().toISOString()
            };
            localStorage.setItem('currentUser', JSON.stringify(userData));
            
            // Redirect
            window.location.href = '../dashboard.html';
        } else {
            alert('Google Login Failed: ' + (data.message || 'Unknown error'));
            if(btn) {
                btn.disabled = false;
                btn.innerHTML = '<span>LOGIN</span><i class="fas fa-sign-in-alt"></i>';
            }
        }
    })
    .catch(err => {
        console.error('Google Login Error:', err);
        alert('Server connection failed');
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>LOGIN</span><i class="fas fa-sign-in-alt"></i>';
        }
    });
};
