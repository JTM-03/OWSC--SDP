const express = require("express")
const prisma = require("../lib/prisma")
const { authenticate } = require("../middleware/auth")
const { BadRequestError, NotFoundError } = require("../utils/errors")
const { z } = require('zod')
const { validate } = require("../middleware/validate")

const router = express.Router()

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

// GET /api/payments/my - Get user payments
router.get("/my", authenticate, async (req, res, next) => {
    try {
        const memberId = req.user.id

        const [membershipPayments, bookingPayments, orderPayments] = await Promise.all([
            prisma.membershipPayment.findMany({ where: { memberId }, orderBy: { paymentDate: 'desc' } }),
            prisma.bookingPayment.findMany({ where: { memberId }, orderBy: { paymentDate: 'desc' } }),
            prisma.orderPayment.findMany({ where: { memberId }, orderBy: { paymentDate: 'desc' } })
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
