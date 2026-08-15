require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const faceRoutes = require('./routes/faceRoutes');

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Expert Solutions Attendance System API is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/face', faceRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

app.listen(PORT, HOST, () => {
  console.log('='.repeat(50));
  console.log(`Expert Solutions Attendance System`);
  console.log(`Server running in ${process.env.NODE_ENV} mode`);
  console.log(`Listening on ${HOST}:${PORT}`);
  console.log(`API Base URL: http://localhost:${PORT}`);
  console.log(`Network URL: http://10.189.214.236:${PORT}`);
  console.log('='.repeat(50));
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});
