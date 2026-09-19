const { businessDate, dateBucket, dayQuery, rangeQuery, monthRange, hoursBetween, dailyRows, workingDayCount, reportSummary } = require('../utils/attendanceTime');
const { officeAt } = require('../utils/offices');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest');

// @desc    Mark check-in (Mark Present)
// @route   POST /api/attendance/check-in
// @access  Private
const checkIn = async (req, res) => {
  try {
    const { latitude, longitude, address, face_match_score, biometric_verified } = req.body;

    // Validate required fields
    if (!officeAt(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: 'You must be within 50 metres of a registered office. Refresh your GPS location.',
      });
    }

    const office_name = officeAt(latitude, longitude).name;

    // Support both face and biometric verification
    let matchScore = face_match_score;
    let verificationType = 'face';
    
    if (biometric_verified === true) {
      matchScore = 1.0; // Biometric verification is always 100%
      verificationType = 'biometric';
    } else if (face_match_score === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide face match score or biometric verification.',
      });
    } else if (typeof face_match_score !== 'number' || !Number.isFinite(face_match_score) || face_match_score < 0.6 || face_match_score > 1) {
      return res.status(400).json({
        success: false,
        message: 'Face verification failed. Please try again.',
      });
    }

    const today = dateBucket();

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      employee_id: req.employee._id,
      date: dayQuery(),
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: existingAttendance.check_in?.time ? 'Already checked in today.' : 'An absence or leave record exists for today. Ask your admin to correct it before checking in.',
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
        office_name: office_name || 'Unknown Office',
        face_match_score: matchScore,
        verified: true,
        verification_type: verificationType,
      },
      status: 'present',
    });

    await attendance.save();

    // Populate employee details
    await attendance.populate('employee_id', 'employee_name employee_id');

    res.status(201).json({
      success: true,
      message: `Checked in successfully at ${office_name || 'office'} using ${verificationType}.`,
      data: attendance,
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Attendance was already recorded. Refresh to see your status.' });
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
    const { latitude, longitude, address, face_match_score, biometric_verified } = req.body;

    // Validate required fields
    if (!officeAt(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: 'You must be within 50 metres of a registered office. Refresh your GPS location.',
      });
    }

    const office_name = officeAt(latitude, longitude).name;

    // Support both face and biometric verification
    let matchScore = face_match_score;
    let verificationType = 'face';
    
    if (biometric_verified === true) {
      matchScore = 1.0; // Biometric verification is always 100%
      verificationType = 'biometric';
    } else if (face_match_score === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide face match score or biometric verification.',
      });
    } else if (typeof face_match_score !== 'number' || !Number.isFinite(face_match_score) || face_match_score < 0.6 || face_match_score > 1) {
      return res.status(400).json({
        success: false,
        message: 'Face verification failed. Please try again.',
      });
    }

    // Find today's attendance record
    let attendance = await Attendance.findOne({
      employee_id: req.employee._id,
      date: dayQuery(),
    });

    if (!attendance || !attendance.check_in?.time) {
      return res.status(404).json({
        success: false,
        message: 'No check-in found for today. Please check in first.',
      });
    }

    if (attendance.check_out?.time) {
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
      office_name: office_name || 'Unknown Office',
      face_match_score: matchScore,
      verified: true,
      verification_type: verificationType,
    };

    // Calculate total hours
    attendance.calculateTotalHours();

    attendance = await Attendance.findOneAndUpdate(
      { _id: attendance._id, 'check_out.time': null, 'check_in.time': { $ne: null } },
      { $set: { check_out: attendance.check_out, total_hours: attendance.total_hours } },
      { new: true, runValidators: true });
    if (!attendance) return res.status(409).json({ success: false, message: 'Already checked out, or attendance changed. Refresh your status.' });

    // Populate employee details
    await attendance.populate('employee_id', 'employee_name employee_id');

    res.json({
      success: true,
      message: `Checked out successfully from ${office_name || 'office'} using ${verificationType}.`,
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
      query.date = rangeQuery(startDate, endDate);
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
    const today = dateBucket();

    const attendance = await Attendance.findOne({
      employee_id: req.employee._id,
      date: dayQuery(),
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
      query.date = rangeQuery(startDate, endDate);
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
    
    const currentDate = new Date(Date.now() + 330 * 60000);
    const targetMonth = month ? parseInt(month) - 1 : currentDate.getUTCMonth();
    const targetYear = year ? parseInt(year) : currentDate.getUTCFullYear();

    // Get first and last day of month
    const period = monthRange(targetMonth + 1, targetYear);
    const { $gte: firstDay, $lt: lastDay } = rangeQuery(period.start, period.end);

    const attendance = await Attendance.find({
      employee_id: req.employee._id,
      date: {
        $gte: firstDay,
        $lt: lastDay,
      },
    }).sort({ date: 1 });

    // Also get approved leave requests for this month
    const leaveRequests = await LeaveRequest.find({
      employee_id: req.employee._id,
      leave_date: {
        $gte: firstDay,
        $lt: lastDay,
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

    const period = startDate && endDate ? { start: startDate, end: endDate } : monthRange();
    const dateRange = rangeQuery(period.start, period.end);
    const employee = await Employee.findById(empId).select('employee_name employee_id mobile_no email profile_picture');
    const attendance = await Attendance.find({ employee_id: empId, date: dateRange })
      .sort({ date: 1 }).populate('employee_id', 'employee_name employee_id mobile_no email');

    // Calculate statistics
    const { totalHours, presentDays, averageHours } = reportSummary(attendance);
    const absentDays = attendance.filter(a => a.status === 'absent').length;
    const leaveDays = attendance.filter(a => a.status === 'on-leave').length;
    const halfDays = attendance.filter(a => a.status === 'half-day').length;
    const lateDays = attendance.filter(a => a.status === 'late').length;
    
    const workingDays = workingDayCount(attendance);
    const avgHours = averageHours.toFixed(2);

    const absentDates = attendance
      .filter(a => a.status === 'absent')
      .map(a => businessDate(a.date));

    res.json({
      success: true,
      data: {
        employee,
        period: {
          start: dateBucket(period.start).toISOString().slice(0,10),
          end: dateBucket(period.end).toISOString().slice(0,10),
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
          working_days: workingDays,
          absent_dates: absentDates,
        },
        attendance,
        daily: dailyRows(attendance, period.start, period.end),
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

    const leaveDate = dateBucket(leave_date);

    // Check if already requested
    const existing = await LeaveRequest.findOne({
      employee_id: req.employee._id,
      leave_date: dayQuery(leave_date),
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
      const leaveDate = dateBucket(leaveRequest.leave_date);

      const existingAttendance = await Attendance.findOne({
        employee_id: leaveRequest.employee_id,
        date: dayQuery(leaveDate),
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
    const { month, year, startDate, endDate } = req.query;
    
    const currentDate = new Date(Date.now() + 330 * 60000);
    const targetMonth = month ? parseInt(month) - 1 : currentDate.getUTCMonth();
    const targetYear = year ? parseInt(year) : currentDate.getUTCFullYear();

    const period = startDate && endDate ? { start: startDate, end: endDate } : monthRange(targetMonth + 1, targetYear);
    const { $gte: firstDay, $lt: lastDay } = rangeQuery(period.start, period.end);

    // Get all approved employees
    const employees = await Employee.find({ 
      status: 'approved',
      role: 'employee',
    }).select('employee_id employee_name mobile_no email address profile_picture face_data.image_url');

    const summaries = await Promise.all(
      employees.map(async (emp) => {
        const attendance = await Attendance.find({
          employee_id: emp._id,
          date: { $gte: firstDay, $lt: lastDay },
        });

        const { totalHours, presentDays, averageHours } = reportSummary(attendance);
        const absentDays = attendance.filter(a => a.status === 'absent').length;
        const leaveDays = attendance.filter(a => a.status === 'on-leave').length;
    
        return {
          employee: emp,
          summary: {
            total_days: attendance.length,
            present_days: presentDays,
            absent_days: absentDays,
            leave_days: leaveDays,
            total_hours: totalHours.toFixed(2),
            average_hours: averageHours.toFixed(2),
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



// @desc    Get employee attendance records (Admin only)
// @route   GET /api/attendance/employee/:employeeId
// @access  Private/Admin
const getEmployeeAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    // Build query
    const query = { employee_id: employeeId };
    
    if (startDate && endDate) {
      query.date = rangeQuery(startDate, endDate);
    }

    const attendanceRecords = await Attendance.find(query)
      .sort({ date: -1 })
      .lean();

    res.json({
      success: true,
      count: attendanceRecords.length,
      data: attendanceRecords,
    });
  } catch (error) {
    console.error('Get employee attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attendance records.',
      error: error.message,
    });
  }
};

// @desc    Update attendance check-in/check-out time (Admin only)
// @route   PUT /api/admin/attendance/:id/time
// @access  Private/Admin
const updateAttendanceTime = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkInTime, checkOutTime } = req.body;

    const attendance = await Attendance.findById(id);
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found.',
      });
    }

    const parseTime = (value, previous) => value === undefined ? previous : (value === null || value === '' ? null : new Date(value));
    const nextIn = parseTime(checkInTime, attendance.check_in?.time);
    const nextOut = parseTime(checkOutTime, attendance.check_out?.time);
    if ((nextIn && !Number.isFinite(+nextIn)) || (nextOut && !Number.isFinite(+nextOut)) || (nextOut && !nextIn) || (nextIn && nextOut && nextOut < nextIn)) {
      return res.status(400).json({ success: false, message: 'Enter valid times. Check-out must follow check-in.' });
    }
    if (nextIn && businessDate(nextIn) !== businessDate(attendance.date)) {
      return res.status(400).json({ success: false, message: 'Check-in must be on the attendance date in IST.' });
    }

    // Update check-in time
    if (checkInTime !== undefined) {
      if (checkInTime === null || checkInTime === '') {
        // Remove check-in
        attendance.check_in = {
          time: null,
          latitude: null,
          longitude: null,
          address: null,
          office_name: null,
        };
      } else {
        const newCheckInTime = new Date(checkInTime);
        attendance.check_in.time = newCheckInTime;
      }
    }

    // Update check-out time
    if (checkOutTime !== undefined) {
      if (checkOutTime === null || checkOutTime === '') {
        // Remove check-out
        attendance.check_out = {
          time: null,
          latitude: null,
          longitude: null,
          address: null,
        };
      } else {
        const newCheckOutTime = new Date(checkOutTime);
        attendance.check_out.time = newCheckOutTime;
      }
    }

    // Recalculate total hours if both times exist
    if (attendance.check_in.time && attendance.check_out.time) {
      const checkInDate = new Date(attendance.check_in.time);
      const checkOutDate = new Date(attendance.check_out.time);
      const diffHours = hoursBetween(checkInDate, checkOutDate);
      attendance.total_hours = Math.max(0, parseFloat(diffHours.toFixed(2)));
      
      // Update status based on hours
      if (diffHours >= 8) {
        attendance.status = 'present';
      } else if (diffHours >= 4) {
        attendance.status = 'half-day';
      } else {
        attendance.status = 'present'; // Still mark as present
      }
    } else if (attendance.check_in.time && !attendance.check_out.time) {
      attendance.total_hours = 0;
      attendance.status = 'present'; // Checked in but not out
    } else if (!attendance.check_in.time && !attendance.check_out.time) {
      attendance.total_hours = 0;
      attendance.status = 'absent';
    }

    await attendance.save();

    res.json({
      success: true,
      message: 'Attendance time updated successfully.',
      data: attendance,
    });
  } catch (error) {
    console.error('Update attendance time error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update attendance time.',
      error: error.message,
    });
  }
};

// @desc    Auto-mark employees absent if not checked in by 12 PM
// @route   POST /api/admin/attendance/auto-absent
// @access  Private/Admin (or CRON job)
const autoMarkAbsent = async (req, res) => {
  try {
    const today = dateBucket();

    // Get current time for logging
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    console.log(`[Auto-Absent] Running at ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);

    // Get all APPROVED employees (not pending, rejected, or inactive)
    const employees = await Employee.find({ status: 'approved', role: 'employee' });
    
    if (!employees || employees.length === 0) {
      const message = 'No approved employees found';
      console.log(`[Auto-Absent] ${message}`);
      return res ? res.json({ success: true, message, marked_absent: 0 }) : null;
    }

    console.log(`[Auto-Absent] Found ${employees.length} approved employees to check`);

    let markedAbsentCount = 0;
    const absentEmployees = [];

    // Check each employee
    for (const employee of employees) {
      // Check if they have attendance record for today
      const attendance = await Attendance.findOne({
        employee_id: employee._id,
        date: dayQuery(),
      });

      // Check if they have an approved leave for today
      const approvedLeave = await LeaveRequest.findOne({
        employee_id: employee._id,
        status: 'approved',
        leave_date: dayQuery(),
      });

      // If no attendance record and no approved leave, mark as absent
      if (!attendance && !approvedLeave) {
        const newAttendance = new Attendance({
          employee_id: employee._id,
          date: today,
          status: 'absent',
          total_hours: 0,
          check_in: null,
          check_out: null,
        });

        await newAttendance.save();
        markedAbsentCount++;
        absentEmployees.push({
          employee_id: employee.employee_id,
          employee_name: employee.employee_name,
        });

        console.log(`[Auto-Absent] Marked ${employee.employee_name} (${employee.employee_id}) as absent`);
      } else if (attendance) {
        console.log(`[Auto-Absent] ${employee.employee_name} already has attendance record (${attendance.status})`);
      } else if (approvedLeave) {
        console.log(`[Auto-Absent] ${employee.employee_name} is on approved leave`);
      }
    }

    const message = `Auto-absent completed: ${markedAbsentCount} employee(s) marked absent out of ${employees.length} total`;
    console.log(`[Auto-Absent] ${message}`);

    if (res) {
      res.json({
        success: true,
        message,
        total_employees: employees.length,
        marked_absent: markedAbsentCount,
        employees: absentEmployees,
        timestamp: now.toISOString(),
      });
    }

    return { success: true, marked_absent: markedAbsentCount };
  } catch (error) {
    console.error('[Auto-Absent] Error:', error);
    if (res) {
      res.status(500).json({
        success: false,
        message: 'Failed to auto-mark absent.',
        error: error.message,
      });
    }
    return { success: false, error: error.message };
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
  getEmployeeAttendance,
  updateAttendanceTime,
  autoMarkAbsent,
};
