const express = require("express")
const { authenticate, requireRole } = require("../middleware/auth")
const { validate } = require("../middleware/validate")
const { z } = require('zod')
const ctrl = require("../controllers/supplierController")

const router = express.Router()

const supplierSchema = z.object({
    name: z.string().min(3).max(100).regex(/^[a-zA-Z0-9\s&-]+$/),
    contactPerson: z.string().min(0).max(100).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    phone: z.string().regex(/^0\d{9}$/).optional().or(z.literal('')),
    email: z.string().email().max(100).optional().or(z.literal('')).transform(val => val === '' ? undefined : val)
})

/**
 * @swagger
 * /suppliers:
 *   get:
 *     summary: List all suppliers with pagination (Admin/Staff)
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *   post:
 *     summary: Create a new supplier (Admin)
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 * /suppliers/{id}:
 *   put:
 *     summary: Update a supplier (Admin)
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     summary: Delete a supplier (Admin)
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 */

router.get("/",       authenticate, requireRole('admin', 'staff'), ctrl.listSuppliers)
router.post("/",      authenticate, requireRole('admin'), validate(supplierSchema), ctrl.createSupplier)
router.put("/:id",    authenticate, requireRole('admin'), validate(supplierSchema), ctrl.updateSupplier)
router.delete("/:id", authenticate, requireRole('admin'), ctrl.deleteSupplier)

module.exports = router
