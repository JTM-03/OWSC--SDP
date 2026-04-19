# Configuration Setup Guide

## Overview
This guide explains how to properly configure the application for different environments (development, staging, production) to avoid hardcoded localhost URLs and other environment-specific issues.

## Files Created/Modified

### 1. **backend/src/config/environment.js** (NEW)
Centralized configuration file that manages all environment-specific URLs and settings.

**Features:**
- Automatically detects the environment (development, staging, production)
- Provides consistent URLs across the application
- Exports configuration for use in services and middleware

**Usage:**
```javascript
const config = require('../config/environment');

// Access URLs
console.log(config.baseUrl);        // http://localhost:5000
console.log(config.frontendUrl);    // http://localhost:5173
console.log(config.emailLoginUrl);  // http://localhost:5173/login
```

### 2. **backend/.env** (MODIFIED)
Updated to include new environment variables:

```env
NODE_ENV=development
BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
```

### 3. **backend/.env.example** (NEW)
Template file showing all available configuration options for different environments.

### 4. **backend/src/services/emailService.js** (MODIFIED)
Updated to use the config file instead of hardcoded localhost URLs.

**Before:**
```javascript
<a href="http://localhost:5173/login">Login</a>
```

**After:**
```javascript
const config = require('../config/environment');
<a href="${config.emailLoginUrl}">Login</a>
```

## Environment Setup

### Development Environment
```env
NODE_ENV=development
PORT=5000
BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
```

### Staging Environment
```env
NODE_ENV=staging
PORT=5000
BASE_URL=https://staging-api.yourdomain.com
FRONTEND_URL=https://staging.yourdomain.com
```

### Production Environment
```env
NODE_ENV=production
PORT=5000
BASE_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

## How to Use

### In Backend Services
```javascript
const config = require('../config/environment');

// Use config URLs instead of hardcoded values
const loginUrl = config.emailLoginUrl;
const apiUrl = config.apiUrl;
const corsOrigin = config.corsOrigin;
```

### In Frontend (Already Configured)
The frontend already uses environment variables:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
```

Create a `.env` file in the Frontend directory:
```env
VITE_API_URL=http://localhost:5000/api
```

For production:
```env
VITE_API_URL=https://api.yourdomain.com/api
```

## Configuration Priority

The configuration system uses this priority order:

1. **Environment Variables** (highest priority)
   - `BASE_URL`
   - `FRONTEND_URL`
   - `NODE_ENV`

2. **Default Values** (lowest priority)
   - Development: `http://localhost:5000`
   - Staging: `https://staging-api.yourdomain.com`
   - Production: `https://api.yourdomain.com`

## Next Steps

### 1. Update Other Services
Search for other hardcoded URLs and update them to use the config:

```bash
# Search for hardcoded URLs
grep -r "localhost" backend/src --include="*.js"
grep -r "127.0.0.1" backend/src --include="*.js"
```

### 2. Update CORS Configuration
In your Express app (backend/src/app.js or backend/src/server.js):

```javascript
const config = require('./config/environment');

app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
```

### 3. Update API Base URLs
In any service that makes API calls:

```javascript
const config = require('../config/environment');

const apiClient = axios.create({
  baseURL: config.apiUrl
});
```

### 4. Environment-Specific Logging
```javascript
const config = require('../config/environment');

console.log(`🚀 Server running in ${config.env} mode`);
console.log(`📍 Base URL: ${config.baseUrl}`);
console.log(`🌐 Frontend URL: ${config.frontendUrl}`);
```

## Deployment Checklist

- [ ] Set `NODE_ENV=production` on production server
- [ ] Set `BASE_URL` to your production API domain
- [ ] Set `FRONTEND_URL` to your production frontend domain
- [ ] Update database connection string for production
- [ ] Update JWT_SECRET to a strong production value
- [ ] Update all API keys (Brevo, Cloudinary, etc.)
- [ ] Test email links point to correct production URLs
- [ ] Verify CORS settings allow production frontend domain

## Troubleshooting

### Issue: Emails still have localhost URLs
**Solution:** Ensure `emailService.js` is using the config file and restart the server.

### Issue: CORS errors in production
**Solution:** Check that `config.corsOrigin` matches your frontend domain exactly.

### Issue: API calls failing
**Solution:** Verify `BASE_URL` and `FRONTEND_URL` are correctly set in `.env`.

## Security Notes

- Never commit `.env` files to version control
- Use `.env.example` as a template for team members
- Rotate `JWT_SECRET` regularly
- Use strong, unique values for production secrets
- Store sensitive values in secure environment management systems (AWS Secrets Manager, etc.)
