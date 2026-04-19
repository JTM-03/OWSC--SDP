const express = require("express")
const prisma = require("../lib/prisma")
const { validate } = require("../middleware/validate")
const { venueSchema, bookingSchema } = require("../validation/schemas")
const { authenticate, requireRole } = require("../middleware/auth")
const { NotFoundError, BadRequestError } = require("../utils/errors")
const { isRestrictedDate } = require("../utils/dateRestriction")
const upload = require("../config/upload")

const router = express.Router()

/**
 * @swagger
 * /venues:
 *   get:
 *     summary: List all venues
 *     tags: [Venues]
 *     responses:
 *       200:
 *         description: Array of venues
 *   post:
 *     summary: Create a new venue (Admin only)
 *     tags: [Venues]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, capacity, charge]
 *             properties:
 *               name:       { type: string, example: Presidents Lounge }
 *               capacity:   { type: integer, example: 50 }
 *               facilities: { type: string, example: "AC, Projector, WiFi" }
 *               atmosphere: { type: string, example: Formal }
 *               charge:     { type: number, example: 5000 }
 *     responses:
 *       201:
 *         description: Venue created
 *       403:
 *         description: Admin access required
 *
 * /venues/search:
 *   get:
 *     summary: Search available venues by date and time
 *     tags: [Venues]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date, example: "2026-05-01" }
 *       - in: query
 *         name: startTime
 *         required: true
 *         schema: { type: string, example: "09:00" }
 *       - in: query
 *         name: endTime
 *         required: true
 *         schema: { type: string, example: "12:00" }
 *       - in: query
 *         name: capacity
 *         schema: { type: integer, example: 20 }
 *       - in: query
 *         name: occasion
 *         schema: { type: string, example: wedding }
 *       - in: query
 *         name: venueType
 *         schema: { type: string, enum: [sports, hall, meeting] }
 *     responses:
 *       200:
 *         description: Available venues
 *       400:
 *         description: Missing required query params
 *
 * /venues/{id}:
 *   get:
 *     summary: Get venue details
 *     tags: [Venues]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Venue details
 *       404:
 *         description: Venue not found
 *   put:
 *     summary: Update a venue (Admin only)
 *     tags: [Venues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:       { type: string }
 *               capacity:   { type: integer }
 *               facilities: { type: string }
 *               atmosphere: { type: string }
 *               charge:     { type: number }
 *     responses:
 *       200:
 *         description: Venue updated
 *   delete:
 *     summary: Delete a venue (Admin only)
 *     tags: [Venues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Venue deleted
 *
 * /venues/bookings:
 *   post:
 *     summary: Create a venue booking
 *     tags: [Venues]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [venueId, bookingDate, startTime, endTime, amount, paymentMethod]
 *             properties:
 *               venueId:       { type: integer, example: 1 }
 *               bookingDate:   { type: string, format: date, example: "2026-05-01" }
 *               startTime:     { type: string, example: "09:00" }
 *               endTime:       { type: string, example: "12:00" }
 *               amount:        { type: number, example: 5000 }
 *               paymentMethod: { type: string, example: "Bank Transfer" }
 *               receipt:       { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Booking created
 *       400:
 *         description: Venue unavailable or restricted date
 *
 * /venues/bookings/my:
 *   get:
 *     summary: Get current user's bookings
 *     tags: [Venues]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bookings
 *
 * /venues/bookings/all:
 *   get:
 *     summary: Get all bookings (Admin only)
 *     tags: [Venues]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All bookings
 *
 * /venues/bookings/calendar:
 *   get:
 *     summary: Get bookings for calendar view
 *     tags: [Venues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: venueId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Calendar events
 *
 * /venues/bookings/{id}/cancel:
 *   put:
 *     summary: Cancel a booking
 *     tags: [Venues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Booking cancelled
 *
 * /venues/bookings/{id}/verify-payment:
 *   put:
 *     summary: Verify booking payment (Admin only)
 *     tags: [Venues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Payment verified and booking confirmed
 */

// GET /api/venues - List all venues
router.get("/", async (req, res, next) => {
    try {
        const venues = await prisma.venue.findMany()
        res.json(venues)
    } catch (error) {
        next(error)
    }
})

// GET /api/venues/search - Search available venues
router.get("/search", async (req, res, next) => {
    try {
        const { date, startTime, endTime, capacity, occasion, venueType } = req.query;

        if (!date || !startTime || !endTime) {
            return res.status(400).json({ error: "Date, start time, and end time are required" });
        }

        // Reject past dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const requestedDate = new Date(date);
        requestedDate.setHours(0, 0, 0, 0);
        if (requestedDate < today) {
            return res.json([]); // Return empty — no venues available for past dates
        }

        // 1. Get all bookings for the date
        const existingBookings = await prisma.venueBooking.findMany({
            where: {
                bookingDate: {
                    gte: new Date(date + "T00:00:00.000Z"),
                    lt: new Date(date + "T23:59:59.999Z")
                },
                bookingStatus: { not: 'Cancelled' }
            }
        });

        // 2. Find venues that are occupied
        const occupiedVenueIds = existingBookings.filter(booking => {
            if (!booking.timeSlot) return false;
            const parts = booking.timeSlot.split(' - ');
            if (parts.length !== 2) return false;
            const bStart = parts[0];
            const bEnd = parts[1];
            return (startTime < bEnd) && (endTime > bStart);
        }).map(b => b.venueId);

        // 3. Build Venue Filter
        const venueBoxFilter = {
            id: { notIn: occupiedVenueIds },
            capacity: capacity ? { gte: parseInt(capacity) } : undefined
        };

        if (occasion && occasion !== 'all') {
            venueBoxFilter.OR = [
                { facilities: { contains: occasion } },
                { name: { contains: occasion } }
            ];
        }

        if (venueType && venueType !== 'all') {
            const typeKeywords = {
                'sports': ['Court', 'Pool', 'Track', 'Field', 'Gym'],
                'hall': ['Hall', 'Ballroom', 'Auditorium'],
                'meeting': ['Meeting', 'Conference', 'Room', 'Lounge']
            };

            const keywords = typeKeywords[venueType.toLowerCase()] || [];
            if (keywords.length > 0) {
                const typeFilters = keywords.map(keyword => ({ name: { contains: keyword } }));
                venueBoxFilter.OR = venueBoxFilter.OR
                    ? [...venueBoxFilter.OR, ...typeFilters]
                    : typeFilters;
            }
        }

        const venues = await prisma.venue.findMany({
            where: venueBoxFilter
        });

        res.json(venues);
    } catch (error) {
        next(error);
    }
});

// GET /api/venues/:id - Get venue details
router.get("/:id", async (req, res, next) => {
    try {
        const { id } = req.params
        const venue = await prisma.venue.findUnique({
            where: { id: parseInt(id) }
        })

        if (!venue) {
            throw new NotFoundError('Venue not found')
        }

        res.json(venue)
    } catch (error) {
        next(error)
    }
})

// Admin Routes
router.post("/", authenticate, requireRole('admin'), validate(venueSchema), async (req, res, next) => {
    try {
        const { name, capacity, facilities, atmosphere, charge } = req.validatedData
        const venue = await prisma.venue.create({
            data: { name, capacity, facilities, atmosphere, charge }
        })
        res.status(201).json({ message: 'Venue created successfully', venue })
    } catch (error) {
        next(error)
    }
})

router.put("/:id", authenticate, requireRole('admin'), validate(venueSchema), async (req, res, next) => {
    try {
        const { id } = req.params
        const { name, capacity, facilities, atmosphere, charge } = req.validatedData
        const venue = await prisma.venue.update({
            where: { id: parseInt(id) },
            data: { name, capacity, facilities, atmosphere, charge }
        })
        res.json({ message: 'Venue updated successfully', venue })
    } catch (error) {
        next(error)
    }
})

router.delete("/:id", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { id } = req.params
        await prisma.venue.delete({ where: { id: parseInt(id) } })
        res.json({ message: 'Venue deleted successfully' })
    } catch (error) {
        next(error)
    }
})

// Booking Routes
router.post("/bookings", authenticate, upload.single('receipt'), async (req, res, next) => {
    try {
        const venueId = parseInt(req.body.venueId);
        const bookingDate = req.body.bookingDate;
        const startTime = req.body.startTime;
        const endTime = req.body.endTime;
        const amount = parseFloat(req.body.amount);
        const paymentMethod = req.body.paymentMethod;

        if (!amount || !paymentMethod) {
            throw new BadRequestError('Amount and payment method are required');
        }

        bookingSchema.parse({ venueId, bookingDate, startTime, endTime });

        if (isRestrictedDate(bookingDate)) {
            throw new BadRequestError('Cannot book venues on Sundays or Poya days.');
        }

        // Reject past dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const requestedDate = new Date(bookingDate);
        requestedDate.setHours(0, 0, 0, 0);
        if (requestedDate < today) {
            throw new BadRequestError('Cannot book venues for past dates.');
        }

        const memberId = req.user.id
        const dateObj = new Date(bookingDate);
        const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0));
        const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999));

        const existingBookings = await prisma.venueBooking.findMany({
            where: {
                venueId,
                bookingDate: { gte: startOfDay, lte: endOfDay },
                bookingStatus: { not: 'Cancelled' }
            }
        });

        const conflicting = existingBookings.find(b => {
            if (!b.timeSlot) return false;
            const parts = b.timeSlot.split(' - ');
            return (parts.length === 2) && (startTime < parts[1]) && (endTime > parts[0]);
        });

        if (conflicting) {
            throw new BadRequestError('Venue is already booked for this time range')
        }

        const result = await prisma.$transaction(async (prisma) => {
            const booking = await prisma.venueBooking.create({
                data: {
                    memberId,
                    venueId,
                    bookingDate: new Date(bookingDate),
                    timeSlot: `${startTime} - ${endTime}`,
                    bookingStatus: 'Pending'
                },
                include: { venue: true }
            });

            let receiptUrl = req.file ? `/uploads/${req.file.filename}` : null;
            const payment = await prisma.bookingPayment.create({
                data: {
                    bookingId: booking.id,
                    memberId,
                    amount,
                    paymentMethod: paymentMethod || 'Unknown',
                    paymentStatus: 'Pending Verification',
                    paymentDate: new Date(),
                    receiptUrl: receiptUrl
                }
            });

            return { booking, payment };
        });

        const { sendNotification } = require("../services/notificationService");
        await sendNotification(
            memberId,
            "Booking Confirmation Pending",
            `Your booking for ${result.booking.venue.name} on ${new Date(bookingDate).toLocaleDateString()} is pending approval.`,
            "info"
        );

        // Send booking submitted email
        const member = await prisma.member.findUnique({ where: { id: memberId }, select: { fullName: true, email: true } });
        if (member?.email) {
            const { sendBookingSubmittedEmail } = require("../services/emailService");
            sendBookingSubmittedEmail(member, result.booking, result.booking.venue, result.payment)
                .catch(err => console.error('Booking submitted email failed:', err.message));
        }

        res.status(201).json({ message: 'Booking created successfully', booking: result.booking, payment: result.payment })
    } catch (error) {
        next(error)
    }
})

router.get("/bookings/my", authenticate, async (req, res, next) => {
    try {
        const bookings = await prisma.venueBooking.findMany({
            where: { memberId: req.user.id },
            include: { venue: true, payments: true, feedback: true },
            orderBy: { bookingDate: 'desc' }
        })
        res.json(bookings)
    } catch (error) {
        next(error)
    }
})

router.put("/bookings/:id/cancel", authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const memberId = req.user.id;
        const { reason } = req.body;

        const booking = await prisma.venueBooking.findUnique({
            where: { id: parseInt(id) },
            include: { venue: true }
        });

        if (!booking || booking.memberId !== memberId) {
            throw new NotFoundError("Booking not found");
        }

        const updated = await prisma.venueBooking.update({
            where: { id: parseInt(id) },
            data: { bookingStatus: 'Cancelled', cancellationReason: reason || null }
        });

        const { sendNotification } = require("../services/notificationService");
        await sendNotification(
            memberId,
            "Booking Cancelled",
            `Your booking for ${booking.venue.name} on ${new Date(booking.bookingDate).toLocaleDateString()} has been cancelled.`,
            "alert"
        );

        // Send cancellation email
        const member = await prisma.member.findUnique({ where: { id: memberId }, select: { fullName: true, email: true } });
        if (member?.email) {
            const { sendBookingCancelledEmail } = require("../services/emailService");
            sendBookingCancelledEmail(member, booking, booking.venue, reason || null, false)
                .catch(err => console.error('Booking cancellation email failed:', err.message));
        }

        res.json({ message: "Booking cancelled successfully", booking: updated });
    } catch (error) {
        next(error);
    }
});

// Admin Booking Management
router.get("/bookings/all", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const bookings = await prisma.venueBooking.findMany({
            include: {
                venue: true,
                member: { select: { id: true, fullName: true, email: true, phone: true } },
                payments: true
            },
            orderBy: { bookingDate: 'desc' }
        })
        res.json(bookings)
    } catch (error) {
        next(error)
    }
})

router.put("/bookings/:id/admin-cancel", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const booking = await prisma.venueBooking.findUnique({
            where: { id: parseInt(id) },
            include: { venue: true, member: true }
        });

        if (!booking) throw new NotFoundError("Booking not found");

        const updated = await prisma.venueBooking.update({
            where: { id: parseInt(id) },
            data: { 
                bookingStatus: 'Cancelled', 
                cancellationReason: reason,
                cancelledBy: req.user.id
            }
        });

        const { sendNotification } = require("../services/notificationService");
        await sendNotification(
            booking.memberId,
            "Booking Cancelled by Admin",
            `Your booking for ${booking.venue.name} on ${new Date(booking.bookingDate).toLocaleDateString()} has been cancelled. Reason: ${reason}`,
            "alert"
        );

        // Send cancellation email to member
        if (booking.member?.email) {
            const { sendBookingCancelledEmail } = require("../services/emailService");
            sendBookingCancelledEmail(booking.member, booking, booking.venue, reason || null, true)
                .catch(err => console.error('Admin cancellation email failed:', err.message));
        }

        res.json({ message: "Booking cancelled by admin", booking: updated });
    } catch (error) {
        next(error);
    }
});

router.put("/bookings/:id/verify-payment", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const bookingId = parseInt(id);

        const booking = await prisma.venueBooking.findUnique({
            where: { id: bookingId },
            include: { payments: true }
        });

        if (!booking || booking.payments.length === 0) throw new BadRequestError("Booking or payment not found");

        await prisma.bookingPayment.update({
            where: { id: booking.payments[0].id },
            data: { paymentStatus: 'Completed' }
        });

        const updated = await prisma.venueBooking.update({
            where: { id: bookingId },
            data: { bookingStatus: 'Confirmed' },
            include: { venue: true, member: true }
        });

        const { sendNotification } = require("../services/notificationService");
        await sendNotification(
            booking.memberId,
            "Booking Confirmed!",
            `Your payment for ${updated.venue.name} has been verified and booking is confirmed.`,
            "success"
        );

        // Send booking confirmed email to member
        if (updated.member?.email) {
            const { sendBookingConfirmedEmail } = require("../services/emailService");
            sendBookingConfirmedEmail(
                updated.member,
                updated,
                updated.venue,
                booking.payments[0]
            ).catch(err => console.error('Booking confirmed email failed:', err.message));
        }

        res.json({ message: "Payment verified", booking: updated });
    } catch (error) {
        next(error);
    }
});

router.put("/bookings/:id", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { bookingStatus, bookingDate, startTime, endTime, cancellationReason } = req.body;

        const data = {};
        if (bookingStatus) data.bookingStatus = bookingStatus;
        if (bookingDate) data.bookingDate = new Date(bookingDate);
        if (startTime && endTime) data.timeSlot = `${startTime} - ${endTime}`;
        if (cancellationReason !== undefined) data.cancellationReason = cancellationReason;

        const booking = await prisma.venueBooking.update({
            where: { id: parseInt(id) },
            data,
            include: { venue: true, member: true }
        });

        res.json({ message: "Booking updated successfully", booking });
    } catch (error) {
        next(error);
    }
});

// Calendar Route
router.get("/bookings/calendar", authenticate, async (req, res, next) => {
    try {
        const { startDate, endDate, venueId } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: "startDate and endDate are required" });
        }

        const whereClause = {
            bookingDate: {
                gte: new Date(startDate),
                lte: new Date(endDate)
            },
            bookingStatus: { not: 'Cancelled' }
        };

        if (venueId && venueId !== 'all' && venueId !== 'undefined') {
            whereClause.venueId = parseInt(venueId);
        }

        const bookings = await prisma.venueBooking.findMany({
            where: whereClause,
            include: {
                venue: { select: { id: true, name: true } },
                member: { select: { id: true, fullName: true, email: true, phone: true } },
                payments: {
                    select: { id: true, amount: true, paymentStatus: true, paymentMethod: true, receiptUrl: true },
                    take: 1,
                    orderBy: { paymentDate: 'desc' }
                }
            }
        });

        const calendarEvents = bookings.map(booking => {
            let bookingDateTime = new Date(booking.bookingDate);
            if (isNaN(bookingDateTime.getTime())) bookingDateTime = new Date();

            if (booking.timeSlot && booking.timeSlot.includes(' - ')) {
                try {
                    const [startTime] = booking.timeSlot.split(' - ');
                    const parts = startTime.split(':');
                    if (parts.length >= 2) {
                        const h = parseInt(parts[0]);
                        const m = parseInt(parts[1]);
                        if (!isNaN(h) && !isNaN(m)) bookingDateTime.setHours(h, m, 0);
                    }
                } catch (e) { console.error('Time parsing error:', e); }
            }

            const payment = booking.payments[0] || null;
            const iso = bookingDateTime.toISOString();

            return {
                id: booking.id,
                bookingId: booking.id,
                title: `${booking.venue?.name || 'Venue'} - ${booking.member?.fullName || 'Member'}`,
                start: iso,
                end: iso,
                description: booking.purpose || 'Venue Booking',
                venueId: booking.venueId,
                venueName: booking.venue?.name || 'Venue',
                memberName: booking.member?.fullName || 'Member',
                memberEmail: booking.member?.email || '',
                memberPhone: booking.member?.phone || '',
                bookingStatus: booking.bookingStatus,
                status: booking.bookingStatus,
                paymentStatus: payment ? payment.paymentStatus : 'No Payment',
                paymentAmount: payment ? Number(payment.amount) : 0,
                paymentMethod: payment ? payment.paymentMethod : 'N/A',
                receiptUrl: payment ? payment.receiptUrl : null,
                timeSlot: booking.timeSlot,
                backgroundColor: booking.bookingStatus === 'Confirmed' ? '#2563eb' : '#f59e0b'
            };
        });

        res.json(calendarEvents);
    } catch (error) {
        console.error('Calendar Fetch Error:', error);
        next(error);
    }
});

module.exports = router;
