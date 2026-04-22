/**
 * Admin Module Tests
 * Tests: dashboard stats, list members, pending memberships, upgrade requests, CSV export
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

const ADMIN_ID  = 99920;
const MEMBER_ID = 99921;

function token(id, role = 'admin') {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

describe('Admin Module', () => {

  beforeAll(async () => {
    await prisma.member.upsert({
      where: { id: ADMIN_ID }, update: {},
      create: {
        id: ADMIN_ID, fullName: 'Dashboard Admin', nic: `DASADM${ADMIN_ID}`,
        address: '1 Admin St', phone: '0771000070', email: `dasadmin${ADMIN_ID}@owsc.test`,
        username: `dasadmin${ADMIN_ID}`, passwordHash: 'x', status: 'Active', role: 'admin',
      },
    });
    await prisma.member.upsert({
      where: { id: MEMBER_ID }, update: {},
      create: {
        id: MEMBER_ID, fullName: 'Dashboard Member', nic: `DASMEM${MEMBER_ID}`,
        address: '2 Member St', phone: '0771000071', email: `dasmem${MEMBER_ID}@owsc.test`,
        username: `dasmem${MEMBER_ID}`, passwordHash: 'x', status: 'Active', role: 'member',
      },
    });
  });

  // ── Dashboard Stats ───────────────────────────────────────────────────────
  describe('GET /api/admin/stats', () => {
    it('should return KPIs and revenue chart for admin', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('kpis');
      expect(res.body.kpis).toHaveProperty('revenue');
      expect(res.body.kpis).toHaveProperty('activeBookings');
      expect(res.body.kpis).toHaveProperty('pendingApprovals');
      expect(res.body.kpis).toHaveProperty('lowStock');
      expect(res.body).toHaveProperty('revenueData');
      expect(Array.isArray(res.body.revenueData)).toBe(true);
    });

    it('should support month range', async () => {
      const res = await request(app)
        .get('/api/admin/stats?range=month')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.revenueData.length).toBe(30);
    });

    it('should return 403 for non-admin/staff', async () => {
      const plainId = 99920 + 1000;
      await prisma.member.upsert({
        where: { id: plainId }, update: {},
        create: {
          id: plainId, fullName: 'Plain Member', nic: `ADMPLAIN${plainId}`,
          address: '3 Plain St', phone: '0771000072', email: `admplain${plainId}@owsc.test`,
          username: `admplain${plainId}`, passwordHash: 'x', status: 'Active', role: 'member',
        },
      });
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${jwt.sign({ id: plainId }, process.env.JWT_SECRET, { expiresIn: '1h' })}`);
      await prisma.member.deleteMany({ where: { id: plainId } });
      expect(res.statusCode).toBe(403);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/admin/stats');
      expect(res.statusCode).toBe(401);
    });
  });

  // ── List Members ──────────────────────────────────────────────────────────
  describe('GET /api/admin/members', () => {
    it('should return paginated member list for admin', async () => {
      const res = await request(app)
        .get('/api/admin/members')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      // All returned users should have role 'member'
      res.body.data.forEach(m => expect(m.role).toBe('member'));
    });

    it('should support search filter', async () => {
      const res = await request(app)
        .get('/api/admin/members?search=Dashboard Member')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.some(m => m.id === MEMBER_ID)).toBe(true);
    });

    it('should return 403 for non-admin', async () => {
      const plainId = 99920 + 2000;
      await prisma.member.upsert({
        where: { id: plainId }, update: {},
        create: {
          id: plainId, fullName: 'Plain Member2', nic: `ADMPLAIN2${plainId}`,
          address: '4 Plain St', phone: '0771000073', email: `admplain2${plainId}@owsc.test`,
          username: `admplain2${plainId}`, passwordHash: 'x', status: 'Active', role: 'member',
        },
      });
      const res = await request(app)
        .get('/api/admin/members')
        .set('Authorization', `Bearer ${jwt.sign({ id: plainId }, process.env.JWT_SECRET, { expiresIn: '1h' })}`);
      await prisma.member.deleteMany({ where: { id: plainId } });
      expect(res.statusCode).toBe(403);
    });
  });

  // ── Pending Memberships ───────────────────────────────────────────────────
  describe('GET /api/admin/pending-memberships', () => {
    it('should return paginated pending memberships', async () => {
      const res = await request(app)
        .get('/api/admin/pending-memberships')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });
  });

  // ── Upgrade Requests ──────────────────────────────────────────────────────
  describe('GET /api/admin/upgrade-requests', () => {
    it('should return paginated upgrade requests', async () => {
      const res = await request(app)
        .get('/api/admin/upgrade-requests')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  // ── Update Member Status ──────────────────────────────────────────────────
  describe('PUT /api/admin/members/:id/status', () => {
    it('should allow admin to update member status', async () => {
      const res = await request(app)
        .put(`/api/admin/members/${MEMBER_ID}/status`)
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({ status: 'Suspended' });
      expect(res.statusCode).toBe(200);

      // Restore
      await prisma.member.update({ where: { id: MEMBER_ID }, data: { status: 'Active' } });
    });
  });

  // ── CSV Export ────────────────────────────────────────────────────────────
  describe('GET /api/admin/export/:area', () => {
    const areas = ['members', 'bookings', 'orders', 'inventory', 'revenue'];

    areas.forEach(area => {
      it(`should export ${area} as CSV`, async () => {
        const res = await request(app)
          .get(`/api/admin/export/${area}`)
          .set('Authorization', `Bearer ${token(ADMIN_ID)}`);
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/csv/);
      });
    });

    it('should return 400 for invalid export area', async () => {
      const res = await request(app)
        .get('/api/admin/export/invalid_area')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);
      expect(res.statusCode).toBe(400);
    });
  });

  // ── Teardown ──────────────────────────────────────────────────────────────
  afterAll(async () => {
    await prisma.member.deleteMany({ where: { id: { in: [ADMIN_ID, MEMBER_ID] } } });
    await prisma.$disconnect();
  });
});
