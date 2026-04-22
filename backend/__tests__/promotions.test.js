/**
 * Promotions Module Tests
 * Tests: list, create (admin), update, deactivate (soft delete)
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

const ADMIN_ID = 99914;

function token(id, role = 'admin') {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

let createdPromoId;

describe('Promotions Module', () => {

  beforeAll(async () => {
    await prisma.member.upsert({
      where: { id: ADMIN_ID }, update: {},
      create: {
        id: ADMIN_ID, fullName: 'Promo Admin', nic: `PROMADM${ADMIN_ID}`,
        address: '1 Admin St', phone: '0771000030', email: `promoadmin${ADMIN_ID}@owsc.test`,
        username: `promoadmin${ADMIN_ID}`, passwordHash: 'x', status: 'Active', role: 'admin',
      },
    });
  });

  // ── List Promotions ───────────────────────────────────────────────────────
  describe('GET /api/promotions', () => {
    it('should return paginated promotions (public)', async () => {
      const res = await request(app).get('/api/promotions');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });

    it('should filter active-only promotions', async () => {
      const res = await request(app).get('/api/promotions?activeOnly=true');
      expect(res.statusCode).toBe(200);
      res.body.data.forEach(p => expect(p.isActive).toBe(true));
    });
  });

  // ── Create Promotion ──────────────────────────────────────────────────────
  describe('POST /api/promotions', () => {
    it('should allow admin to create a promotion', async () => {
      const res = await request(app)
        .post('/api/promotions')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({
          title:       'Test Promo 20% Off',
          description: 'Get 20% off all drinks',
          validUntil:  '2026-12-31T23:59:59.000Z',
          isActive:    true,
        });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('title', 'Test Promo 20% Off');
      createdPromoId = res.body.id;
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/promotions')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({ title: 'Incomplete Promo' }); // missing description and validUntil
      expect(res.statusCode).toBe(400);
    });

    it('should return 403 for non-admin', async () => {
      const plainId = 99914 + 1000;
      await prisma.member.upsert({
        where: { id: plainId }, update: {},
        create: {
          id: plainId, fullName: 'Plain Member', nic: `PROMOPLAIN${plainId}`,
          address: '3 Plain St', phone: '0771000031', email: `promoplain${plainId}@owsc.test`,
          username: `promoplain${plainId}`, passwordHash: 'x', status: 'Active', role: 'member',
        },
      });
      const res = await request(app)
        .post('/api/promotions')
        .set('Authorization', `Bearer ${jwt.sign({ id: plainId }, process.env.JWT_SECRET, { expiresIn: '1h' })}`)
        .send({
          title: 'Hack Promo', description: 'x',
          validUntil: '2026-12-31T23:59:59.000Z',
        });
      await prisma.member.deleteMany({ where: { id: plainId } });
      expect(res.statusCode).toBe(403);
    });
  });

  // ── Update Promotion ──────────────────────────────────────────────────────
  describe('PUT /api/promotions/:id', () => {
    it('should allow admin to update a promotion', async () => {
      const res = await request(app)
        .put(`/api/promotions/${createdPromoId}`)
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({
          title:       'Updated Promo 30% Off',
          description: 'Now 30% off',
          validUntil:  '2026-12-31T23:59:59.000Z',
          isActive:    true,
        });
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Updated Promo 30% Off');
    });
  });

  // ── Deactivate (Soft Delete) ──────────────────────────────────────────────
  describe('DELETE /api/promotions/:id', () => {
    it('should soft-delete (deactivate) a promotion', async () => {
      const res = await request(app)
        .delete(`/api/promotions/${createdPromoId}`)
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);
      expect(res.statusCode).toBe(200);

      // Verify it's deactivated, not hard-deleted
      const promo = await prisma.promotion.findUnique({ where: { id: createdPromoId } });
      expect(promo).not.toBeNull();
      expect(promo.isActive).toBe(false);
    });
  });

  // ── Teardown ──────────────────────────────────────────────────────────────
  afterAll(async () => {
    if (createdPromoId) {
      await prisma.promotion.deleteMany({ where: { id: createdPromoId } });
    }
    await prisma.member.deleteMany({ where: { id: ADMIN_ID } });
    await prisma.$disconnect();
  });
});
