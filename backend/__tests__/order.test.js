/**
 * Functional Test: Order Placement
 *
 * Tests the POST /api/orders endpoint against the real test database (owsc_test).
 * Uses Prisma directly for setup/teardown and supertest to hit the Express app.
 *
 * Run with: npm test (sets NODE_ENV=test automatically)
 */

// Mock date restriction BEFORE any modules are loaded so the order route
// never sees a Sunday/Poya block during tests.
jest.mock('../src/utils/dateRestriction', () => ({
  isRestrictedDate: () => false,
  PoyaDates2026: [],
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a signed JWT for a seeded test member so the `authenticate`
 * middleware lets the request through.
 */
function makeToken(memberId) {
  return jwt.sign({ id: memberId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// ─── Test data IDs (high values to avoid collisions with real data) ───────────
const TEST_MEMBER_ID  = 99901;
const TEST_MENU_ITEM_ID = 99801;

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Functional Test: Order Placement', () => {

  let authToken;

  // ── 1. SETUP ────────────────────────────────────────────────────────────────
  beforeAll(async () => {
    // Create a test member with an active membership
    await prisma.member.upsert({
      where: { id: TEST_MEMBER_ID },
      update: {},
      create: {
        id:           TEST_MEMBER_ID,
        fullName:     'Test Member',
        nic:          'TEST-NIC-99901',
        address:      '1 Test Street',
        phone:        '0771234567',
        email:        'testmember99901@owsc.test',
        username:     'testmember99901',
        passwordHash: 'not-a-real-hash',
        status:       'Active',
        role:         'member',
      },
    });

    // Give the member an active membership (required by the order route)
    await prisma.user.create({
      data: {
        memberId:       TEST_MEMBER_ID,
        membershipType: 'Full',
        startDate:      new Date('2026-01-01'),
        endDate:        new Date('2027-01-01'),
        status:         'Active',
        membershipFee:  5000,
      },
    });

    // Create a test menu item
    await prisma.menuItem.upsert({
      where: { id: TEST_MENU_ITEM_ID },
      update: {},
      create: {
        id:                 TEST_MENU_ITEM_ID,
        name:               'Test Mojito',
        category:           'Beverages',
        price:              1500,
        availabilityStatus: 'Available',
        maxPerOrder:        10,
      },
    });

    authToken = makeToken(TEST_MEMBER_ID);
  });

  // ── 2. FAILURE TEST: unavailable item → 400 ─────────────────────────────────
  it('Should reject the order when the menu item is unavailable', async () => {
    // Temporarily mark the item as unavailable
    await prisma.menuItem.update({
      where: { id: TEST_MENU_ITEM_ID },
      data:  { availabilityStatus: 'Unavailable' },
    });

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        orderType: 'Takeaway',
        items: [{ menuItemId: TEST_MENU_ITEM_ID, quantity: 1 }],
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.success ?? false).toBe(false);

    // Restore availability for the next test
    await prisma.menuItem.update({
      where: { id: TEST_MENU_ITEM_ID },
      data:  { availabilityStatus: 'Available' },
    });
  });

  // ── 3. FAILURE TEST: exceeds per-item max → 400 ──────────────────────────────
  it('Should reject the order when quantity exceeds maxPerOrder', async () => {
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        orderType: 'Takeaway',
        items: [{ menuItemId: TEST_MENU_ITEM_ID, quantity: 99 }], // maxPerOrder is 10
      });

    expect(response.statusCode).toBe(400);
  });

  // ── 4. SUCCESS TEST: valid order → 201 ──────────────────────────────────────
  it('Should accept the order and return 201 when everything is valid', async () => {
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        orderType: 'Takeaway',
        items: [{ menuItemId: TEST_MENU_ITEM_ID, quantity: 2 }],
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('order');
    expect(response.body.order.memberId).toBe(TEST_MEMBER_ID);
    expect(response.body.order.orderStatus).toBe('Pending');

    // Verify the order items were persisted correctly
    const savedOrder = await prisma.order.findUnique({
      where: { id: response.body.order.id },
      include: { orderItems: true },
    });
    expect(savedOrder).not.toBeNull();
    expect(savedOrder.orderItems).toHaveLength(1);
    expect(savedOrder.orderItems[0].quantity).toBe(2);
  });

  // ── 5. AUTH TEST: no token → 401 ────────────────────────────────────────────
  it('Should return 401 when no auth token is provided', async () => {
    const response = await request(app)
      .post('/api/orders')
      .send({
        orderType: 'Takeaway',
        items: [{ menuItemId: TEST_MENU_ITEM_ID, quantity: 1 }],
      });

    expect(response.statusCode).toBe(401);
  });

  // ── 6. TEARDOWN ──────────────────────────────────────────────────────────────
  afterAll(async () => {
    // Delete in dependency order to respect foreign key constraints
    await prisma.orderItem.deleteMany({
      where: { order: { memberId: TEST_MEMBER_ID } },
    });
    await prisma.order.deleteMany({
      where: { memberId: TEST_MEMBER_ID },
    });
    await prisma.menuItem.deleteMany({
      where: { id: TEST_MENU_ITEM_ID },
    });
    await prisma.user.deleteMany({
      where: { memberId: TEST_MEMBER_ID },
    });
    await prisma.member.deleteMany({
      where: { id: TEST_MEMBER_ID },
    });

    await prisma.$disconnect();
  });
});
