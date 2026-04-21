const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Generate a unique room ID
router.post('/create-room', authenticateToken, (req, res) => {
    const roomId = Math.random().toString(36).substring(2, 10);
    res.json({ success: true, roomId });
});

// Validate room
router.post('/validate-room', authenticateToken, (req, res) => {
    const { roomId } = req.body;
    if (!roomId) {
        return res.status(400).json({ success: false, message: 'Room ID required' });
    }
    res.json({ success: true, roomId });
});

module.exports = router;