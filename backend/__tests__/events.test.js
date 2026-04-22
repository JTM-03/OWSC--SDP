/**
 * Events Module Tests
 * Tests: list, create (admin), update, delete
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

const ADMIN_ID = 99913;

function token(id, role = 'admin') {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

let createdEventId;

describe('Events Module', () => {

  beforeAll(async () => {
    await prisma.member.upsert({
      where: { id: ADMIN_ID }, update: {},
      create: {
        id: ADMIN_ID, fullName: 'Events Admin', nic: `EVTADM${ADMIN_ID}`,
        address: '1 Admin St', phone: '0771000020', email: `evtadmin${ADMIN_ID}@owsc.test`,
        username: `evtadmin${ADMIN_ID}`, passwordHash: 'x', status: 'Active', role: 'admin',
      },
    });
  });

  // ── List Events ───────────────────────────────────────────────────────────
  describe('GET /api/events', () => {
    it('should return paginated events (public)', async () => {
      const res = await request(app).get('/api/events');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });

    it('should filter by status', async () => {
      const res = await request(app).get('/api/events?status=Upcoming');
      expect(res.statusCode).toBe(200);
    });
  });

  // ── Create Event ──────────────────────────────────────────────────────────
  describe('POST /api/events', () => {
    it('should allow admin to create an event', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({
          title:       'Test Gala Night',
          description: 'Annual test gala',
          date:        '2026-08-15T18:00:00.000Z',
          time:        '18:00',
          location:    'Main Hall',
          category:    'social',
          totalTickets: 100,
          ticketPrice:  500,
          status:      'Upcoming',
        });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('title', 'Test Gala Night');
      createdEventId = res.body.id;
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({ title: 'Incomplete Event' }); // missing description, date, time, location
      expect(res.statusCode).toBe(400);
    });

    it('should return 403 for non-admin', async () => {
      // Seed a plain member for this check
      const plainId = 99913 + 1000;
      await prisma.member.upsert({
        where: { id: plainId }, update: {},
        create: {
          id: plainId, fullName: 'Plain Member', nic: `EVTPLAIN${plainId}`,
          address: '3 Plain St', phone: '0771000021', email: `evtplain${plainId}@owsc.test`,
          username: `evtplain${plainId}`, passwordHash: 'x', status: 'Active', role: 'member',
        },
      });
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${jwt.sign({ id: plainId }, process.env.JWT_SECRET, { expiresIn: '1h' })}`)
        .send({
          title: 'Hack Event', description: 'x',
          date: '2026-09-01T10:00:00.000Z', time: '10:00', location: 'Nowhere',
        });
      await prisma.member.deleteMany({ where: { id: plainId } });
      expect(res.statusCode).toBe(403);
    });
  });

  // ── Update Event ──────────────────────────────────────────────────────────
  describe('PUT /api/events/:id', () => {
    it('should allow admin to update an event', async () => {
      const res = await request(app)
        .put(`/api/events/${createdEventId}`)
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({
          title:       'Updated Gala Night',
          description: 'Updated description',
          date:        '2026-08-15T18:00:00.000Z',
          time:        '19:00',
          location:    'Grand Hall',
          status:      'Upcoming',
        });
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Updated Gala Night');
    });
  });

  // ── Delete Event ──────────────────────────────────────────────────────────
  describe('DELETE /api/events/:id', () => {
    it('should allow admin to delete an event', async () => {
      const res = await request(app)
        .delete(`/api/events/${createdEventId}`)
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);
      expect(res.statusCode).toBe(200);
      createdEventId = null;
    });
  });

  // ── Teardown ──────────────────────────────────────────────────────────────
  afterAll(async () => {
    if (createdEventId) {
      await prisma.event.deleteMany({ where: { id: createdEventId } });
    }
    await prisma.member.deleteMany({ where: { id: ADMIN_ID } });
    await prisma.$disconnect();
  });
});
