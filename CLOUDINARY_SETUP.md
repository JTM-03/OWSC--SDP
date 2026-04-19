# Environment Variables Configuration (.env)

## Cloudinary Setup for Receipt Upload System

Add these lines to your `backend/.env` file:

```env
# ========================================
# CLOUDINARY CONFIGURATION
# ========================================
# Required for receipt upload functionality
# Get these from: https://cloudinary.com/console/settings/api

CLOUDINARY_CLOUD_NAME=<your_cloud_name>
CLOUDINARY_API_KEY=<your_api_key>
CLOUDINARY_API_SECRET=<your_api_secret>
```

## How to Get Cloudinary Credentials

### Step 1: Create Cloudinary Account
1. Go to https://cloudinary.com
2. Click "Sign Up" 
3. Create a free account (no credit card required for free tier)
4. Verify your email

### Step 2: Get Your Credentials
1. Log in to Cloudinary dashboard
2. Navigate to **Settings** > **API** (or direct URL: https://cloudinary.com/console/settings/api)
3. You will see:
   - **Cloud Name** - Your unique identifier (e.g., "djz1abc2de")
   - **API Key** - Public API key (e.g., "123456789012345")
   - **API Secret** - Keep this secret! (e.g., "abcdefghijk_xyz123")

### Step 3: Add to .env
Copy and paste the three values:

```env
CLOUDINARY_CLOUD_NAME=djz1abc2de
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijk_xyz123
```

## Example Complete Backend .env File

```env
# ========================================
# DATABASE
# ========================================
DATABASE_URL="postgresql://user:password@localhost:5433/rms_db"

# ========================================
# JWT & AUTHENTICATION
# ========================================
JWT_SECRET="your_jwt_secret_key"
JWT_EXPIRY="7d"

# ========================================
# EMAIL SERVICE (Optional)
# ========================================
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_app_password"
SENDER_EMAIL="noreply@restaurant.com"

# ========================================
# CLOUDINARY (REQUIRED for Receipt Uploads)
# ========================================
CLOUDINARY_CLOUD_NAME=djz1abc2de
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijk_xyz123

# ========================================
# SERVER
# ========================================
PORT=5000
NODE_ENV=development
```

## Testing Cloudinary Connection

After adding the credentials, test the connection:

### Option 1: Test via Backend Server
1. Start your backend server: `npm run dev`
2. Check server logs for any Cloudinary connection errors
3. The service will initialize on startup

### Option 2: Test via API
Upload a test receipt:

```bash
curl -X POST http://localhost:5000/api/payments/upload/membership \
  -F "membershipId=1" \
  -F "amount=15000" \
  -F "paymentMethod=Bank Transfer" \
  -F "receipt=@/path/to/test-image.jpg" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Option 3: Manual Test in Code
Create a test file `backend/test-cloudinary.js`:

```javascript
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Test connection by uploading a simple text file
console.log('Testing Cloudinary connection...');
console.log('Cloud Name:', cloudinary.config().cloud_name);
console.log('API Key:', cloudinary.config().api_key ? 'Configured' : 'Missing');
console.log('API Secret:', cloudinary.config().api_secret ? 'Configured' : 'Missing');

console.log('✓ Cloudinary configured successfully!');
```

Then run: `node test-cloudinary.js`

## Free Tier Limits

Cloudinary's free tier provides:
- **10GB storage** - For uploaded files/receipts
- **20GB bandwidth** - For serving files
- **300 transformations/month** - Image processing
- **Unlimited API calls** - For upload/delete

This is MORE than sufficient for a restaurant management system's receipt uploads.

## Security Best Practices

1. **Never commit .env to git** - Add to .gitignore
2. **Keep API Secret private** - Only store server-side
3. **Use environment variables** - Don't hardcode credentials
4. **Rotate credentials regularly** - Change if exposed
5. **Monitor Cloudinary dashboard** - Check API usage

## Cloudinary Folder Organization

Files are automatically organized into:
```
cloud_storage/
├── receipts/
│   ├── membership/    (Membership payment receipts)
│   ├── booking/       (Venue booking payment receipts)
│   └── order/         (Order payment receipts)
```

This helps organize and manage files by payment type.

## Potential Issues & Solutions

### Issue: "Cloudinary API credentials missing"
**Solution**: Ensure all three env variables are set:
```bash
echo $CLOUDINARY_CLOUD_NAME
echo $CLOUDINARY_API_KEY
echo $CLOUDINARY_API_SECRET
```

### Issue: "401 Unauthorized" from Cloudinary
**Solutions**:
- Double-check credentials from dashboard
- Ensure no extra spaces in .env values
- Restart server after updating .env

### Issue: Environment variables not loading
**Solutions**:
- Install dotenv: `npm install dotenv`
- Ensure .env is in correct directory (backend/)
- Check .env syntax (no quotes needed unless value has spaces)

### Issue: Files not uploading but API says success
**Solutions**:
- Check Cloudinary storage quota
- Verify Cloudinary dashboard can see files
- Check network connectivity
- Review Cloudinary API logs

## Upgrade Path (Future)

As your restaurant grows, upgrade Cloudinary plan:
- **Starter Plan**: More transformations, priority support
- **Advanced**: Custom domains, video processing
- **Enterprise**: Dedicated support, SLA guarantees

## Storage Estimate

Average receipt file sizes:
- JPG image: 200-500 KB
- PNG image: 300-800 KB
- PDF: 100-300 KB

For 1,000 members with 1 receipt each: ~500 MB (0.5 GB)
Free tier supports: 10 GB = 20,000+ receipts

## Quick Reference

| Item | Value |
|------|-------|
| Provider | Cloudinary |
| Cost | Free > $99/month |
| Best For | Simple image storage |
| Integration | REST API |
| Setup Time | 5 minutes |
| Documentation | cloudinary.com/documentation |

## Summary Steps

1. ✓ Sign up at cloudinary.com
2. ✓ Go to Settings > API
3. ✓ Copy Cloud Name, API Key, API Secret
4. ✓ Add to backend/.env
5. ✓ Restart backend server
6. ✓ Done! System ready for use

No further configuration needed. The system handles everything automatically!
