const express = require("express")
const prisma = require("../lib/prisma")
const { authenticate, requireRole } = require("../middleware/auth")
const { z } = require('zod')
const { validate } = require("../middleware/validate")
const { parsePagination, paginationMeta } = require("../utils/pagination")

const router = express.Router()

/**
 * @swagger
 * /promotions:
 *   get:
 *     summary: List all promotions with pagination
 *     tags: [Promotions]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: activeOnly
 *         schema: { type: boolean }
 *         description: If true, return only active promotions
 *     responses:
 *       200:
 *         description: Paginated promotions
 *   post:
 *     summary: Create a new promotion (Admin)
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, validUntil]
 *             properties:
 *               title:       { type: string }
 *               description: { type: string }
 *               validUntil:  { type: string, format: date-time }
 *               isActive:    { type: boolean, default: true }
 *     responses:
 *       201:
 *         description: Promotion created
 *
 * /promotions/{id}:
 *   put:
 *     summary: Update a promotion (Admin)
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Promotion updated
 *   delete:
 *     summary: Deactivate a promotion (Admin)
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Promotion deactivated
 */

const promotionSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    validUntil: z.string().datetime(),
    isActive: z.boolean().default(true)
})

// GET /api/promotions - List all promotions
router.get("/", async (req, res, next) => {
    try {
        const { skip, take, page, limit } = parsePagination(req.query)
        const { activeOnly } = req.query

        const where = activeOnly === 'true' ? { isActive: true } : {}

        const [promotions, total] = await Promise.all([
            prisma.promotion.findMany({
                where,
                orderBy: { createdDate: 'desc' },
                skip,
                take,
            }),
            prisma.promotion.count({ where })
        ])

        res.json({ data: promotions, meta: paginationMeta(total, page, limit) })
    } catch (error) {
        next(error)
    }
})

// POST /api/promotions - Create new promotion (Admin only)
router.post("/", authenticate, requireRole('admin'), validate(promotionSchema), async (req, res, next) => {
    try {
        console.log("Creating promotion:", req.validatedData);
        const { title, description, validUntil, isActive } = req.validatedData

        const promotion = await prisma.promotion.create({
            data: {
                title,
                description,
                validUntil: new Date(validUntil),
                isActive
            }
        })

        res.status(201).json(promotion)
    } catch (error) {
        next(error)
    }
})

// PUT /api/promotions/:id - Update promotion (Admin only)
router.put("/:id", authenticate, requireRole('admin'), validate(promotionSchema.partial()), async (req, res, next) => {
    try {
        const { id } = req.params
        const { title, description, validUntil, isActive } = req.validatedData

        const promotion = await prisma.promotion.update({
            where: { id: parseInt(id) },
            data: {
                ...(title && { title }),
                ...(description && { description }),
                ...(validUntil && { validUntil: new Date(validUntil) }),
                ...(isActive !== undefined && { isActive })
            }
        })

        res.json(promotion)
    } catch (error) {
        next(error)
    }
})

// DELETE /api/promotions/:id - Remove promotion (Soft delete) (Admin only)
router.delete("/:id", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { id } = req.params
        await prisma.promotion.update({
            where: { id: parseInt(id) },
            data: { isActive: false }
        })
        res.json({ message: 'Promotion removed successfully' })
    } catch (error) {
        next(error)
    }
})

module.exports = router
