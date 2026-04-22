/**
 * Payments Module Tests
 * Tests: process payment, get my payments, receipt download
 * Note: upload endpoints require Cloudinary — those are mocked.
 */

jest.mock('../src/services/cloudinaryService', () => ({
  uploadReceipt: jest.fn().mockResolvedValue({ url: 'https://cloudinary.test/receipt.pdf' }),
}));
jest.mock('../src/services/notificationService', () => ({
  sendNotification: jest.fn().mockResolvedValue(true),
}));
jest.mock('../src/utils/dateRestriction', () => ({
  isRestrictedDate: () => false,
  PoyaDates2026: [],
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

const MEMBER_ID  = 99922;
const VENUE_ID   = 99804;
const MENU_ID    = 99802;

function token(id, role = 'member') {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

let membershipId;
let bookingId;
let orderId;

describe('Payments Module', () => {

  beforeAll(async () => {
    // Seed member
    await prisma.member.upsert({
      where: { id: MEMBER_ID }, update: {},
      create: {
        id: MEMBER_ID, fullName: 'Payment Tester', nic: `PAYNIC${MEMBER_ID}`,
        address: '1 Test St', phone: '0771000080', email: `paytest${MEMBER_ID}@owsc.test`,
        username: `paytest${MEMBER_ID}`, passwordHash: 'x', status: 'Active', role: 'member',
      },
    });
    // Seed membership (Pending)
    const ms = await prisma.user.create({
      data: {
        memberId: MEMBER_ID, membershipType: 'sport',
        startDate: new Date(), endDate: new Date('2027-01-01'),
        status: 'Pending', membershipFee: 5000,
      },
    });
    membershipId = ms.id;

    // Seed venue + booking
    await prisma.venue.upsert({
      where: { id: VENUE_ID }, update: {},
      create: { id: VENUE_ID, name: 'Payment Venue', capacity: 20, charge: 2000, isAvailable: true },
    });
    const bk = await prisma.venueBooking.create({
      data: {
        memberId: MEMBER_ID, venueId: VENUE_ID,
        bookingDate: new Date('2026-10-01'), timeSlot: '10:00 - 12:00',
        bookingStatus: 'Pending',
      },
    });
    bookingId = bk.id;

    // Seed menu item + active membership for order
    await prisma.menuItem.upsert({
      where: { id: MENU_ID }, update: {},
      create: {
        id: MENU_ID, name: 'Payment Test Item', category: 'Beverages',
        price: 500, availabilityStatus: 'Available', maxPerOrder: 10,
      },
    });
    // Give member an active membership so order route passes
    await prisma.user.create({
      data: {
        memberId: MEMBER_ID, membershipType: 'full',
        startDate: new Date(), endDate: new Date('2027-01-01'),
        status: 'Active', membershipFee: 15000,
      },
    });
    const ord = await prisma.order.create({
      data: {
        memberId: MEMBER_ID, orderType: 'Takeaway',
        subtotalAmount: 500, serviceFee: 50, totalAmount: 550,
        orderStatus: 'Pending',
        orderItems: { create: [{ menuItemId: MENU_ID, quantity: 1, unitPrice: 500 }] },
      },
    });
    orderId = ord.id;
  });

  // ── Process Payment ───────────────────────────────────────────────────────
  describe('POST /api/payments', () => {
    it('should process a membership payment and activate it', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token(MEMBER_ID)}`)
        .send({ entityType: 'membership', entityId: membershipId, amount: 5000, method: 'Card' });
      expect(res.statusCode).toBe(201);
      expect(res.body.paymentRecord).toHaveProperty('paymentStatus', 'Completed');

      const ms = await prisma.user.findUnique({ where: { id: membershipId } });
      expect(ms.status).toBe('Active');
    });

    it('should process a booking payment and confirm the booking', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token(MEMBER_ID)}`)
        .send({ entityType: 'booking', entityId: bookingId, amount: 2000, method: 'Card' });
      expect(res.statusCode).toBe(201);

      const bk = await prisma.venueBooking.findUnique({ where: { id: bookingId } });
      expect(bk.bookingStatus).toBe('Confirmed');
    });

    it('should process an order payment and move order to Preparing', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token(MEMBER_ID)}`)
        .send({ entityType: 'order', entityId: orderId, amount: 550, method: 'Card' });
      expect(res.statusCode).toBe(201);

      const ord = await prisma.order.findUnique({ where: { id: orderId } });
      expect(ord.orderStatus).toBe('Preparing');
    });

    it('should return 400 for invalid entity type', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token(MEMBER_ID)}`)
        .send({ entityType: 'invalid', entityId: 1, amount: 100, method: 'Cash' });
      expect(res.statusCode).toBe(400);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/payments')
        .send({ entityType: 'order', entityId: orderId, amount: 100, method: 'Cash' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── My Payments ───────────────────────────────────────────────────────────
  describe('GET /api/payments/my', () => {
    it('should return payment history grouped by type', async () => {
      const res = await request(app)
        .get('/api/payments/my')
        .set('Authorization', `Bearer ${token(MEMBER_ID)}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('membership');
      expect(res.body).toHaveProperty('booking');
      expect(res.body).toHaveProperty('order');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/payments/my');
      expect(res.statusCode).toBe(401);
    });
  });

  // ── Teardown ──────────────────────────────────────────────────────────────
  afterAll(async () => {
    await prisma.orderPayment.deleteMany({ where: { memberId: MEMBER_ID } });
    await prisma.bookingPayment.deleteMany({ where: { memberId: MEMBER_ID } });
    await prisma.membershipPayment.deleteMany({ where: { memberId: MEMBER_ID } });
    await prisma.orderItem.deleteMany({ where: { order: { memberId: MEMBER_ID } } });
    await prisma.order.deleteMany({ where: { memberId: MEMBER_ID } });
    await prisma.venueBooking.deleteMany({ where: { memberId: MEMBER_ID } });
    await prisma.user.deleteMany({ where: { memberId: MEMBER_ID } });
    await prisma.menuItem.deleteMany({ where: { id: MENU_ID } });
    await prisma.venue.deleteMany({ where: { id: VENUE_ID } });
    await prisma.member.deleteMany({ where: { id: MEMBER_ID } });
    await prisma.$disconnect();
  });
});
