const express = require("express")
const prisma = require("../lib/prisma")
const { validate } = require("../middleware/validate")
const { menuItemSchema } = require("../validation/schemas")
const { authenticate, requireRole } = require("../middleware/auth")
const { NotFoundError } = require("../utils/errors")
const upload = require("../config/upload")

const router = express.Router()

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
router.put("/:id", authenticate, requireRole('admin', 'staff'), upload.single('image'), validate(menuItemSchema), async (req, res, next) => {
    try {
        const { id } = req.params
        const { name, category, price, description, imageUrl, isPopular, availabilityStatus } = req.validatedData

        let finalImageUrl = imageUrl
        if (req.file) {
            finalImageUrl = `/uploads/${req.file.filename}`
        }

        const menuItem = await prisma.menuItem.update({
            where: { id: parseInt(id) },
            data: {
                name,
                category,
                price,
                description,
                imageUrl: finalImageUrl,
                isPopular,
                availabilityStatus
            }
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
