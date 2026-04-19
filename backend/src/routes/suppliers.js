const express = require("express")
const prisma = require("../lib/prisma")
const { authenticate, requireRole } = require("../middleware/auth")
const { z } = require('zod')
const { validate } = require("../middleware/validate")
const { NotFoundError, BadRequestError } = require("../utils/errors")
const { parsePagination, paginationMeta } = require("../utils/pagination")

const router = express.Router()

/**
 * @swagger
 * /suppliers:
 *   get:
 *     summary: List all suppliers with pagination (Admin/Staff)
 *     tags: [Suppliers]
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
 *         name: search
 *         schema: { type: string }
 *         description: Filter by supplier name
 *     responses:
 *       200:
 *         description: Paginated supplier list
 *   post:
 *     summary: Create a new supplier (Admin)
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:          { type: string }
 *               contactPerson: { type: string }
 *               phone:         { type: string }
 *               email:         { type: string, format: email }
 *     responses:
 *       201:
 *         description: Supplier created
 *
 * /suppliers/{id}:
 *   put:
 *     summary: Update a supplier (Admin)
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Supplier updated
 *   delete:
 *     summary: Delete a supplier (Admin)
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Supplier deleted
 */

// Schema for validation
const supplierSchema = z.object({
    name: z.string()
        .min(3, 'Supplier name must be at least 3 characters')
        .max(100, 'Supplier name must not exceed 100 characters')
        .regex(/^[a-zA-Z0-9\s&-]+$/, 'Supplier name can only contain letters, numbers, spaces, ampersand, and hyphens'),
    contactPerson: z.string()
        .min(0)
        .max(100, 'Contact person name must not exceed 100 characters')
        .optional()
        .or(z.literal(''))
        .transform(val => val === '' ? undefined : val),
    phone: z.string()
        .regex(/^0\d{9}$/, 'Phone number must be 10 digits and start with 0 (e.g. 07XXXXXXXX or 0112XXXXXX)')
        .optional()
        .or(z.literal('')),
    email: z.string()
        .email('Invalid email address format')
        .max(100, 'Email must not exceed 100 characters')
        .optional()
        .or(z.literal(''))
        .transform(val => val === '' ? undefined : val)
})

// GET /api/suppliers - List all suppliers with their supplied items
router.get("/", authenticate, requireRole('admin', 'staff'), async (req, res, next) => {
    try {
        const { skip, take, page, limit } = parsePagination(req.query)
        const { search } = req.query

        const where = search
            ? { name: { contains: search, mode: 'insensitive' } }
            : {}

        const [suppliers, total] = await Promise.all([
            prisma.supplier.findMany({
                where,
                include: {
                    stockBatches: {
                        select: { product: { select: { productName: true, unit: true } } },
                        distinct: ['productId']
                    }
                },
                skip,
                take,
            }),
            prisma.supplier.count({ where })
        ])

        const formatted = suppliers.map(s => ({
            ...s,
            items: s.stockBatches.map(b => b.product.productName)
        }))

        res.json({ data: formatted, meta: paginationMeta(total, page, limit) })
    } catch (error) {
        next(error)
    }
})

// POST /api/suppliers - Create new supplier
router.post("/", authenticate, requireRole('admin'), validate(supplierSchema), async (req, res, next) => {
    try {
        const { name, contactPerson, phone, email } = req.validatedData
        const supplier = await prisma.supplier.create({
            data: { name, contactPerson, phone, email }
        })
        res.status(201).json({ message: "Supplier added successfully", supplier })
    } catch (error) {
        next(error)
    }
})

// PUT /api/suppliers/:id - Update supplier
router.put("/:id", authenticate, requireRole('admin'), validate(supplierSchema), async (req, res, next) => {
    try {
        const { id } = req.params
        const { name, contactPerson, phone, email } = req.validatedData
        const supplier = await prisma.supplier.update({
            where: { id: parseInt(id) },
            data: { name, contactPerson, phone, email }
        })
        res.json({ message: "Supplier updated successfully", supplier })
    } catch (error) {
        if (error.code === 'P2025') next(new NotFoundError("Supplier not found"))
        else next(error)
    }
})

// DELETE /api/suppliers/:id - Delete supplier
router.delete("/:id", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { id } = req.params
        // Check relationships (deliveries/stock batches) - Optional: soft delete or block
        // For now, strict delete (will fail if used)
        await prisma.supplier.delete({
            where: { id: parseInt(id) }
        })
        res.json({ message: "Supplier deleted successfully" })
    } catch (error) {
        if (error.code === 'P2003') next(new BadRequestError("Cannot delete supplier with associated records"))
        else if (error.code === 'P2025') next(new NotFoundError("Supplier not found"))
        else next(error)
    }
})

module.exports = router
