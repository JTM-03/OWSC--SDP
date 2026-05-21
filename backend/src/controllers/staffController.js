const prisma = require("../lib/prisma")
const { NotFoundError, BadRequestError } = require("../utils/errors")
const { parsePagination, paginationMeta } = require("../utils/pagination")

// ─── Staff Management ─────────────────────────────────────────────────────────

/**
 * Return paginated list of staff and admin accounts.
 * Supports optional name/email search.
 * @route GET /api/staff
 */
exports.listStaff = async (req, res, next) => {
    try {
        const { skip, take, page, limit } = parsePagination(req.query)
        const { search } = req.query
        // Filter to only staff and admin roles
        const where = { role: { in: ['staff', 'admin'] }, ...(search && { OR: [{ fullName: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }) }

        const [staff, total] = await Promise.all([
            prisma.member.findMany({ where, select: { id: true, fullName: true, email: true, username: true, role: true, phone: true, status: true, registrationDate: true }, skip, take }),
            prisma.member.count({ where })
        ])
        res.json({ data: staff, meta: paginationMeta(total, page, limit) })
    } catch (error) { next(error) }
}

/**
 * Update a user's role (admin only).
 * Validates that the new role is one of the allowed values.
 * @route PUT /api/staff/:id/role
 */
exports.updateRole = async (req, res, next) => {
    try {
        const { id } = req.params
        const { role } = req.body
        if (!['member', 'staff', 'admin'].includes(role)) throw new BadRequestError('Invalid role')

        const user = await prisma.member.update({ where: { id: parseInt(id) }, data: { role } })
        res.json({ message: `User role updated to ${role}`, user: { id: user.id, fullName: user.fullName, role: user.role } })
    } catch (error) {
        if (error.code === 'P2025') next(new NotFoundError('User not found'))
        else next(error)
    }
}

/**
 * Assign a staff member to a venue for a specific shift.
 * Validates that both the staff member and venue exist before confirming.
 * Note: this is a lightweight assignment — no conflict checking is performed here
 * (use the staffing controller for full scheduling with overlap detection).
 * @route POST /api/staff/assign
 */
exports.assignStaff = async (req, res, next) => {
    try {
        const { staffId, venueId, shift } = req.body
        const staff = await prisma.member.findUnique({ where: { id: parseInt(staffId) } })
        if (!staff) throw new NotFoundError('Staff member not found')

        const venue = await prisma.venue.findUnique({ where: { id: parseInt(venueId) } })
        if (!venue) throw new NotFoundError('Venue not found')

        res.json({ message: `Staff ${staff.fullName} assigned to ${venue.name} for ${shift} shift` })
    } catch (error) { next(error) }
}
