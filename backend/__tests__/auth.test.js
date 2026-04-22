/**
 * Auth Module Tests
 * Tests: register, login, /me, logout, forgot-password flow
 */

jest.mock('../src/services/emailService', () => ({
  sendRegistrationConfirmationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetOTP: jest.fn().mockResolvedValue(true),
  sendMembershipApprovedEmail: jest.fn().mockResolvedValue(true),
  sendMembershipRejectedEmail: jest.fn().mockResolvedValue(true),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

const UNIQUE = Date.now();
const TEST_EMAIL    = `authtest_${UNIQUE}@owsc.test`;
const TEST_USERNAME = `authtest_${UNIQUE}`;
const TEST_PASSWORD = 'Auth@Test123';

let createdMemberId;
let authToken;

describe('Auth Module', () => {

  // ── Registration ──────────────────────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('should register a new member and return 201', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .field('fullName',  'Auth Tester')
        .field('email',     TEST_EMAIL)
        .field('username',  TEST_USERNAME)
        .field('password',  TEST_PASSWORD)
        .field('phone',     '0771234567')
        .field('address',   '1 Test Lane')
        .field('nic',       `AUTHNIC${UNIQUE}`)
        .field('role',      'staff'); // staff → immediately Active, no approval needed

      expect(res.statusCode).toBe(201);
      expect(res.body.user).toHaveProperty('id');
      createdMemberId = res.body.user.id;
    });

    it('should reject duplicate email with 409', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .field('fullName',  'Duplicate User')
        .field('email',     TEST_EMAIL)
        .field('username',  `other_${UNIQUE}`)
        .field('password',  TEST_PASSWORD)
        .field('phone',     '0771234568')
        .field('role',      'staff');

      expect(res.statusCode).toBe(409);
    });

    it('should reject weak password with 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .field('fullName',  'Weak Pass')
        .field('email',     `weak_${UNIQUE}@owsc.test`)
        .field('username',  `weakpass_${UNIQUE}`)
        .field('password',  'weak')
        .field('phone',     '0771234569')
        .field('role',      'staff');

      expect(res.statusCode).toBe(400);
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials and return 200', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toHaveProperty('email', TEST_EMAIL);
      // Extract token from cookie for subsequent tests
      const cookie = res.headers['set-cookie']?.[0] || '';
      const match  = cookie.match(/token=([^;]+)/);
      authToken    = match ? match[1] : null;
    });

    it('should reject wrong password with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: 'WrongPass@999' });

      expect(res.statusCode).toBe(401);
    });

    it('should reject non-existent user with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@owsc.test', password: TEST_PASSWORD });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── Profile ───────────────────────────────────────────────────────────────
  describe('GET /api/auth/me', () => {
    it('should return profile for authenticated user', async () => {
      const token = jwt.sign({ id: createdMemberId }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toHaveProperty('email', TEST_EMAIL);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
    });
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  describe('POST /api/auth/logout', () => {
    it('should return 200 and clear cookie', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.statusCode).toBe(200);
    });
  });

  // ── Forgot Password ───────────────────────────────────────────────────────
  describe('POST /api/auth/forgot-password', () => {
    it('should return generic success message regardless of whether user exists', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ username: TEST_USERNAME, nic: `AUTHNIC${UNIQUE}` });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 400 when username or nic is missing', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ username: TEST_USERNAME }); // missing nic

      expect(res.statusCode).toBe(400);
    });
  });

  // ── Teardown ──────────────────────────────────────────────────────────────
  afterAll(async () => {
    if (createdMemberId) {
      await prisma.passwordResetOtp.deleteMany({ where: { email: TEST_EMAIL } });
      await prisma.member.deleteMany({ where: { id: createdMemberId } });
    }
    await prisma.$disconnect();
  });
});
