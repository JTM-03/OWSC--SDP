const express = require("express")
const { authenticate, requireRole } = require("../middleware/auth")
const { validate } = require("../middleware/validate")
const { z } = require('zod')
const ctrl = require("../controllers/deliveryController")

const router = express.Router()

const createDeliverySchema = z.object({
    supplierId: z.number().int(),
    items: z.array(z.object({ productId: z.number().int(), quantity: z.number().positive() })).min(1)
})

const updateStatusSchema = z.object({
    status: z.enum(['On-Process', 'Completed', 'Cancelled'])
})

/**
 * @swagger
 * /deliveries:
 *   get:
 *     summary: List all deliveries with pagination (Admin/Staff)
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 *   post:
 *     summary: Create a new delivery order (Admin/Staff)
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 * /deliveries/{id}/status:
 *   put:
 *     summary: Update delivery status (Admin/Staff)
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 */

router.get("/",              authenticate, requireRole('admin', 'staff'), ctrl.listDeliveries)
router.post("/",             authenticate, requireRole('admin', 'staff'), validate(createDeliverySchema), ctrl.createDelivery)
router.put("/:id/status",    authenticate, requireRole('admin', 'staff'), validate(updateStatusSchema),   ctrl.updateDeliveryStatus)

module.exports = router
