/**
 * Staff Module Tests
 * Tests: list staff, update role, assign to venue
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

const ADMIN_ID  = 99916;
const STAFF_ID  = 99917;
const VENUE_ID  = 99802;

function token(id, role = 'admin') {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

describe('Staff Module', () => {

  beforeAll(async () => {
    await prisma.member.upsert({
      where: { id: ADMIN_ID }, update: {},
      create: {
        id: ADMIN_ID, fullName: 'Staff Admin', nic: `STFADM${ADMIN_ID}`,
        address: '1 Admin St', phone: '0771000050', email: `stfadmin${ADMIN_ID}@owsc.test`,
        username: `stfadmin${ADMIN_ID}`, passwordHash: 'x', status: 'Active', role: 'admin',
      },
    });
    await prisma.member.upsert({
      where: { id: STAFF_ID }, update: {},
      create: {
        id: STAFF_ID, fullName: 'Test Staff', nic: `STFMEM${STAFF_ID}`,
        address: '2 Staff St', phone: '0771000051', email: `stfmem${STAFF_ID}@owsc.test`,
        username: `stfmem${STAFF_ID}`, passwordHash: 'x', status: 'Active', role: 'staff',
      },
    });
    await prisma.venue.upsert({
      where: { id: VENUE_ID }, update: {},
      create: {
        id: VENUE_ID, name: 'Staff Test Venue', capacity: 30,
        charge: 3000, isAvailable: true,
      },
    });
  });

  // ── List Staff ────────────────────────────────────────────────────────────
  describe('GET /api/staff', () => {
    it('should return paginated staff list for admin', async () => {
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      // All returned users should be staff or admin
      res.body.data.forEach(s => expect(['staff', 'admin']).toContain(s.role));
    });

    it('should return 403 for non-admin', async () => {
      const plainId = 99916 + 1000;
      await prisma.member.upsert({
        where: { id: plainId }, update: {},
        create: {
          id: plainId, fullName: 'Plain Member', nic: `STFPLAIN${plainId}`,
          address: '3 Plain St', phone: '0771000052', email: `stfplain${plainId}@owsc.test`,
          username: `stfplain${plainId}`, passwordHash: 'x', status: 'Active', role: 'member',
        },
      });
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${jwt.sign({ id: plainId }, process.env.JWT_SECRET, { expiresIn: '1h' })}`);
      await prisma.member.deleteMany({ where: { id: plainId } });
      expect(res.statusCode).toBe(403);
    });

    it('should support search filter', async () => {
      const res = await request(app)
        .get('/api/staff?search=Test Staff')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);
      expect(res.statusCode).toBe(200);
    });
  });

  // ── Update Role ───────────────────────────────────────────────────────────
  describe('PUT /api/staff/:id/role', () => {
    it('should allow admin to change a staff role', async () => {
      const res = await request(app)
        .put(`/api/staff/${STAFF_ID}/role`)
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({ role: 'admin' });
      expect(res.statusCode).toBe(200);
      expect(res.body.user.role).toBe('admin');

      // Restore role
      await prisma.member.update({ where: { id: STAFF_ID }, data: { role: 'staff' } });
    });

    it('should return 400 for invalid role', async () => {
      const res = await request(app)
        .put(`/api/staff/${STAFF_ID}/role`)
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({ role: 'superuser' });
      expect(res.statusCode).toBe(400);
    });

    it('should return 404 for non-existent member', async () => {
      const res = await request(app)
        .put('/api/staff/999999/role')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({ role: 'staff' });
      expect(res.statusCode).toBe(404);
    });
  });

  // ── Assign Staff to Venue ─────────────────────────────────────────────────
  describe('POST /api/staff/assign', () => {
    it('should assign a staff member to a venue', async () => {
      const res = await request(app)
        .post('/api/staff/assign')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({ staffId: STAFF_ID, venueId: VENUE_ID, shift: 'Morning' });
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/assigned/i);
    });

    it('should return 404 for non-existent staff', async () => {
      const res = await request(app)
        .post('/api/staff/assign')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({ staffId: 999999, venueId: VENUE_ID, shift: 'Morning' });
      expect(res.statusCode).toBe(404);
    });
  });

  // ── Teardown ──────────────────────────────────────────────────────────────
  afterAll(async () => {
    await prisma.venueAssignment.deleteMany({ where: { staffId: STAFF_ID } });
    await prisma.venue.deleteMany({ where: { id: VENUE_ID } });
    await prisma.member.deleteMany({ where: { id: { in: [ADMIN_ID, STAFF_ID] } } });
    await prisma.$disconnect();
  });
});
