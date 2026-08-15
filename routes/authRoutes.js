const express = require('express');
const router = express.Router();
const { registerEmployee, loginEmployee, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/register', registerEmployee);
router.post('/login', loginEmployee);

// Protected routes
router.get('/me', authenticate, getMe);

module.exports = router;
