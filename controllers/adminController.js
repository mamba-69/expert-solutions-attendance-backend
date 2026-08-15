const bcrypt = require('bcryptjs');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');

// @desc    Get all pending employee registrations
// @route   GET /api/admin/pending-employees
// @access  Private/Admin
const getPendingEmployees = async (req, res) => {
  try {
    const pendingEmployees = await Employee.find({ status: 'pending' })
      .select('-password')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      count: pendingEmployees.length,
      data: pendingEmployees,
    });
  } catch (error) {
    console.error('Get pending employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending employees.',
      error: error.message,
    });
  }
};

// @desc    Approve employee and assign credentials
// @route   PUT /api/admin/approve-employee/:id
// @access  Private/Admin
const approveEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password.',
      });
    }

    // Check if employee exists and is pending
    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.',
      });
    }

    if (employee.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Employee is already ${employee.status}.`,
      });
    }

    // Check if username already exists
    const existingUsername = await Employee.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists. Please choose a different username.',
      });
    }

    // Generate employee ID
    const employee_id = await Employee.generateEmployeeId();

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update employee
    employee.employee_id = employee_id;
    employee.username = username.toLowerCase();
    employee.password = hashedPassword;
    employee.status = 'approved';
    employee.approved_by = req.employee._id;
    employee.approved_at = new Date();

    await employee.save();

    // Return employee without password
    const approvedEmployee = await Employee.findById(id).select('-password');

    res.json({
      success: true,
      message: 'Employee approved successfully.',
      data: approvedEmployee,
    });
  } catch (error) {
    console.error('Approve employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve employee.',
      error: error.message,
    });
  }
};

// @desc    Reject employee registration
// @route   PUT /api/admin/reject-employee/:id
// @access  Private/Admin
const rejectEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.',
      });
    }

    if (employee.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Employee is already ${employee.status}.`,
      });
    }

    employee.status = 'rejected';
    employee.rejection_reason = rejection_reason || 'Not specified';
    employee.approved_by = req.employee._id;

    await employee.save();

    res.json({
      success: true,
      message: 'Employee registration rejected.',
      data: employee,
    });
  } catch (error) {
    console.error('Reject employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject employee.',
      error: error.message,
    });
  }
};

// @desc    Get all approved employees
// @route   GET /api/admin/employees
// @access  Private/Admin
const getAllEmployees = async (req, res) => {
  try {
    const { status, search } = req.query;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { employee_name: { $regex: search, $options: 'i' } },
        { employee_id: { $regex: search, $options: 'i' } },
        { mobile_no: { $regex: search, $options: 'i' } },
      ];
    }

    const employees = await Employee.find(query)
      .select('-password -face_data.descriptor')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (error) {
    console.error('Get all employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees.',
      error: error.message,
    });
  }
};

// @desc    Update employee credentials
// @route   PUT /api/admin/employee/:id/credentials
// @access  Private/Admin
const updateEmployeeCredentials = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;

    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.',
      });
    }

    // Update username if provided
    if (username && username !== employee.username) {
      const existingUsername = await Employee.findOne({ 
        username: username.toLowerCase(),
        _id: { $ne: id }
      });
      
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists.',
        });
      }
      
      employee.username = username.toLowerCase();
    }

    // Update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      employee.password = await bcrypt.hash(password, salt);
    }

    await employee.save();

    const updatedEmployee = await Employee.findById(id).select('-password');

    res.json({
      success: true,
      message: 'Credentials updated successfully.',
      data: updatedEmployee,
    });
  } catch (error) {
    console.error('Update credentials error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update credentials.',
      error: error.message,
    });
  }
};

// @desc    Get attendance statistics
// @route   GET /api/admin/attendance-stats
// @access  Private/Admin
const getAttendanceStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {};
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const totalEmployees = await Employee.countDocuments({ status: 'approved' });
    const totalAttendance = await Attendance.countDocuments(query);
    const presentToday = await Attendance.countDocuments({
      date: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lte: new Date(new Date().setHours(23, 59, 59, 999)),
      },
      status: 'present',
    });

    res.json({
      success: true,
      data: {
        totalEmployees,
        totalAttendance,
        presentToday,
        absentToday: totalEmployees - presentToday,
      },
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance statistics.',
      error: error.message,
    });
  }
};

module.exports = {
  getPendingEmployees,
  approveEmployee,
  rejectEmployee,
  getAllEmployees,
  updateEmployeeCredentials,
  getAttendanceStats,
};
