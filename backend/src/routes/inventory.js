const express = require("express")
const { authenticate, requireRole } = require("../middleware/auth")
const { validate } = require("../middleware/validate")
const { inventoryProductSchema, inventoryUpdateSchema, inventoryReturnSchema } = require("../validation/schemas")
const ctrl = require("../controllers/inventoryController")

const router = express.Router()

/**
 * @swagger
 * /inventory:
 *   get:
 *     summary: List all inventory items with pagination (Admin/Staff)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 * /inventory/deliveries:
 *   get:
 *     summary: List recent stock deliveries with pagination (Admin/Staff)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 * /inventory/returns:
 *   get:
 *     summary: List return records with pagination (Admin/Staff)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 * /inventory/product:
 *   post:
 *     summary: Create a new inventory product (Admin)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 * /inventory/update:
 *   post:
 *     summary: Record a stock delivery or usage (Admin/Staff)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 * /inventory/return:
 *   post:
 *     summary: Record a supplier return (Admin)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */

router.get("/",           authenticate, requireRole('admin', 'staff'), ctrl.listInventory)
router.get("/deliveries", authenticate, requireRole('admin', 'staff'), ctrl.listDeliveries)
router.get("/returns",    authenticate, requireRole('admin', 'staff'), ctrl.listReturns)
router.post("/product",   authenticate, requireRole('admin'),          validate(inventoryProductSchema), ctrl.createProduct)
router.post("/update",    authenticate, requireRole('admin', 'staff'), validate(inventoryUpdateSchema),  ctrl.updateStock)
router.post("/return",    authenticate, requireRole('admin'),          validate(inventoryReturnSchema),  ctrl.recordReturn)

module.exports = router
