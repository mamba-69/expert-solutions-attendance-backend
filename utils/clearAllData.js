const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');

async function clearAllData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🗑️  Clearing all data...\n');

    // Delete all employees except superadmin
    const deletedEmployees = await Employee.deleteMany({ 
      role: { $ne: 'superadmin' } 
    });
    console.log(`✅ Deleted ${deletedEmployees.deletedCount} employees`);

    // Delete all attendance records
    const deletedAttendance = await Attendance.deleteMany({});
    console.log(`✅ Deleted ${deletedAttendance.deletedCount} attendance records`);

    // Delete all leave requests
    const deletedLeaves = await LeaveRequest.deleteMany({});
    console.log(`✅ Deleted ${deletedLeaves.deletedCount} leave requests`);

    console.log('\n✨ Database cleared successfully!\n');
    console.log('Superadmin account preserved:');
    console.log('  Username: superadmin');
    console.log('  Password: SuperAdmin@123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    process.exit(1);
  }
}

clearAllData();
