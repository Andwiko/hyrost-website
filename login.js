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

            fetch('http://localhost:3000/api/auth/login', {
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
                        loginType: 'regular',
                        loggedInAt: new Date().toISOString()
                    };
                    
                    localStorage.setItem('currentUser', JSON.stringify(userData));
                    localStorage.setItem('hyrostToken', data.token);
                    
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                } else {
                    showMessage(data.message || 'Login failed', 'error');
                    btn.disabled = false;
                    btn.innerHTML = originalBtnContent;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('Connection error. Please try again.', 'error');
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
