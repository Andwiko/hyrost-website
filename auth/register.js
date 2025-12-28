// API Configuration - Update this to match your backend port
const API_BASE_URL = window.location.origin; // Updated to match backend

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('register-form');
    
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Validasi sederhana
            if (!username || !email || !password) {
                showMessage('Harap isi semua field!', 'error');
                return;
            }
            
            // Info: First user automatically becomes admin
            const infoNote = username.toLowerCase().includes('admin') || email.toLowerCase().includes('admin') 
                ? ' (akan didaftarkan sebagai ADMIN)' 
                : '';
            
            // Disable button
            const btn = registerForm.querySelector('button');
            const originalBtnContent = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span>CREATING...</span>';

            // Proses registrasi ke backend
            fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.token) {
                    const roleMsg = data.user.role === 'admin' ? ' sebagai ADMIN' : '';
                    showMessage(`Registrasi berhasil${roleMsg}! Mengalihkan...`, 'success');
                    
                    // Auto login
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
                    
                    console.log('Register success - User role:', data.user.role);
                    
                    setTimeout(() => {
                        window.location.href = '../dashboard.html';
                    }, 1500);
                } else {
                    showMessage('Registrasi gagal: ' + (data.message || 'Unknown error') + (data.error ? ' ('+data.error+')' : ''), 'error');
                    btn.disabled = false;
                    btn.innerHTML = originalBtnContent;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('Terjadi kesalahan saat registrasi. Cek koneksi backend/internet Anda.', 'error');
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