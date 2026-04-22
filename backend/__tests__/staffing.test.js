/**
 * Staffing Module Tests
 * Tests: create assignment, conflict detection, list by venue, update, delete
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

const ADMIN_ID  = 99918;
const STAFF_ID  = 99919;
const VENUE_ID  = 99803;

function token(id, role = 'admin') {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

let assignmentId;

describe('Staffing Module', () => {

  beforeAll(async () => {
    await prisma.member.upsert({
      where: { id: ADMIN_ID }, update: {},
      create: {
        id: ADMIN_ID, fullName: 'Staffing Admin', nic: `SFGADM${ADMIN_ID}`,
        address: '1 Admin St', phone: '0771000060', email: `sfgadmin${ADMIN_ID}@owsc.test`,
        username: `sfgadmin${ADMIN_ID}`, passwordHash: 'x', status: 'Active', role: 'admin',
      },
    });
    await prisma.member.upsert({
      where: { id: STAFF_ID }, update: {},
      create: {
        id: STAFF_ID, fullName: 'Staffing Staff', nic: `SFGSTF${STAFF_ID}`,
        address: '2 Staff St', phone: '0771000061', email: `sfgstaff${STAFF_ID}@owsc.test`,
        username: `sfgstaff${STAFF_ID}`, passwordHash: 'x', status: 'Active', role: 'staff',
      },
    });
    await prisma.venue.upsert({
      where: { id: VENUE_ID }, update: {},
      create: {
        id: VENUE_ID, name: 'Staffing Test Venue', capacity: 40,
        charge: 4000, isAvailable: true,
      },
    });
  });

  // ── Create Assignment ─────────────────────────────────────────────────────
  describe('POST /api/staffing', () => {
    it('should create a staff assignment', async () => {
      const res = await request(app)
        .post('/api/staffing')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({
          venueId:        VENUE_ID,
          staffId:        STAFF_ID,
          assignmentDate: '2026-09-01',
          startTime:      '09:00',
          endTime:        '17:00',
          eventName:      'Test Event',
          role:           'Service',
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.assignment).toHaveProperty('venueId', VENUE_ID);
      assignmentId = res.body.assignment.id;
    });

    it('should reject overlapping assignment for same staff', async () => {
      const res = await request(app)
        .post('/api/staffing')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({
          venueId:        VENUE_ID,
          staffId:        STAFF_ID,
          assignmentDate: '2026-09-01',
          startTime:      '10:00', // overlaps 09:00-17:00
          endTime:        '12:00',
          role:           'Service',
        });
      expect(res.statusCode).toBe(400);
    });

    it('should return 403 for member role', async () => {
      const plainId = 99918 + 1000;
      await prisma.member.upsert({
        where: { id: plainId }, update: {},
        create: {
          id: plainId, fullName: 'Plain Member', nic: `SFGPLAIN${plainId}`,
          address: '3 Plain St', phone: '0771000062', email: `sfgplain${plainId}@owsc.test`,
          username: `sfgplain${plainId}`, passwordHash: 'x', status: 'Active', role: 'member',
        },
      });
      const res = await request(app)
        .post('/api/staffing')
        .set('Authorization', `Bearer ${jwt.sign({ id: plainId }, process.env.JWT_SECRET, { expiresIn: '1h' })}`)
        .send({
          venueId: VENUE_ID, staffId: STAFF_ID,
          assignmentDate: '2026-09-02', startTime: '09:00', endTime: '17:00',
        });
      await prisma.member.deleteMany({ where: { id: plainId } });
      expect(res.statusCode).toBe(403);
    });
  });

  // ── List by Venue ─────────────────────────────────────────────────────────
  describe('GET /api/staffing/venue/:venueId', () => {
    it('should return assignments for a venue', async () => {
      const res = await request(app)
        .get(`/api/staffing/venue/${VENUE_ID}`)
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  // ── Check Availability ────────────────────────────────────────────────────
  describe('GET /api/staffing/check-availability', () => {
    it('should return busy staff map for a date/time', async () => {
      const res = await request(app)
        .get('/api/staffing/check-availability?date=2026-09-01&startTime=09:00&endTime=17:00')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('busyStaff');
      expect(res.body.busyStaff).toHaveProperty(String(STAFF_ID));
    });

    it('should return 400 when params are missing', async () => {
      const res = await request(app)
        .get('/api/staffing/check-availability?date=2026-09-01')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);
      expect(res.statusCode).toBe(400);
    });
  });

  // ── Update Assignment ─────────────────────────────────────────────────────
  describe('PUT /api/staffing/:id', () => {
    it('should allow admin to update an assignment', async () => {
      const res = await request(app)
        .put(`/api/staffing/${assignmentId}`)
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`)
        .send({ eventName: 'Updated Event Name' });
      expect(res.statusCode).toBe(200);
      expect(res.body.assignment.eventName).toBe('Updated Event Name');
    });
  });

  // ── Delete Assignment ─────────────────────────────────────────────────────
  describe('DELETE /api/staffing/:id', () => {
    it('should allow admin to delete an assignment', async () => {
      const res = await request(app)
        .delete(`/api/staffing/${assignmentId}`)
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);
      expect(res.statusCode).toBe(200);
      assignmentId = null;
    });

    it('should return 404 for non-existent assignment', async () => {
      const res = await request(app)
        .delete('/api/staffing/999999')
        .set('Authorization', `Bearer ${token(ADMIN_ID)}`);
      expect(res.statusCode).toBe(404);
    });
  });

  // ── Teardown ──────────────────────────────────────────────────────────────
  afterAll(async () => {
    if (assignmentId) {
      await prisma.venueAssignment.deleteMany({ where: { id: assignmentId } });
    }
    await prisma.venueAssignment.deleteMany({ where: { staffId: STAFF_ID } });
    await prisma.venue.deleteMany({ where: { id: VENUE_ID } });
    await prisma.member.deleteMany({ where: { id: { in: [ADMIN_ID, STAFF_ID] } } });
    await prisma.$disconnect();
  });
});
