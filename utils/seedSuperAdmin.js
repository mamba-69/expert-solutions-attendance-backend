require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Employee = require('../models/Employee');

/**
 * Seed Super Admin Account
 * This script creates the initial superadmin account if it doesn't exist
 */

const seedSuperAdmin = async () => {
  try {
    console.log('='.repeat(60));
    console.log('Expert Solutions Attendance System - Super Admin Seeder');
    console.log('='.repeat(60));
    console.log('');

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ Connected to MongoDB successfully');
    console.log('');

    // Check if superadmin already exists
    const existingSuperAdmin = await Employee.findOne({ role: 'superadmin' });

    if (existingSuperAdmin) {
      console.log('⚠ Super Admin already exists!');
      console.log('');
      console.log('Existing Super Admin Details:');
      console.log('  Employee ID:', existingSuperAdmin.employee_id);
      console.log('  Name:', existingSuperAdmin.employee_name);
      console.log('  Username:', existingSuperAdmin.username);
      console.log('  Email:', existingSuperAdmin.email || 'N/A');
      console.log('  Status:', existingSuperAdmin.status);
      console.log('  Created:', existingSuperAdmin.created_at);
      console.log('');
      console.log('If you want to create a new superadmin, please delete the existing one first.');
      console.log('');
      await mongoose.connection.close();
      return;
    }

    // Get credentials from environment variables
    const username = process.env.SUPERADMIN_USERNAME || 'superadmin';
    const password = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin@123';
    const email = process.env.SUPERADMIN_EMAIL || 'admin@expertsolutions.com';

    console.log('Creating Super Admin account...');
    console.log('');

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create dummy face data (superadmin doesn't need face recognition)
    const dummyDescriptor = Array(128).fill(0);

    // Create superadmin
    const superAdmin = new Employee({
      employee_id: 'ADMIN001',
      employee_name: 'Super Administrator',
      mobile_no: '0000000000',
      address: 'Expert Solutions HQ',
      email: email,
      username: username.toLowerCase(),
      password: hashedPassword,
      role: 'superadmin',
      status: 'approved',
      face_data: {
        descriptor: dummyDescriptor,
        image_url: null,
        captured_at: new Date(),
      },
      approved_at: new Date(),
    });

    await superAdmin.save();

    console.log('✓ Super Admin created successfully!');
    console.log('');
    console.log('='.repeat(60));
    console.log('SUPER ADMIN CREDENTIALS');
    console.log('='.repeat(60));
    console.log('');
    console.log('  Employee ID:', superAdmin.employee_id);
    console.log('  Name:', superAdmin.employee_name);
    console.log('  Username:', superAdmin.username);
    console.log('  Password:', password);
    console.log('  Email:', superAdmin.email);
    console.log('  Role:', superAdmin.role);
    console.log('');
    console.log('⚠ IMPORTANT: Please change the default password after first login!');
    console.log('⚠ Store these credentials securely!');
    console.log('');
    console.log('='.repeat(60));
    console.log('');

    // Close connection
    await mongoose.connection.close();
    console.log('✓ Database connection closed');
    console.log('');
    console.log('Setup complete! You can now start the server with: npm start');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('✗ Error seeding super admin:', error.message);
    console.error('');
    
    if (error.code === 11000) {
      console.error('Duplicate key error. Possible reasons:');
      console.error('  - Username already exists');
      console.error('  - Mobile number already exists');
      console.error('  - Employee ID already exists');
      console.error('');
      console.error('Please check your database and remove any conflicting records.');
    }
    
    console.error('');
    process.exit(1);
  }
};

// Run the seeder
seedSuperAdmin();
