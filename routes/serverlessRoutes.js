// routes/serverlessRoutes.js
const express = require('express');
const router = express.Router();
const serverlessController = require('../controllers/serverlessController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Test route (admin only)
router.post('/test-built-in-vm', protect, authorize(['admin']), serverlessController.testBuiltInVMExecution);

// Deploy serverless function route
router.post('/deploy', protect, serverlessController.deployFunction);

// Execute serverless function route
// Can be POST (if passing larger context/args in body) or GET (if args are simple and in query)
// Using POST for flexibility with `req.body.context` and `req.body.args`.
// This route should be protected. Who can execute functions?
// For now, any authenticated user. Granular permissions could be added later.
router.post('/execute/:functionName', protect, serverlessController.executeFunction);
// Example GET if params are in query: router.get('/execute/:functionName', protect, serverlessController.executeFunction);


module.exports = router;
