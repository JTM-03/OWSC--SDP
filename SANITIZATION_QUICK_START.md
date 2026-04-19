# Input Sanitization - Quick Start Guide

## What Was Added

A complete input sanitization system to protect against XSS, injection attacks, and other security vulnerabilities.

## Files Created

### Backend
1. **`backend/src/utils/sanitize.js`** - Sanitization utility functions
2. **`backend/.env.example`** - Environment template (from previous setup)

### Frontend
1. **`Frontend/src/utils/sanitize.ts`** - Frontend sanitization utilities
2. **`Frontend/src/hooks/useSanitizedForm.ts`** - Custom form hook
3. **`Frontend/src/components/examples/SanitizedFormExample.tsx`** - Example component

### Documentation
1. **`INPUT_SANITIZATION_GUIDE.md`** - Comprehensive guide
2. **`SANITIZATION_IMPLEMENTATION_CHECKLIST.md`** - Implementation checklist
3. **`SANITIZATION_QUICK_START.md`** - This file

## Files Modified

### Backend
1. **`backend/src/middleware/validate.js`** - Added automatic sanitization
2. **`backend/src/validation/schemas.js`** - Added sanitization transforms

## How It Works

### Backend Flow
```
User Input → Middleware (sanitizeObject) → Validation (with transforms) → Database
```

### Frontend Flow
```
User Input → Form Hook (sanitizeField) → Validation → API Request
```

## Quick Implementation

### Backend - Already Done ✅
The backend is already configured. All routes using the `validate()` middleware will automatically sanitize input.

```javascript
// Example route (already working)
router.post('/register', validate(registerSchema), async (req, res) => {
  // req.validatedData contains sanitized data
  const userData = req.validatedData;
  // ... rest of handler
});
```

### Frontend - Update Your Forms

#### Option 1: Use the Custom Hook (Recommended)

```typescript
import { useSanitizedForm } from '../hooks/useSanitizedForm';

const MyForm = () => {
  const { values, errors, handleChange, handleBlur, handleSubmit } = useSanitizedForm(
    { name: '', email: '', phone: '' },
    {
      name: { type: 'string', required: true, minLength: 2 },
      email: { type: 'email', required: true },
      phone: { type: 'phone', required: true }
    },
    async (formData) => {
      // Submit sanitized data
      await api.post('/endpoint', formData);
    }
  );

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="name"
        value={values.name}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {errors.name && <span>{errors.name}</span>}
      
      <input
        name="email"
        type="email"
        value={values.email}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {errors.email && <span>{errors.email}</span>}
      
      <button type="submit">Submit</button>
    </form>
  );
};
```

#### Option 2: Manual Sanitization

```typescript
import { sanitizeString, sanitizeEmail, sanitizePhone } from '../utils/sanitize';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const sanitized = {
    name: sanitizeString(formData.name),
    email: sanitizeEmail(formData.email),
    phone: sanitizePhone(formData.phone)
  };
  
  await api.post('/endpoint', sanitized);
};
```

## What Gets Sanitized

### Strings
- Whitespace trimmed
- HTML special characters escaped
- Script tags removed
- Event handlers removed

### Emails
- Trimmed
- Converted to lowercase

### Phone Numbers
- Only digits and leading + preserved

### Objects
- Recursively sanitized
- All string values processed

## Testing

### Test with XSS Payload
```
Input: <script>alert('xss')</script>
Output: &lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;
```

### Test with Spaces
```
Input: "  hello world  "
Output: "hello world"
```

### Test with Email
```
Input: "  USER@EXAMPLE.COM  "
Output: "user@example.com"
```

## Common Use Cases

### 1. Registration Form
```typescript
const { values, handleChange, handleSubmit } = useSanitizedForm(
  { fullName: '', email: '', phone: '', password: '' },
  {
    fullName: { type: 'string', required: true },
    email: { type: 'email', required: true },
    phone: { type: 'phone', required: true },
    password: { type: 'string', required: true }
  }
);
```

### 2. Comment Form
```typescript
const { values, handleChange, handleSubmit } = useSanitizedForm(
  { comment: '' },
  { comment: { type: 'string', required: true, maxLength: 500 } }
);
```

### 3. Profile Update
```typescript
const { values, handleChange, handleSubmit } = useSanitizedForm(
  { bio: '', website: '', location: '' },
  {
    bio: { type: 'string', maxLength: 160 },
    website: { type: 'string' },
    location: { type: 'string' }
  }
);
```

## Validation Helpers

### Check Email Validity
```typescript
import { isValidEmail } from '../utils/sanitize';

if (!isValidEmail(email)) {
  setError('Invalid email format');
}
```

### Check Phone Validity
```typescript
import { isValidPhone } from '../utils/sanitize';

if (!isValidPhone(phone)) {
  setError('Phone must be 07XXXXXXXX');
}
```

### Check Password Strength
```typescript
import { isStrongPassword, getPasswordStrength } from '../utils/sanitize';

const strength = getPasswordStrength(password); // 'weak' | 'medium' | 'strong'

if (!isStrongPassword(password)) {
  setError('Password not strong enough');
}
```

## Display User Content Safely

### React (Default - Safe)
```typescript
// React escapes by default - SAFE
<div>{userContent}</div>
```

### If You Need HTML
```typescript
import DOMPurify from 'dompurify';

// Sanitize before displaying
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />
```

## Troubleshooting

### Issue: Form not submitting
**Check:** Are all required fields filled? Are there validation errors?

### Issue: Data looks different after sanitization
**Expected:** Whitespace trimmed, HTML escaped, special chars removed

### Issue: Email validation failing
**Check:** Email must be valid format (user@domain.com)

### Issue: Phone validation failing
**Check:** Phone must be 07XXXXXXXX format

## Next Steps

1. **Update all forms** to use `useSanitizedForm` hook
2. **Test with malicious input** to verify sanitization works
3. **Review the example component** for implementation patterns
4. **Check the comprehensive guide** for advanced usage

## Example Component

See `Frontend/src/components/examples/SanitizedFormExample.tsx` for a complete working example with:
- All field types
- Real-time validation
- Error messages
- Password strength indicator
- Form reset functionality

## Security Checklist

- [x] Backend sanitization implemented
- [x] Frontend sanitization utilities created
- [x] Custom form hook created
- [x] Example component provided
- [ ] Update all forms in your app
- [ ] Test with XSS payloads
- [ ] Test with SQL injection payloads
- [ ] Deploy to production

## Support

For detailed information, see:
- `INPUT_SANITIZATION_GUIDE.md` - Comprehensive guide
- `SANITIZATION_IMPLEMENTATION_CHECKLIST.md` - Step-by-step checklist
- `Frontend/src/components/examples/SanitizedFormExample.tsx` - Working example

## Key Functions Reference

### Backend
```javascript
const { sanitizeString, sanitizeEmail, sanitizePhone, sanitizeObject } = require('../utils/sanitize');
```

### Frontend
```typescript
import {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeObject,
  isValidEmail,
  isValidPhone,
  isStrongPassword,
  getPasswordStrength
} from '../utils/sanitize';

import { useSanitizedForm } from '../hooks/useSanitizedForm';
```

---

**Status:** ✅ Ready to use
**Last Updated:** April 2026
