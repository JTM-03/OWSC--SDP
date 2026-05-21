const prisma = require("../lib/prisma")
const { parsePagination, paginationMeta } = require("../utils/pagination")

// ─── Promotions CRUD ──────────────────────────────────────────────────────────

/**
 * Return paginated list of promotions.
 * Supports optional filtering to only active promotions via ?activeOnly=true.
 * @route GET /api/promotions
 */
exports.listPromotions = async (req, res, next) => {
    try {
        const { skip, take, page, limit } = parsePagination(req.query)
        const { activeOnly } = req.query
        const where = activeOnly === 'true' ? { isActive: true } : {}

        const [promotions, total] = await Promise.all([
            prisma.promotion.findMany({ where, orderBy: { createdDate: 'desc' }, skip, take }),
            prisma.promotion.count({ where })
        ])
        res.json({ data: promotions, meta: paginationMeta(total, page, limit) })
    } catch (error) { next(error) }
}

/**
 * Create a new promotion (admin only).
 * @route POST /api/promotions
 */
exports.createPromotion = async (req, res, next) => {
    try {
        const { title, description, validUntil, isActive } = req.validatedData
        const promotion = await prisma.promotion.create({ data: { title, description, validUntil: new Date(validUntil), isActive } })
        res.status(201).json(promotion)
    } catch (error) { next(error) }
}

/**
 * Update an existing promotion's details (admin only).
 * Only provided fields are updated.
 * @route PUT /api/promotions/:id
 */
exports.updatePromotion = async (req, res, next) => {
    try {
        const { id } = req.params
        const { title, description, validUntil, isActive } = req.validatedData
        const promotion = await prisma.promotion.update({
            where: { id: parseInt(id) },
            data: { ...(title && { title }), ...(description && { description }), ...(validUntil && { validUntil: new Date(validUntil) }), ...(isActive !== undefined && { isActive }) }
        })
        res.json(promotion)
    } catch (error) { next(error) }
}

/**
 * Soft-delete a promotion by setting isActive to false (admin only).
 * Preserves the record for historical reference rather than hard-deleting.
 * @route DELETE /api/promotions/:id
 */
exports.deletePromotion = async (req, res, next) => {
    try {
        await prisma.promotion.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } })
        res.json({ message: 'Promotion removed successfully' })
    } catch (error) { next(error) }
}
