document.addEventListener('DOMContentLoaded', () => {
    // --- Social Hub Logic ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    if (tabBtns.length > 0) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.style.display = 'none');

                // Add active
                btn.classList.add('active');
                const targetId = btn.getAttribute('data-tab') + 'Tab';
                document.getElementById(targetId).style.display = 'block';
            });
        });
    }

    // --- Chat Logic ---
    const msgInput = document.getElementById('msgInput');
    const sendBtn = document.getElementById('sendBtn');
    const messagesArea = document.getElementById('messagesArea');

    if (sendBtn && msgInput) {
        sendBtn.addEventListener('click', sendMessage);
        msgInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    function sendMessage() {
        const text = msgInput.value.trim();
        if (text) {
            // Append Sent Message
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message sent';
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            msgDiv.innerHTML = `
                <p>${text}</p>
                <span class="msg-time">${time}</span>
            `;
            messagesArea.appendChild(msgDiv);
            msgInput.value = '';
            scrollToBottom();

            // Mock Auto Reply
            setTimeout(() => {
                const replyDiv = document.createElement('div');
                replyDiv.className = 'message received';
                replyDiv.innerHTML = `
                    <p>Oke siap, ditunggu ya!</p>
                    <span class="msg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                `;
                messagesArea.appendChild(replyDiv);
                scrollToBottom();
            }, 1000);
        }
    }

    function scrollToBottom() {
        if (messagesArea) {
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    }
});
