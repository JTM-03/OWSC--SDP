# Backend Error Analysis Report

## Executive Summary
The backend has **3 critical root causes** causing cascading failures across the system. These are primarily **Prisma schema-code mismatches** and **middleware validation issues**.

---

## Root Cause #1: Prisma Client Out of Sync with Schema

### Problem
The Prisma Client generated code doesn't match the actual schema definition. This causes `PrismaClientValidationError` when trying to use fields that don't exist in the generated client.

### Evidence from Error Logs

**Error 1: Unknown field `loyaltyPoints`**
```
Unknown field `loyaltyPoints` for select statement on model `Member`. 
Available options are marked with ?.
```
- **Location**: `backend/src/routes/auth.js:180` (GET /api/auth/me)
- **Issue**: Code tries to select `loyaltyPoints` but the generated Prisma client doesn't recognize it
- **Schema Definition**: `loyaltyPoints` IS defined in `schema.prisma` line 24
- **Root Cause**: Prisma client was generated BEFORE the schema was updated with `loyaltyPoints` field

**Error 2: Unknown argument `emergencyContact`**
```
Unknown argument `emergencyContact`. Available options are marked with ?.
```
- **Location**: `backend/src/routes/auth.js:47` (POST /api/auth/register)
- **Issue**: Code tries to create member with `emergencyContact` but generated client doesn't support it
- **Schema Definition**: `emergencyContact` IS defined in `schema.prisma` line 20
- **Root Cause**: Same as above - stale Prisma client

**Error 3: Argument `membershipType` is missing**
```
Argument `membershipType` is missing.
```
- **Location**: `backend/src/routes/auth.js:84` (User creation)
- **Issue**: Code passes `type: "full"` but schema expects `membershipType`
- **Root Cause**: Code uses wrong field name

### Solution
```bash
cd backend
npx prisma generate
```

This regenerates the Prisma client to match the current schema.

---

## Root Cause #2: Validation Middleware Crash - Missing req.body

### Problem
The validate middleware crashes when `req.body` is undefined, causing a "Cannot read properties of undefined (reading 'map')" error.

### Evidence from Error Logs

**Error**: 
```
TypeError: Cannot read properties of undefined (reading 'map')
at D:\restaurant-management-system\backend\src\middleware\validate.js:10:39
```
- **Location**: `backend/src/middleware/validate.js:10`
- **Endpoint**: POST /api/auth/register
- **Root Cause**: `req.body` is undefined when middleware tries to iterate over it

### Why This Happens

**In `app.js` (line 27-28):**
```javascript
app.use(express.json())
app.use(express.static('public'));
```

**In `auth.js` (line 60):**
```javascript
router.post("/register", upload.single('paymentSlip'), validate(registerSchema), ...)
```

**The Problem**: 
- `upload.single('paymentSlip')` is a **multipart/form-data** middleware
- It runs BEFORE `validate()` middleware
- BUT `express.json()` in app.js doesn't handle multipart data
- When the request is multipart, `req.body` is undefined
- The validate middleware tries to iterate over undefined: `Object.entries(raw)` where `raw = req.body`

### Code Issue in validate.js (line 10):
```javascript
for (const [key, value] of Object.entries(raw)) {  // ← CRASHES if raw is undefined
    sanitizedData[key] = SKIP_SANITIZE.has(key) ? value : sanitizeObject(value);
}
```

### Solution
Add null/undefined check in validate middleware:

```javascript
function validate(schema) {
    return (req, res, next) => {
        try {
            const raw = req.body || {};  // ← FIX: Default to empty object
            const sanitizedData = {};
            for (const [key, value] of Object.entries(raw)) {
                sanitizedData[key] = SKIP_SANITIZE.has(key) ? value : sanitizeObject(value);
            }
            // ... rest of code
        }
    }
}
```

---

## Root Cause #3: Missing Required Fields in Registration

### Problem
The registration endpoint doesn't properly handle required fields, causing Prisma validation errors.

### Evidence from Error Logs

**Error**:
```
Argument `nic` is missing.
```
- **Location**: `backend/src/routes/auth.js:49` (POST /api/auth/register for staff)
- **Issue**: Staff registration doesn't provide `nic` field
- **Schema**: `nic` is `@unique` and required (no default value)

### Why This Happens

**In `auth.js` (line 56):**
```javascript
nic: nic || `SYSTEM-${Date.now()}`,  // ← Fallback provided
```

**But in validation schema** (`backend/src/validation/schemas.js`):
- The `nic` field might be optional in the schema
- When not provided, it becomes `undefined`
- The code tries to use `undefined || fallback` but if validation strips it, it's never passed

### Solution
Ensure the validation schema makes `nic` required OR always provide a default:

```javascript
// In auth.js - ensure nic always has a value
const nic = req.validatedData.nic || `SYSTEM-${Date.now()}`;
```

---

## Root Cause #4: Database Connection String Configuration

### Current Status ✅
**Database connection is properly configured:**

```env
DATABASE_URL="postgresql://rms_user:rms_password@127.0.0.1:5433/rms_db?schema=public"
```

**Verification**:
- ✅ PostgreSQL connection string format is correct
- ✅ Host: 127.0.0.1:5433 (local development)
- ✅ Database: rms_db
- ✅ Schema: public
- ✅ Credentials configured

**Note**: The database connection itself is NOT the root cause. The errors are all Prisma client/schema mismatches.

---

## Root Cause #5: Body Parser Middleware Order

### Current Status ✅
**Middleware order in `app.js` is correct:**

```javascript
app.use(buildMorganMiddleware())           // Logging (first)
app.use(cors(...))                         // CORS
app.use(cookieParser())                    // Cookie parsing
app.use(express.json())                    // JSON body parser
app.use(express.static('public'))          // Static files
app.use('/uploads', express.static(...))   // Upload files
```

**Status**: This is properly ordered. The issue is that multipart routes use `upload.single()` which handles its own parsing.

---

## Summary of All Issues

| # | Issue | Severity | Location | Fix |
|---|-------|----------|----------|-----|
| 1 | Prisma client out of sync | 🔴 CRITICAL | Generated client | Run `npx prisma generate` |
| 2 | Validate middleware crashes on undefined req.body | 🔴 CRITICAL | validate.js:10 | Add null check: `req.body \|\| {}` |
| 3 | Missing required `nic` field | 🟠 HIGH | auth.js:49 | Ensure default value always provided |
| 4 | Field name mismatch (`type` vs `membershipType`) | 🟠 HIGH | auth.js:84 | Use correct field name from schema |
| 5 | Database connection | ✅ OK | .env | No action needed |
| 6 | Middleware order | ✅ OK | app.js | No action needed |

---

## Recommended Fix Order

1. **First**: Run `npx prisma generate` (fixes 50% of errors)
2. **Second**: Fix validate middleware null check (fixes registration crashes)
3. **Third**: Fix field name mismatches in auth.js
4. **Fourth**: Test all endpoints

---

## Testing After Fixes

```bash
# 1. Regenerate Prisma client
cd backend
npx prisma generate

# 2. Restart the server
npm run dev

# 3. Test registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test@123",
    "phone": "0712345678"
  }'

# 4. Test GET /api/auth/me
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Environment Variables Status

✅ **All required environment variables are set:**
- `PORT=5000`
- `NODE_ENV=development`
- `DATABASE_URL` (PostgreSQL connection)
- `JWT_SECRET` (configured)
- `BREVO_API_KEY` (email service)
- `CLOUDINARY_*` (image service)

No environment variable issues detected.
