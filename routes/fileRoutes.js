// routes/fileRoutes.js
const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware'); // Protect file uploads

// POST /api/files/upload
// This route will expect a multipart/form-data request with a field named 'file'
router.post('/upload', protect, fileController.uploadFile);

// GET /api/files/download/:filename
// This route is also protected, meaning only authenticated users can download.
// More granular access control (e.g. only owner or specific roles) would require file metadata.
router.get('/download/:filename', protect, fileController.downloadFile);

module.exports = router;
