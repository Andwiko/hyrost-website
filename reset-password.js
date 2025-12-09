document.getElementById('reset-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
        alert('Invalid token!');
        return;
    }

    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('message');
    const btn = this.querySelector('button');
    
    // Disable button
    btn.disabled = true;
    btn.innerHTML = '<span>UPDATING...</span>';
    
    try {
        const response = await fetch(`http://localhost:3000/api/auth/resetpassword/${token}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });
        
        const data = await response.json();
        
        messageDiv.style.display = 'block';
        if (response.ok) {
            messageDiv.style.color = '#4cd137';
            messageDiv.textContent = 'Password updated! Redirecting to login...';
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            messageDiv.style.color = '#e84118';
            messageDiv.textContent = data.message || 'Error occurred';
        }
    } catch (err) {
        messageDiv.style.display = 'block';
        messageDiv.style.color = '#e84118';
        messageDiv.textContent = 'Connection error';
    } finally {
        if (messageDiv.textContent !== 'Password updated! Redirecting to login...') {
            btn.disabled = false;
            btn.innerHTML = '<span>UPDATE PASSWORD</span> <i class="fas fa-check"></i>';
        }
    }
});
