const express = require("express")
const prisma = require("../lib/prisma")
const { validate } = require("../middleware/validate")
const { menuItemSchema, menuItemPartialSchema } = require("../validation/schemas")
const { authenticate, requireRole } = require("../middleware/auth")
const { NotFoundError } = require("../utils/errors")
const upload = require("../config/upload")

const router = express.Router()

/**
 * @swagger
 * /menu:
 *   get:
 *     summary: List all menu items
 *     tags: [Menu]
 *     responses:
 *       200:
 *         description: Array of menu items
 *   post:
 *     summary: Add a new menu item (Admin/Staff only)
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, category, price]
 *             properties:
 *               name:               { type: string, example: Grilled Chicken }
 *               category:           { type: string, example: Main Course }
 *               price:              { type: number, example: 1200 }
 *               description:        { type: string }
 *               isPopular:          { type: boolean }
 *               availabilityStatus: { type: string, enum: [Available, Unavailable] }
 *               image:              { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Menu item created
 *       403:
 *         description: Admin or Staff access required
 *
 * /menu/{id}:
 *   get:
 *     summary: Get a menu item by ID
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Menu item details
 *       404:
 *         description: Menu item not found
 *   put:
 *     summary: Update a menu item (Admin/Staff only)
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:               { type: string }
 *               category:           { type: string }
 *               price:              { type: number }
 *               description:        { type: string }
 *               isPopular:          { type: boolean }
 *               availabilityStatus: { type: string }
 *               image:              { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Menu item updated
 *       404:
 *         description: Menu item not found
 *   delete:
 *     summary: Delete a menu item (Admin/Staff only)
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Menu item deleted
 *       404:
 *         description: Menu item not found
 */

// GET /api/menu - List all menu items
router.get("/", async (req, res, next) => {
    try {
        const menuItems = await prisma.menuItem.findMany()
        res.json(menuItems)
    } catch (error) {
        next(error)
    }
})

// GET /api/menu/:id - Get menu item details
router.get("/:id", async (req, res, next) => {
    try {
        const { id } = req.params
        const menuItem = await prisma.menuItem.findUnique({
            where: { id: parseInt(id) }
        })

        if (!menuItem) {
            throw new NotFoundError('Menu item not found')
        }

        res.json(menuItem)
    } catch (error) {
        next(error)
    }
})

// POST /api/menu - Add new menu item (Admin/Staff only)
router.post("/", authenticate, requireRole('admin', 'staff'), upload.single('image'), validate(menuItemSchema), async (req, res, next) => {
    try {
        const { name, category, price, description, imageUrl, isPopular, availabilityStatus } = req.validatedData

        let finalImageUrl = imageUrl
        if (req.file) {
            finalImageUrl = `/uploads/${req.file.filename}`
        }

        const menuItem = await prisma.menuItem.create({
            data: {
                name,
                category,
                price,
                description,
                imageUrl: finalImageUrl,
                isPopular: isPopular || false,
                availabilityStatus: availabilityStatus || 'Available'
            }
        })

        res.status(201).json({
            message: 'Menu item created successfully',
            menuItem
        })
    } catch (error) {
        next(error)
    }
})

// PUT /api/menu/:id - Update menu item (Admin/Staff only)
router.put("/:id", authenticate, requireRole('admin', 'staff'), upload.single('image'), validate(menuItemPartialSchema), async (req, res, next) => {
    try {
        const { id } = req.params
        const { name, category, price, description, imageUrl, isPopular, availabilityStatus } = req.validatedData

        let finalImageUrl = imageUrl
        if (req.file) {
            finalImageUrl = `/uploads/${req.file.filename}`
        }

        // Build update object with only the fields that were provided
        const updateData = {}
        if (name !== undefined)               updateData.name = name
        if (category !== undefined)           updateData.category = category
        if (price !== undefined)              updateData.price = price
        if (description !== undefined)        updateData.description = description
        if (finalImageUrl !== undefined)      updateData.imageUrl = finalImageUrl
        if (isPopular !== undefined)          updateData.isPopular = isPopular
        if (availabilityStatus !== undefined) updateData.availabilityStatus = availabilityStatus

        const menuItem = await prisma.menuItem.update({
            where: { id: parseInt(id) },
            data: updateData
        })

        res.json({
            message: 'Menu item updated successfully',
            menuItem
        })
    } catch (error) {
        if (error.code === 'P2025') {
            next(new NotFoundError('Menu item not found'))
        } else {
            next(error)
        }
    }
})

// DELETE /api/menu/:id - Delete menu item (Admin/Staff only)
router.delete("/:id", authenticate, requireRole('admin', 'staff'), async (req, res, next) => {
    try {
        const { id } = req.params

        await prisma.menuItem.delete({
            where: { id: parseInt(id) }
        })

        res.json({ message: 'Menu item deleted successfully' })
    } catch (error) {
        if (error.code === 'P2025') {
            next(new NotFoundError('Menu item not found'))
        } else {
            next(error)
        }
    }
})

module.exports = router
