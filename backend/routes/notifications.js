const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification'); // Ensure file is named Notification.js
const auth = require('../middleware/auth');

router.get('/me', auth, async (req, res) => {
    try {
        if (req.user.role !== 'pharmacy') return res.status(403).json({detail: 'Access denied'});
        
        const alerts = await Notification.find({ 
            pharmacy_id: req.user.id,
            status: 'unread'
        }).sort({ count: -1, created_at: -1 });

        res.json(alerts);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

router.patch('/:id/read', auth, async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { status: 'read' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

module.exports = router;