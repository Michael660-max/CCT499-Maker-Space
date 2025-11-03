const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// POST /api/chat
router.post('/', chatController.handleChatMessage);

module.exports = router;