const express = require('express');
const router = express.Router();
const {
  getPendingEmployees,
  approveEmployee,
  rejectEmployee,
  getAllEmployees,
  updateEmployeeCredentials,
  getAttendanceStats,
  updateEmployee,
  deleteEmployee,
  updateProfilePicture,
  markEmployeeAbsent,
} = require('../controllers/adminController');
const {
  generateEmployeeReport,
  generateAllEmployeesReport,
} = require('../controllers/reportController');
const { authenticate, isAdmin } = require('../middleware/auth');

// Public report routes (PDF generation - read-only, no sensitive data modification)
router.get('/reports/employee/:id/pdf', generateEmployeeReport);
router.get('/reports/all-employees/pdf', generateAllEmployeesReport);

// All other routes require authentication and admin privileges
router.use(authenticate);
router.use(isAdmin);

// Employee management routes
router.get('/pending-employees', getPendingEmployees);
router.put('/approve-employee/:id', approveEmployee);
router.put('/reject-employee/:id', rejectEmployee);
router.get('/employees', getAllEmployees);
router.put('/employee/:id/credentials', updateEmployeeCredentials);
router.put('/employee/:id', updateEmployee);
router.delete('/employee/:id', deleteEmployee);
router.put('/employee/:id/profile-picture', updateProfilePicture);
router.post('/mark-absent/:employeeId', markEmployeeAbsent);

// Statistics routes
router.get('/attendance-stats', getAttendanceStats);

// Attendance management routes
router.put('/attendance/:id/time', require('../controllers/attendanceController').updateAttendanceTime);

module.exports = router;
