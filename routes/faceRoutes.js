const express = require('express');
const router = express.Router();
const { validateFace, verifyFace, extractDescriptor } = require('../controllers/faceController');
const { authenticate } = require('../middleware/auth');

// Public routes (for registration)
router.post('/validate', validateFace);
router.post('/extract', extractDescriptor);

// Protected routes (for attendance)
router.post('/verify', authenticate, verifyFace);

module.exports = router;
