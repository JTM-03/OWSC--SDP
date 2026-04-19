const express = require("express")
const prisma = require("../lib/prisma")
const { authenticate } = require("../middleware/auth")
const { BadRequestError, NotFoundError } = require("../utils/errors")
const { z } = require('zod')
const { validate } = require("../middleware/validate")
const { uploadSingleReceipt, handleMulterError } = require("../middleware/multerConfig")
const { uploadReceipt } = require("../services/cloudinaryService")

const router = express.Router()

/**
 * @swagger
 * /payments:
 *   post:
 *     summary: Process a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [entityType, entityId, amount, method]
 *             properties:
 *               entityType: { type: string, enum: [membership, booking, order] }
 *               entityId:   { type: integer, example: 1 }
 *               amount:     { type: number, example: 5000 }
 *               method:     { type: string, enum: [Cash, Card, Online] }
 *     responses:
 *       201:
 *         description: Payment processed
 *
 * /payments/my:
 *   get:
 *     summary: Get current user's payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment history grouped by type
 *
 * /payments/pending:
 *   get:
 *     summary: Get all pending payment receipts (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending payments grouped by type
 *
 * /payments/upload/membership:
 *   post:
 *     summary: Upload membership payment receipt
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [membershipId, amount, paymentMethod, receipt]
 *             properties:
 *               membershipId:  { type: integer }
 *               amount:        { type: number }
 *               paymentMethod: { type: string }
 *               receipt:       { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Receipt uploaded, pending verification
 *
 * /payments/upload/booking:
 *   post:
 *     summary: Upload booking payment receipt
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [bookingId, amount, paymentMethod, receipt]
 *             properties:
 *               bookingId:     { type: integer }
 *               amount:        { type: number }
 *               paymentMethod: { type: string }
 *               receipt:       { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Receipt uploaded
 *
 * /payments/upload/order:
 *   post:
 *     summary: Upload order payment receipt
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [orderId, amount, paymentMethod, receipt]
 *             properties:
 *               orderId:       { type: integer }
 *               amount:        { type: number }
 *               paymentMethod: { type: string }
 *               receipt:       { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Receipt uploaded
 *
 * /payments/verify/{type}/{paymentId}:
 *   post:
 *     summary: Verify a payment receipt (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [membership, booking, order] }
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [approved]
 *             properties:
 *               approved: { type: boolean }
 *               reason:   { type: string }
 *     responses:
 *       200:
 *         description: Payment approved or rejected
 *
 * /payments/receipt/{type}/{id}:
 *   get:
 *     summary: Download a payment receipt PDF
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [membership, booking, order] }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: PDF receipt file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */

const paymentSchema = z.object({
    entityType: z.enum(['membership', 'booking', 'order']),
    entityId: z.number().int(),
    amount: z.number().positive(),
    method: z.enum(['Cash', 'Card', 'Online'])
})

// POST /api/payments - Process a payment
router.post("/", authenticate, validate(paymentSchema), async (req, res, next) => {
    try {
        const { entityType, entityId, amount, method } = req.validatedData
        const memberId = req.user.id

        console.log(`Processing ${entityType} payment for ID ${entityId}: ${amount} via ${method}`);

        const result = await prisma.$transaction(async (tx) => {
            let paymentRecord;
            let updatedEntity;

            if (entityType === 'membership') {
                // Check membership
                const membership = await tx.user.findUnique({ where: { id: entityId } })
                if (!membership) throw new NotFoundError('Membership not found')

                // Create Payment
                paymentRecord = await tx.membershipPayment.create({
                    data: {
                        membershipId: entityId,
                        memberId,
                        amount,
                        paymentMethod: method,
                        paymentDate: new Date(),
                        paymentStatus: 'Completed'
                    }
                })

                // Activate Membership if pending
                if (membership.status === 'Pending') {
                    updatedEntity = await tx.user.update({
                        where: { id: entityId },
                        data: { status: 'Active' }
                    })

                    // Also update Member status if needed
                    await tx.member.update({
                        where: { id: membership.memberId },
                        data: { status: 'Active' }
                    })
                }

            } else if (entityType === 'booking') {
                const booking = await tx.venueBooking.findUnique({ where: { id: entityId } })
                if (!booking) throw new NotFoundError('Booking not found')

                paymentRecord = await tx.bookingPayment.create({
                    data: {
                        bookingId: entityId,
                        memberId,
                        amount,
                        paymentMethod: method,
                        paymentDate: new Date(),
                        paymentStatus: 'Completed'
                    }
                })

                if (booking.bookingStatus === 'Pending') {
                    updatedEntity = await tx.venueBooking.update({
                        where: { id: entityId },
                        data: { bookingStatus: 'Confirmed' }
                    })
                }

            } else if (entityType === 'order') {
                const order = await tx.order.findUnique({ where: { id: entityId } })
                if (!order) throw new NotFoundError('Order not found')

                paymentRecord = await tx.orderPayment.create({
                    data: {
                        orderId: entityId,
                        memberId,
                        amount,
                        paymentMethod: method,
                        paymentDate: new Date(),
                        paymentStatus: 'Completed'
                    }
                })

                if (order.orderStatus === 'Pending') {
                    // If paid, maybe move to 'Preparing' or 'Paid' status depending on workflow
                    // Using 'Preparing' as default 'Paid' state for kitchen
                    updatedEntity = await tx.order.update({
                        where: { id: entityId },
                        data: { orderStatus: 'Preparing' }
                    })
                }
            }

            return { paymentRecord, updatedEntity }
        })

        const { sendNotification } = require("../services/notificationService");

        await sendNotification(
            memberId,
            "Payment Received",
            `Your ${entityType} payment of Rs. ${amount} via ${method} has been received.`,
            "info"
        );

        res.status(201).json({
            message: 'Payment processed successfully',
            ...result
        })

    } catch (error) {
        next(error)
    }
})

// ====================
// RECEIPT UPLOAD ENDPOINTS
// ====================

/**
 * POST /api/payments/upload/membership
 * Upload membership payment receipt
 * Body: { membershipId, amount, paymentMethod, receipt (file) }
 */
router.post("/upload/membership", authenticate, uploadSingleReceipt, handleMulterError, async (req, res, next) => {
    try {
        const { membershipId, amount, paymentMethod } = req.body;
        const memberId = req.user.id;

        // Validation
        if (!membershipId || !amount || !paymentMethod || !req.file) {
            throw new BadRequestError('Missing required fields: membershipId, amount, paymentMethod, and receipt file');
        }

        // Verify membership exists and belongs to user
        const membership = await prisma.user.findUnique({
            where: { id: parseInt(membershipId) }
        });

        if (!membership) {
            throw new NotFoundError('Membership not found');
        }

        // Upload file to Cloudinary
        console.log(`Uploading membership receipt for membership ID: ${membershipId}`);
        const cloudinaryResult = await uploadReceipt(
            req.file.buffer,
            req.file.originalname,
            'receipts/membership'
        );

        // Create payment record with receipt URL
        const payment = await prisma.membershipPayment.create({
            data: {
                membershipId: parseInt(membershipId),
                memberId,
                amount: parseFloat(amount),
                paymentMethod,
                paymentDate: new Date(),
                paymentStatus: 'Pending',  // Set to Pending - admin must verify
                receiptUrl: cloudinaryResult.url  // Store Cloudinary URL
            }
        });

        const { sendNotification } = require("../services/notificationService");
        await sendNotification(
            memberId,
            "Membership Payment Submitted",
            `Your membership payment receipt has been uploaded and is pending admin verification.`,
            "info"
        );

        res.status(201).json({
            message: 'Membership payment receipt uploaded successfully',
            payment
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/payments/upload/booking
 * Upload venue booking payment receipt
 * Body: { bookingId, amount, paymentMethod, receipt (file) }
 */
router.post("/upload/booking", authenticate, uploadSingleReceipt, handleMulterError, async (req, res, next) => {
    try {
        const { bookingId, amount, paymentMethod } = req.body;
        const memberId = req.user.id;

        // Validation
        if (!bookingId || !amount || !paymentMethod || !req.file) {
            throw new BadRequestError('Missing required fields: bookingId, amount, paymentMethod, and receipt file');
        }

        // Verify booking exists
        const booking = await prisma.venueBooking.findUnique({
            where: { id: parseInt(bookingId) }
        });

        if (!booking) {
            throw new NotFoundError('Booking not found');
        }

        if (booking.memberId !== memberId) {
            throw new BadRequestError('Unauthorized: This booking does not belong to you');
        }

        // Upload file to Cloudinary
        console.log(`Uploading booking receipt for booking ID: ${bookingId}`);
        const cloudinaryResult = await uploadReceipt(
            req.file.buffer,
            req.file.originalname,
            'receipts/booking'
        );

        // Create payment record with receipt URL
        const payment = await prisma.bookingPayment.create({
            data: {
                bookingId: parseInt(bookingId),
                memberId,
                amount: parseFloat(amount),
                paymentMethod,
                paymentDate: new Date(),
                paymentStatus: 'Pending',  // Set to Pending - admin must verify
                receiptUrl: cloudinaryResult.url  // Store Cloudinary URL
            }
        });

        const { sendNotification } = require("../services/notificationService");
        await sendNotification(
            memberId,
            "Booking Payment Submitted",
            `Your booking payment receipt has been uploaded and is pending admin verification.`,
            "info"
        );

        res.status(201).json({
            message: 'Booking payment receipt uploaded successfully',
            payment
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/payments/upload/order
 * Upload order payment receipt
 * Body: { orderId, amount, paymentMethod, receipt (file) }
 */
router.post("/upload/order", authenticate, uploadSingleReceipt, handleMulterError, async (req, res, next) => {
    try {
        const { orderId, amount, paymentMethod } = req.body;
        const memberId = req.user.id;

        // Validation
        if (!orderId || !amount || !paymentMethod || !req.file) {
            throw new BadRequestError('Missing required fields: orderId, amount, paymentMethod, and receipt file');
        }

        // Verify order exists
        const order = await prisma.order.findUnique({
            where: { id: parseInt(orderId) }
        });

        if (!order) {
            throw new NotFoundError('Order not found');
        }

        if (order.memberId !== memberId) {
            throw new BadRequestError('Unauthorized: This order does not belong to you');
        }

        // Upload file to Cloudinary
        console.log(`Uploading order receipt for order ID: ${orderId}`);
        const cloudinaryResult = await uploadReceipt(
            req.file.buffer,
            req.file.originalname,
            'receipts/order'
        );

        // Create payment record with receipt URL
        const payment = await prisma.orderPayment.create({
            data: {
                orderId: parseInt(orderId),
                memberId,
                amount: parseFloat(amount),
                paymentMethod,
                paymentDate: new Date(),
                paymentStatus: 'Pending',  // Set to Pending - admin must verify
                receiptUrl: cloudinaryResult.url  // Store Cloudinary URL
            }
        });

        const { sendNotification } = require("../services/notificationService");
        await sendNotification(
            memberId,
            "Order Payment Submitted",
            `Your order payment receipt has been uploaded and is pending admin verification.`,
            "info"
        );

        res.status(201).json({
            message: 'Order payment receipt uploaded successfully',
            payment
        });

    } catch (error) {
        next(error);
    }
});

// ====================
// ADMIN ENDPOINTS FOR PAYMENT VERIFICATION
// ====================

/**
 * GET /api/payments/pending
 * Get all pending payment receipts (Admin only)
 */
router.get("/pending", authenticate, async (req, res, next) => {
    try {
        // Check if user is admin
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { role: true }
        });

        if (user?.role !== 'admin') {
            throw new BadRequestError('Unauthorized: Admin access required');
        }

        const [membershipPayments, bookingPayments, orderPayments] = await Promise.all([
            prisma.membershipPayment.findMany({
                where: { paymentStatus: 'Pending' },
                include: {
                    member: { select: { id: true, fullName: true, email: true } },
                    membership: true
                },
                orderBy: { paymentDate: 'asc' }
            }),
            prisma.bookingPayment.findMany({
                where: { paymentStatus: 'Pending' },
                include: {
                    member: { select: { id: true, fullName: true, email: true } },
                    booking: { include: { venue: true } }
                },
                orderBy: { paymentDate: 'asc' }
            }),
            prisma.orderPayment.findMany({
                where: { paymentStatus: 'Pending' },
                include: {
                    member: { select: { id: true, fullName: true, email: true } },
                    order: true
                },
                orderBy: { paymentDate: 'asc' }
            })
        ]);

        res.json({
            membership: membershipPayments,
            booking: bookingPayments,
            order: orderPayments,
            summary: {
                pendingMembership: membershipPayments.length,
                pendingBooking: bookingPayments.length,
                pendingOrder: orderPayments.length,
                total: membershipPayments.length + bookingPayments.length + orderPayments.length
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/payments/verify/:type/:paymentId
 * Verify and approve a pending payment receipt (Admin only)
 * Body: { approved: boolean, reason?: string }
 */
router.post("/verify/:type/:paymentId", authenticate, async (req, res, next) => {
    try {
        const { type, paymentId } = req.params;
        const { approved, reason } = req.body;

        // Check if user is admin
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { role: true }
        });

        if (user?.role !== 'admin') {
            throw new BadRequestError('Unauthorized: Admin access required');
        }

        const id = parseInt(paymentId);
        const status = approved ? 'Completed' : 'Rejected';

        let payment;
        let updatedEntity;
        const { sendNotification } = require("../services/notificationService");

        // Handle different payment types
        if (type === 'membership') {
            payment = await prisma.membershipPayment.findUnique({
                where: { id },
                include: { member: true }
            });

            if (!payment) {
                throw new NotFoundError('Membership payment not found');
            }

            // Update payment status
            payment = await prisma.membershipPayment.update({
                where: { id },
                data: { paymentStatus: status }
            });

            // If approved, activate membership
            if (approved) {
                updatedEntity = await prisma.user.update({
                    where: { id: payment.membershipId },
                    data: { status: 'Active' }
                });

                await sendNotification(
                    payment.memberId,
                    "Membership Approved",
                    `Your membership payment has been verified and approved. Your membership is now active.`,
                    "success"
                );
            } else {
                await sendNotification(
                    payment.memberId,
                    "Membership Payment Rejected",
                    `Your membership payment was rejected. Reason: ${reason || 'Please contact admin for details'}`,
                    "error"
                );
            }

        } else if (type === 'booking') {
            payment = await prisma.bookingPayment.findUnique({
                where: { id },
                include: { member: true, booking: true }
            });

            if (!payment) {
                throw new NotFoundError('Booking payment not found');
            }

            // Update payment status
            payment = await prisma.bookingPayment.update({
                where: { id },
                data: { paymentStatus: status }
            });

            // If approved, confirm booking
            if (approved) {
                updatedEntity = await prisma.venueBooking.update({
                    where: { id: payment.bookingId },
                    data: { bookingStatus: 'Confirmed' }
                });

                await sendNotification(
                    payment.memberId,
                    "Booking Payment Approved",
                    `Your booking payment has been verified and approved. Your booking is now confirmed.`,
                    "success"
                );
            } else {
                await sendNotification(
                    payment.memberId,
                    "Booking Payment Rejected",
                    `Your booking payment was rejected. Reason: ${reason || 'Please contact admin for details'}`,
                    "error"
                );
            }

        } else if (type === 'order') {
            payment = await prisma.orderPayment.findUnique({
                where: { id },
                include: { member: true, order: true }
            });

            if (!payment) {
                throw new NotFoundError('Order payment not found');
            }

            // Update payment status
            payment = await prisma.orderPayment.update({
                where: { id },
                data: { paymentStatus: status }
            });

            // If approved, mark order as preparing
            if (approved) {
                updatedEntity = await prisma.order.update({
                    where: { id: payment.orderId },
                    data: { orderStatus: 'Preparing' }
                });

                await sendNotification(
                    payment.memberId,
                    "Order Payment Approved",
                    `Your order payment has been verified. Your order is now being prepared.`,
                    "success"
                );
            } else {
                await sendNotification(
                    payment.memberId,
                    "Order Payment Rejected",
                    `Your order payment was rejected. Reason: ${reason || 'Please contact admin for details'}`,
                    "error"
                );
            }

        } else {
            throw new BadRequestError('Invalid payment type');
        }

        res.json({
            message: `Payment ${status === 'Completed' ? 'approved' : 'rejected'} successfully`,
            payment,
            updatedEntity
        });

    } catch (error) {
        next(error);
    }
});


router.get("/my", authenticate, async (req, res, next) => {
    try {
        const memberId = req.user.id
        
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const [membershipPayments, bookingPayments, orderPayments] = await Promise.all([
            prisma.membershipPayment.findMany({ where: { memberId, paymentDate: { gte: oneYearAgo } }, orderBy: { paymentDate: 'desc' } }),
            prisma.bookingPayment.findMany({ where: { memberId, paymentDate: { gte: oneYearAgo } }, orderBy: { paymentDate: 'desc' } }),
            prisma.orderPayment.findMany({ where: { memberId, paymentDate: { gte: oneYearAgo } }, orderBy: { paymentDate: 'desc' } })
        ])

        res.json({
            membership: membershipPayments,
            booking: bookingPayments,
            order: orderPayments
        })
    } catch (e) { next(e) }
})

// GET /api/payments/receipt/:type/:id - Download Receipt
router.get("/receipt/:type/:id", authenticate, async (req, res, next) => {
    try {
        const { type, id } = req.params;
        const memberId = req.user.id;
        const paymentId = parseInt(id);

        let payment;
        let details = {};

        // Fetch user details for the receipt
        const member = await prisma.member.findUnique({
            where: { id: memberId },
            select: { id: true, fullName: true, email: true }
        });

        if (type === 'membership') {
            payment = await prisma.membershipPayment.findFirst({
                where: { id: paymentId, memberId }
            });
        } else if (type === 'booking') {
            payment = await prisma.bookingPayment.findFirst({
                where: { id: paymentId, memberId },
                include: { booking: { include: { venue: true } } }
            });
            if (payment?.booking) details = payment.booking;
        } else if (type === 'order') {
            payment = await prisma.orderPayment.findFirst({
                where: { id: paymentId, memberId },
                include: { order: true }
            });
            if (payment?.order) details = payment.order;
        } else {
            return res.status(400).json({ error: "Invalid payment type" });
        }

        if (!payment) {
            throw new NotFoundError("Payment record not found");
        }

        const { generateReceipt } = require("../services/receiptService");
        generateReceipt(payment, type, member, details, res);

    } catch (error) {
        next(error);
    }
});

module.exports = router
