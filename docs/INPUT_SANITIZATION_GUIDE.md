# Input Sanitization Guide

## Overview
This guide explains the input sanitization system implemented to protect against XSS (Cross-Site Scripting), injection attacks, and other security vulnerabilities.

## Backend Sanitization

### Files Created/Modified

#### 1. **backend/src/utils/sanitize.js** (NEW)
Comprehensive sanitization utility module with functions for different input types.

**Available Functions:**

```javascript
// Basic string sanitization
sanitizeString(value)        // Trims, removes dangerous chars, escapes HTML
trimString(value)            // Removes leading/trailing whitespace
escapeHtml(value)            // Escapes HTML special characters
removeDangerousChars(value)  // Removes script tags and event handlers

// Specialized sanitization
sanitizeEmail(email)         // Trims and converts to lowercase
sanitizePhone(phone)         // Removes non-digit characters
sanitizeUrl(url)             // Validates and encodes URL
sanitizeNumber(value)        // Ensures valid number
sanitizeBoolean(value)       // Converts to boolean
sanitizeFilename(filename)   // Removes path traversal attempts
sanitizeObject(obj)          // Recursively sanitizes object
```

#### 2. **backend/src/middleware/validate.js** (MODIFIED)
Updated to automatically sanitize input before validation.

**Before:**
```javascript
const validatedData = schema.parse(req.body);
```

**After:**
```javascript
const sanitizedData = sanitizeObject(req.body);
const validatedData = schema.parse(sanitizedData);
```

#### 3. **backend/src/validation/schemas.js** (MODIFIED)
Updated all schemas to include sanitization transformations.

**Before:**
```javascript
fullName: z.string().min(2, 'Full name must be at least 2 characters')
```

**After:**
```javascript
fullName: z.string()
    .transform(val => sanitizeString(val))
    .min(2, 'Full name must be at least 2 characters')
```

## Sanitization Flow

```
User Input
    ↓
Middleware: sanitizeObject()
    ↓
Validation: Schema with .transform()
    ↓
Sanitized & Validated Data
    ↓
Database/Response
```

## What Gets Sanitized

### 1. **String Fields**
- Trimmed of whitespace
- HTML special characters escaped
- Dangerous scripts removed
- Event handlers removed

**Example:**
```javascript
Input:  "  <script>alert('xss')</script>  "
Output: "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;"
```

### 2. **Email Fields**
- Trimmed
- Converted to lowercase
- HTML escaped

**Example:**
```javascript
Input:  "  USER@EXAMPLE.COM  "
Output: "user@example.com"
```

### 3. **Phone Fields**
- Trimmed
- Only digits and leading + preserved
- HTML escaped

**Example:**
```javascript
Input:  "+1 (555) 123-4567"
Output: "+15551234567"
```

### 4. **Nested Objects**
- Recursively sanitized
- All string values processed
- Arrays handled correctly

**Example:**
```javascript
Input: {
  user: "  <img src=x onerror=alert('xss')>  ",
  address: {
    street: "  123 Main St  "
  }
}

Output: {
  user: "&lt;img src=x onerror=alert(&#x27;xss&#x27;)&gt;",
  address: {
    street: "123 Main St"
  }
}
```

## Frontend Implementation

### 1. **Input Validation Before Sending**

Create a sanitization utility in the frontend:

```typescript
// Frontend/src/utils/sanitize.ts
export const sanitizeInput = (value: string): string => {
  if (typeof value !== 'string') return value;
  
  // Trim whitespace
  let sanitized = value.trim();
  
  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  return sanitized;
};

export const sanitizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

export const sanitizePhone = (phone: string): string => {
  return phone.replace(/[^\d+]/g, '').replace(/\+/g, (match, offset) => offset === 0 ? match : '');
};
```

### 2. **Form Input Handling**

```typescript
// Frontend/src/components/RegisterForm.tsx
import { sanitizeInput, sanitizeEmail, sanitizePhone } from '../utils/sanitize';

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  
  let sanitizedValue = value;
  
  if (name === 'email') {
    sanitizedValue = sanitizeEmail(value);
  } else if (name === 'phone') {
    sanitizedValue = sanitizePhone(value);
  } else if (name === 'fullName' || name === 'address') {
    sanitizedValue = sanitizeInput(value);
  }
  
  setFormData({
    ...formData,
    [name]: sanitizedValue
  });
};
```

### 3. **Display User Content Safely**

```typescript
// Always escape user-generated content when displaying
import DOMPurify from 'dompurify';

const UserComment = ({ comment }: { comment: string }) => {
  const sanitized = DOMPurify.sanitize(comment);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
};

// Or use text content (safer)
const UserComment = ({ comment }: { comment: string }) => {
  return <div>{comment}</div>; // React escapes by default
};
```

### 4. **API Request Sanitization**

```typescript
// Frontend/src/api/auth.ts
import { sanitizeInput, sanitizeEmail } from '../utils/sanitize';

export const register = async (userData: RegisterData) => {
  const sanitized = {
    fullName: sanitizeInput(userData.fullName),
    email: sanitizeEmail(userData.email),
    username: sanitizeInput(userData.username),
    password: userData.password, // Don't sanitize passwords
    phone: sanitizePhone(userData.phone),
    address: sanitizeInput(userData.address),
    // ... other fields
  };
  
  return api.post('/auth/register', sanitized);
};
```

## Security Best Practices

### 1. **Never Trust User Input**
```javascript
// ❌ BAD - Direct use of user input
const html = `<div>${userInput}</div>`;

// ✅ GOOD - Sanitized and escaped
const sanitized = sanitizeString(userInput);
const html = `<div>${sanitized}</div>`;
```

### 2. **Sanitize at Multiple Levels**
```
Frontend Sanitization (UX)
    ↓
Backend Sanitization (Security)
    ↓
Database Storage (Validation)
    ↓
Display Sanitization (Output)
```

### 3. **Use Parameterized Queries**
```javascript
// ❌ BAD - SQL Injection risk
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ GOOD - Parameterized query
const query = 'SELECT * FROM users WHERE email = $1';
db.query(query, [email]);
```

### 4. **Content Security Policy (CSP)**
Add to your HTML headers:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self'">
```

### 5. **Escape Output**
```typescript
// ✅ React escapes by default
<div>{userContent}</div>

// ❌ Avoid dangerouslySetInnerHTML unless necessary
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ If needed, use DOMPurify
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />
```

## Testing Sanitization

### Backend Test
```javascript
const { sanitizeString, sanitizeEmail } = require('./sanitize');

// Test XSS prevention
const xssInput = '<script>alert("xss")</script>';
const result = sanitizeString(xssInput);
console.log(result); // &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;

// Test email sanitization
const emailInput = '  USER@EXAMPLE.COM  ';
const result = sanitizeEmail(emailInput);
console.log(result); // user@example.com
```

### Frontend Test
```typescript
import { sanitizeInput } from './utils/sanitize';

describe('Sanitization', () => {
  it('should remove script tags', () => {
    const input = '<script>alert("xss")</script>';
    const result = sanitizeInput(input);
    expect(result).not.toContain('<script>');
  });

  it('should trim whitespace', () => {
    const input = '  hello world  ';
    const result = sanitizeInput(input);
    expect(result).toBe('hello world');
  });
});
```

## Common Vulnerabilities Prevented

| Vulnerability | Prevention | Example |
|---|---|---|
| XSS (Cross-Site Scripting) | HTML escaping, script removal | `<script>` → `&lt;script&gt;` |
| SQL Injection | Parameterized queries | Use `$1` placeholders |
| Path Traversal | Filename sanitization | `../../../etc/passwd` → `etc_passwd` |
| Command Injection | Input validation | Whitelist allowed characters |
| Email Injection | Email validation | Reject invalid formats |

## Deployment Checklist

- [ ] Backend sanitization middleware enabled
- [ ] All validation schemas include sanitization transforms
- [ ] Frontend sanitization utilities implemented
- [ ] User input displayed safely (escaped or text content)
- [ ] CSP headers configured
- [ ] Parameterized queries used throughout
- [ ] File upload validation implemented
- [ ] Regular security audits scheduled

## Troubleshooting

### Issue: Legitimate input being rejected
**Solution:** Review sanitization rules, may need to whitelist certain characters

### Issue: HTML entities appearing in output
**Solution:** Ensure you're not double-escaping (sanitize once, not multiple times)

### Issue: Performance degradation
**Solution:** Cache sanitization results for frequently used values

## References

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
