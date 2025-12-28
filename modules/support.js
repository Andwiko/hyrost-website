document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('createTicketForm');
    const ticketList = document.getElementById('ticketList');

    // Mock initial data
    let tickets = [
        {
            id: 'T-1002',
            subject: 'Gagal klaim hadiah harian',
            category: 'Bug',
            status: 'Open',
            date: '2025-12-27',
            priority: 'Medium'
        },
        {
            id: 'T-1001',
            subject: 'Lupa password akun kedua',
            category: 'Account',
            status: 'Closed',
            date: '2025-12-25',
            priority: 'High'
        }
    ];

    renderTickets();

    // Handle Form Submission
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const subject = document.getElementById('ticketSubject').value;
            const category = document.getElementById('ticketCategory').value;
            const priority = document.getElementById('ticketPriority').value;
            const message = document.getElementById('ticketMessage').value;

            const newTicket = {
                id: `T-${1000 + tickets.length + 1}`,
                subject: subject,
                category: category,
                status: 'Open',
                date: new Date().toISOString().split('T')[0],
                priority: priority,
                message: message // In real app, this would go to backend
            };

            // Add to top list
            tickets.unshift(newTicket);
            
            // Show success animation (optional) or alert
            alert('Tiket berhasil dikirim! Tim kami akan segera membalasnya.');
            
            // Reset form
            form.reset();
            
            // Re-render
            renderTickets();
        });
    }

    function renderTickets() {
        if (!ticketList) return;
        
        if (tickets.length === 0) {
            ticketList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-ticket-alt"></i>
                    <p>Belum ada tiket yang dibuat.</p>
                </div>
            `;
            return;
        }

        ticketList.innerHTML = '';
        tickets.forEach(ticket => {
            const item = document.createElement('div');
            item.className = `ticket-item status-${ticket.status.toLowerCase()}`;
            
            let statusColor = '#888';
            if(ticket.status === 'Open') statusColor = '#4ade80';
            if(ticket.status === 'Pending') statusColor = '#e98a22';

            item.innerHTML = `
                <div class="ticket-info">
                    <h4>${ticket.subject} <span style="font-size:0.7rem; color:#666;">#${ticket.id}</span></h4>
                    <div class="ticket-meta">
                        <span>${ticket.category}</span> &bull; 
                        <span>${ticket.date}</span> &bull; 
                        <span style="color:${getPriorityColor(ticket.priority)}">${ticket.priority}</span>
                    </div>
                </div>
                <div class="ticket-status-badge" style="background:${statusColor}20; color:${statusColor}; border:1px solid ${statusColor}40;">
                    ${ticket.status}
                </div>
            `;
            ticketList.appendChild(item);
        });
    }

    function getPriorityColor(p) {
        if(p === 'High') return '#ef4444';
        if(p === 'Medium') return '#e98a22';
        return '#888';
    }
});
