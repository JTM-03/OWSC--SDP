const express = require("express")
const { authenticate, requireRole } = require("../middleware/auth")
const { validate } = require("../middleware/validate")
const { z } = require('zod')
const ctrl = require("../controllers/promotionController")

const router = express.Router()

const promotionSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    validUntil: z.string().datetime(),
    isActive: z.boolean().default(true)
})

/**
 * @swagger
 * /promotions:
 *   get:
 *     summary: List all promotions with pagination
 *     tags: [Promotions]
 *   post:
 *     summary: Create a new promotion (Admin)
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 * /promotions/{id}:
 *   put:
 *     summary: Update a promotion (Admin)
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     summary: Deactivate a promotion (Admin)
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 */

router.get("/",       ctrl.listPromotions)
router.post("/",      authenticate, requireRole('admin'), validate(promotionSchema),          ctrl.createPromotion)
router.put("/:id",    authenticate, requireRole('admin'), validate(promotionSchema.partial()), ctrl.updatePromotion)
router.delete("/:id", authenticate, requireRole('admin'), ctrl.deletePromotion)

module.exports = router
