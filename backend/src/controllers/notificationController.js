const prisma = require("../lib/prisma")
const { parsePagination, paginationMeta } = require("../utils/pagination")

// ─── Notification Retrieval ───────────────────────────────────────────────────

/**
 * Return notifications for the authenticated member.
 * Combines two sources:
 *  1. Synthetic alerts derived from live data (pending bookings, pending membership)
 *  2. Stored UserNotification records from the database
 * Supports optional unread-only filtering and pagination.
 * @route GET /api/notifications
 */
exports.getNotifications = async (req, res, next) => {
    try {
        const memberId = req.user.id
        const { skip, take, page, limit } = parsePagination(req.query)
        const { unreadOnly } = req.query

        const notifications = []

        // Inject live alerts for upcoming bookings that still need payment
        const pendingBookings = await prisma.venueBooking.findMany({ where: { memberId, bookingStatus: 'Pending', bookingDate: { gte: new Date() } }, take: 5 })
        pendingBookings.forEach(booking => {
            notifications.push({ id: `booking-${booking.id}`, type: 'alert', title: 'Pending Booking Payment', message: `Booking for venue on ${new Date(booking.bookingDate).toLocaleDateString()} is pending. Please complete payment.`, link: '/mybookings', createdAt: booking.createdAt || new Date() })
        })

        // Inject a membership-pending alert if the member's account is still under review
        const membership = await prisma.member.findUnique({ where: { id: memberId }, select: { status: true } })
        if (membership?.status === 'Pending') {
            notifications.push({ id: 'membership-pending', type: 'info', title: 'Membership Pending', message: 'Your membership application is currently under review.', link: '/profile', createdAt: new Date() })
        }

        // Fetch stored notifications from the DB, optionally filtered to unread only
        const storedWhere = { memberId, ...(unreadOnly === 'true' && { readStatus: false }) }
        const [stored, total] = await Promise.all([
            prisma.userNotification.findMany({ where: storedWhere, include: { notification: true }, orderBy: { sentDate: 'desc' }, skip, take }),
            prisma.userNotification.count({ where: storedWhere })
        ])

        stored.forEach(un => {
            notifications.push({ id: un.id, type: un.notification.notificationType, title: un.notification.title, message: un.notification.message, read: un.readStatus, createdAt: un.sentDate })
        })

        res.json({ data: notifications, meta: paginationMeta(total, page, limit) })
    } catch (error) { next(error) }
}

// ─── Admin Notification Dispatch ─────────────────────────────────────────────

/**
 * Send a notification to a specific member (admin only).
 * Delegates to notificationService which persists the record and emits a socket event.
 * @route POST /api/notifications/send
 */
exports.sendNotification = async (req, res, next) => {
    try {
        const { memberId, title, message, type = 'info', data = {} } = req.body
        if (!memberId || !title || !message) return res.status(400).json({ error: "memberId, title, and message are required" })

        const { sendNotification } = require("../services/notificationService")
        await sendNotification(memberId, title, message, type)

        res.json({ success: true, message: "Notification sent successfully", data })
    } catch (error) {
        console.error("Error sending notification:", error)
        next(error)
    }
}
