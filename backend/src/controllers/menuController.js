const prisma = require("../lib/prisma")
const { NotFoundError } = require("../utils/errors")

// ─── Menu Item CRUD ───────────────────────────────────────────────────────────

/**
 * Return all menu items (public — no auth required).
 * @route GET /api/menu
 */
exports.listMenuItems = async (req, res, next) => {
    try {
        const menuItems = await prisma.menuItem.findMany()
        res.json(menuItems)
    } catch (error) {
        next(error)
    }
}

/**
 * Return a single menu item by ID.
 * @route GET /api/menu/:id
 */
exports.getMenuItem = async (req, res, next) => {
    try {
        const menuItem = await prisma.menuItem.findUnique({ where: { id: parseInt(req.params.id) } })
        if (!menuItem) throw new NotFoundError('Menu item not found')
        res.json(menuItem)
    } catch (error) {
        next(error)
    }
}

/**
 * Create a new menu item (admin only).
 * If a file is uploaded via multer, its path takes precedence over the imageUrl body field.
 * @route POST /api/menu
 */
exports.createMenuItem = async (req, res, next) => {
    try {
        const { name, category, price, description, imageUrl, isPopular, availabilityStatus } = req.validatedData
        // Prefer the uploaded file path over any URL provided in the request body
        let finalImageUrl = imageUrl
        if (req.file) finalImageUrl = `/uploads/${req.file.filename}`

        const menuItem = await prisma.menuItem.create({
            data: { name, category, price, description, imageUrl: finalImageUrl, isPopular: isPopular || false, availabilityStatus: availabilityStatus || 'Available' }
        })
        res.status(201).json({ message: 'Menu item created successfully', menuItem })
    } catch (error) {
        next(error)
    }
}

/**
 * Update an existing menu item (admin only).
 * Only fields that are explicitly provided in the request are updated.
 * @route PUT /api/menu/:id
 */
exports.updateMenuItem = async (req, res, next) => {
    try {
        const { name, category, price, description, imageUrl, isPopular, availabilityStatus } = req.validatedData
        let finalImageUrl = imageUrl
        if (req.file) finalImageUrl = `/uploads/${req.file.filename}`

        // Build update object from only the provided fields to support partial updates
        const updateData = {}
        if (name !== undefined)               updateData.name = name
        if (category !== undefined)           updateData.category = category
        if (price !== undefined)              updateData.price = price
        if (description !== undefined)        updateData.description = description
        if (finalImageUrl !== undefined)      updateData.imageUrl = finalImageUrl
        if (isPopular !== undefined)          updateData.isPopular = isPopular
        if (availabilityStatus !== undefined) updateData.availabilityStatus = availabilityStatus

        const menuItem = await prisma.menuItem.update({ where: { id: parseInt(req.params.id) }, data: updateData })
        res.json({ message: 'Menu item updated successfully', menuItem })
    } catch (error) {
        if (error.code === 'P2025') next(new NotFoundError('Menu item not found'))
        else next(error)
    }
}

/**
 * Delete a menu item (admin only).
 * @route DELETE /api/menu/:id
 */
exports.deleteMenuItem = async (req, res, next) => {
    try {
        await prisma.menuItem.delete({ where: { id: parseInt(req.params.id) } })
        res.json({ message: 'Menu item deleted successfully' })
    } catch (error) {
        if (error.code === 'P2025') next(new NotFoundError('Menu item not found'))
        else next(error)
    }
}
