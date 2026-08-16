# 🚀 Deploy Backend to GitHub & Vercel

## Step 1: Create GitHub Repository

### Option A: Using GitHub Website (Recommended)
1. Go to https://github.com/new
2. **Repository name**: `expert-solutions-attendance-backend`
3. **Description**: `Backend API for Expert Solutions Attendance System with face recognition`
4. **Visibility**: Private (recommended) or Public
5. **DO NOT** initialize with README, .gitignore, or license (we already have them)
6. Click **"Create repository"**

### Option B: Using Command Line (if you have GitHub CLI)
```bash
gh repo create expert-solutions-attendance-backend --private --source=. --remote=origin
```

## Step 2: Push Code to GitHub

After creating the repository on GitHub, copy the repository URL and run:

```bash
cd /Users/apple/Projects/attendence/backend

# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/expert-solutions-attendance-backend.git

# Push code
git branch -M main
git push -u origin main
```

**Example** (if your username is "johndoe"):
```bash
git remote add origin https://github.com/johndoe/expert-solutions-attendance-backend.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Vercel

### 3.1: Sign Up/Login to Vercel
1. Go to https://vercel.com/signup
2. Sign up with GitHub (recommended)

### 3.2: Import Project
1. Click **"Add New..."** → **"Project"**
2. Select **"Import Git Repository"**
3. Choose your repository: `expert-solutions-attendance-backend`
4. Click **"Import"**

### 3.3: Configure Project
**Framework Preset**: Other  
**Root Directory**: ./  
**Build Command**: (leave empty)  
**Output Directory**: (leave empty)  
**Install Command**: `npm install`

### 3.4: Add Environment Variables
Click **"Environment Variables"** and add these:

| Name | Value |
|------|-------|
| `MONGODB_URI` | `mongodb+srv://anishpatel0655_db_user:kH24x6Vpf7OQ8kyE@attendencedata.okeyuqd.mongodb.net/?appName=AttendenceData` |
| `JWT_SECRET` | `cb48c1278ae97e0e359ec3a91b7d5381d3592d95ac61a34969adb787f3973340` |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |
| `SUPERADMIN_USERNAME` | `superadmin` |
| `SUPERADMIN_PASSWORD` | `SuperAdmin@123` |
| `SUPERADMIN_EMAIL` | `admin@expertsolutions.com` |
| `IMGBB_API_KEY` | `69a13199c795ac16a0d03a3e08a033bc` |

### 3.5: Deploy
1. Click **"Deploy"**
2. Wait 1-2 minutes for deployment
3. You'll get a URL like: `https://expert-solutions-attendance-backend.vercel.app`

## Step 4: Update Flutter App

### 4.1: Copy Vercel URL
After deployment, copy your Vercel URL (e.g., `https://expert-solutions-attendance-backend.vercel.app`)

### 4.2: Update constants.dart
Edit: `/Users/apple/Projects/attendence/flutter_app/lib/utils/constants.dart`

Change:
```dart
static const String baseUrl = 'http://10.189.214.236:3000/api';
```

To:
```dart
static const String baseUrl = 'https://YOUR_VERCEL_URL.vercel.app/api';
```

**Example**:
```dart
static const String baseUrl = 'https://expert-solutions-attendance-backend.vercel.app/api';
```

### 4.3: Rebuild APK
```bash
cd /Users/apple/Projects/attendence/flutter_app
flutter build apk --release --split-per-abi
```

### 4.4: Install New APK
```bash
flutter install --release
```

## Step 5: Test

### 5.1: Test Backend
Visit your Vercel URL in browser:
```
https://YOUR_VERCEL_URL.vercel.app/health
```

Should return:
```json
{
  "success": true,
  "message": "Expert Solutions Attendance System API is running",
  "timestamp": "2026-08-04T..."
}
```

### 5.2: Test Login from Phone
Open app and login:
- Username: `anish`
- Password: `Anish@123`

Should work from **ANY network** now! 🎉

## Troubleshooting

### Error: "Repository not found"
- Make sure you created the repository on GitHub
- Check the repository URL is correct
- Verify you have access to the repository

### Error: "Permission denied"
Run:
```bash
git config credential.helper store
```
Then try pushing again. GitHub will ask for credentials.

### Vercel Deployment Failed
Check:
1. Environment variables are set correctly
2. MongoDB URI is correct
3. No syntax errors in code
4. Check Vercel deployment logs

### App still can't connect
1. Make sure you updated `constants.dart` with correct Vercel URL
2. Rebuilt and reinstalled APK
3. Check Vercel logs for errors: https://vercel.com/YOUR_USERNAME/expert-solutions-attendance-backend/logs

## Important Notes

⚠️ **Security**:
- Repository is set to **Private** to protect credentials
- Never commit `.env` file (it's in `.gitignore`)
- Change default passwords in production

✅ **Benefits**:
- Backend accessible from **anywhere**
- No need for same WiFi
- Free Vercel hosting
- Automatic HTTPS
- Auto-deploy on git push

🔄 **Future Updates**:
To update backend:
```bash
cd /Users/apple/Projects/attendence/backend
git add .
git commit -m "Your update message"
git push
```
Vercel will auto-deploy the changes!

## Next Steps

1. ✅ Create GitHub repository
2. ✅ Push code to GitHub
3. ✅ Deploy to Vercel
4. ✅ Add environment variables
5. ✅ Update Flutter app with Vercel URL
6. ✅ Rebuild and install APK
7. ✅ Test from phone (any network!)

**That's it! Your app will work from anywhere in the world!** 🌍
