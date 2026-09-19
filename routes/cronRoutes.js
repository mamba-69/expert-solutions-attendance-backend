const express = require('express');
const router = express.Router();
const { autoMarkAbsent } = require('../controllers/attendanceController');

// Middleware to verify request is from Vercel Cron
const verifyCronRequest = (req, res, next) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization === `Bearer ${secret}`) return next();
  return res.status(401).json({ success:false, message:'Unauthorized cron request' });
};

// Auto-absent cron job endpoint
// This endpoint is called by Vercel Cron at 12:00 PM daily
router.post('/auto-absent', verifyCronRequest, autoMarkAbsent);
router.get('/auto-absent', verifyCronRequest, autoMarkAbsent);

// Test endpoint (allows manual testing)
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Cron route is accessible',
    time: new Date().toISOString(),
    headers: {
      'x-vercel-cron': req.headers['x-vercel-cron'] || 'not set',
      authorization: req.headers.authorization ? 'present' : 'not set',
    },
  });
});

// Health check for cron
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Cron routes are active',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
