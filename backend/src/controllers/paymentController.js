const prisma = require("../lib/prisma")
const { BadRequestError, NotFoundError } = require("../utils/errors")
const { uploadReceipt } = require("../services/cloudinaryService")
const fs = require("fs")

// ─── Direct Payment Processing ────────────────────────────────────────────────

/**
 * Process a payment for a membership, booking, or order.
 * Activates the associated entity (membership/booking/order) upon successful payment.
 * Sends an in-app notification to the member.
 * @route POST /api/payments
 */
exports.processPayment = async (req, res, next) => {
    try {
        const { entityType, entityId, amount, method } = req.validatedData
        const memberId = req.user.id

        const result = await prisma.$transaction(async (tx) => {
            let paymentRecord, updatedEntity

            if (entityType === 'membership') {
                const membership = await tx.user.findUnique({ where: { id: entityId } })
                if (!membership) throw new NotFoundError('Membership not found')
                paymentRecord = await tx.membershipPayment.create({ data: { membershipId: entityId, memberId, amount, paymentMethod: method, paymentDate: new Date(), paymentStatus: 'Completed' } })
                // Auto-activate the membership and member account on payment
                if (membership.status === 'Pending') {
                    updatedEntity = await tx.user.update({ where: { id: entityId }, data: { status: 'Active' } })
                    await tx.member.update({ where: { id: membership.memberId }, data: { status: 'Active' } })
                }
            } else if (entityType === 'booking') {
                const booking = await tx.venueBooking.findUnique({ where: { id: entityId } })
                if (!booking) throw new NotFoundError('Booking not found')
                paymentRecord = await tx.bookingPayment.create({ data: { bookingId: entityId, memberId, amount, paymentMethod: method, paymentDate: new Date(), paymentStatus: 'Completed' } })
                if (booking.bookingStatus === 'Pending') updatedEntity = await tx.venueBooking.update({ where: { id: entityId }, data: { bookingStatus: 'Confirmed' } })
            } else if (entityType === 'order') {
                const order = await tx.order.findUnique({ where: { id: entityId } })
                if (!order) throw new NotFoundError('Order not found')
                paymentRecord = await tx.orderPayment.create({ data: { orderId: entityId, memberId, amount, paymentMethod: method, paymentDate: new Date(), paymentStatus: 'Completed' } })
                if (order.orderStatus === 'Pending') updatedEntity = await tx.order.update({ where: { id: entityId }, data: { orderStatus: 'Preparing' } })
            }

            return { paymentRecord, updatedEntity }
        })

        const { sendNotification } = require("../services/notificationService")
        await sendNotification(memberId, "Payment Received", `Your ${entityType} payment of Rs. ${amount} via ${method} has been received.`, "info")

        res.status(201).json({ message: 'Payment processed successfully', ...result })
    } catch (error) { next(error) }
}

// ─── Receipt Upload Endpoints ─────────────────────────────────────────────────

/**
 * Upload a bank transfer receipt for a membership payment.
 * Stores the file on Cloudinary and creates a Pending payment record for admin review.
 * @route POST /api/payments/membership/receipt
 */
exports.uploadMembershipReceipt = async (req, res, next) => {
    try {
        const { membershipId, amount, paymentMethod } = req.body
        const memberId = req.user.id

        if (!membershipId || !amount || !paymentMethod || !req.file) throw new BadRequestError('Missing required fields: membershipId, amount, paymentMethod, and receipt file')

        const membership = await prisma.user.findUnique({ where: { id: parseInt(membershipId) } })
        if (!membership) throw new NotFoundError('Membership not found')

        // Upload to Cloudinary and clean up the local temp file
        const cloudinaryResult = await uploadReceipt(req.file.path, req.file.originalname, 'receipts/membership')
        fs.unlink(req.file.path, () => {})
        const payment = await prisma.membershipPayment.create({ data: { membershipId: parseInt(membershipId), memberId, amount: parseFloat(amount), paymentMethod, paymentDate: new Date(), paymentStatus: 'Pending', receiptUrl: cloudinaryResult.url } })

        const { sendNotification } = require("../services/notificationService")
        await sendNotification(memberId, "Membership Payment Submitted", `Your membership payment receipt has been uploaded and is pending admin verification.`, "info")

        res.status(201).json({ message: 'Membership payment receipt uploaded successfully', payment })
    } catch (error) { next(error) }
}

/**
 * Upload a bank transfer receipt for a venue booking payment.
 * Verifies the booking belongs to the requesting member before accepting the upload.
 * @route POST /api/payments/booking/receipt
 */
exports.uploadBookingReceipt = async (req, res, next) => {
    try {
        const { bookingId, amount, paymentMethod } = req.body
        const memberId = req.user.id

        if (!bookingId || !amount || !paymentMethod || !req.file) throw new BadRequestError('Missing required fields: bookingId, amount, paymentMethod, and receipt file')

        const booking = await prisma.venueBooking.findUnique({ where: { id: parseInt(bookingId) } })
        if (!booking) throw new NotFoundError('Booking not found')
        // Ownership check: prevent members from submitting receipts for other members' bookings
        if (booking.memberId !== memberId) throw new BadRequestError('Unauthorized: This booking does not belong to you')

        const cloudinaryResult = await uploadReceipt(req.file.path, req.file.originalname, 'receipts/booking')
        fs.unlink(req.file.path, () => {})
        const payment = await prisma.bookingPayment.create({ data: { bookingId: parseInt(bookingId), memberId, amount: parseFloat(amount), paymentMethod, paymentDate: new Date(), paymentStatus: 'Pending', receiptUrl: cloudinaryResult.url } })

        const { sendNotification } = require("../services/notificationService")
        await sendNotification(memberId, "Booking Payment Submitted", `Your booking payment receipt has been uploaded and is pending admin verification.`, "info")

        res.status(201).json({ message: 'Booking payment receipt uploaded successfully', payment })
    } catch (error) { next(error) }
}

/**
 * Upload a bank transfer receipt for a food order payment.
 * Verifies the order belongs to the requesting member before accepting the upload.
 * @route POST /api/payments/order/receipt
 */
exports.uploadOrderReceipt = async (req, res, next) => {
    try {
        const { orderId, amount, paymentMethod } = req.body
        const memberId = req.user.id

        if (!orderId || !amount || !paymentMethod || !req.file) throw new BadRequestError('Missing required fields: orderId, amount, paymentMethod, and receipt file')

        const order = await prisma.order.findUnique({ where: { id: parseInt(orderId) } })
        if (!order) throw new NotFoundError('Order not found')
        // Ownership check: prevent members from submitting receipts for other members' orders
        if (order.memberId !== memberId) throw new BadRequestError('Unauthorized: This order does not belong to you')

        const cloudinaryResult = await uploadReceipt(req.file.path, req.file.originalname, 'receipts/order')
        fs.unlink(req.file.path, () => {})
        const payment = await prisma.orderPayment.create({ data: { orderId: parseInt(orderId), memberId, amount: parseFloat(amount), paymentMethod, paymentDate: new Date(), paymentStatus: 'Pending', receiptUrl: cloudinaryResult.url } })

        const { sendNotification } = require("../services/notificationService")
        await sendNotification(memberId, "Order Payment Submitted", `Your order payment receipt has been uploaded and is pending admin verification.`, "info")

        res.status(201).json({ message: 'Order payment receipt uploaded successfully', payment })
    } catch (error) { next(error) }
}

// ─── Admin Payment Verification ───────────────────────────────────────────────

/**
 * Return all pending payments grouped by type (membership, booking, order).
 * Includes a summary count for the admin dashboard badge.
 * @route GET /api/payments/pending
 */
exports.getPendingPayments = async (req, res, next) => {
    try {
        // req.user is populated by authenticate middleware with role from Member model
        if (req.user?.role !== 'admin') throw new BadRequestError('Unauthorized: Admin access required')

        const [membershipPayments, bookingPayments, orderPayments] = await Promise.all([
            prisma.membershipPayment.findMany({ where: { paymentStatus: 'Pending' }, include: { member: { select: { id: true, fullName: true, email: true } }, membership: true }, orderBy: { paymentDate: 'asc' } }),
            prisma.bookingPayment.findMany({ where: { paymentStatus: 'Pending' }, include: { member: { select: { id: true, fullName: true, email: true } }, booking: { include: { venue: true } } }, orderBy: { paymentDate: 'asc' } }),
            prisma.orderPayment.findMany({ where: { paymentStatus: 'Pending' }, include: { member: { select: { id: true, fullName: true, email: true } }, order: true }, orderBy: { paymentDate: 'asc' } })
        ])

        res.json({ membership: membershipPayments, booking: bookingPayments, order: orderPayments, summary: { pendingMembership: membershipPayments.length, pendingBooking: bookingPayments.length, pendingOrder: orderPayments.length, total: membershipPayments.length + bookingPayments.length + orderPayments.length } })
    } catch (error) { next(error) }
}

/**
 * Approve or reject a specific payment and update the associated entity's status.
 * On approval: activates the membership/booking/order and notifies the member.
 * On rejection: notifies the member with the provided reason.
 * @route PUT /api/payments/:type/:paymentId/verify
 */
exports.verifyPayment = async (req, res, next) => {
    try {
        const { type, paymentId } = req.params
        const { approved, reason } = req.body

        // req.user is populated by authenticate middleware with role from Member model
        if (req.user?.role !== 'admin') throw new BadRequestError('Unauthorized: Admin access required')

        const id = parseInt(paymentId)
        const status = approved ? 'Completed' : 'Rejected'
        let payment, updatedEntity
        const { sendNotification } = require("../services/notificationService")

        if (type === 'membership') {
            payment = await prisma.membershipPayment.findUnique({ where: { id }, include: { member: true } })
            if (!payment) throw new NotFoundError('Membership payment not found')
            payment = await prisma.membershipPayment.update({ where: { id }, data: { paymentStatus: status } })
            if (approved) {
                // Activate the membership record when payment is approved
                updatedEntity = await prisma.user.update({ where: { id: payment.membershipId }, data: { status: 'Active' } })
                await sendNotification(payment.memberId, "Membership Approved", `Your membership payment has been verified and approved. Your membership is now active.`, "success")
            } else {
                await sendNotification(payment.memberId, "Membership Payment Rejected", `Your membership payment was rejected. Reason: ${reason || 'Please contact admin for details'}`, "error")
            }
        } else if (type === 'booking') {
            payment = await prisma.bookingPayment.findUnique({ where: { id }, include: { member: true, booking: true } })
            if (!payment) throw new NotFoundError('Booking payment not found')
            payment = await prisma.bookingPayment.update({ where: { id }, data: { paymentStatus: status } })
            if (approved) {
                updatedEntity = await prisma.venueBooking.update({ where: { id: payment.bookingId }, data: { bookingStatus: 'Confirmed' } })
                await sendNotification(payment.memberId, "Booking Payment Approved", `Your booking payment has been verified and approved. Your booking is now confirmed.`, "success")
            } else {
                await sendNotification(payment.memberId, "Booking Payment Rejected", `Your booking payment was rejected. Reason: ${reason || 'Please contact admin for details'}`, "error")
            }
        } else if (type === 'order') {
            payment = await prisma.orderPayment.findUnique({ where: { id }, include: { member: true, order: true } })
            if (!payment) throw new NotFoundError('Order payment not found')
            payment = await prisma.orderPayment.update({ where: { id }, data: { paymentStatus: status } })
            if (approved) {
                // Move the order to Preparing once payment is confirmed
                updatedEntity = await prisma.order.update({ where: { id: payment.orderId }, data: { orderStatus: 'Preparing' } })
                await sendNotification(payment.memberId, "Order Payment Approved", `Your order payment has been verified. Your order is now being prepared.`, "success")
            } else {
                await sendNotification(payment.memberId, "Order Payment Rejected", `Your order payment was rejected. Reason: ${reason || 'Please contact admin for details'}`, "error")
            }
        } else {
            throw new BadRequestError('Invalid payment type')
        }

        res.json({ message: `Payment ${status === 'Completed' ? 'approved' : 'rejected'} successfully`, payment, updatedEntity })
    } catch (error) { next(error) }
}

// ─── Member Payment History ───────────────────────────────────────────────────

/**
 * Return the authenticated member's payment history for the past year.
 * Grouped by payment type: membership, booking, and order.
 * @route GET /api/payments/my
 */
exports.getMyPayments = async (req, res, next) => {
    try {
        const memberId = req.user.id
        const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

        const [membershipPayments, bookingPayments, orderPayments] = await Promise.all([
            prisma.membershipPayment.findMany({ where: { memberId, paymentDate: { gte: oneYearAgo } }, orderBy: { paymentDate: 'desc' } }),
            prisma.bookingPayment.findMany({ where: { memberId, paymentDate: { gte: oneYearAgo } }, orderBy: { paymentDate: 'desc' } }),
            prisma.orderPayment.findMany({ where: { memberId, paymentDate: { gte: oneYearAgo } }, orderBy: { paymentDate: 'desc' } })
        ])

        res.json({ membership: membershipPayments, booking: bookingPayments, order: orderPayments })
    } catch (e) { next(e) }
}

/**
 * Generate and stream a PDF receipt for a specific payment.
 * Fetches the payment record and related entity details, then delegates to receiptService.
 * @route GET /api/payments/:type/:id/receipt
 */
exports.downloadReceipt = async (req, res, next) => {
    try {
        const { type, id } = req.params
        const memberId = req.user.id
        const paymentId = parseInt(id)

        const member = await prisma.member.findUnique({ where: { id: memberId }, select: { id: true, fullName: true, email: true } })

        let payment, details = {}

        if (type === 'membership') {
            payment = await prisma.membershipPayment.findFirst({ where: { id: paymentId, memberId } })
        } else if (type === 'booking') {
            payment = await prisma.bookingPayment.findFirst({ where: { id: paymentId, memberId }, include: { booking: { include: { venue: true } } } })
            if (payment?.booking) details = payment.booking
        } else if (type === 'order') {
            payment = await prisma.orderPayment.findFirst({ where: { id: paymentId, memberId }, include: { order: true } })
            if (payment?.order) details = payment.order
        } else {
            return res.status(400).json({ error: "Invalid payment type" })
        }

        if (!payment) throw new NotFoundError("Payment record not found")

        const { generateReceipt } = require("../services/receiptService")
        generateReceipt(payment, type, member, details, res)
    } catch (error) { next(error) }
}
