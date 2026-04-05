# Authentication API Testing

## Test the Authentication Endpoints

### 1. Register a New User

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "password": "password123",
    "phone": "+94771234567",
    "role": "member"
  }'
```

**Expected Response:**
```json
{
  "message": "Registration successful",
  "user": {
    "id": 1,
    "fullName": "John Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "role": "member",
    "registrationDate": "2026-01-26T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Login

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### 3. Get Profile (Protected)

**Request:**
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Update Profile

**Request:**
```bash
curl -X PUT http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Updated",
    "phone": "+94777654321"
  }'
```

### 5. Refresh Token

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Test Error Cases

### Invalid Email
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test",
    "email": "invalid-email",
    "username": "test",
    "password": "password123"
  }'
```

### Duplicate Email
Register the same email twice

### Wrong Password
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "wrongpassword"
  }'
```

### No Token
```bash
curl -X GET http://localhost:5000/api/auth/me
```
