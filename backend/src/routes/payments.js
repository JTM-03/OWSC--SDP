const express = require("express")
const { authenticate } = require("../middleware/auth")
const { validate } = require("../middleware/validate")
const { z } = require('zod')
const { uploadSingleReceipt, handleMulterError } = require("../middleware/multerConfig")
const ctrl = require("../controllers/paymentController")

const router = express.Router()

const paymentSchema = z.object({
    entityType: z.enum(['membership', 'booking', 'order']),
    entityId: z.number().int(),
    amount: z.number().positive(),
    method: z.enum(['Cash', 'Card', 'Online'])
})

/**
 * @swagger
 * /payments:
 *   post:
 *     summary: Process a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 * /payments/my:
 *   get:
 *     summary: Get current user's payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 * /payments/pending:
 *   get:
 *     summary: Get all pending payment receipts (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 * /payments/upload/membership:
 *   post:
 *     summary: Upload membership payment receipt
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 * /payments/upload/booking:
 *   post:
 *     summary: Upload booking payment receipt
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 * /payments/upload/order:
 *   post:
 *     summary: Upload order payment receipt
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 * /payments/verify/{type}/{paymentId}:
 *   post:
 *     summary: Verify a payment receipt (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 * /payments/receipt/{type}/{id}:
 *   get:
 *     summary: Download a payment receipt PDF
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */

router.post("/",                        authenticate, validate(paymentSchema), ctrl.processPayment)
router.get("/my",                       authenticate, ctrl.getMyPayments)
router.get("/pending",                  authenticate, ctrl.getPendingPayments)
router.post("/upload/membership",       authenticate, uploadSingleReceipt, handleMulterError, ctrl.uploadMembershipReceipt)
router.post("/upload/booking",          authenticate, uploadSingleReceipt, handleMulterError, ctrl.uploadBookingReceipt)
router.post("/upload/order",            authenticate, uploadSingleReceipt, handleMulterError, ctrl.uploadOrderReceipt)
router.post("/verify/:type/:paymentId", authenticate, ctrl.verifyPayment)
router.get("/receipt/:type/:id",        authenticate, ctrl.downloadReceipt)

module.exports = router
