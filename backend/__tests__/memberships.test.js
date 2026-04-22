/**
 * Membership Module Tests
 * Tests: plans list, register membership, get my membership, admin approve/reject
 */

jest.mock('../src/services/emailService', () => ({
  sendMembershipApprovedEmail: jest.fn().mockResolvedValue(true),
  sendMembershipRejectedEmail: jest.fn().mockResolvedValue(true),
  sendRegistrationConfirmationEmail: jest.fn().mockResolvedValue(true),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

const MEMBER_ID = 99902;
const ADMIN_ID  = 99903;

function token(id, role = 'member') {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

let membershipId;

describe('Membership Module', () => {

  beforeAll(async () => {
    // Seed test member
    await prisma.member.upsert({
      where: { id: MEMBER_ID },
      update: {},
      create: {
        id: MEMBER_ID, fullName: 'Membership Tester', nic: `MEMNIC${MEMBER_ID}`,
        address: '1 Test St', phone: '0771111111', email: `memtest${MEMBER_ID}@owsc.test`,
        username: `memtest${MEMBER_ID}`, passwordHash: 'x', status: 'Active', role: 'member',
      },
    });
    // Seed admin
    await prisma.member.upsert({
      where: { id: ADMIN_ID },
      update: {},
      create: {
        id: ADMIN_ID, fullName: 'Admin Tester', nic: `ADMNIC${ADMIN_ID}`,
        address: '2 Admin St', phone: '0772222222', email: `admintest${ADMIN_ID}@owsc.test`,
        username: `admintest${ADMIN_ID}`, passwordHash: 'x', status: 'Active', role: 'admin',
      },
    });
  });

  // ── Plans ─────────────────────────────────────────────────────────────────
  describe('GET /api/membership/plans', () => {
    it('should return all membership plans (public)', async () => {
      const res = await request(app).get('/api/membership/plans');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('price');
    });
  });

  // ── Register Membership ───────────────────────────────────────────────────
  describe('POST /api/membership/register', () => {
    it('should create a pending membership for an active member', async () => {
      const res = await request(app)
        .post('/api/membership/register')
        .set('Authorization', `Bearer ${token(MEMBER_ID)}`)
        .send({ planId: 'sport' });

      expect(res.statusCode).toBe(201);
      expect(res.body.membership).toHaveProperty('status', 'Pending');
      membershipId = res.body.membership.id;
    });

    it('should reject duplicate active membership', async () => {
      // Activate the membership first
      await prisma.user.update({ where: { id: membershipId }, data: { status: 'Active' } });

      const res = await request(app)
        .post('/api/membership/register')
        .set('Authorization', `Bearer ${token(MEMBER_ID)}`)
        .send({ planId: 'full' });

      expect(res.statusCode).toBe(400);
    });

    it('should reject invalid plan ID', async () => {
      const res = await request(app)
        .post('/api/membership/register')
        .set('Authorization', `Bearer ${token(MEMBER_ID)}`)
        .send({ planId: 'nonexistent_plan' });

      expect(res.statusCode).toBe(400);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/membership/register')
        .send({ planId: 'sport' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── My Membership ─────────────────────────────────────────────────────────
  describe('GET /api/membership/my', () => {
    it('should return the member\'s membership', async () => {
      const res = await request(app)
        .get('/api/membership/my')
        .set('Authorization', `Bearer ${token(MEMBER_ID)}`);

      expect(res.statusCode).toBe(200);
    });
  });

  // ── Admin: List All ───────────────────────────────────────────────────────
  describe('GET /api/membership/all', () => {
    it('should return all memberships for admin', async () => {
      const res = await request(app)
        .get('/api/membership/all')
        .set('Authorization', `Bearer ${token(ADMIN_ID, 'admin')}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 403 for non-admin', async () => {
      const res = await request(app)
        .get('/api/membership/all')
        .set('Authorization', `Bearer ${token(MEMBER_ID, 'member')}`);

      expect(res.statusCode).toBe(403);
    });
  });

  // ── Admin: Approve/Reject ─────────────────────────────────────────────────
  describe('PUT /api/membership/:id/status', () => {
    it('should allow admin to update membership status', async () => {
      // Reset to Pending first
      await prisma.user.update({ where: { id: membershipId }, data: { status: 'Pending' } });

      const res = await request(app)
        .put(`/api/membership/${membershipId}/status`)
        .set('Authorization', `Bearer ${token(ADMIN_ID, 'admin')}`)
        .send({ status: 'Active' });

      expect(res.statusCode).toBe(200);
      expect(res.body.membership.status).toBe('Active');
    });

    it('should return 400 for invalid status', async () => {
      const res = await request(app)
        .put(`/api/membership/${membershipId}/status`)
        .set('Authorization', `Bearer ${token(ADMIN_ID, 'admin')}`)
        .send({ status: 'InvalidStatus' });

      expect(res.statusCode).toBe(400);
    });
  });

  // ── Teardown ──────────────────────────────────────────────────────────────
  afterAll(async () => {
    await prisma.membershipPayment.deleteMany({ where: { memberId: { in: [MEMBER_ID, ADMIN_ID] } } });
    await prisma.user.deleteMany({ where: { memberId: { in: [MEMBER_ID, ADMIN_ID] } } });
    await prisma.member.deleteMany({ where: { id: { in: [MEMBER_ID, ADMIN_ID] } } });
    await prisma.$disconnect();
  });
});
