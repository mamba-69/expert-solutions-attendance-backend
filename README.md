# Expert Solutions Attendance System - Backend

Backend API server for the Expert Solutions Attendance System with face recognition, geofencing, and employee management.

## Features

- 🔐 JWT Authentication
- 👤 Face Recognition (using @vladmandic/face-api)
- 📍 GPS Geofencing (Multiple office locations)
- 📸 ImgBB Image Upload Integration
- 🏢 Office-based Check-in/Check-out
- 📊 Attendance Reports
- 🗓️ Leave Management
- 👨‍💼 Admin Panel API

## Tech Stack

- **Node.js** + **Express.js**
- **MongoDB** (Atlas)
- **Face Recognition**: @vladmandic/face-api
- **Image Upload**: ImgBB API
- **Authentication**: JWT + bcrypt

## Environment Variables

Create a `.env` file in the root directory:

```env
# MongoDB Configuration
MONGODB_URI=your_mongodb_connection_string

# JWT Secret
JWT_SECRET=your_jwt_secret_key

# Server Configuration
PORT=3000
NODE_ENV=production

# Superadmin Credentials
SUPERADMIN_USERNAME=superadmin
SUPERADMIN_PASSWORD=SuperAdmin@123
SUPERADMIN_EMAIL=admin@expertsolutions.com

# ImgBB API Key
IMGBB_API_KEY=your_imgbb_api_key
```

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new employee
- `POST /api/auth/login` - Employee login
- `GET /api/auth/me` - Get current user

### Attendance
- `POST /api/attendance/check-in` - Mark check-in
- `PUT /api/attendance/check-out` - Mark check-out
- `GET /api/attendance/today` - Get today's attendance
- `GET /api/attendance/my-attendance` - Get employee attendance history

### Admin
- `GET /api/admin/pending-employees` - Get pending registrations
- `POST /api/admin/approve-employee` - Approve employee
- `POST /api/admin/reject-employee` - Reject employee
- `GET /api/admin/employees` - Get all employees
- `GET /api/admin/employees-summary` - Get employees with attendance summary

### Face Recognition
- `POST /api/face/extract` - Extract face descriptor from image
- `POST /api/face/verify` - Verify face against stored descriptor

### Leave Requests
- `POST /api/attendance/leave-request` - Request leave
- `GET /api/attendance/my-leave-requests` - Get employee's leave requests
- `GET /api/attendance/all-leave-requests` - Get all leave requests (Admin)
- `PUT /api/attendance/leave-request/:id` - Approve/Reject leave (Admin)

## Deployment

### Vercel
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Manual
```bash
npm install --production
NODE_ENV=production node server.js
```

## Office Locations

The system supports multiple office locations with geofencing:

- **Office 1**: Expert Solutions Warehouse (35m radius)
- **Office 2**: E. S. Showroom (25m radius)
- **Office 3**: Configurable

## Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens for authentication
- Face descriptors stored as 128-dimensional arrays
- MongoDB connection secured with SSL

## License

Private - Expert Solutions

## Support

For issues and questions, contact the development team.
