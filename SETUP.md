# Expert Solutions Attendance System - Backend Setup Guide

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Installation Steps

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy the `.env.example` to `.env` and update the values:

```bash
cp ../.env.example ../.env
```

Edit `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017/expert_solutions_attendance
JWT_SECRET=your_secure_jwt_secret_key_here
PORT=5000
NODE_ENV=development

SUPERADMIN_USERNAME=superadmin
SUPERADMIN_PASSWORD=SuperAdmin@123
SUPERADMIN_EMAIL=admin@expertsolutions.com
```

**Important:** Change the JWT_SECRET and superadmin credentials in production!

### 3. Set Up MongoDB

Option A: Local MongoDB
```bash
# Install MongoDB (macOS)
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community
```

Option B: MongoDB Atlas (Cloud)
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string and update MONGODB_URI in .env

### 4. Download Face Recognition Models

Face recognition requires pre-trained models. Run the following:

```bash
cd models
mkdir -p face-models
cd face-models

# Download models
curl -O https://raw.githubusercontent.com/vladmandic/face-api/master/model/ssd_mobilenetv1_model-weights_manifest.json
curl -O https://github.com/vladmandic/face-api/raw/master/model/ssd_mobilenetv1_model-shard1
curl -O https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_landmark_68_model-weights_manifest.json
curl -O https://github.com/vladmandic/face-api/raw/master/model/face_landmark_68_model-shard1
curl -O https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_recognition_model-weights_manifest.json
curl -O https://github.com/vladmandic/face-api/raw/master/model/face_recognition_model-shard1
curl -O https://github.com/vladmandic/face-api/raw/master/model/face_recognition_model-shard2

cd ../..
```

See `README_FACE_MODELS.md` for more details.

### 5. Seed Super Admin Account

Create the initial superadmin account:

```bash
npm run seed
```

This will create a superadmin account with credentials from your .env file.

**Default credentials:**
- Username: `superadmin`
- Password: `SuperAdmin@123`

⚠️ **Change these credentials after first login!**

### 6. Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:5000`

## Verify Installation

### Check API Health

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Expert Solutions Attendance System API is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Test Super Admin Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "password": "SuperAdmin@123"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "eyJhbGc...",
    "employee": {
      "id": "...",
      "employee_id": "ADMIN001",
      "employee_name": "Super Administrator",
      "username": "superadmin",
      "role": "superadmin"
    }
  }
}
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new employee (pending approval)
- `POST /api/auth/login` - Login employee
- `GET /api/auth/me` - Get current user (requires auth)

### Admin Panel
- `GET /api/admin/pending-employees` - Get pending registrations
- `PUT /api/admin/approve-employee/:id` - Approve employee and assign credentials
- `PUT /api/admin/reject-employee/:id` - Reject employee registration
- `GET /api/admin/employees` - Get all employees
- `PUT /api/admin/employee/:id/credentials` - Update employee credentials
- `GET /api/admin/attendance-stats` - Get attendance statistics

### Attendance
- `POST /api/attendance/check-in` - Mark check-in
- `PUT /api/attendance/check-out` - Mark check-out
- `GET /api/attendance/my-attendance` - Get my attendance history
- `GET /api/attendance/today` - Get today's attendance status
- `GET /api/attendance/all` - Get all attendance (admin only)

### Face Recognition
- `POST /api/face/validate` - Validate face image quality
- `POST /api/face/extract` - Extract face descriptor
- `POST /api/face/verify` - Verify face for attendance (requires auth)

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check MONGODB_URI in .env file
- For Atlas, ensure your IP is whitelisted

### Face Models Not Loading
- Ensure all model files are in `backend/models/face-models/`
- Check file permissions
- See `README_FACE_MODELS.md` for model setup

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or use a different port in .env
PORT=3000
```

## Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── adminController.js   # Admin panel logic
│   ├── attendanceController.js  # Attendance logic
│   └── faceController.js    # Face recognition logic
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── models/
│   ├── Employee.js          # Employee schema
│   ├── Attendance.js        # Attendance schema
│   └── face-models/         # Face recognition models (download required)
├── routes/
│   ├── authRoutes.js        # Auth endpoints
│   ├── adminRoutes.js       # Admin endpoints
│   ├── attendanceRoutes.js  # Attendance endpoints
│   └── faceRoutes.js        # Face recognition endpoints
├── utils/
│   ├── faceRecognition.js   # Face recognition utilities
│   └── seedSuperAdmin.js    # Superadmin seeder script
├── server.js                # Express server
└── package.json             # Dependencies
```

## Security Notes

1. **Change default credentials** - Update superadmin password after first login
2. **Use strong JWT_SECRET** - Generate a secure random string for production
3. **Enable HTTPS** - Use SSL/TLS certificates in production
4. **Environment variables** - Never commit .env file to version control
5. **Rate limiting** - Consider adding rate limiting middleware
6. **Input validation** - All inputs are validated, but review for your use case

## Next Steps

After backend setup:
1. Set up the Flutter mobile app
2. Configure app permissions (camera, location, calendar)
3. Connect Flutter app to backend API
4. Test employee registration and face capture
5. Test admin approval workflow
6. Test attendance check-in/out with face verification

## Support

For issues or questions, contact your development team.
