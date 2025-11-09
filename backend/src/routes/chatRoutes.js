const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authenticateToken = require('../middleware/auth');

// POST /api/chat
router.post('/', chatController.handleChatMessage);

// Chat persistence routes
router.post('/save', authenticateToken, chatController.saveMessage);
router.get('/conversation/:conversation_id', authenticateToken, chatController.getConversation);

// Conversation management routes
router.post('/conversations', authenticateToken, chatController.createConversation);
router.get('/conversations/:user_id', authenticateToken, chatController.getConversations);

module.exports = router;