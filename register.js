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
            
            // Disable button
            const btn = registerForm.querySelector('button');
            const originalBtnContent = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span>CREATING...</span>';

            // Proses registrasi ke backend
            fetch('http://localhost:3000/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.token) {
                    showMessage('Registrasi berhasil! Mengalihkan...', 'success');
                    
                    // Auto login
                    const userData = {
                        username: data.user.username,
                        email: data.user.email,
                        role: data.user.role,
                        loginType: 'regular',
                        loggedInAt: new Date().toISOString()
                    };
                    localStorage.setItem('currentUser', JSON.stringify(userData));
                    localStorage.setItem('hyrostToken', data.token);
                    
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                } else {
                    showMessage('Registrasi gagal: ' + (data.message || 'Unknown error'), 'error');
                    btn.disabled = false;
                    btn.innerHTML = originalBtnContent;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('Terjadi kesalahan saat registrasi.', 'error');
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