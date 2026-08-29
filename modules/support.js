// modules/support.js
document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api';
    const token = localStorage.getItem('hyrostToken');

    let currentOpenTicketId = null;

    // Token check
    if (!token) {
        showToast('Anda harus masuk terlebih dahulu!', 'error');
        setTimeout(() => {
            window.location.href = '../';
        }, 1500);
        return;
    }

    // --- Tab Navigation ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabContents.forEach(c => c.style.display = 'none');
            const targetEl = document.getElementById(`${targetTab}Tab`);
            if (targetEl) targetEl.style.display = 'block';

            if (targetTab === 'my-tickets') {
                loadMyTickets();
            }
        });
    });

    // --- FAQ Accordion Logic ---
    const faqItems = document.querySelectorAll('.faq-accordion-item');
    faqItems.forEach(item => {
        const header = item.querySelector('.faq-header');
        const body = item.querySelector('.faq-body');
        const icon = header.querySelector('i');

        header.addEventListener('click', () => {
            const isOpen = body.style.display === 'block';
            body.style.display = isOpen ? 'none' : 'block';
            icon.className = isOpen ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
        });
    });

    // --- API Helper ---
    async function makeRequest(endpoint, method = 'GET', body = null) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        const config = { method, headers };
        if (body) config.body = JSON.stringify(body);

        try {
            const res = await fetch(`${API_URL}${endpoint}`, config);
            const data = await res.json();

            if (res.status === 401) {
                localStorage.removeItem('hyrostToken');
                localStorage.removeItem('currentUser');
                window.location.href = '../';
                return null;
            }

            if (!res.ok) {
                throw new Error(data.message || data.error || 'Terjadi kesalahan sistem');
            }

            return data;
        } catch (err) {
            showToast(err.message, 'error');
            console.error(`Support API Error [${endpoint}]:`, err);
            return null;
        }
    }

    // --- Toast Notification ---
    function showToast(message, type = 'success') {
        const toast = document.getElementById('global-toast');
        const icon = document.getElementById('toast-icon');
        const text = document.getElementById('toast-message');

        if (!toast || !icon || !text) return;

        text.textContent = message;
        toast.className = 'toast-notification show ' + type;

        if (type === 'success') {
            icon.className = 'fas fa-check-circle';
            icon.style.color = '#10b981';
        } else if (type === 'error') {
            icon.className = 'fas fa-exclamation-circle';
            icon.style.color = '#ef4444';
        } else {
            icon.className = 'fas fa-info-circle';
            icon.style.color = '#3b82f6';
        }

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    }

    // --- Load User Tickets ---
    async function loadMyTickets() {
        const container = document.getElementById('tickets-list-container');
        if (!container) return;

        container.innerHTML = '<div style="color: rgba(255,255,255,0.4); text-align: center; padding: 40px;">Memuat tiket Anda...</div>';

        const data = await makeRequest('/support/tickets');
        if (!data || !data.tickets) {
            container.innerHTML = '';
            return;
        }

        document.getElementById('ticket-count-badge').textContent = data.tickets.length;

        if (data.tickets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-ticket-alt"></i>
                    <p>Anda belum pernah mengajukan tiket bantuan. Klik tab "Buat Tiket Baru" jika butuh bantuan!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        data.tickets.forEach(ticket => {
            const statusClass = getStatusClass(ticket.status);
            const priorityClass = getPriorityClass(ticket.priority);

            const card = document.createElement('div');
            card.className = 'ticket-item-card';
            card.innerHTML = `
                <div class="ticket-meta">
                    <h4>
                        ${escapeHTML(ticket.subject)}
                        <span class="priority-badge ${priorityClass}">${ticket.priority}</span>
                    </h4>
                    <p>Kode: <strong style="color:var(--accent-indigo,#6366f1);">${ticket.ticket_code}</strong> &bull; Kategori: ${ticket.category} &bull; Tgl: ${new Date(ticket.created_at).toLocaleDateString('id-ID')}</p>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span class="ticket-badge ${statusClass}">${ticket.status}</span>
                    <span style="color: rgba(255,255,255,0.4); font-size: 0.8rem;"><i class="fas fa-comment-alt"></i> ${ticket.reply_count || 0}</span>
                    <i class="fas fa-chevron-right" style="color: rgba(255,255,255,0.2);"></i>
                </div>
            `;

            card.addEventListener('click', () => {
                openTicketDetail(ticket.id);
            });

            container.appendChild(card);
        });
    }

    // --- Create Ticket Form ---
    const createForm = document.getElementById('createSupportTicketForm');
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const subject = document.getElementById('ticketSubject').value.trim();
            const category = document.getElementById('ticketCategory').value;
            const priority = document.getElementById('ticketPriority').value;
            const message = document.getElementById('ticketMessage').value.trim();

            const submitBtn = document.getElementById('btnSubmitTicket');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Mengirim Tiket...</span>';

            const payload = { subject, category, priority, message };
            const res = await makeRequest('/support/tickets', 'POST', payload);

            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Kirim Tiket Bantuan</span>';

            if (res && res.success) {
                showToast(`Tiket ${res.ticketCode} berhasil dikirim!`);
                createForm.reset();
                
                // Switch to my-tickets tab
                document.querySelector('.tab-btn[data-tab="my-tickets"]').click();
            }
        });
    }

    // --- Open Ticket Detail Modal ---
    async function openTicketDetail(ticketId) {
        currentOpenTicketId = ticketId;
        const modal = document.getElementById('ticketDetailModal');
        const repliesThread = document.getElementById('modal-replies-thread');

        repliesThread.innerHTML = '<div style="color: rgba(255,255,255,0.4); text-align: center; padding: 20px;">Memuat riwayat balasan...</div>';
        modal.classList.add('show');

        const data = await makeRequest(`/support/tickets/${ticketId}`);
        if (!data || !data.ticket) {
            modal.classList.remove('show');
            return;
        }

        const ticket = data.ticket;
        document.getElementById('modal-ticket-subject').textContent = ticket.subject;
        document.getElementById('modal-ticket-code').textContent = `#${ticket.ticket_code}`;
        document.getElementById('modal-ticket-category').textContent = `Kategori: ${ticket.category}`;
        document.getElementById('modal-ticket-date').textContent = new Date(ticket.created_at).toLocaleString('id-ID');

        const statusEl = document.getElementById('modal-ticket-status');
        statusEl.textContent = ticket.status;
        statusEl.className = 'ticket-badge ' + getStatusClass(ticket.status);

        // Hide resolve button if already closed
        const resolveBtn = document.getElementById('btn-resolve-ticket');
        if (ticket.status === 'Closed') {
            resolveBtn.style.display = 'none';
        } else {
            resolveBtn.style.display = 'inline-flex';
        }

        // Render main message + replies
        repliesThread.innerHTML = '';

        // Original creator message
        const originalMsg = document.createElement('div');
        originalMsg.className = 'thread-message';
        const creatorAvatar = ticket.creator_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(ticket.creator_name)}&background=random`;
        
        originalMsg.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                <img src="${creatorAvatar}" style="width:32px; height:32px; border-radius:50%;">
                <div>
                    <strong style="color:#fff; font-size:0.9rem;">${escapeHTML(ticket.creator_name)}</strong>
                    <span style="font-size:0.75rem; color:rgba(255,255,255,0.4); margin-left:6px;">Pembuat Tiket</span>
                </div>
                <span style="font-size:0.75rem; color:rgba(255,255,255,0.3); margin-left:auto;">${new Date(ticket.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
            <div style="color:rgba(255,255,255,0.85); font-size:0.9rem; line-height:1.5; white-space:pre-wrap;">${escapeHTML(ticket.message)}</div>
        `;
        repliesThread.appendChild(originalMsg);

        // Replies thread
        if (data.replies && data.replies.length > 0) {
            data.replies.forEach(reply => {
                const isStaff = reply.role && reply.role.toLowerCase() === 'admin';
                const avatar = reply.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.username)}&background=random`;

                const replyDiv = document.createElement('div');
                replyDiv.className = `thread-message ${isStaff ? 'staff-reply' : ''}`;
                replyDiv.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                        <img src="${avatar}" style="width:32px; height:32px; border-radius:50%;">
                        <div>
                            <strong style="color:#fff; font-size:0.9rem;">${escapeHTML(reply.username)}</strong>
                            ${isStaff ? '<span class="role-badge admin" style="margin-left:6px;">STAFF HYROST</span>' : ''}
                        </div>
                        <span style="font-size:0.75rem; color:rgba(255,255,255,0.3); margin-left:auto;">${new Date(reply.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div style="color:rgba(255,255,255,0.85); font-size:0.9rem; line-height:1.5; white-space:pre-wrap;">${escapeHTML(reply.message)}</div>
                `;
                repliesThread.appendChild(replyDiv);
            });
        }
    }

    // Modal Close
    const btnCloseModal = document.getElementById('btn-close-modal');
    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
            document.getElementById('ticketDetailModal').classList.remove('show');
        });
    }

    // Reply to ticket form
    const modalReplyForm = document.getElementById('modalReplyForm');
    if (modalReplyForm) {
        modalReplyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentOpenTicketId) return;

            const text = document.getElementById('modalReplyText').value.trim();
            if (!text) return;

            const res = await makeRequest(`/support/tickets/${currentOpenTicketId}/reply`, 'POST', { message: text });
            if (res && res.success) {
                showToast('Balasan berhasil dikirim!');
                document.getElementById('modalReplyText').value = '';
                openTicketDetail(currentOpenTicketId);
                loadMyTickets();
            }
        });
    }

    // Resolve / Close ticket button
    const btnResolveTicket = document.getElementById('btn-resolve-ticket');
    if (btnResolveTicket) {
        btnResolveTicket.addEventListener('click', async () => {
            if (!currentOpenTicketId) return;
            if (confirm('Apakah Anda yakin ingin menutup tiket ini? Tiket yang sudah ditutup tidak dapat dibalas lagi.')) {
                const res = await makeRequest(`/support/tickets/${currentOpenTicketId}/close`, 'PATCH');
                if (res && res.success) {
                    showToast('Tiket telah berhasil ditutup.');
                    document.getElementById('ticketDetailModal').classList.remove('show');
                    loadMyTickets();
                }
            }
        });
    }

    // Helpers
    function getStatusClass(status) {
        switch (status) {
            case 'Open': return 'status-open';
            case 'In Progress': return 'status-inprogress';
            case 'Resolved': return 'status-resolved';
            case 'Closed': return 'status-closed';
            default: return 'status-open';
        }
    }

    function getPriorityClass(priority) {
        switch (priority) {
            case 'Urgent': return 'priority-urgent';
            case 'High': return 'priority-high';
            case 'Medium': return 'priority-medium';
            case 'Low': return 'priority-low';
            default: return 'priority-medium';
        }
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    // Init
    loadMyTickets();
});
