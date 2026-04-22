/**
 * Inventory Module Tests
 * Tests: list inventory, create product, stock update (delivery/usage), returns
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

const ADMIN_ID    = 99907;
const SUPPLIER_ID = 99701;

function token(id, role = 'admin') {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

let createdProductId;

describe('Inventory Module', () => {

  beforeAll(async () => {
    await prisma.member.upsert({
      where: { id: ADMIN_ID },
      update: {},
      create: {
        id: ADMIN_ID, fullName: 'Inv Admin', nic: `INVADM${ADMIN_ID}`,
        address: '1 Inv St', phone: '0776666666', email: `invadmin${ADMIN_ID}@owsc.test`,
        username: `invadmin${ADMIN_ID}`, passwordHash: 'x', status: 'Active', role: 'admin',
      },
    });
    // Seed a supplier for stock batch creation
    await prisma.supplier.upsert({
      where: { id: SUPPLIER_ID },
      update: {},
      create: {
        id: SUPPLIER_ID, name: 'Test Supplier Co', phone: '0777777777', status: 'Active',
      },
    });
  });

  // ── List Inventory ────────────────────────────────────────────────────────
  describe('GET /api/inventory', () => {
    it('should return paginated inventory for admin', async () => {
      const res = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/inventory');
      expect(res.statusCode).toBe(401);
    });

    it('should return 403 for non-admin/staff', async () => {
      const plainId = 99907 + 1000;
      await prisma.member.upsert({
        where: { id: plainId }, update: {},
        create: {
          id: plainId, fullName: 'Plain Member', nic: `INVPLAIN${plainId}`,
          address: '3 Plain St', phone: '0776666667', email: `invplain${plainId}@owsc.test`,
          username: `invplain${plainId}`, passwordHash: 'x', status: 'Active', role: 'member',
        },
      });
      const res = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${jwt.sign({ id: plainId }, process.env.JWT_SECRET, { expiresIn: '1h' })}`);
      await prisma.member.deleteMany({ where: { id: plainId } });
      expect(res.statusCode).toBe(403);
    });
  });

  // ── Create Product ────────────────────────────────────────────────────────
  describe('POST /api/inventory/product', () => {
    it('should create a new product with initial stock', async () => {
      const res = await request(app)
        .post('/api/inventory/product')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({
          productName:     'Test Rum',
          category:        'Beverages',
          unit:            'ml',
          reorderLevel:    100,
          initialQuantity: 500,
          supplierId:      SUPPLIER_ID,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.inventory).toHaveProperty('productId');
      createdProductId = res.body.inventory.productId;
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/inventory/product')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({ productName: 'Incomplete' }); // missing category and unit

      expect(res.statusCode).toBe(400);
    });
  });

  // ── Stock Update (Delivery) ───────────────────────────────────────────────
  describe('POST /api/inventory/update', () => {
    it('should increase stock on delivery', async () => {
      const before = await prisma.inventory.findUnique({ where: { productId: createdProductId } });

      const res = await request(app)
        .post('/api/inventory/update')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({
          productId:  createdProductId,
          quantity:   200,
          supplierId: SUPPLIER_ID,
          type:       'delivery',
          reason:     'Test delivery',
        });

      expect(res.statusCode).toBe(200);

      const after = await prisma.inventory.findUnique({ where: { productId: createdProductId } });
      expect(Number(after.currentQuantity)).toBe(Number(before.currentQuantity) + 200);
    });

    it('should decrease stock on usage', async () => {
      const before = await prisma.inventory.findUnique({ where: { productId: createdProductId } });

      const res = await request(app)
        .post('/api/inventory/update')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({
          productId: createdProductId,
          quantity:  100,
          type:      'used',
          reason:    'Test usage',
        });

      expect(res.statusCode).toBe(200);

      const after = await prisma.inventory.findUnique({ where: { productId: createdProductId } });
      expect(Number(after.currentQuantity)).toBe(Number(before.currentQuantity) - 100);
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/inventory/update')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({ productId: createdProductId }); // missing quantity and type

      expect(res.statusCode).toBe(400);
    });
  });

  // ── Returns ───────────────────────────────────────────────────────────────
  describe('POST /api/inventory/return', () => {
    it('should record a supplier return and decrease stock', async () => {
      const before = await prisma.inventory.findUnique({ where: { productId: createdProductId } });

      const res = await request(app)
        .post('/api/inventory/return')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({
          productId:  createdProductId,
          supplierId: SUPPLIER_ID,
          quantity:   50,
          reason:     'Damaged goods',
        });

      expect(res.statusCode).toBe(201);

      const after = await prisma.inventory.findUnique({ where: { productId: createdProductId } });
      expect(Number(after.currentQuantity)).toBe(Number(before.currentQuantity) - 50);
    });
  });

  // ── List Returns ──────────────────────────────────────────────────────────
  describe('GET /api/inventory/returns', () => {
    it('should return paginated returns list', async () => {
      const res = await request(app)
        .get('/api/inventory/returns')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  // ── Teardown ──────────────────────────────────────────────────────────────
  afterAll(async () => {
    if (createdProductId) {
      await prisma.return.deleteMany({ where: { batch: { productId: createdProductId } } });
      await prisma.stockMovement.deleteMany({ where: { productId: createdProductId } });
      await prisma.stockBatch.deleteMany({ where: { productId: createdProductId } });
      await prisma.inventory.deleteMany({ where: { productId: createdProductId } });
      await prisma.product.deleteMany({ where: { id: createdProductId } });
    }
    await prisma.supplier.deleteMany({ where: { id: SUPPLIER_ID } });
    await prisma.member.deleteMany({ where: { id: ADMIN_ID } });
    await prisma.$disconnect();
  });
});
