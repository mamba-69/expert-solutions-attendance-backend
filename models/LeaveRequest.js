const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  leave_date: {
    type: Date,
    required: true,
  },
  leave_type: {
    type: String,
    enum: ['sick', 'casual', 'personal', 'emergency', 'other'],
    default: 'casual',
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  requested_at: {
    type: Date,
    default: Date.now,
  },
  reviewed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  reviewed_at: {
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
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Index for employee and leave date
leaveRequestSchema.index({ employee_id: 1, leave_date: 1 });

// Index for status
leaveRequestSchema.index({ status: 1 });

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);

module.exports = LeaveRequest;
