document.getElementById('forgot-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const messageDiv = document.getElementById('message');
    const btn = this.querySelector('button');
    
    // Disable button
    btn.disabled = true;
    btn.innerHTML = '<span>SENDING...</span>';
    
    try {
        const response = await fetch('http://localhost:3000/api/auth/forgotpassword', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        messageDiv.style.display = 'block';
        if (response.ok) {
            messageDiv.style.color = '#4cd137';
            messageDiv.textContent = 'Reset link sent! Check the server console.';
        } else {
            messageDiv.style.color = '#e84118';
            messageDiv.textContent = data.message || 'Error occurred';
        }
    } catch (err) {
        messageDiv.style.display = 'block';
        messageDiv.style.color = '#e84118';
        messageDiv.textContent = 'Connection error';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>SEND RESET LINK</span> <i class="fas fa-paper-plane"></i>';
    }
});
