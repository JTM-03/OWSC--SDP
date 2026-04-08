const express = require("express")
const prisma = require("../lib/prisma")
const { validate } = require("../middleware/validate")
const { venueSchema, bookingSchema } = require("../validation/schemas")
const { authenticate, requireRole } = require("../middleware/auth")
const { NotFoundError, BadRequestError } = require("../utils/errors")
const { isRestrictedDate } = require("../utils/dateRestriction")
const upload = require("../config/upload")

const router = express.Router()

// GET /api/venues - List all venues
router.get("/", async (req, res, next) => {
    try {
        const venues = await prisma.venue.findMany()
        res.json(venues)
    } catch (error) {
        next(error)
    }
})

// GET /api/venues/search - Search available venues (MUST be before /:id)
router.get("/search", async (req, res, next) => {
    try {
        const { date, startTime, endTime, capacity, occasion, venueType } = req.query;

        console.log("🔍 Search Request:", { date, startTime, endTime, capacity, occasion, venueType });

        if (!date || !startTime || !endTime) {
            return res.status(400).json({ error: "Date, start time, and end time are required" });
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
            // Filter by venue type (sports, hall, meeting)
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

        // 4. Get venues
        const venues = await prisma.venue.findMany({
            where: venueBoxFilter
        });

        console.log(`✅ Found ${venues.length} venues`);
        res.json(venues);
    } catch (error) {
        console.error("❌ Search Error:", error);
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

// POST /api/venues - Add new venue (Admin only)
router.post("/", authenticate, requireRole('admin'), validate(venueSchema), async (req, res, next) => {
    try {
        const { name, capacity, facilities, atmosphere, charge } = req.validatedData

        const venue = await prisma.venue.create({
            data: {
                name,
                capacity,
                facilities,
                atmosphere,
                charge
            }
        })

        res.status(201).json({
            message: 'Venue created successfully',
            venue
        })
    } catch (error) {
        next(error)
    }
})

// PUT /api/venues/:id - Update venue (Admin only)
router.put("/:id", authenticate, requireRole('admin'), validate(venueSchema), async (req, res, next) => {
    try {
        const { id } = req.params
        const { name, capacity, facilities, atmosphere, charge } = req.validatedData

        const venue = await prisma.venue.update({
            where: { id: parseInt(id) },
            data: {
                name,
                capacity,
                facilities,
                atmosphere,
                charge
            }
        })

        res.json({
            message: 'Venue updated successfully',
            venue
        })
    } catch (error) {
        if (error.code === 'P2025') {
            next(new NotFoundError('Venue not found'))
        } else {
            next(error)
        }
    }
})

// DELETE /api/venues/:id - Delete venue (Admin only)
router.delete("/:id", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { id } = req.params

        await prisma.venue.delete({
            where: { id: parseInt(id) }
        })

        res.json({ message: 'Venue deleted successfully' })
    } catch (error) {
        if (error.code === 'P2025') {
            next(new NotFoundError('Venue not found'))
        } else {
            next(error)
        }
    }
})



// POST /api/venues/bookings - Create a booking (Authenticated)
router.post("/bookings", authenticate, upload.single('receipt'), async (req, res, next) => {
    try {
        // Parse and validate manually since multipart/form-data comes as strings
        const venueId = parseInt(req.body.venueId);
        const bookingDate = req.body.bookingDate;
        const startTime = req.body.startTime;
        const endTime = req.body.endTime;
        const amount = parseFloat(req.body.amount);
        const paymentMethod = req.body.paymentMethod;

        if (!amount || !paymentMethod) {
            throw new BadRequestError('Amount and payment method are required');
        }

        // Validation
        const bookingData = bookingSchema.parse({
            venueId,
            bookingDate,
            startTime,
            endTime
        });

        if (isRestrictedDate(bookingDate)) {
            throw new BadRequestError('Cannot book venues on Sundays or Poya days.');
        }

        const memberId = req.user.id

        // Check availability (Exact Overlap Check)
        const dateObj = new Date(bookingDate);
        const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0));
        const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999));

        const existingBookings = await prisma.venueBooking.findMany({
            where: {
                venueId,
                bookingDate: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                bookingStatus: { not: 'Cancelled' }
            }
        });

        // Check for time overlap
        let conflictingBooking = null;
        for (const b of existingBookings) {
            if (!b.timeSlot) continue;
            const parts = b.timeSlot.split(' - ');
            if (parts.length === 2) {
                const bStart = parts[0];
                const bEnd = parts[1];
                if ((startTime < bEnd) && (endTime > bStart)) {
                    conflictingBooking = b;
                    break;
                }
            }
        }

        if (conflictingBooking) {
            throw new BadRequestError('Venue is already booked for this time range')
        }

        // Create booking and payment in transaction
        const result = await prisma.$transaction(async (prisma) => {
            // 1. Create Booking
            const booking = await prisma.venueBooking.create({
                data: {
                    memberId,
                    venueId,
                    bookingDate: new Date(bookingDate),
                    timeSlot: `${startTime} - ${endTime}`,
                    bookingStatus: 'Pending'
                },
                include: {
                    venue: true
                }
            });

            // 2. Create Payment Record (if amount provided)
            let payment = null;
            if (!isNaN(amount) && amount > 0) {
                payment = await prisma.bookingPayment.create({
                    data: {
                        bookingId: booking.id,
                        memberId,
                        amount,
                        paymentMethod: paymentMethod || 'Unknown',
                        paymentStatus: 'Pending Verification', // Default status for receipt uploads
                        paymentDate: new Date()
                    }
                });
            }

            return { booking, payment };
        });

        // NOTIFICATION
        const { sendNotification } = require("../services/notificationService");
        await sendNotification(
            memberId,
            "Booking Confirmation Pending",
            `Your booking for ${result.booking.venue.name} on ${new Date(bookingDate).toLocaleDateString()} is pending approval.`,
            "info"
        );

        res.status(201).json({
            message: 'Booking created successfully',
            booking: result.booking,
            payment: result.payment
        })
    } catch (error) {
        next(error)
    }
})

// PUT /api/venues/bookings/:id/cancel - Cancel own booking (Authenticated User)
router.put("/bookings/:id/cancel", authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const memberId = req.user.id; // From auth middleware
        const { reason } = req.body; // cancellation reason

        const booking = await prisma.venueBooking.findUnique({
            where: { id: parseInt(id) },
            include: { venue: true }
        });

        if (!booking) {
            throw new NotFoundError("Booking not found");
        }

        if (booking.memberId !== memberId) {
            return res.status(403).json({ error: "You are not authorized to cancel this booking" });
        }

        if (booking.bookingStatus === 'Cancelled') {
            return res.status(400).json({ error: "Booking is already cancelled" });
        }

        // Update with cancellation reason
        const updatedBooking = await prisma.venueBooking.update({
            where: { id: parseInt(id) },
            data: { bookingStatus: 'Cancelled', cancellationReason: reason || null }
        });

        // NOTIFICATION with reason
        const { sendNotification } = require("../services/notificationService");
        await sendNotification(
            memberId,
            "Booking Cancelled",
            `Your booking for ${booking.venue.name} on ${new Date(booking.bookingDate).toLocaleDateString()} has been cancelled. Reason: ${reason || 'No reason provided.'}`,
            "alert"
        );

        res.json({ message: "Booking cancelled successfully", booking: updatedBooking });
    } catch (error) {
        next(error);
    }
});

// GET /api/venues/bookings/my - Get current user's bookings
router.get("/bookings/my", authenticate, async (req, res, next) => {
    try {
        const bookings = await prisma.venueBooking.findMany({
            where: { memberId: req.user.id },
            include: {
                venue: true,
                payments: true,
                feedback: true
            },
            orderBy: {
                bookingDate: 'desc'
            }
        })

        res.json(bookings)
    } catch (error) {
        next(error)
    }
})

// GET /api/venues/bookings/all - Get all bookings (Admin only)
router.get("/bookings/all", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const bookings = await prisma.venueBooking.findMany({
            include: {
                venue: true,
                member: {
                    select: { id: true, fullName: true, email: true, phone: true }
                },
                payments: true
            },
            orderBy: {
                bookingDate: 'desc'
            }
        })
        res.json(bookings)
    } catch (error) {
        next(error)
    }
})

// PUT /api/venues/bookings/:id - Update booking status/details (Admin only)
router.put("/bookings/:id", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { bookingStatus, bookingDate, startTime, endTime } = req.body;

        const updateData = {};
        if (bookingStatus) updateData.bookingStatus = bookingStatus;
        if (bookingDate) updateData.bookingDate = new Date(bookingDate);
        if (startTime && endTime) updateData.timeSlot = `${startTime} - ${endTime}`;

        const booking = await prisma.venueBooking.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: { venue: true, member: true }
        });

        res.json({ message: "Booking updated successfully", booking });
    } catch (error) {
        next(error);
    }
});

module.exports = router
