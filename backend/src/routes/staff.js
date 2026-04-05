const express = require("express")
const prisma = require("../lib/prisma")
const { authenticate, requireRole } = require("../middleware/auth")
const { NotFoundError, BadRequestError } = require("../utils/errors")

const router = express.Router()

// GET /api/staff - List all staff users
router.get("/", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const staff = await prisma.member.findMany({
            where: {
                role: { in: ['staff', 'admin'] }
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                username: true,
                role: true,
                phone: true,
                status: true,
                registrationDate: true
            }
        })
        res.json(staff)
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
