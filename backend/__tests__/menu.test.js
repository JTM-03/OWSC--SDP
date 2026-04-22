/**
 * Menu Module Tests
 * Tests: list items, get by id, create (admin/staff), update, delete
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

const ADMIN_ID = 99906;

function token(id, role = 'admin') {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

let createdItemId;

describe('Menu Module', () => {

  beforeAll(async () => {
    await prisma.member.upsert({
      where: { id: ADMIN_ID },
      update: {},
      create: {
        id: ADMIN_ID, fullName: 'Menu Admin', nic: `MENUADM${ADMIN_ID}`,
        address: '1 Admin St', phone: '0775555555', email: `menuadmin${ADMIN_ID}@owsc.test`,
        username: `menuadmin${ADMIN_ID}`, passwordHash: 'x', status: 'Active', role: 'admin',
      },
    });
  });

  // ── List Menu Items ───────────────────────────────────────────────────────
  describe('GET /api/menu', () => {
    it('should return array of menu items (public)', async () => {
      const res = await request(app).get('/api/menu');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── Create Menu Item ──────────────────────────────────────────────────────
  describe('POST /api/menu', () => {
    it('should allow admin to create a menu item', async () => {
      const res = await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .field('name',     'Test Burger')
        .field('category', 'Main Course')
        .field('price',    '1200');

      expect(res.statusCode).toBe(201);
      expect(res.body.menuItem).toHaveProperty('name', 'Test Burger');
      createdItemId = res.body.menuItem.id;
    });

    it('should return 403 for non-admin/staff', async () => {
      // Use ADMIN_ID but with a member-role DB record via a separate seeded member
      const memberToken = jwt.sign({ id: 99906 + 1000 }, process.env.JWT_SECRET, { expiresIn: '1h' });
      // Seed a plain member
      await prisma.member.upsert({
        where: { id: 99906 + 1000 }, update: {},
        create: {
          id: 99906 + 1000, fullName: 'Plain Member', nic: `PLNMEM${99906 + 1000}`,
          address: '3 Plain St', phone: '0775500001', email: `plainmem${99906 + 1000}@owsc.test`,
          username: `plainmem${99906 + 1000}`, passwordHash: 'x', status: 'Active', role: 'member',
        },
      });
      const res = await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${memberToken}`)
        .field('name',     'Hack Burger')
        .field('category', 'Main Course')
        .field('price',    '100');

      await prisma.member.deleteMany({ where: { id: 99906 + 1000 } });
      expect(res.statusCode).toBe(403);
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .field('name', 'No Price Item');
      // price is missing

      expect(res.statusCode).toBe(400);
    });
  });

  // ── Get Menu Item by ID ───────────────────────────────────────────────────
  describe('GET /api/menu/:id', () => {
    it('should return menu item details', async () => {
      const res = await request(app).get(`/api/menu/${createdItemId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id', createdItemId);
    });

    it('should return 404 for non-existent item', async () => {
      const res = await request(app).get('/api/menu/999999');
      expect(res.statusCode).toBe(404);
    });
  });

  // ── Update Menu Item ──────────────────────────────────────────────────────
  describe('PUT /api/menu/:id', () => {
    it('should allow admin to update a menu item', async () => {
      const res = await request(app)
        .put(`/api/menu/${createdItemId}`)
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .field('name',               'Updated Burger')
        .field('category',           'Main Course')
        .field('price',              '1500')
        .field('availabilityStatus', 'Unavailable');

      expect(res.statusCode).toBe(200);
      expect(res.body.menuItem.availabilityStatus).toBe('Unavailable');
    });
  });

  // ── Delete Menu Item ──────────────────────────────────────────────────────
  describe('DELETE /api/menu/:id', () => {
    it('should allow admin to delete a menu item', async () => {
      const res = await request(app)
        .delete(`/api/menu/${createdItemId}`)
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);

      expect(res.statusCode).toBe(200);
      createdItemId = null; // already deleted
    });

    it('should return 404 for already-deleted item', async () => {
      const res = await request(app)
        .delete('/api/menu/999999')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // ── Teardown ──────────────────────────────────────────────────────────────
  afterAll(async () => {
    if (createdItemId) {
      await prisma.menuItem.deleteMany({ where: { id: createdItemId } });
    }
    await prisma.member.deleteMany({ where: { id: ADMIN_ID } });
    await prisma.$disconnect();
  });
});
