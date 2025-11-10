const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');

// GET /api/auth/callback - Handle OAuth callback
router.get('/callback', authController.handleOAuthCallback);

// POST /api/auth/verify - Verify JWT token
router.post('/verify', authController.verifyToken);

// GET /api/auth/profile - Get user profile (requires auth)
router.get('/profile', authenticateToken, authController.getUserProfile);

module.exports = router;