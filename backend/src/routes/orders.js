const express = require("express")
const { validate } = require("../middleware/validate")
const { orderSchema } = require("../validation/schemas")
const { authenticate, requireRole } = require("../middleware/auth")
const ctrl = require("../controllers/orderController")

const router = express.Router()

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: List all orders (Admin/Staff only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *   post:
 *     summary: Place a new food order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 * /orders/my:
 *   get:
 *     summary: Get current user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 * /orders/{id}/status:
 *   put:
 *     summary: Update order status (Admin/Staff only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */

router.get("/",                    authenticate, requireRole('admin', 'staff'), ctrl.listOrders)
router.get("/my",                  authenticate, ctrl.getMyOrders)
router.post("/",                   authenticate, validate(orderSchema), ctrl.createOrder)
router.put("/:id/status",          authenticate, requireRole('admin', 'staff'), ctrl.updateOrderStatus)
// Allow admin/staff to mark an order payment as Paid or Unpaid
router.put("/:id/payment-status",  authenticate, requireRole('admin', 'staff'), ctrl.updatePaymentStatus)

module.exports = router
