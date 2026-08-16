const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const { uploadWithRetry } = require('../utils/imageUpload');

// Generate JWT token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register new employee (pending approval)
// @route   POST /api/auth/register
// @access  Public
const registerEmployee = async (req, res) => {
  try {
    const { employee_name, mobile_no, address, email, face_data, biometric_id } = req.body;

    // Validate required fields
    if (!employee_name || !mobile_no || !address) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, mobile, and address.',
      });
    }

    // Check if mobile number already exists
    const existingEmployee = await Employee.findOne({ mobile_no });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number already registered.',
      });
    }

    // NEW: Support biometric-only registration (no face data required)
    let faceData = null;
    
    if (face_data && face_data.descriptor && Array.isArray(face_data.descriptor)) {
      // Face data provided (legacy flow)
      let imageUrl = face_data.image_url || null;
      
      if (face_data.base64Image) {
        console.log('Uploading face image to ImgBB...');
        const uploadResult = await uploadWithRetry(
          face_data.base64Image,
          `${employee_name.replace(/\s+/g, '_')}_${Date.now()}`
        );
        
        if (uploadResult.success) {
          imageUrl = uploadResult.url;
          console.log('Image uploaded successfully:', imageUrl);
        } else {
          console.warn('Failed to upload image to ImgBB:', uploadResult.error);
        }
      }
      
      faceData = {
        descriptor: face_data.descriptor,
        image_url: imageUrl,
      };
    }

    // Create new employee (pending status)
    const employeeData = {
      employee_name,
      mobile_no,
      address,
      email,
      status: 'pending',
    };

    // Add face data only if provided
    if (faceData) {
      employeeData.face_data = faceData;
    }

    // Add biometric_id if provided (for device biometric authentication)
    if (biometric_id) {
      employeeData.biometric_id = biometric_id;
    }

    const employee = new Employee(employeeData);
    await employee.save();

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully. Waiting for admin approval.',
      data: {
        id: employee._id,
        employee_name: employee.employee_name,
        mobile_no: employee.mobile_no,
        status: employee.status,
        biometric_enrolled: !!biometric_id,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed.',
      error: error.message,
    });
  }
};

// @desc    Login employee
// @route   POST /api/auth/login
// @access  Public
const loginEmployee = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password.',
      });
    }

    // Find employee by username
    const employee = await Employee.findOne({ username: username.toLowerCase() });

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // Check if employee is approved
    if (employee.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: `Account is ${employee.status}. Please contact admin.`,
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, employee.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // Update last login
    employee.last_login = new Date();
    await employee.save();

    // Generate token
    const token = generateToken(employee._id, employee.role);

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        employee: {
          id: employee._id,
          employee_id: employee.employee_id,
          employee_name: employee.employee_name,
          username: employee.username,
          role: employee.role,
          mobile_no: employee.mobile_no,
          email: employee.email,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed.',
      error: error.message,
    });
  }
};

// @desc    Get current logged-in employee
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const employee = await Employee.findById(req.employee.id).select('-password');

    res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get employee details.',
      error: error.message,
    });
  }
};

module.exports = {
  registerEmployee,
  loginEmployee,
  getMe,
};
