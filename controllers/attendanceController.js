const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest');

// @desc    Mark check-in (Mark Present)
// @route   POST /api/attendance/check-in
// @access  Private
const checkIn = async (req, res) => {
  try {
    const { latitude, longitude, address, face_match_score, office_name } = req.body;

    // Validate required fields
    if (!latitude || !longitude || face_match_score === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide location and face match score.',
      });
    }

    // Check if face match score is acceptable (lowered threshold to 0.4)
    if (face_match_score < 0.4) {  // Lowered from 0.6 to 0.4
      return res.status(400).json({
        success: false,
        message: 'Face verification failed. Please try again.',
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      employee_id: req.employee._id,
      date: today,
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in today.',
        data: existingAttendance,
      });
    }

    // Create attendance record with office name
    const attendance = new Attendance({
      employee_id: req.employee._id,
      date: today,
      check_in: {
        time: new Date(),
        location: {
          latitude,
          longitude,
          address,
        },
        office_name: office_name || 'Unknown Office', // Store which office
        face_match_score,
        verified: face_match_score >= 0.4,  // Lowered from 0.6 to 0.4
      },
      status: 'present',
    });

    await attendance.save();

    // Populate employee details
    await attendance.populate('employee_id', 'employee_name employee_id');

    res.status(201).json({
      success: true,
      message: `Checked in successfully at ${office_name || 'office'}.`,
      data: attendance,
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Check-in failed.',
      error: error.message,
    });
  }
};

// @desc    Mark check-out
// @route   PUT /api/attendance/check-out
// @access  Private
const checkOut = async (req, res) => {
  try {
    const { latitude, longitude, address, face_match_score, office_name } = req.body;

    // Validate required fields
    if (!latitude || !longitude || face_match_score === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide location and face match score.',
      });
    }

    // Check if face match score is acceptable (lowered threshold to 0.4)
    if (face_match_score < 0.4) {  // Lowered from 0.6 to 0.4
      return res.status(400).json({
        success: false,
        message: 'Face verification failed. Please try again.',
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's attendance record
    const attendance = await Attendance.findOne({
      employee_id: req.employee._id,
      date: today,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No check-in found for today. Please check in first.',
      });
    }

    if (attendance.check_out.time) {
      return res.status(400).json({
        success: false,
        message: 'Already checked out today.',
      });
    }

    // Update check-out details with office name
    attendance.check_out = {
      time: new Date(),
      location: {
        latitude,
        longitude,
        address,
      },
      office_name: office_name || 'Unknown Office', // Store which office
      face_match_score,
      verified: face_match_score >= 0.6,
    };

    // Calculate total hours
    attendance.calculateTotalHours();

    await attendance.save();

    // Populate employee details
    await attendance.populate('employee_id', 'employee_name employee_id');

    res.json({
      success: true,
      message: `Checked out successfully from ${office_name || 'office'}.`,
      data: attendance,
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Check-out failed.',
      error: error.message,
    });
  }
};

// @desc    Get my attendance history
// @route   GET /api/attendance/my-attendance
// @access  Private
const getMyAttendance = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    const query = { employee_id: req.employee._id };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const skip = (page - 1) * limit;

    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('employee_id', 'employee_name employee_id');

    const total = await Attendance.countDocuments(query);

    res.json({
      success: true,
      count: attendance.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: attendance,
    });
  } catch (error) {
    console.error('Get my attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance.',
      error: error.message,
    });
  }
};

// @desc    Get today's attendance status
// @route   GET /api/attendance/today
// @access  Private
const getTodayAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee_id: req.employee._id,
      date: today,
    }).populate('employee_id', 'employee_name employee_id');

    res.json({
      success: true,
      data: attendance || null,
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s attendance.',
      error: error.message,
    });
  }
};

// @desc    Get all attendance (Admin)
// @route   GET /api/attendance/all
// @access  Private/Admin
const getAllAttendance = async (req, res) => {
  try {
    const { 
      employeeId, 
      startDate, 
      endDate, 
      status,
      page = 1, 
      limit = 20 
    } = req.query;

    const query = {};

    if (employeeId) {
      query.employee_id = employeeId;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('employee_id', 'employee_name employee_id mobile_no');

    const total = await Attendance.countDocuments(query);

    res.json({
      success: true,
      count: attendance.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: attendance,
    });
  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance.',
      error: error.message,
    });
  }
};

// @desc    Get attendance calendar for employee
// @route   GET /api/attendance/calendar
// @access  Private
const getAttendanceCalendar = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    // Get first and last day of month
    const firstDay = new Date(targetYear, targetMonth, 1);
    const lastDay = new Date(targetYear, targetMonth + 1, 0);
    lastDay.setHours(23, 59, 59, 999);

    const attendance = await Attendance.find({
      employee_id: req.employee._id,
      date: {
        $gte: firstDay,
        $lte: lastDay,
      },
    }).sort({ date: 1 });

    // Also get approved leave requests for this month
    const leaveRequests = await LeaveRequest.find({
      employee_id: req.employee._id,
      leave_date: {
        $gte: firstDay,
        $lte: lastDay,
      },
      status: 'approved',
    });

    res.json({
      success: true,
      month: targetMonth + 1,
      year: targetYear,
      data: {
        attendance,
        leaves: leaveRequests,
      },
    });
  } catch (error) {
    console.error('Get attendance calendar error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance calendar.',
      error: error.message,
    });
  }
};

// @desc    Get monthly report for employee
// @route   GET /api/attendance/monthly-report
// @access  Private
const getMonthlyReport = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    
    const empId = employeeId || req.employee._id;
    
    // Check if admin is requesting another employee's report
    if (employeeId && req.employee.role === 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view other employees\' reports.',
      });
    }

    let start, end;
    
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default to current month
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    end.setHours(23, 59, 59, 999);

    const attendance = await Attendance.find({
      employee_id: empId,
      date: {
        $gte: start,
        $lte: end,
      },
    }).sort({ date: 1 }).populate('employee_id', 'employee_name employee_id mobile_no email');

    // Calculate statistics
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const absentDays = attendance.filter(a => a.status === 'absent').length;
    const leaveDays = attendance.filter(a => a.status === 'on-leave').length;
    const halfDays = attendance.filter(a => a.status === 'half-day').length;
    const lateDays = attendance.filter(a => a.status === 'late').length;
    
    const totalHours = attendance.reduce((sum, a) => sum + (a.total_hours || 0), 0);
    const avgHours = attendance.length > 0 ? (totalHours / attendance.length).toFixed(2) : 0;

    const absentDates = attendance
      .filter(a => a.status === 'absent')
      .map(a => a.date.toISOString().split('T')[0]);

    res.json({
      success: true,
      data: {
        employee: attendance[0]?.employee_id || null,
        period: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        },
        summary: {
          total_days: attendance.length,
          present_days: presentDays,
          absent_days: absentDays,
          leave_days: leaveDays,
          half_days: halfDays,
          late_days: lateDays,
          total_hours: totalHours.toFixed(2),
          average_hours: avgHours,
          absent_dates: absentDates,
        },
        attendance,
      },
    });
  } catch (error) {
    console.error('Get monthly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly report.',
      error: error.message,
    });
  }
};

// @desc    Request leave/absent
// @route   POST /api/attendance/request-leave
// @access  Private
const requestLeave = async (req, res) => {
  try {
    const { leave_date, leave_type, reason } = req.body;

    if (!leave_date || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide leave date and reason.',
      });
    }

    const leaveDate = new Date(leave_date);
    leaveDate.setHours(0, 0, 0, 0);

    // Check if already requested
    const existing = await LeaveRequest.findOne({
      employee_id: req.employee._id,
      leave_date: leaveDate,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Leave request already exists for this date.',
        data: existing,
      });
    }

    // Create leave request
    const leaveRequest = new LeaveRequest({
      employee_id: req.employee._id,
      leave_date: leaveDate,
      leave_type: leave_type || 'casual',
      reason,
      status: 'pending',
    });

    await leaveRequest.save();
    await leaveRequest.populate('employee_id', 'employee_name employee_id mobile_no');

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully.',
      data: leaveRequest,
    });
  } catch (error) {
    console.error('Request leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit leave request.',
      error: error.message,
    });
  }
};

// @desc    Get my leave requests
// @route   GET /api/attendance/my-leaves
// @access  Private
const getMyLeaveRequests = async (req, res) => {
  try {
    const { status } = req.query;
    
    const query = { employee_id: req.employee._id };
    if (status) {
      query.status = status;
    }

    const leaveRequests = await LeaveRequest.find(query)
      .sort({ leave_date: -1 })
      .populate('employee_id', 'employee_name employee_id')
      .populate('reviewed_by', 'employee_name');

    res.json({
      success: true,
      count: leaveRequests.length,
      data: leaveRequests,
    });
  } catch (error) {
    console.error('Get my leave requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave requests.',
      error: error.message,
    });
  }
};

// @desc    Get all leave requests (Admin)
// @route   GET /api/attendance/leave-requests
// @access  Private/Admin
const getAllLeaveRequests = async (req, res) => {
  try {
    const { status, employeeId } = req.query;
    
    const query = {};
    if (status) {
      query.status = status;
    }
    if (employeeId) {
      query.employee_id = employeeId;
    }

    const leaveRequests = await LeaveRequest.find(query)
      .sort({ requested_at: -1 })
      .populate('employee_id', 'employee_name employee_id mobile_no')
      .populate('reviewed_by', 'employee_name');

    res.json({
      success: true,
      count: leaveRequests.length,
      data: leaveRequests,
    });
  } catch (error) {
    console.error('Get all leave requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave requests.',
      error: error.message,
    });
  }
};

// @desc    Approve/Reject leave request (Admin)
// @route   PUT /api/attendance/leave-request/:id
// @access  Private/Admin
const reviewLeaveRequest = async (req, res) => {
  try {
    const { status, rejection_reason } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid status (approved/rejected).',
      });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found.',
      });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Leave request already reviewed.',
      });
    }

    leaveRequest.status = status;
    leaveRequest.reviewed_by = req.employee._id;
    leaveRequest.reviewed_at = new Date();
    
    if (status === 'rejected' && rejection_reason) {
      leaveRequest.rejection_reason = rejection_reason;
    }

    await leaveRequest.save();

    // If approved, create attendance record with status 'on-leave'
    if (status === 'approved') {
      const leaveDate = new Date(leaveRequest.leave_date);
      leaveDate.setHours(0, 0, 0, 0);

      const existingAttendance = await Attendance.findOne({
        employee_id: leaveRequest.employee_id,
        date: leaveDate,
      });

      if (!existingAttendance) {
        // Create attendance record for leave (no check-in/check-out required)
        await Attendance.create({
          employee_id: leaveRequest.employee_id,
          date: leaveDate,
          status: 'on-leave',
          check_in: {
            // Leave records don't have actual check-in data
            time: null,
            location: {
              latitude: null,
              longitude: null,
              address: null,
            },
            office_name: null,
            verified: false,
          },
          leave_request: {
            requested: true,
            reason: leaveRequest.reason,
            requested_at: leaveRequest.requested_at,
            approved_by: req.employee._id,
            approved_at: new Date(),
            approval_status: 'approved',
          },
        });
      }
    }

    await leaveRequest.populate('employee_id', 'employee_name employee_id mobile_no');
    await leaveRequest.populate('reviewed_by', 'employee_name');

    res.json({
      success: true,
      message: `Leave request ${status} successfully.`,
      data: leaveRequest,
    });
  } catch (error) {
    console.error('Review leave request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review leave request.',
      error: error.message,
    });
  }
};

// @desc    Get all employees with attendance summary (Admin)
// @route   GET /api/attendance/employees-summary
// @access  Private/Admin
const getEmployeesSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    const firstDay = new Date(targetYear, targetMonth, 1);
    const lastDay = new Date(targetYear, targetMonth + 1, 0);
    lastDay.setHours(23, 59, 59, 999);

    // Get all approved employees
    const employees = await Employee.find({ 
      status: 'approved',
      role: 'employee',
    }).select('employee_id employee_name mobile_no email');

    const summaries = await Promise.all(
      employees.map(async (emp) => {
        const attendance = await Attendance.find({
          employee_id: emp._id,
          date: { $gte: firstDay, $lte: lastDay },
        });

        const presentDays = attendance.filter(a => a.status === 'present').length;
        const absentDays = attendance.filter(a => a.status === 'absent').length;
        const leaveDays = attendance.filter(a => a.status === 'on-leave').length;
        const totalHours = attendance.reduce((sum, a) => sum + (a.total_hours || 0), 0);

        return {
          employee: emp,
          summary: {
            total_days: attendance.length,
            present_days: presentDays,
            absent_days: absentDays,
            leave_days: leaveDays,
            total_hours: totalHours.toFixed(2),
          },
        };
      })
    );

    res.json({
      success: true,
      month: targetMonth + 1,
      year: targetYear,
      count: summaries.length,
      data: summaries,
    });
  } catch (error) {
    console.error('Get employees summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees summary.',
      error: error.message,
    });
  }
};

module.exports = {
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
};

