// Multi-Fallback API Fetcher with Timeout Protection
async function fetchAuthEndpoint(endpoint, payload) {
    const urlsToTry = [
        window.HYROST_API_URL,
        localStorage.getItem('hyrost_api_url'),
        window.location.origin,
        `${window.location.protocol}//${window.location.hostname}:3044`
    ].filter(Boolean);

    const uniqueUrls = [...new Set(urlsToTry)];

    for (const baseUrl of uniqueUrls) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const cleanBase = baseUrl.replace(/\/+$/, '');
            const targetUrl = `${cleanBase}/api/${endpoint.replace(/^\/+/, '')}`;
            
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const contentType = response.headers.get('content-type') || '';
            if (response.ok && contentType.includes('application/json')) {
                const data = await response.json();
                return { ok: true, status: response.status, data };
            }
        } catch (e) {
            // Fetch error or timeout, continue to next fallback
        }
    }

    return { 
        ok: false, 
        status: 404, 
        data: { message: "Backend API 404/Unreachable" } 
    };
}

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            if (!username || !password) {
                showMessage('Please enter both email/username and password', 'error');
                return;
            }
            
            const btn = loginForm.querySelector('button');
            const originalBtnContent = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span>LOGGING IN...</span>';

            const resObj = await fetchAuthEndpoint('auth/login', { email: username, password });
            const data = resObj.data || {};

            if (resObj.ok && data.token) {
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
                
                setTimeout(() => {
                    window.location.href = '../dashboard.html';
                }, 1200);
            } else {
                showMessage(data.message || 'Login gagal. Periksa username/email dan password.', 'error');
                btn.disabled = false;
                btn.innerHTML = originalBtnContent;
            }
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
