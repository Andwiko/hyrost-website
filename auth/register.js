// Multi-Fallback API Fetcher with Timeout Protection
async function fetchAuthEndpoint(endpoint, payload) {
    const urlsToTry = [
        window.HYROST_API_URL,
        localStorage.getItem('hyrost_api_url'),
        '/api',
        window.location.origin + '/api',
        `${window.location.protocol}//${window.location.hostname}:3044/api`
    ].filter(Boolean);

    const uniqueUrls = [...new Set(urlsToTry)];
    let lastErrorMsg = null;

    for (const baseUrl of uniqueUrls) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const cleanBase = baseUrl.replace(/\/+$/, '');
            const cleanEndpoint = endpoint.replace(/^\/+/, '');
            const targetUrl = cleanBase.endsWith('/api')
                ? `${cleanBase}/${cleanEndpoint}`
                : `${cleanBase}/api/${cleanEndpoint}`;
            
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const data = await response.json().catch(() => ({}));
                if (response.status !== 404 && response.status !== 502 && response.status !== 503) {
                    return { ok: response.ok, status: response.status, data };
                }
                lastErrorMsg = data.message || `Server error (${response.status})`;
            }
        } catch (e) {
            lastErrorMsg = e.name === 'AbortError' ? 'Koneksi ke server timeout' : 'Tidak dapat terhubung ke server';
        }
    }

    return { 
        ok: false, 
        status: 404, 
        data: { message: lastErrorMsg || "Gagal terhubung ke backend server. Pastikan backend Node.js aktif." } 
    };
}

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('register-form');
    
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            if (!username || !email || !password) {
                showMessage('Harap isi semua field formulir!', 'error');
                return;
            }
            
            const btn = registerForm.querySelector('button[type="submit"]');
            const originalBtnContent = btn ? btn.innerHTML : '';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span>MEMBUAT AKUN...</span> <i class="fas fa-spinner fa-spin"></i>';
            }

            const resObj = await fetchAuthEndpoint('auth/register', { username, email, password });
            const data = resObj.data || {};

            if (resObj.ok && data.token) {
                const roleMsg = data.user && data.user.role === 'admin' ? ' sebagai ADMIN' : '';
                showMessage(`Registrasi berhasil${roleMsg}! Mengalihkan ke Dashboard...`, 'success');
                
                const user = data.user || {};
                const userData = {
                    username: user.username || username,
                    email: user.email || email,
                    role: user.role || 'Member',
                    avatarUrl: user.avatarUrl || user.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username || username) + '&background=6366f1&color=fff',
                    loginType: 'regular',
                    loggedInAt: new Date().toISOString()
                };
                localStorage.setItem('currentUser', JSON.stringify(userData));
                localStorage.setItem('hyrostToken', data.token);
                if (data.refreshToken) {
                    localStorage.setItem('hyrostRefreshToken', data.refreshToken);
                }
                
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1000);
            } else {
                showMessage(data.message || 'Registrasi gagal. Pastikan data valid dan email belum pernah digunakan.', 'error');
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalBtnContent;
                }
            }
        });
    }

    function showMessage(text, type) {
        const messageDiv = document.getElementById('message');
        if (messageDiv) {
            messageDiv.style.display = 'block';
            messageDiv.textContent = text;
            if (type === 'success') {
                messageDiv.style.color = '#10b981';
                messageDiv.style.background = 'rgba(16, 185, 129, 0.12)';
                messageDiv.style.border = '1px solid rgba(16, 185, 129, 0.3)';
                messageDiv.style.padding = '10px 14px';
                messageDiv.style.borderRadius = '8px';
            } else {
                messageDiv.style.color = '#ef4444';
                messageDiv.style.background = 'rgba(239, 68, 68, 0.12)';
                messageDiv.style.border = '1px solid rgba(239, 68, 68, 0.3)';
                messageDiv.style.padding = '10px 14px';
                messageDiv.style.borderRadius = '8px';
            }
        }
    }
});