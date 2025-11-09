const { supabase } = require('../config/supabase');

// Verify token endpoint
const verifyToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      },
      valid: true 
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Token verification failed' });
  }
};

// Get user profile endpoint
const getUserProfile = async (req, res) => {
  try {
    const user = req.user; // From auth middleware
    
    res.json({
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
      created_at: user.created_at
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
};

module.exports = {
  verifyToken,
  getUserProfile
};