const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const employee = await Employee.findById(decoded.id).select('-password');

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Employee not found.',
      });
    }

    if (employee.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Account not approved yet.',
      });
    }

    req.employee = employee;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Authentication error.',
      error: error.message,
    });
  }
};

// Check if user is admin or superadmin
const isAdmin = (req, res, next) => {
  if (req.employee.role !== 'admin' && req.employee.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.',
    });
  }
  next();
};

// Check if user is superadmin
const isSuperAdmin = (req, res, next) => {
  if (req.employee.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super admin privileges required.',
    });
  }
  next();
};

module.exports = {
  authenticate,
  isAdmin,
  isSuperAdmin,
};
