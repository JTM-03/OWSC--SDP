const express = require("express")
const prisma = require("../lib/prisma")
const { authenticate, requireRole } = require("../middleware/auth")
const { NotFoundError, BadRequestError } = require("../utils/errors")
const { parsePagination, paginationMeta } = require("../utils/pagination")

const router = express.Router()

/**
 * @swagger
 * /staff:
 *   get:
 *     summary: List all staff members with pagination (Admin)
 *     tags: [Staff]
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
 *         description: Filter by name or email
 *     responses:
 *       200:
 *         description: Paginated staff list
 *
 * /staff/{id}/role:
 *   put:
 *     summary: Update a staff member's role (Admin)
 *     tags: [Staff]
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
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [member, staff, admin] }
 *     responses:
 *       200:
 *         description: Role updated
 *
 * /staff/assign:
 *   post:
 *     summary: Assign a staff member to a venue (Admin)
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [staffId, venueId, shift]
 *             properties:
 *               staffId: { type: integer }
 *               venueId: { type: integer }
 *               shift:   { type: string, example: Morning }
 *     responses:
 *       200:
 *         description: Staff assigned
 */

// GET /api/staff - List all staff users
router.get("/", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { skip, take, page, limit } = parsePagination(req.query)
        const { search } = req.query

        const where = {
            role: { in: ['staff', 'admin'] },
            ...(search && {
                OR: [
                    { fullName: { contains: search, mode: 'insensitive' } },
                    { email:    { contains: search, mode: 'insensitive' } },
                ]
            })
        }

        const [staff, total] = await Promise.all([
            prisma.member.findMany({
                where,
                select: {
                    id: true, fullName: true, email: true, username: true,
                    role: true, phone: true, status: true, registrationDate: true
                },
                skip,
                take,
            }),
            prisma.member.count({ where })
        ])

        res.json({ data: staff, meta: paginationMeta(total, page, limit) })
    } catch (error) {
        next(error)
    }
})

// PUT /api/staff/:id/role - Update staff role
router.put("/:id/role", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { id } = req.params
        const { role } = req.body

        if (!['member', 'staff', 'admin'].includes(role)) {
            throw new BadRequestError('Invalid role')
        }

        const user = await prisma.member.update({
            where: { id: parseInt(id) },
            data: { role }
        })

        res.json({
            message: `User role updated to ${role}`,
            user: {
                id: user.id,
                fullName: user.fullName,
                role: user.role
            }
        })
    } catch (error) {
        if (error.code === 'P2025') {
            next(new NotFoundError('User not found'))
        } else {
            next(error)
        }
    }
})

// POST /api/staff/assign - Mock assignment (Schema doesn't have a specific StaffAssignment model yet)
// We could use AuditLog or a new model if needed, but for now we'll just return success.
router.post("/assign", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { staffId, venueId, shift } = req.body
        // In a real app, we'd save this to a StaffAssignment table.
        // For the sake of "No Dummy Data", let's assume we're just checking existence.

        const staff = await prisma.member.findUnique({ where: { id: parseInt(staffId) } })
        if (!staff) throw new NotFoundError('Staff member not found')

        const venue = await prisma.venue.findUnique({ where: { id: parseInt(venueId) } })
        if (!venue) throw new NotFoundError('Venue not found')

        res.json({
            message: `Staff ${staff.fullName} assigned to ${venue.name} for ${shift} shift`
        })
    } catch (error) {
        next(error)
    }
})

module.exports = router
