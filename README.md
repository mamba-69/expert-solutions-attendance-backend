# Expert Solutions Attendance System - Backend

Backend API server for the Expert Solutions Attendance Management System.

## Features

- 🔐 JWT Authentication
- 👤 Employee Management
- 📅 Attendance Tracking with Geofencing
- 👨‍💼 Admin Dashboard
- 📸 Face Recognition (Face-API)
- 🖼️ Profile Picture Upload (ImgBB)
- 🏢 Multi-office Support
- 📊 Attendance Reports
- 🏖️ Leave Management

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Atlas)
- **Authentication**: JWT
- **Face Recognition**: @vladmandic/face-api
- **Image Hosting**: ImgBB

## Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import repository in Vercel
3. Add environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `SUPERADMIN_USERNAME`
   - `SUPERADMIN_PASSWORD`
   - `SUPERADMIN_EMAIL`
   - `IMGBB_API_KEY`
4. Deploy!

### Environment Variables

See `.env.example` for required environment variables.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new employee
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Attendance
- `POST /api/attendance/check-in` - Mark check-in
- `PUT /api/attendance/check-out` - Mark check-out
- `GET /api/attendance/today` - Get today's attendance
- `GET /api/attendance/my-attendance` - Get employee attendance history

### Admin
- `GET /api/admin/pending-employees` - Get pending registrations
- `PUT /api/admin/approve-employee/:id` - Approve employee
- `PUT /api/admin/reject-employee/:id` - Reject employee
- `GET /api/admin/employees` - Get all employees

### Face Recognition
- `POST /api/face/extract` - Extract face descriptor
- `POST /api/face/verify` - Verify face match

## Local Development

```bash
npm install
npm run dev
```

Server runs on `http://localhost:3000`

## Office Locations

- **Office 1**: Expert Solutions Warehouse
- **Office 2**: E. S. Showroom
- **Office 3**: TBD

## License

Private - Expert Solutions
