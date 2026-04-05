const express = require("express");
const prisma = require("../lib/prisma");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// GET /api/notifications - Get user notifications (System Alerts + Stored)
router.get("/", authenticate, async (req, res, next) => {
    try {
        const memberId = req.user.id;
        const notifications = [];

        // 1. Check for Pending Bookings (Overdue/Action Required)
        const pendingBookings = await prisma.venueBooking.findMany({
            where: {
                memberId,
                bookingStatus: 'Pending',
                bookingDate: { gte: new Date() } // Future bookings only
            }
        });

        pendingBookings.forEach(booking => {
            notifications.push({
                id: `booking-${booking.id}`,
                type: 'alert',
                title: 'Pending Booking Payment',
                message: `Booking for ${booking.venueId} on ${new Date(booking.bookingDate).toLocaleDateString()} is pending. Please complete payment.`,
                link: '/mybookings',
                createdAt: booking.createdAt || new Date()
            });
        });

        // 2. Check for Membership Status
        const membership = await prisma.member.findUnique({
            where: { id: memberId },
            select: { status: true }
        });

        if (membership && membership.status === 'Pending') {
            notifications.push({
                id: 'membership-pending',
                type: 'info',
                title: 'Membership Pending',
                message: 'Your membership application is currently under review.',
                link: '/profile',
                createdAt: new Date()
            });
        }

        // 3. Stored Notifications
        const stored = await prisma.userNotification.findMany({
            where: { memberId },
            include: { notification: true },
            orderBy: { sentDate: 'desc' }
        });

        stored.forEach(un => {
            notifications.push({
                id: un.id,
                type: un.notification.notificationType,
                title: un.notification.title,
                message: un.notification.message,
                read: un.readStatus,
                createdAt: un.sentDate
            });
        });

        res.json(notifications);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
