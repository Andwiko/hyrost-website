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
    const registerForm = document.getElementById('register-form');
    
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (!username || !email || !password) {
                showMessage('Harap isi semua field!', 'error');
                return;
            }
            
            const btn = registerForm.querySelector('button');
            const originalBtnContent = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span>CREATING...</span>';

            const resObj = await fetchAuthEndpoint('auth/register', { username, email, password });
            const data = resObj.data || {};

            if (resObj.ok && data.token) {
                const roleMsg = data.user && data.user.role === 'admin' ? ' sebagai ADMIN' : '';
                showMessage(`Registrasi berhasil${roleMsg}! Mengalihkan...`, 'success');
                
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
                showMessage(data.message || 'Registrasi gagal. Pastikan data valid dan server tersedia.', 'error');
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
        } else {
            alert(text);
        }
    }
    
    // Handle Google Sign-In callback
    function handleCredentialResponse(response) {
        console.log('Google Sign-In response:', response);
        // Proses respons Google Sign-In di sini
    }
    
    window.handleCredentialResponse = handleCredentialResponse;
});