const bcrypt = require('bcryptjs');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const { uploadWithRetry } = require('../utils/imageUpload');

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
      .select('-password')
      .sort({ created_at: -1 });
    
    // Remove descriptor from face_data but keep image_url
    const employeesWithoutDescriptor = employees.map(emp => {
      const empObj = emp.toObject();
      if (empObj.face_data && empObj.face_data.descriptor) {
        delete empObj.face_data.descriptor;
      }
      return empObj;
    });

    res.json({
      success: true,
      count: employeesWithoutDescriptor.length,
      data: employeesWithoutDescriptor,
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

// @desc    Update employee details
// @route   PUT /api/admin/employee/:id
// @access  Private/Admin
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_name, mobile_no, email, address, role, status } = req.body;

    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.',
      });
    }

    // Prevent editing superadmin
    if (employee.role === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot edit superadmin account.',
      });
    }

    // Update fields if provided
    if (employee_name) employee.employee_name = employee_name;
    if (address) employee.address = address;
    if (email) employee.email = email;
    if (role) employee.role = role;
    if (status) employee.status = status;
    
    // Check if mobile number is changing and if it's unique
    if (mobile_no && mobile_no !== employee.mobile_no) {
      const existingMobile = await Employee.findOne({ 
        mobile_no,
        _id: { $ne: id }
      });
      
      if (existingMobile) {
        return res.status(400).json({
          success: false,
          message: 'Mobile number already exists.',
        });
      }
      
      employee.mobile_no = mobile_no;
    }

    await employee.save();

    const updatedEmployee = await Employee.findById(id).select('-password');

    res.json({
      success: true,
      message: 'Employee updated successfully.',
      data: updatedEmployee,
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update employee.',
      error: error.message,
    });
  }
};

// @desc    Delete employee
// @route   DELETE /api/admin/employee/:id
// @access  Private/Admin
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.',
      });
    }

    // Prevent deleting superadmin
    if (employee.role === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete superadmin account.',
      });
    }

    // Delete associated attendance records
    await Attendance.deleteMany({ employee_id: id });

    // Delete employee
    await Employee.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Employee and associated records deleted successfully.',
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete employee.',
      error: error.message,
    });
  }
};

// @desc    Update employee profile picture
// @route   PUT /api/admin/employee/:id/profile-picture
// @access  Private/Admin or Self
const updateProfilePicture = async (req, res) => {
  try {
    const { id } = req.params;
    const { base64Image } = req.body;

    if (!base64Image) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an image.',
      });
    }

    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.',
      });
    }

    // Check if user is updating their own profile or is admin
    const isOwnProfile = req.employee._id.toString() === id;
    const isAdmin = req.employee.role === 'admin' || req.employee.role === 'superadmin';

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile picture.',
      });
    }

    // Upload to ImgBB
    console.log('Uploading profile picture to ImgBB...');
    const uploadResult = await uploadWithRetry(
      base64Image,
      `${employee.employee_name.replace(/\s+/g, '_')}_profile_${Date.now()}`
    );

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image.',
        error: uploadResult.error,
      });
    }

    // Update employee profile picture
    employee.profile_picture = uploadResult.url;
    await employee.save();

    const updatedEmployee = await Employee.findById(id).select('-password');

    res.json({
      success: true,
      message: 'Profile picture updated successfully.',
      data: {
        employee: updatedEmployee,
        profile_picture: uploadResult.url,
      },
    });
  } catch (error) {
    console.error('Update profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile picture.',
      error: error.message,
    });
  }
};

// @desc    Mark employee as absent for a specific date
// @route   POST /api/admin/mark-absent/:employeeId
// @access  Private/Admin
const markEmployeeAbsent = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { date, reason } = req.body;

    // Validate employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.',
      });
    }

    if (employee.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved employees can be marked absent.',
      });
    }

    // Parse and validate date
    const absenceDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(absenceDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(absenceDate.setHours(23, 59, 59, 999));

    // Check if attendance already exists for this date
    const existingAttendance = await Attendance.findOne({
      employee_id: employeeId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance record already exists for this date.',
      });
    }

    // Create absent attendance record
    const attendance = await Attendance.create({
      employee_id: employeeId,
      date: startOfDay,
      status: 'absent',
      reason: reason || 'Marked absent by admin',
      marked_by_admin: true,
      marked_by: req.employee._id,
    });

    res.json({
      success: true,
      message: 'Employee marked as absent successfully.',
      data: attendance,
    });
  } catch (error) {
    console.error('Mark absent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark employee absent.',
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
  updateEmployee,
  deleteEmployee,
  updateProfilePicture,
  markEmployeeAbsent,
};
