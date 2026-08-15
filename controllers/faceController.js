const { validateFaceImage, extractFaceDescriptor, findMatchingEmployee } = require('../utils/faceRecognition');
const Employee = require('../models/Employee');

// @desc    Validate face image during registration
// @route   POST /api/face/validate
// @access  Public
const validateFace = async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an image.',
      });
    }

    // Validate face image quality
    const validation = await validateFaceImage(image);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
        data: {
          confidence: validation.confidence,
          faceRatio: validation.faceRatio,
          faceCount: validation.faceCount,
        },
      });
    }

    res.json({
      success: true,
      message: 'Face validated successfully.',
      data: {
        confidence: validation.confidence,
        faceRatio: validation.faceRatio,
        descriptor: validation.descriptor,
      },
    });
  } catch (error) {
    console.error('Face validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Face validation failed.',
      error: error.message,
    });
  }
};

// @desc    Verify face for attendance (check-in/out)
// @route   POST /api/face/verify
// @access  Private
const verifyFace = async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an image.',
      });
    }

    // Extract descriptor from provided image
    const descriptor = await extractFaceDescriptor(image);

    if (!descriptor) {
      return res.status(400).json({
        success: false,
        message: 'No face detected in the image.',
      });
    }

    // Get all approved employees with face data
    const employees = await Employee.find({ 
      status: 'approved',
      'face_data.descriptor': { $exists: true }
    }).select('employee_id employee_name face_data');

    // Find matching employee
    const match = findMatchingEmployee(descriptor, employees, 0.6);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'No matching employee found.',
        data: {
          score: 0,
        },
      });
    }

    // Check if matched employee is the authenticated user
    const isCorrectEmployee = match.employee._id.toString() === req.employee._id.toString();

    if (!isCorrectEmployee) {
      return res.status(403).json({
        success: false,
        message: 'Face does not match authenticated employee.',
        data: {
          matchedEmployee: match.employee.employee_name,
          score: match.score,
        },
      });
    }

    res.json({
      success: true,
      message: 'Face verified successfully.',
      data: {
        employee: {
          id: match.employee._id,
          employee_id: match.employee.employee_id,
          employee_name: match.employee.employee_name,
        },
        score: match.score,
      },
    });
  } catch (error) {
    console.error('Face verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Face verification failed.',
      error: error.message,
    });
  }
};

// @desc    Extract face descriptor from image
// @route   POST /api/face/extract
// @access  Public (for registration)
const extractDescriptor = async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an image.',
      });
    }

    // First validate the image
    const validation = await validateFaceImage(image);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    res.json({
      success: true,
      message: 'Face descriptor extracted successfully.',
      data: {
        descriptor: validation.descriptor,
        confidence: validation.confidence,
      },
    });
  } catch (error) {
    console.error('Extract descriptor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extract face descriptor.',
      error: error.message,
    });
  }
};

module.exports = {
  validateFace,
  verifyFace,
  extractDescriptor,
};
