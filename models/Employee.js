const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employee_id: {
    type: String,
    unique: true,
    sparse: true, // Allows null for pending employees
  },
  employee_name: {
    type: String,
    required: true,
    trim: true,
  },
  mobile_no: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return /^[0-9]{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid mobile number!`
    }
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  face_data: {
    // Store face descriptor (128-dimensional array from face-api.js)
    descriptor: {
      type: [Number],
      required: true,
    },
    // Store original image for reference
    image_url: {
      type: String,
    },
    // Metadata
    captured_at: {
      type: Date,
      default: Date.now,
    },
  },
  username: {
    type: String,
    unique: true,
    sparse: true, // Allows null for pending employees
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    // Not required initially, will be set by admin
  },
  role: {
    type: String,
    enum: ['employee', 'admin', 'superadmin'],
    default: 'employee',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'inactive'],
    default: 'pending',
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  approved_at: {
    type: Date,
  },
  rejection_reason: {
    type: String,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  last_login: {
    type: Date,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Pre-save middleware to update timestamps
employeeSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Method to generate employee ID
employeeSchema.statics.generateEmployeeId = async function() {
  try {
    // Get all employees with employee_id that starts with "EMP"
    const employees = await this.find({ 
      employee_id: { $exists: true, $ne: null, $regex: /^EMP\d+$/ } 
    }).select('employee_id');
    
    if (!employees || employees.length === 0) {
      return 'EMP001';
    }
    
    // Extract numeric parts and find the maximum
    const numbers = employees
      .map(emp => {
        const match = emp.employee_id.match(/^EMP(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => !isNaN(num));
    
    if (numbers.length === 0) {
      return 'EMP001';
    }
    
    const maxNumber = Math.max(...numbers);
    const newNumber = maxNumber + 1;
    return `EMP${String(newNumber).padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating employee ID:', error);
    // Fallback: generate a random ID if something goes wrong
    const randomNum = Math.floor(Math.random() * 1000) + 1;
    return `EMP${String(randomNum).padStart(3, '0')}`;
  }
};

// Index for faster queries
employeeSchema.index({ status: 1 });
employeeSchema.index({ username: 1 });
employeeSchema.index({ mobile_no: 1 });

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;
