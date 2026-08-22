const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// All support endpoints require token verification
router.use(verifyToken);

// User endpoints
router.post('/tickets', supportController.createTicket);
router.get('/tickets', supportController.getUserTickets);
router.get('/tickets/:id', supportController.getTicketDetails);
router.post('/tickets/:id/reply', supportController.replyTicket);
router.patch('/tickets/:id/close', supportController.closeTicket);

// Admin / Staff endpoints
router.get('/admin/tickets', verifyAdmin, supportController.getAllTicketsAdmin);
router.patch('/admin/tickets/:id/status', verifyAdmin, supportController.updateTicketStatusAdmin);

module.exports = router;
