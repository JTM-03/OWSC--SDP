# Login Test Credentials & Troubleshooting Guide

## Test Credentials

The following test accounts have been seeded into the database:

### Admin Account
- **Email:** `admin@owsc.lk`
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** Admin
- **Status:** Active

### Staff Account
- **Email:** `staff@owsc.lk`
- **Username:** `staff`
- **Password:** `staff123`
- **Role:** Staff
- **Status:** Active

### Member Account
- **Email:** `member@owsc.lk`
- **Username:** `member`
- **Password:** `member123`
- **Role:** Member
- **Status:** Active

## Login Features

### Show/Hide Password
The login page includes a password visibility toggle:
- Click the **Eye** icon to reveal the password
- Click the **EyeOff** icon to hide the password again
- This helps verify you're typing the correct password

## Troubleshooting Login Issues

### Check Backend Server
1. Ensure the backend is running: `npm run dev` in the backend directory
2. Backend should be available at `http://localhost:5000`
3. Check the backend terminal for any error messages

### Check Frontend Server
1. Ensure the frontend is running: `npm run dev` in the Frontend directory
2. Frontend should be available at `http://localhost:5173`

### Check Browser Console
1. Open browser DevTools (F12)
2. Go to the Console tab
3. Look for login-related messages:
   - `🔐 Login attempt with:` - Shows when you submit the login form
   - `✅ Login successful:` - Shows when login succeeds
   - `❌ Login error:` - Shows when login fails with detailed error info

### Common Error Messages

#### "Invalid credentials"
- **Cause:** Wrong email or password
- **Solution:** Double-check your credentials, use the test accounts listed above

#### "Account Pending Approval"
- **Cause:** Account status is not 'Active'
- **Solution:** Check Prisma Studio (http://localhost:5555) to verify account status

#### "Network Error"
- **Cause:** Cannot connect to backend server
- **Solution:** Make sure backend is running on port 5000

#### "Account is not active"
- **Cause:** User account status is 'Pending', 'Suspended', or 'Inactive'
- **Solution:** Update status to 'Active' in Prisma Studio

## Verifying Database Setup

1. Open Prisma Studio: `npx prisma studio --port 5555` in the backend directory
2. Navigate to http://localhost:5555
3. Click on "Member" table
4. Verify test accounts exist with correct:
   - Email addresses
   - Usernames
   - Role assignments
   - Status set to 'Active'

## Re-seeding Test Accounts

If test accounts are missing or corrupted:

```bash
cd backend
node seed_users.js
```

This will upsert (create or update) the three test accounts.
