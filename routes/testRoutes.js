const express = require('express');
const router = express.Router();
// Import both protect and authorize from authMiddleware
const { protect, authorize } = require('../middleware/authMiddleware');

// Route accessible by any authenticated user
router.get('/protected', protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'You have accessed a protected route!',
    user: req.user
  });
});

// Route accessible only by authenticated users with the 'admin' role
router.get('/admin', protect, authorize(['admin']), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the Admin Zone!',
    user: req.user
  });
});

// Route accessible by authenticated users with 'admin' OR 'editor' role
router.get('/content-creators', protect, authorize(['admin', 'editor']), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Content Creators Dashboard',
    user: req.user
  });
});

// Temporary routes for testing Socket.IO broadcasting
const { broadcastToRoom, broadcastToAll } = require('../socketManager');

router.post('/broadcast-test/room', protect, authorize(['admin']), (req, res) => {
  const { roomName, eventName, message } = req.body;
  if (!roomName || !eventName || !message) {
    return res.status(400).send('Missing roomName, eventName, or message in body.');
  }
  broadcastToRoom(roomName, eventName, { text: message, sender: 'serverAdminTest' });
  res.send(`Broadcast attempt to room '${roomName}' with event '${eventName}'. Check connected clients.`);
});

router.post('/broadcast-test/all', protect, authorize(['admin']), (req, res) => {
  const { eventName, message } = req.body;
   if (!eventName || !message) {
    return res.status(400).send('Missing eventName or message in body.');
  }
  broadcastToAll(eventName, { text: message, sender: 'serverAdminTestAll' });
  res.send(`Broadcast attempt to all clients with event '${eventName}'. Check connected clients.`);
});

module.exports = router;
