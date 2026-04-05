const express = require("express")
const prisma = require("../lib/prisma")
const { authenticate, requireRole } = require("../middleware/auth")
const { z } = require('zod')
const { validate } = require("../middleware/validate")

const router = express.Router()

const promotionSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    validUntil: z.string().datetime(),
    isActive: z.boolean().default(true)
})

// GET /api/promotions - List all promotions
router.get("/", async (req, res, next) => {
    try {
        const promotions = await prisma.promotion.findMany({
            orderBy: { createdDate: 'desc' }
        })
        res.json(promotions)
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

// DELETE /api/promotions/:id - Delete promotion (Admin only)
router.delete("/:id", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { id } = req.params
        await prisma.promotion.delete({
            where: { id: parseInt(id) }
        })
        res.json({ message: 'Promotion deleted successfully' })
    } catch (error) {
        next(error)
    }
})

module.exports = router
