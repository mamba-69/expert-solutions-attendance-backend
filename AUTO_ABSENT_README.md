# Auto-Absent Feature

## Overview
Automatically marks employees as absent if they don't check in by 12:00 PM IST daily.

## How It Works
1. **Scheduled Job**: Runs daily at 12:00 PM IST (Indian Standard Time)
2. **Check Logic**:
   - Gets all active employees
   - Checks if employee has attendance record for today
   - Checks if employee has approved leave for today
   - If no attendance AND no leave → marks as ABSENT
3. **Smart Detection**:
   - Skips employees already checked in
   - Skips employees on approved leave
   - Only marks those who genuinely didn't show up

## Manual Trigger (Admin)
You can manually trigger the auto-absent job via API:

```bash
POST /api/admin/attendance/auto-absent
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Auto-absent completed: 3 employee(s) marked absent",
  "marked_absent": 3,
  "employees": [
    {
      "employee_id": "EMP001",
      "employee_name": "John Doe"
    }
  ],
  "timestamp": "2026-08-20T06:30:00.000Z"
}
```

## Schedule Details
- **Time**: 12:00 PM (noon) IST
- **Frequency**: Daily
- **Timezone**: Asia/Kolkata (IST)
- **Cron Expression**: `0 12 * * *`

## Testing
To test the auto-absent feature:

1. **Via API** (recommended for testing):
   ```bash
   curl -X POST https://expert-solutions-attendance-backend.vercel.app/api/admin/attendance/auto-absent \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

2. **Check logs**: The backend logs will show:
   ```
   [Scheduler] Running auto-absent job at 12:00 PM IST
   [Auto-Absent] Marked John Doe (EMP001) as absent
   [Auto-Absent] Auto-absent completed: 3 employee(s) marked absent
   ```

## Important Notes
- **Vercel Serverless**: On Vercel, cron jobs don't run continuously. You need to:
  - Use Vercel Cron Jobs (add to `vercel.json`)
  - OR use external cron service (e.g., cron-job.org)
  - OR manually trigger via admin panel

- **Database**: Absence records are permanent unless manually edited by admin

- **Leave Priority**: Employees on approved leave are NOT marked absent

## Vercel Cron Configuration
Add to `vercel.json` for automatic scheduling on Vercel:

```json
{
  "crons": [
    {
      "path": "/api/admin/attendance/auto-absent",
      "schedule": "0 12 * * *"
    }
  ]
}
```

## Admin Panel Integration
Admins can:
1. View auto-absent schedule
2. Manually trigger auto-absent
3. See list of employees marked absent
4. Edit absence records if needed (via Edit Time button)

## Future Enhancements
- Email/SMS notifications to absent employees
- Configurable cutoff time (not hardcoded to 12 PM)
- Grace period for late check-ins
- Exceptions for specific employees or departments
