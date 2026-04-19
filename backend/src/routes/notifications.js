const express = require("express");
const prisma = require("../lib/prisma");
const { authenticate } = require("../middleware/auth");
const { parsePagination, paginationMeta } = require("../utils/pagination");

const router = express.Router();

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get current user's notifications with pagination
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: unreadOnly
 *         schema: { type: boolean }
 *         description: If true, return only unread notifications
 *     responses:
 *       200:
 *         description: Paginated notifications
 *
 * /notifications/send:
 *   post:
 *     summary: Send a notification to a user (Admin/System)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [memberId, title, message]
 *             properties:
 *               memberId: { type: integer }
 *               title:    { type: string }
 *               message:  { type: string }
 *               type:     { type: string, enum: [info, alert, success, error], default: info }
 *     responses:
 *       200:
 *         description: Notification sent
 */

// GET /api/notifications - Get user notifications
router.get("/", authenticate, async (req, res, next) => {
    try {
        const memberId = req.user.id;
        const { skip, take, page, limit } = parsePagination(req.query);
        const { unreadOnly } = req.query;

        const notifications = [];

        // 1. Pending booking alerts (not paginated — always show)
        const pendingBookings = await prisma.venueBooking.findMany({
            where: {
                memberId,
                bookingStatus: 'Pending',
                bookingDate: { gte: new Date() }
            },
            take: 5  // cap at 5 alert items
        });

        pendingBookings.forEach(booking => {
            notifications.push({
                id: `booking-${booking.id}`,
                type: 'alert',
                title: 'Pending Booking Payment',
                message: `Booking for venue on ${new Date(booking.bookingDate).toLocaleDateString()} is pending. Please complete payment.`,
                link: '/mybookings',
                createdAt: booking.createdAt || new Date()
            });
        });

        // 2. Membership status alert
        const membership = await prisma.member.findUnique({
            where: { id: memberId },
            select: { status: true }
        });

        if (membership?.status === 'Pending') {
            notifications.push({
                id: 'membership-pending',
                type: 'info',
                title: 'Membership Pending',
                message: 'Your membership application is currently under review.',
                link: '/profile',
                createdAt: new Date()
            });
        }

        // 3. Stored notifications — paginated
        const storedWhere = {
            memberId,
            ...(unreadOnly === 'true' && { readStatus: false })
        };

        const [stored, total] = await Promise.all([
            prisma.userNotification.findMany({
                where: storedWhere,
                include: { notification: true },
                orderBy: { sentDate: 'desc' },
                skip,
                take,
            }),
            prisma.userNotification.count({ where: storedWhere })
        ]);

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

        res.json({
            data: notifications,
            meta: paginationMeta(total, page, limit)
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/notifications/send - Send a notification to a user (Admin/System)
router.post("/send", authenticate, async (req, res, next) => {
    try {
        const { memberId, title, message, type = 'info', data = {} } = req.body;

        if (!memberId || !title || !message) {
            return res.status(400).json({ error: "memberId, title, and message are required" });
        }

        const { sendNotification } = require("../services/notificationService");
        await sendNotification(memberId, title, message, type);

        res.json({ 
            success: true, 
            message: "Notification sent successfully",
            data 
        });
    } catch (error) {
        console.error("Error sending notification:", error);
        next(error);
    }
});

module.exports = router;
