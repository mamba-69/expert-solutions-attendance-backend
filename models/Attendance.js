const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  check_in: {
    time: {
      type: Date,
      required: false, // Made optional for leave records
    },
    location: {
      latitude: {
        type: Number,
        required: false, // Made optional for leave records
      },
      longitude: {
        type: Number,
        required: false, // Made optional for leave records
      },
      address: {
        type: String,
      },
    },
    office_name: {
      type: String, // NEW: Store which office the employee checked in from
      default: null,
    },
    face_match_score: {
      type: Number,
      min: 0,
      max: 1,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  check_out: {
    time: {
      type: Date,
    },
    location: {
      latitude: {
        type: Number,
      },
      longitude: {
        type: Number,
      },
      address: {
        type: String,
      },
    },
    office_name: {
      type: String, // NEW: Store which office the employee checked out from
      default: null,
    },
    face_match_score: {
      type: Number,
      min: 0,
      max: 1,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  total_hours: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'half-day', 'late', 'on-leave', 'weekend', 'holiday'],
    default: 'present',
  },
  leave_request: {
    requested: {
      type: Boolean,
      default: false,
    },
    reason: {
      type: String,
    },
    requested_at: {
      type: Date,
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    approved_at: {
      type: Date,
    },
    approval_status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  notes: {
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
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound index for employee and date
attendanceSchema.index({ employee_id: 1, date: 1 }, { unique: true });

// Method to calculate total hours
attendanceSchema.methods.calculateTotalHours = function() {
  if (this.check_in.time && this.check_out.time) {
    const diff = this.check_out.time - this.check_in.time;
    this.total_hours = diff / (1000 * 60 * 60); // Convert milliseconds to hours
  }
  return this.total_hours;
};

// Pre-save middleware to calculate total hours
attendanceSchema.pre('save', function(next) {
  if (this.check_in.time && this.check_out.time) {
    this.calculateTotalHours();
  }
  this.updated_at = Date.now();
  next();
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
