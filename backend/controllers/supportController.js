// backend/controllers/supportController.js
const pool = require('../config/mysql');

// Helper to sanitize error response and log actual error
function handleControllerError(res, error, logMessage) {
    console.error(`[ERROR] ${logMessage}:`, error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan internal pada server pusat bantuan' });
}

// ─── CREATE TICKET ───────────────────────────────────────────────────────────
exports.createTicket = async (req, res) => {
    try {
        const userId = req.user.id;
        const { subject, category, priority, message } = req.body;

        if (!subject || subject.trim().length < 3) {
            return res.status(400).json({ message: 'Subjek tiket minimal 3 karakter' });
        }

        if (!category || !category.trim()) {
            return res.status(400).json({ message: 'Kategori kendala harus dipilih' });
        }

        if (!message || message.trim().length < 10) {
            return res.status(400).json({ message: 'Pesan / detail kendala minimal 10 karakter' });
        }

        const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
        const selectedPriority = validPriorities.includes(priority) ? priority : 'Medium';

        // Rate Limiter / Anti-Spam Check: Max 5 open/in-progress tickets per user
        const [openTickets] = await pool.execute(
            `SELECT COUNT(*) as count FROM tickets 
             WHERE user_id = ? AND status IN ('Open', 'In Progress')`,
            [userId]
        );

        if (openTickets[0] && openTickets[0].count >= 5) {
            return res.status(429).json({ 
                message: 'Batas tiket aktif tercapai. Anda memiliki 5 tiket terbuka. Harap tunggu atau selesaikan tiket lama.' 
            });
        }

        // Generate Ticket Code: e.g. T-849201
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const ticketCode = `T-${randomNum}`;

        const [result] = await pool.execute(
            `INSERT INTO tickets (ticket_code, user_id, subject, category, priority, status, message) 
             VALUES (?, ?, ?, ?, ?, 'Open', ?)`,
            [ticketCode, userId, subject.trim(), category.trim(), selectedPriority, message.trim()]
        );

        res.status(201).json({
            success: true,
            message: 'Tiket bantuan berhasil dibuat',
            ticketId: result.insertId,
            ticketCode
        });
    } catch (error) {
        return handleControllerError(res, error, 'CREATE TICKET');
    }
};

// ─── GET USER TICKETS ────────────────────────────────────────────────────────
exports.getUserTickets = async (req, res) => {
    try {
        const userId = req.user.id;

        const [tickets] = await pool.execute(
            `SELECT t.*, 
                    (SELECT COUNT(*) FROM ticket_replies r WHERE r.ticket_id = t.id) as reply_count
             FROM tickets t
             WHERE t.user_id = ?
             ORDER BY t.created_at DESC`,
            [userId]
        );

        res.json({ success: true, tickets });
    } catch (error) {
        return handleControllerError(res, error, 'GET USER TICKETS');
    }
};

// ─── GET TICKET DETAILS WITH REPLIES ─────────────────────────────────────────
exports.getTicketDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const ticketId = parseInt(req.params.id);

        if (isNaN(ticketId)) {
            return res.status(400).json({ message: 'ID tiket tidak valid' });
        }

        const [tickets] = await pool.execute(
            `SELECT t.*, u.username as creator_name, u.avatar_url as creator_avatar, u.role as creator_role
             FROM tickets t
             JOIN users u ON t.user_id = u.id
             WHERE t.id = ?`,
            [ticketId]
        );

        if (tickets.length === 0) {
            return res.status(404).json({ message: 'Tiket bantuan tidak ditemukan' });
        }

        const ticket = tickets[0];

        // Strict Access Control: User must own the ticket or be Admin
        const isOwner = ticket.user_id === userId;
        const isAdmin = req.user.role && req.user.role.toLowerCase() === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Anda tidak memiliki hak akses untuk membaca tiket ini' });
        }

        // Fetch Replies
        const [replies] = await pool.execute(
            `SELECT r.*, u.username, u.avatar_url, u.role
             FROM ticket_replies r
             JOIN users u ON r.user_id = u.id
             WHERE r.ticket_id = ?
             ORDER BY r.created_at ASC`,
            [ticketId]
        );

        res.json({ success: true, ticket, replies });
    } catch (error) {
        return handleControllerError(res, error, 'GET TICKET DETAILS');
    }
};

// ─── REPLY TO TICKET ─────────────────────────────────────────────────────────
exports.replyTicket = async (req, res) => {
    try {
        const userId = req.user.id;
        const ticketId = parseInt(req.params.id);
        const { message } = req.body;

        if (isNaN(ticketId)) {
            return res.status(400).json({ message: 'ID tiket tidak valid' });
        }

        if (!message || !message.trim()) {
            return res.status(400).json({ message: 'Isi balasan tidak boleh kosong' });
        }

        const [tickets] = await pool.execute('SELECT * FROM tickets WHERE id = ?', [ticketId]);
        if (tickets.length === 0) {
            return res.status(404).json({ message: 'Tiket bantuan tidak ditemukan' });
        }

        const ticket = tickets[0];
        const isOwner = ticket.user_id === userId;
        const isAdmin = req.user.role && req.user.role.toLowerCase() === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Anda tidak memiliki hak akses untuk membalas tiket ini' });
        }

        if (ticket.status === 'Closed') {
            return res.status(400).json({ message: 'Tiket ini telah ditutup dan tidak dapat dibalas lagi.' });
        }

        // Insert reply
        await pool.execute(
            'INSERT INTO ticket_replies (ticket_id, user_id, message) VALUES (?, ?, ?)',
            [ticketId, userId, message.trim()]
        );

        // Update ticket status
        if (isAdmin && ticket.status === 'Open') {
            await pool.execute("UPDATE tickets SET status = 'In Progress' WHERE id = ?", [ticketId]);
        } else {
            await pool.execute('UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [ticketId]);
        }

        res.json({ success: true, message: 'Balasan berhasil dikirim' });
    } catch (error) {
        return handleControllerError(res, error, 'REPLY TICKET');
    }
};

// ─── CLOSE TICKET ────────────────────────────────────────────────────────────
exports.closeTicket = async (req, res) => {
    try {
        const userId = req.user.id;
        const ticketId = parseInt(req.params.id);

        if (isNaN(ticketId)) {
            return res.status(400).json({ message: 'ID tiket tidak valid' });
        }

        const [tickets] = await pool.execute('SELECT * FROM tickets WHERE id = ?', [ticketId]);
        if (tickets.length === 0) {
            return res.status(404).json({ message: 'Tiket bantuan tidak ditemukan' });
        }

        const ticket = tickets[0];
        const isOwner = ticket.user_id === userId;
        const isAdmin = req.user.role && req.user.role.toLowerCase() === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Anda tidak memiliki hak akses untuk menutup tiket ini' });
        }

        await pool.execute("UPDATE tickets SET status = 'Closed' WHERE id = ?", [ticketId]);

        res.json({ success: true, message: 'Tiket berhasil ditutup' });
    } catch (error) {
        return handleControllerError(res, error, 'CLOSE TICKET');
    }
};

// ─── ADMIN: GET ALL TICKETS ──────────────────────────────────────────────────
exports.getAllTicketsAdmin = async (req, res) => {
    try {
        const [tickets] = await pool.execute(
            `SELECT t.*, u.username as creator_name, u.avatar_url as creator_avatar, u.role as creator_role,
                    (SELECT COUNT(*) FROM ticket_replies r WHERE r.ticket_id = t.id) as reply_count
             FROM tickets t
             JOIN users u ON t.user_id = u.id
             ORDER BY t.created_at DESC`
        );

        res.json({ success: true, tickets });
    } catch (error) {
        return handleControllerError(res, error, 'ADMIN GET ALL TICKETS');
    }
};

// ─── ADMIN: UPDATE TICKET STATUS ──────────────────────────────────────────────
exports.updateTicketStatusAdmin = async (req, res) => {
    try {
        const ticketId = parseInt(req.params.id);
        const { status } = req.body;

        if (isNaN(ticketId)) {
            return res.status(400).json({ message: 'ID tiket tidak valid' });
        }

        const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Status tiket tidak valid' });
        }

        const [result] = await pool.execute('UPDATE tickets SET status = ? WHERE id = ?', [status, ticketId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Tiket tidak ditemukan' });
        }

        res.json({ success: true, message: `Status tiket berhasil diubah menjadi ${status}` });
    } catch (error) {
        return handleControllerError(res, error, 'ADMIN UPDATE TICKET STATUS');
    }
};
