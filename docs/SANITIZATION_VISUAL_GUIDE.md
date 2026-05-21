# Input Sanitization - Visual Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INPUT                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
   ┌─────────────┐              ┌──────────────────┐
   │  FRONTEND   │              │    BACKEND       │
   │ (Browser)   │              │   (Node.js)      │
   └─────────────┘              └──────────────────┘
        │                                 │
        │ useSanitizedForm()              │ validate() middleware
        │ sanitizeString()                │ sanitizeObject()
        │ sanitizeEmail()                 │ Schema transforms
        │ sanitizePhone()                 │
        │                                 │
        ▼                                 ▼
   ┌─────────────┐              ┌──────────────────┐
   │ VALIDATION  │              │   VALIDATION     │
   │ (Real-time) │              │   (Server-side)  │
   └─────────────┘              └──────────────────┘
        │                                 │
        └────────────────┬────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │   DATABASE   │
                  │  (Sanitized) │
                  └──────────────┘
```

## Data Flow - Registration Example

```
User Types: "  <script>alert('xss')</script>  "
                         │
                         ▼
            ┌─────────────────────────┐
            │  Frontend Sanitization  │
            │  - Trim whitespace      │
            │  - Remove scripts       │
            │  - Remove event handlers│
            └─────────────────────────┘
                         │
                         ▼
Result: "<script>alert('xss')</script>"
                         │
                         ▼
            ┌─────────────────────────┐
            │  Send to Backend        │
            │  POST /auth/register    │
            └─────────────────────────┘
                         │
                         ▼
            ┌─────────────────────────┐
            │  Backend Sanitization   │
            │  - Trim whitespace      │
            │  - Escape HTML          │
            │  - Remove scripts       │
            └─────────────────────────┘
                         │
                         ▼
Result: "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;"
                         │
                         ▼
            ┌─────────────────────────┐
            │  Validation             │
            │  - Check format         │
            │  - Check constraints    │
            │  - Validate rules       │
            └─────────────────────────┘
                         │
                         ▼
            ┌─────────────────────────┐
            │  Store in Database      │
            │  (Fully Sanitized)      │
            └─────────────────────────┘
```

## Sanitization Pipeline

### String Sanitization
```
Input: "  <img src=x onerror=alert('xss')>  "
  │
  ├─ Step 1: Trim
  │  "  <img src=x onerror=alert('xss')>  " → "<img src=x onerror=alert('xss')>"
  │
  ├─ Step 2: Remove Dangerous Chars
  │  "<img src=x onerror=alert('xss')>" → "<img src=x >"
  │
  ├─ Step 3: Escape HTML
  │  "<img src=x >" → "&lt;img src=x &gt;"
  │
  └─ Output: "&lt;img src=x &gt;"
```

### Email Sanitization
```
Input: "  USER@EXAMPLE.COM  "
  │
  ├─ Step 1: Trim
  │  "  USER@EXAMPLE.COM  " → "USER@EXAMPLE.COM"
  │
  ├─ Step 2: Lowercase
  │  "USER@EXAMPLE.COM" → "user@example.com"
  │
  └─ Output: "user@example.com"
```

### Phone Sanitization
```
Input: "+1 (555) 123-4567"
  │
  ├─ Step 1: Trim
  │  "+1 (555) 123-4567" → "+1 (555) 123-4567"
  │
  ├─ Step 2: Remove Non-Digits (except leading +)
  │  "+1 (555) 123-4567" → "+15551234567"
  │
  └─ Output: "+15551234567"
```

## Form Component Integration

```
┌──────────────────────────────────────────────────────┐
│              React Form Component                     │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  useSanitizedForm Hook         │
        │  ├─ values                     │
        │  ├─ errors                     │
        │  ├─ touched                    │
        │  ├─ handleChange               │
        │  ├─ handleBlur                 │
        │  ├─ handleSubmit               │
        │  └─ resetForm                  │
        └────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌─────────┐    ┌──────────┐    ┌──────────┐
   │ Sanitize │    │ Validate │    │  Display │
   │  Input   │    │  Field   │    │  Errors  │
   └─────────┘    └──────────┘    └──────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                         ▼
            ┌─────────────────────────┐
            │  Submit Sanitized Data  │
            │  to Backend API         │
            └─────────────────────────┘
```

## Validation Schema Transform

```
┌─────────────────────────────────────────────────────┐
│  Zod Schema with Sanitization Transform             │
└─────────────────────────────────────────────────────┘

fullName: z.string()
    .transform(val => sanitizeString(val))    ← Sanitize
    .min(2, 'Too short')                       ← Validate
    .regex(/^[a-zA-Z\s]+$/, 'Invalid chars')   ← Validate

email: z.string()
    .transform(val => sanitizeEmail(val))     ← Sanitize
    .email('Invalid email')                    ← Validate

phone: z.string()
    .transform(val => sanitizePhone(val))     ← Sanitize
    .regex(/^07\d{8}$/, 'Invalid format')     ← Validate
```

## Middleware Flow

```
┌──────────────────────────────────────────────────────┐
│  Express Request                                      │
│  POST /auth/register                                 │
│  Body: { fullName: "  John  ", email: "USER@..." }  │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  validate() Middleware         │
        │  1. Sanitize: sanitizeObject() │
        │  2. Validate: schema.parse()   │
        │  3. Store: req.validatedData   │
        └────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  Route Handler                 │
        │  const data = req.validatedData │
        │  // data is sanitized & valid  │
        └────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  Database Operation            │
        │  db.create(data)               │
        └────────────────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                   SECURITY LAYERS                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Layer 1: Frontend Sanitization                         │
│  ├─ Trim whitespace                                     │
│  ├─ Remove scripts                                      │
│  └─ Real-time validation feedback                       │
│                                                          │
│  Layer 2: Backend Sanitization                          │
│  ├─ Automatic sanitization middleware                   │
│  ├─ HTML escaping                                       │
│  └─ Dangerous character removal                         │
│                                                          │
│  Layer 3: Validation                                    │
│  ├─ Format validation (email, phone)                    │
│  ├─ Length constraints                                  │
│  └─ Pattern matching                                    │
│                                                          │
│  Layer 4: Database                                      │
│  ├─ Parameterized queries                               │
│  ├─ Type constraints                                    │
│  └─ Unique constraints                                  │
│                                                          │
│  Layer 5: Output Escaping                               │
│  ├─ React auto-escaping                                 │
│  ├─ DOMPurify for HTML content                          │
│  └─ Text content for user data                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Attack Prevention

```
┌──────────────────────────────────────────────────────┐
│  ATTACK TYPE: XSS (Cross-Site Scripting)             │
├──────────────────────────────────────────────────────┤
│  Attack: <script>alert('xss')</script>               │
│  Prevention:                                          │
│  ├─ Frontend: Remove script tags                      │
│  ├─ Backend: Escape HTML special characters           │
│  └─ Output: React auto-escaping                       │
│  Result: &lt;script&gt;alert(...)&lt;/script&gt;     │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  ATTACK TYPE: SQL Injection                          │
├──────────────────────────────────────────────────────┤
│  Attack: '; DROP TABLE users; --                     │
│  Prevention:                                          │
│  ├─ Backend: Parameterized queries                    │
│  ├─ Validation: Input format checking                 │
│  └─ Database: Type constraints                        │
│  Result: Query safely executed with parameters        │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  ATTACK TYPE: Path Traversal                         │
├──────────────────────────────────────────────────────┤
│  Attack: ../../../etc/passwd                         │
│  Prevention:                                          │
│  ├─ Frontend: Filename sanitization                   │
│  ├─ Backend: Remove ../ sequences                     │
│  └─ Validation: Whitelist allowed characters          │
│  Result: etc_passwd (safe filename)                   │
└──────────────────────────────────────────────────────┘
```

## Implementation Timeline

```
Week 1: Backend Setup ✅
├─ Create sanitize.js utility
├─ Update validate middleware
├─ Update validation schemas
└─ Test backend sanitization

Week 2: Frontend Setup ✅
├─ Create sanitize.ts utility
├─ Create useSanitizedForm hook
├─ Create example component
└─ Test frontend sanitization

Week 3: Integration (To Do)
├─ Update all form components
├─ Add real-time validation
├─ Add error messages
└─ Test end-to-end

Week 4: Testing & Deployment (To Do)
├─ Security testing
├─ Performance testing
├─ Documentation review
└─ Production deployment
```

## File Size Reference

```
Backend Sanitization
├─ sanitize.js ..................... 5.1 KB
├─ validate.js (modified) .......... 1.2 KB
└─ schemas.js (modified) ........... ~3 KB
Total Backend: ~9.3 KB

Frontend Sanitization
├─ sanitize.ts ..................... 6.6 KB
├─ useSanitizedForm.ts ............. 6.3 KB
└─ SanitizedFormExample.tsx ........ ~4 KB
Total Frontend: ~16.9 KB

Documentation
├─ INPUT_SANITIZATION_GUIDE.md ..... ~15 KB
├─ SANITIZATION_IMPLEMENTATION_CHECKLIST.md ~12 KB
├─ SANITIZATION_QUICK_START.md ..... ~8 KB
├─ SANITIZATION_SUMMARY.md ......... ~10 KB
└─ SANITIZATION_VISUAL_GUIDE.md .... ~8 KB
Total Documentation: ~53 KB
```

## Quick Reference Card

```
┌─────────────────────────────────────────────────────┐
│  SANITIZATION QUICK REFERENCE                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Backend:                                            │
│  const { sanitizeString } = require('./sanitize');  │
│  const clean = sanitizeString(userInput);           │
│                                                      │
│  Frontend:                                           │
│  import { useSanitizedForm } from './hooks';        │
│  const { values, handleChange } = useSanitizedForm()│
│                                                      │
│  Validation:                                         │
│  .transform(val => sanitizeString(val))             │
│  .min(2, 'Too short')                               │
│                                                      │
│  Display:                                            │
│  <div>{userContent}</div>  // React escapes         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Status Dashboard

```
┌─────────────────────────────────────────────────────┐
│  IMPLEMENTATION STATUS                               │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Backend Sanitization ................ ✅ Complete  │
│  Frontend Sanitization ............... ✅ Complete  │
│  Custom Form Hook .................... ✅ Complete  │
│  Example Component ................... ✅ Complete  │
│  Documentation ....................... ✅ Complete  │
│                                                      │
│  Form Component Updates .............. ⏳ Pending   │
│  Security Testing .................... ⏳ Pending   │
│  Production Deployment ............... ⏳ Pending   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

**Ready to Use:** ✅ All infrastructure in place
**Next Step:** Update your form components to use the sanitization system
