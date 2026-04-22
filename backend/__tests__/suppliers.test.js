/**
 * Suppliers Module Tests
 * Tests: list, create, update, delete
 *
 * NOTE: requireRole re-fetches the user from DB, so 403 tests need a real
 * DB member with role:'member', not just a JWT claim.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

const ADMIN_ID  = 99910;
const STAFF_ID  = 99911;
const PLAIN_ID  = 99912; // role: member — used for 403 tests

function token(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

let createdSupplierId;

describe('Suppliers Module', () => {

  beforeAll(async () => {
    await prisma.member.upsert({
      where: { id: ADMIN_ID }, update: {},
      create: {
        id: ADMIN_ID, fullName: 'Supplier Admin', nic: `SUPADM${ADMIN_ID}`,
        address: '1 Admin St', phone: '0771000001', email: `supadmin${ADMIN_ID}@owsc.test`,
        username: `supadmin${ADMIN_ID}`, passwordHash: 'x', status: 'Active', role: 'admin',
      },
    });
    await prisma.member.upsert({
      where: { id: STAFF_ID }, update: {},
      create: {
        id: STAFF_ID, fullName: 'Supplier Staff', nic: `SUPSTF${STAFF_ID}`,
        address: '2 Staff St', phone: '0771000002', email: `supstaff${STAFF_ID}@owsc.test`,
        username: `supstaff${STAFF_ID}`, passwordHash: 'x', status: 'Active', role: 'staff',
      },
    });
    await prisma.member.upsert({
      where: { id: PLAIN_ID }, update: {},
      create: {
        id: PLAIN_ID, fullName: 'Plain Member', nic: `SUPPLAIN${PLAIN_ID}`,
        address: '3 Plain St', phone: '0771000003', email: `supplain${PLAIN_ID}@owsc.test`,
        username: `supplain${PLAIN_ID}`, passwordHash: 'x', status: 'Active', role: 'member',
      },
    });
  });

  // ── List Suppliers ────────────────────────────────────────────────────────
  describe('GET /api/suppliers', () => {
    it('should return paginated suppliers for admin', async () => {
      const res = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });

    it('should also work for staff role', async () => {
      const res = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${token(STAFF_ID)}`);
      expect(res.statusCode).toBe(200);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/suppliers');
      expect(res.statusCode).toBe(401);
    });

    it('should return 403 for plain member', async () => {
      const res = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${token(PLAIN_ID)}`);
      expect(res.statusCode).toBe(403);
    });
  });

  // ── Create Supplier ───────────────────────────────────────────────────────
  describe('POST /api/suppliers', () => {
    it('should allow admin to create a supplier', async () => {
      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({
          name: 'Test Supplier Co',
          contactPerson: 'John Doe',
          phone: '0771234567',
          email: `testsupplier${ADMIN_ID}@vendor.test`,
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.supplier).toHaveProperty('name', 'Test Supplier Co');
      createdSupplierId = res.body.supplier.id;
    });

    it('should reject invalid phone number', async () => {
      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({ name: 'Bad Phone Co', phone: '12345' });
      expect(res.statusCode).toBe(400);
    });

    it('should return 403 for staff role (create is admin-only)', async () => {
      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${token(STAFF_ID)}`)
        .send({ name: 'Staff Supplier', phone: '0771234567' });
      expect(res.statusCode).toBe(403);
    });
  });

  // ── Update Supplier ───────────────────────────────────────────────────────
  describe('PUT /api/suppliers/:id', () => {
    it('should allow admin to update a supplier', async () => {
      const res = await request(app)
        .put(`/api/suppliers/${createdSupplierId}`)
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({ name: 'Updated Supplier Co', phone: '0779876543' });
      expect(res.statusCode).toBe(200);
      expect(res.body.supplier.name).toBe('Updated Supplier Co');
    });

    it('should return 404 for non-existent supplier', async () => {
      const res = await request(app)
        .put('/api/suppliers/999999')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({ name: 'Ghost Supplier', phone: '0771234567' });
      expect(res.statusCode).toBe(404);
    });
  });

  // ── Delete Supplier ───────────────────────────────────────────────────────
  describe('DELETE /api/suppliers/:id', () => {
    it('should allow admin to delete a supplier', async () => {
      const res = await request(app)
        .delete(`/api/suppliers/${createdSupplierId}`)
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);
      expect(res.statusCode).toBe(200);
      createdSupplierId = null;
    });
  });

  // ── Teardown ──────────────────────────────────────────────────────────────
  afterAll(async () => {
    if (createdSupplierId) await prisma.supplier.deleteMany({ where: { id: createdSupplierId } });
    await prisma.member.deleteMany({ where: { id: { in: [ADMIN_ID, STAFF_ID, PLAIN_ID] } } });
    await prisma.$disconnect();
  });
});
