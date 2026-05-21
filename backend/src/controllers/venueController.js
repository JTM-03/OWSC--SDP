const prisma = require("../lib/prisma")
const { NotFoundError, BadRequestError } = require("../utils/errors")
const { isRestrictedDate } = require("../utils/dateRestriction")

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert "HH:MM" time string to total minutes since midnight for comparison */
const toMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

// OWSC venue operating hours: 6:00 PM – 11:00 PM
const OPEN_MINUTES  = 18 * 60
const CLOSE_MINUTES = 23 * 60

// ─── Venue CRUD ───────────────────────────────────────────────────────────────

/**
 * Return all venues (no filtering).
 * @route GET /api/venues
 */
exports.listVenues = async (req, res, next) => {
    try {
        const venues = await prisma.venue.findMany()
        res.json(venues)
    } catch (error) { next(error) }
}

/**
 * Search available venues for a given date/time window.
 * Excludes venues that have a confirmed or pending booking overlapping the requested slot.
 * Supports optional filtering by capacity, occasion keyword, and venue type.
 * @route GET /api/venues/search
 */
exports.searchVenues = async (req, res, next) => {
    try {
        const { date, startTime, endTime, capacity, occasion, venueType } = req.query
        if (!date || !startTime || !endTime) return res.status(400).json({ error: "Date, start time, and end time are required" })

        // Reject searches for past dates immediately
        const today = new Date(); today.setHours(0, 0, 0, 0)
        const requestedDate = new Date(date); requestedDate.setHours(0, 0, 0, 0)
        if (requestedDate < today) return res.json([])

        // Find all non-cancelled bookings on the requested date
        const existingBookings = await prisma.venueBooking.findMany({
            where: { bookingDate: { gte: new Date(date + "T00:00:00.000Z"), lt: new Date(date + "T23:59:59.999Z") }, bookingStatus: { not: 'Cancelled' } }
        })

        // Determine which venues have a time-slot conflict with the requested window
        const occupiedVenueIds = existingBookings.filter(b => {
            if (!b.timeSlot) return false
            const parts = b.timeSlot.split(' - ')
            if (parts.length !== 2) return false
            // Overlap condition: requested start < existing end AND requested end > existing start
            return (startTime < parts[1]) && (endTime > parts[0])
        }).map(b => b.venueId)

        const venueBoxFilter = { id: { notIn: occupiedVenueIds }, capacity: capacity ? { gte: parseInt(capacity) } : undefined }

        // Filter by occasion keyword against facilities or venue name
        if (occasion && occasion !== 'all') {
            venueBoxFilter.OR = [{ facilities: { contains: occasion } }, { name: { contains: occasion } }]
        }

        // Map venue type labels to name keywords for flexible matching
        if (venueType && venueType !== 'all') {
            const typeKeywords = { 'sports': ['Court', 'Pool', 'Track', 'Field', 'Gym'], 'hall': ['Hall', 'Ballroom', 'Auditorium'], 'meeting': ['Meeting', 'Conference', 'Room', 'Lounge'] }
            const keywords = typeKeywords[venueType.toLowerCase()] || []
            if (keywords.length > 0) {
                const typeFilters = keywords.map(k => ({ name: { contains: k } }))
                venueBoxFilter.OR = venueBoxFilter.OR ? [...venueBoxFilter.OR, ...typeFilters] : typeFilters
            }
        }

        const venues = await prisma.venue.findMany({ where: venueBoxFilter })
        res.json(venues)
    } catch (error) { next(error) }
}

/**
 * Return a single venue by ID.
 * @route GET /api/venues/:id
 */
exports.getVenue = async (req, res, next) => {
    try {
        const venue = await prisma.venue.findUnique({ where: { id: parseInt(req.params.id) } })
        if (!venue) throw new NotFoundError('Venue not found')
        res.json(venue)
    } catch (error) { next(error) }
}

/**
 * Create a new venue (admin only).
 * @route POST /api/venues
 */
exports.createVenue = async (req, res, next) => {
    try {
        const { name, capacity, facilities, atmosphere, charge } = req.validatedData
        const venue = await prisma.venue.create({ data: { name, capacity, facilities, atmosphere, charge } })
        res.status(201).json({ message: 'Venue created successfully', venue })
    } catch (error) { next(error) }
}

/**
 * Update an existing venue's details (admin only).
 * @route PUT /api/venues/:id
 */
exports.updateVenue = async (req, res, next) => {
    try {
        const { name, capacity, facilities, atmosphere, charge } = req.validatedData
        const venue = await prisma.venue.update({ where: { id: parseInt(req.params.id) }, data: { name, capacity, facilities, atmosphere, charge } })
        res.json({ message: 'Venue updated successfully', venue })
    } catch (error) { next(error) }
}

/**
 * Delete a venue (admin only).
 * @route DELETE /api/venues/:id
 */
exports.deleteVenue = async (req, res, next) => {
    try {
        await prisma.venue.delete({ where: { id: parseInt(req.params.id) } })
        res.json({ message: 'Venue deleted successfully' })
    } catch (error) { next(error) }
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

/**
 * Create a venue booking for the authenticated member.
 * Enforces:
 *  - No bookings on Sundays or Poya days
 *  - Operating hours (6 PM – 11 PM)
 *  - No same-day bookings after 5 PM
 *  - No food pre-orders on same-day bookings
 *  - No double-booking of the same venue/time slot
 * Creates booking + payment records atomically, then sends in-app and socket notifications.
 * @route POST /api/venues/bookings
 */
exports.createBooking = async (req, res, next) => {
    try {
        const venueId = parseInt(req.body.venueId)
        const bookingDate = req.body.bookingDate
        const startTime = req.body.startTime
        const endTime = req.body.endTime
        const amount = parseFloat(req.body.amount)
        const paymentMethod = req.body.paymentMethod
        const foodRequired = req.body.foodRequired === 'true' || req.body.foodRequired === true
        const foodDetails = req.body.foodDetails || null

        if (!amount || !paymentMethod) throw new BadRequestError('Amount and payment method are required')

        // Run Zod schema validation on the booking-specific fields
        const { bookingSchema } = require("../validation/schemas")
        bookingSchema.parse({ venueId, bookingDate, startTime, endTime })

        // OWSC policy: no bookings on restricted dates (Sundays, Poya days)
        if (isRestrictedDate(bookingDate)) throw new BadRequestError('Cannot book venues on Sundays or Poya days.')

        // Enforce operating hours window
        if (toMinutes(startTime) < OPEN_MINUTES || toMinutes(endTime) > CLOSE_MINUTES) {
            throw new BadRequestError('Venue bookings are only available between 6:00 PM and 11:00 PM.')
        }
        if (toMinutes(startTime) >= toMinutes(endTime)) throw new BadRequestError('End time must be after start time.')

        const today = new Date(); today.setHours(0, 0, 0, 0)
        const requestedDate = new Date(bookingDate); requestedDate.setHours(0, 0, 0, 0)
        const isToday = requestedDate.getTime() === today.getTime()

        if (requestedDate < today) throw new BadRequestError('Cannot book venues for past dates.')
        // Cut-off for same-day bookings is 5 PM
        if (isToday && new Date().getHours() >= 17) throw new BadRequestError('Same-day venue bookings are not accepted after 5:00 PM.')
        // Food pre-orders require advance notice — same-day food must be ordered separately
        if (foodRequired && foodDetails && isToday) throw new BadRequestError('Food pre-orders are not available for same-day bookings. Please place your food order separately through the restaurant.')

        const memberId = req.user.id
        const dateObj = new Date(bookingDate)
        const startOfDay = new Date(dateObj); startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(dateObj); endOfDay.setHours(23, 59, 59, 999)

        // Check for conflicting bookings on the same venue and date
        const existingBookings = await prisma.venueBooking.findMany({
            where: { venueId, bookingDate: { gte: startOfDay, lte: endOfDay }, bookingStatus: { not: 'Cancelled' } }
        })

        const conflicting = existingBookings.find(b => {
            if (!b.timeSlot) return false
            const parts = b.timeSlot.split(' - ')
            return (parts.length === 2) && (startTime < parts[1]) && (endTime > parts[0])
        })
        if (conflicting) throw new BadRequestError('Venue is already booked for this time range')

        // Create booking and payment atomically
        const result = await prisma.$transaction(async (prisma) => {
            const booking = await prisma.venueBooking.create({
                data: { memberId, venueId, bookingDate: new Date(bookingDate), timeSlot: `${startTime} - ${endTime}`, bookingStatus: 'Pending', foodRequired, foodDetails: foodRequired ? foodDetails : null },
                include: { venue: true }
            })
            let receiptUrl = req.file ? `/uploads/${req.file.filename}` : null
            const payment = await prisma.bookingPayment.create({
                data: { bookingId: booking.id, memberId, amount, paymentMethod: paymentMethod || 'Unknown', paymentStatus: 'Pending Verification', paymentDate: new Date(), receiptUrl }
            })
            return { booking, payment }
        })

        const { sendNotification } = require("../services/notificationService")
        const { notifyUser } = require("../services/socketService")

        // Notify member via DB notification and real-time socket event
        await sendNotification(memberId, "Booking Received", `Your booking for ${result.booking.venue.name} on ${new Date(bookingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} has been received and is pending payment verification.`, "info")
        notifyUser(memberId, { type: 'BOOKING_RECEIVED', title: 'Booking Received', message: `Your booking for ${result.booking.venue.name} is pending payment verification.`, bookingId: result.booking.id })

        res.status(201).json({ message: 'Booking created successfully', booking: result.booking, payment: result.payment })
    } catch (error) { next(error) }
}

/**
 * Return all bookings belonging to the authenticated member.
 * @route GET /api/venues/bookings/my
 */
exports.getMyBookings = async (req, res, next) => {
    try {
        const bookings = await prisma.venueBooking.findMany({
            where: { memberId: req.user.id },
            include: { venue: true, payments: true, feedback: true },
            orderBy: { bookingDate: 'desc' }
        })
        res.json(bookings)
    } catch (error) { next(error) }
}

/**
 * Return all bookings across all members (admin/staff only).
 * @route GET /api/venues/bookings
 */
exports.getAllBookings = async (req, res, next) => {
    try {
        const bookings = await prisma.venueBooking.findMany({
            include: { venue: true, member: { select: { id: true, fullName: true, email: true, phone: true } }, payments: true },
            orderBy: { bookingDate: 'desc' }
        })
        res.json(bookings)
    } catch (error) { next(error) }
}

/**
 * Cancel a booking by the member who owns it.
 * Sends cancellation notification and email to the member.
 * @route DELETE /api/venues/bookings/:id
 */
exports.cancelBooking = async (req, res, next) => {
    try {
        const { id } = req.params
        const memberId = req.user.id
        const { reason } = req.body

        // Ensure the booking belongs to the requesting member
        const booking = await prisma.venueBooking.findUnique({ where: { id: parseInt(id) }, include: { venue: true } })
        if (!booking || booking.memberId !== memberId) throw new NotFoundError("Booking not found")

        const updated = await prisma.venueBooking.update({ where: { id: parseInt(id) }, data: { bookingStatus: 'Cancelled', cancellationReason: reason || null } })

        const { sendNotification } = require("../services/notificationService")
        const { notifyUser } = require("../services/socketService")

        await sendNotification(memberId, "Booking Cancelled", `Your booking for ${booking.venue.name} on ${new Date(booking.bookingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} has been cancelled.`, "alert")
        notifyUser(memberId, { type: 'BOOKING_CANCELLED', title: 'Booking Cancelled', message: `Your booking for ${booking.venue.name} has been cancelled.`, bookingId: parseInt(id) })

        const member = await prisma.member.findUnique({ where: { id: memberId }, select: { fullName: true, email: true } })
        if (member?.email) {
            const { sendBookingCancelledEmail } = require("../services/emailService")
            sendBookingCancelledEmail(member, booking, booking.venue, reason || null, false).catch(err => console.error('Booking cancellation email failed:', err.message))
        }

        res.json({ message: "Booking cancelled successfully", booking: updated })
    } catch (error) { next(error) }
}

/**
 * Cancel any booking on behalf of an admin.
 * Records the cancelling admin's ID and notifies the member.
 * @route DELETE /api/venues/bookings/:id/admin
 */
exports.adminCancelBooking = async (req, res, next) => {
    try {
        const { id } = req.params
        const { reason } = req.body

        const booking = await prisma.venueBooking.findUnique({ where: { id: parseInt(id) }, include: { venue: true, member: true } })
        if (!booking) throw new NotFoundError("Booking not found")

        // Store which admin performed the cancellation for audit purposes
        const updated = await prisma.venueBooking.update({ where: { id: parseInt(id) }, data: { bookingStatus: 'Cancelled', cancellationReason: reason, cancelledBy: req.user.id } })

        const { sendNotification } = require("../services/notificationService")
        const { notifyUser } = require("../services/socketService")

        await sendNotification(booking.memberId, "Booking Cancelled by Administration", `Your booking for ${booking.venue.name} on ${new Date(booking.bookingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} has been cancelled. Reason: ${reason}`, "alert")
        notifyUser(booking.memberId, { type: 'BOOKING_CANCELLED', title: 'Booking Cancelled by Administration', message: `Your booking for ${booking.venue.name} has been cancelled. Reason: ${reason || 'Contact admin for details.'}`, bookingId: parseInt(id) })

        if (booking.member?.email) {
            const { sendBookingCancelledEmail } = require("../services/emailService")
            sendBookingCancelledEmail(booking.member, booking, booking.venue, reason || null, true).catch(err => console.error('Admin cancellation email failed:', err.message))
        }

        res.json({ message: "Booking cancelled by admin", booking: updated })
    } catch (error) { next(error) }
}

/**
 * Mark a booking's payment as verified and confirm the booking.
 * Sends confirmation notification, socket event, and email to the member.
 * @route POST /api/venues/bookings/:id/verify-payment
 */
exports.verifyBookingPayment = async (req, res, next) => {
    try {
        const bookingId = parseInt(req.params.id)
        const booking = await prisma.venueBooking.findUnique({ where: { id: bookingId }, include: { payments: true } })
        if (!booking || booking.payments.length === 0) throw new BadRequestError("Booking or payment not found")

        // Approve the first (most recent) payment record
        await prisma.bookingPayment.update({ where: { id: booking.payments[0].id }, data: { paymentStatus: 'Completed' } })

        const updated = await prisma.venueBooking.update({ where: { id: bookingId }, data: { bookingStatus: 'Confirmed' }, include: { venue: true, member: true } })

        const { sendNotification } = require("../services/notificationService")
        const { notifyUser } = require("../services/socketService")

        await sendNotification(booking.memberId, "Booking Confirmed! ✓", `Your booking for ${updated.venue.name} on ${new Date(updated.bookingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} has been confirmed. Time: ${updated.timeSlot}.`, "success")
        notifyUser(booking.memberId, { type: 'BOOKING_CONFIRMED', title: 'Booking Confirmed!', message: `Your booking for ${updated.venue.name} on ${new Date(updated.bookingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} is confirmed.`, bookingId: updated.id })

        if (updated.member?.email) {
            const { sendBookingConfirmedEmail } = require("../services/emailService")
            sendBookingConfirmedEmail(updated.member, updated, updated.venue, booking.payments[0]).catch(err => console.error('Booking confirmed email failed:', err.message))
        }

        res.json({ message: "Payment verified", booking: updated })
    } catch (error) { next(error) }
}

/**
 * Update booking details or status (admin only).
 * Notifies the member of any changes via in-app notification and email.
 * @route PUT /api/venues/bookings/:id
 */
exports.updateBooking = async (req, res, next) => {
    try {
        const { id } = req.params
        const { bookingStatus, bookingDate, startTime, endTime, cancellationReason } = req.body

        // Build update payload from only the provided fields
        const data = {}
        if (bookingStatus) data.bookingStatus = bookingStatus
        if (bookingDate) data.bookingDate = new Date(bookingDate)
        if (startTime && endTime) data.timeSlot = `${startTime} - ${endTime}`
        if (cancellationReason !== undefined) data.cancellationReason = cancellationReason

        const booking = await prisma.venueBooking.update({ where: { id: parseInt(id) }, data, include: { venue: true, member: true } })

        const { sendNotification } = require("../services/notificationService")
        const { notifyUser } = require("../services/socketService")
        const { sendBookingEditedEmail } = require("../services/emailService")

        // Build a human-readable description of what changed for the notification
        const changeDesc = bookingStatus ? `Status updated to ${bookingStatus}` : bookingDate ? `Date/time updated` : 'Booking details updated'

        await sendNotification(booking.memberId, "Booking Updated", `Your booking for ${booking.venue?.name} has been updated. ${changeDesc}.`, "info")
        notifyUser(booking.memberId, { type: 'BOOKING_UPDATED', title: 'Booking Updated', message: `Your booking for ${booking.venue?.name} has been updated. ${changeDesc}.`, bookingId: booking.id })

        if (booking.member?.email) {
            sendBookingEditedEmail(booking.member, booking, booking.venue, changeDesc).catch(err => console.error('Booking edit email failed:', err.message))
        }

        res.json({ message: "Booking updated successfully", booking })
    } catch (error) { next(error) }
}

/**
 * Return bookings formatted as calendar events for a given date range.
 * Optionally filtered by venueId. Used by the admin calendar view.
 * @route GET /api/venues/calendar
 */
exports.getCalendar = async (req, res, next) => {
    try {
        const { startDate, endDate, venueId } = req.query
        if (!startDate || !endDate) return res.status(400).json({ error: "startDate and endDate are required" })

        const whereClause = { bookingDate: { gte: new Date(startDate), lte: new Date(endDate) }, bookingStatus: { not: 'Cancelled' } }
        if (venueId && venueId !== 'all' && venueId !== 'undefined') whereClause.venueId = parseInt(venueId)

        const bookings = await prisma.venueBooking.findMany({
            where: whereClause,
            include: {
                venue: { select: { id: true, name: true } },
                member: { select: { id: true, fullName: true, email: true, phone: true } },
                // Only fetch the most recent payment for display
                payments: { select: { id: true, amount: true, paymentStatus: true, paymentMethod: true, receiptUrl: true }, take: 1, orderBy: { paymentDate: 'desc' } }
            }
        })

        // Transform bookings into the FullCalendar event shape expected by the frontend
        const calendarEvents = bookings.map(booking => {
            let bookingDateTime = new Date(booking.bookingDate)
            if (isNaN(bookingDateTime.getTime())) bookingDateTime = new Date()

            // Parse the start time from the "HH:MM - HH:MM" slot string to set the event start
            if (booking.timeSlot && booking.timeSlot.includes(' - ')) {
                try {
                    const [startTime] = booking.timeSlot.split(' - ')
                    const parts = startTime.split(':')
                    if (parts.length >= 2) {
                        const h = parseInt(parts[0]); const m = parseInt(parts[1])
                        if (!isNaN(h) && !isNaN(m)) bookingDateTime.setHours(h, m, 0)
                    }
                } catch (e) { console.error('Time parsing error:', e) }
            }

            const payment = booking.payments[0] || null
            const iso = bookingDateTime.toISOString()

            return {
                id: booking.id, bookingId: booking.id,
                title: `${booking.venue?.name || 'Venue'} - ${booking.member?.fullName || 'Member'}`,
                start: iso, end: iso,
                description: booking.purpose || 'Venue Booking',
                venueId: booking.venueId, venueName: booking.venue?.name || 'Venue',
                memberName: booking.member?.fullName || 'Member', memberEmail: booking.member?.email || '',
                memberPhone: booking.member?.phone || '', bookingStatus: booking.bookingStatus,
                status: booking.bookingStatus,
                paymentStatus: payment ? payment.paymentStatus : 'No Payment',
                paymentAmount: payment ? Number(payment.amount) : 0,
                paymentMethod: payment ? payment.paymentMethod : 'N/A',
                receiptUrl: payment ? payment.receiptUrl : null,
                timeSlot: booking.timeSlot,
                // Colour-code events: blue for confirmed, amber for pending
                backgroundColor: booking.bookingStatus === 'Confirmed' ? '#2563eb' : '#f59e0b'
            }
        })

        res.json(calendarEvents)
    } catch (error) {
        console.error('Calendar Fetch Error:', error)
        next(error)
    }
}
