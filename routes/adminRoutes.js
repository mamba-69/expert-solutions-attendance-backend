const express = require('express');
const router = express.Router();
const {
  getPendingEmployees,
  approveEmployee,
  rejectEmployee,
  getAllEmployees,
  updateEmployeeCredentials,
  getAttendanceStats,
} = require('../controllers/adminController');
const { authenticate, isAdmin } = require('../middleware/auth');

// All routes require authentication and admin privileges
router.use(authenticate);
router.use(isAdmin);

// Employee management routes
router.get('/pending-employees', getPendingEmployees);
router.put('/approve-employee/:id', approveEmployee);
router.put('/reject-employee/:id', rejectEmployee);
router.get('/employees', getAllEmployees);
router.put('/employee/:id/credentials', updateEmployeeCredentials);

// Statistics routes
router.get('/attendance-stats', getAttendanceStats);

module.exports = router;
