const prisma = require("../lib/prisma")
const { parsePagination, paginationMeta } = require("../utils/pagination")

// ─── Events CRUD ──────────────────────────────────────────────────────────────

/**
 * Return paginated list of events, optionally filtered by status.
 * Ordered by date ascending so upcoming events appear first.
 * @route GET /api/events
 */
exports.listEvents = async (req, res, next) => {
    try {
        const { skip, take, page, limit } = parsePagination(req.query)
        const { status } = req.query
        const where = status ? { status } : {}

        const [events, total] = await Promise.all([
            prisma.event.findMany({ where, orderBy: { date: 'asc' }, skip, take }),
            prisma.event.count({ where })
        ])
        res.json({ data: events, meta: paginationMeta(total, page, limit) })
    } catch (error) { next(error) }
}

/**
 * Create a new event (admin only).
 * @route POST /api/events
 */
exports.createEvent = async (req, res, next) => {
    try {
        const data = req.validatedData
        const event = await prisma.event.create({ data: { ...data, date: new Date(data.date) } })
        res.status(201).json(event)
    } catch (error) { next(error) }
}

/**
 * Update an existing event's details (admin only).
 * @route PUT /api/events/:id
 */
exports.updateEvent = async (req, res, next) => {
    try {
        const { id } = req.params
        const data = req.validatedData
        const event = await prisma.event.update({ where: { id: parseInt(id) }, data: { ...data, date: new Date(data.date) } })
        res.json(event)
    } catch (error) { next(error) }
}

/**
 * Delete an event (admin only).
 * @route DELETE /api/events/:id
 */
exports.deleteEvent = async (req, res, next) => {
    try {
        await prisma.event.delete({ where: { id: parseInt(req.params.id) } })
        res.json({ message: 'Event deleted successfully' })
    } catch (error) { next(error) }
}
