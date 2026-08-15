const express = require('express');
const router = express.Router();
const {
  checkIn,
  checkOut,
  getMyAttendance,
  getTodayAttendance,
  getAllAttendance,
  getAttendanceCalendar,
  getMonthlyReport,
  requestLeave,
  getMyLeaveRequests,
  getAllLeaveRequests,
  reviewLeaveRequest,
  getEmployeesSummary,
} = require('../controllers/attendanceController');
const { authenticate, isAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Employee routes
router.post('/check-in', checkIn);
router.put('/check-out', checkOut);
router.get('/my-attendance', getMyAttendance);
router.get('/today', getTodayAttendance);
router.get('/calendar', getAttendanceCalendar);
router.get('/monthly-report', getMonthlyReport);
router.post('/request-leave', requestLeave);
router.get('/my-leaves', getMyLeaveRequests);

// Admin routes
router.get('/all', isAdmin, getAllAttendance);
router.get('/employees-summary', isAdmin, getEmployeesSummary);
router.get('/leave-requests', isAdmin, getAllLeaveRequests);
router.put('/leave-request/:id', isAdmin, reviewLeaveRequest);

module.exports = router;
