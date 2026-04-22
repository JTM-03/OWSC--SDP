/**
 * Notifications Module Tests
 * Tests: get notifications (paginated), send notification
 */

jest.mock('../src/services/notificationService', () => ({
  sendNotification: jest.fn().mockResolvedValue(true),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

const MEMBER_ID = 99915;

function token(id, role = 'member') {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

describe('Notifications Module', () => {

  beforeAll(async () => {
    await prisma.member.upsert({
      where: { id: MEMBER_ID }, update: {},
      create: {
        id: MEMBER_ID, fullName: 'Notif Tester', nic: `NOTNIC${MEMBER_ID}`,
        address: '1 Test St', phone: '0771000040', email: `notiftest${MEMBER_ID}@owsc.test`,
        username: `notiftest${MEMBER_ID}`, passwordHash: 'x', status: 'Active', role: 'member',
      },
    });
  });

  // ── Get Notifications ─────────────────────────────────────────────────────
  describe('GET /api/notifications', () => {
    it('should return notifications for authenticated member', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token(MEMBER_ID)}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should support unreadOnly filter', async () => {
      const res = await request(app)
        .get('/api/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${token(MEMBER_ID)}`);
      expect(res.statusCode).toBe(200);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.statusCode).toBe(401);
    });
  });

  // ── Send Notification ─────────────────────────────────────────────────────
  describe('POST /api/notifications/send', () => {
    it('should send a notification to a member', async () => {
      const res = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${token(MEMBER_ID)}`)
        .send({
          memberId: MEMBER_ID,
          title:    'Test Notification',
          message:  'This is a test notification',
          type:     'info',
        });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${token(MEMBER_ID)}`)
        .send({ memberId: MEMBER_ID }); // missing title and message
      expect(res.statusCode).toBe(400);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/notifications/send')
        .send({ memberId: MEMBER_ID, title: 'x', message: 'y' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── Teardown ──────────────────────────────────────────────────────────────
  afterAll(async () => {
    await prisma.userNotification.deleteMany({ where: { memberId: MEMBER_ID } });
    await prisma.member.deleteMany({ where: { id: MEMBER_ID } });
    await prisma.$disconnect();
  });
});
