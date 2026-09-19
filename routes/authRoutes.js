const express = require('express');
const router = express.Router();
const { registerEmployee, loginEmployee, getMe, updateMyProfilePicture } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/register', registerEmployee);
router.post('/login', loginEmployee);

// Protected routes (employee only)
router.get('/me', authenticate, getMe);
router.put('/profile-picture', authenticate, updateMyProfilePicture);

module.exports = router;
