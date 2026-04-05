const express = require("express")
const prisma = require("../lib/prisma")
const { z } = require("zod")
const { validate } = require("../middleware/validate")
const { authenticate, requireRole } = require("../middleware/auth")
const { NotFoundError, BadRequestError } = require("../utils/errors")

const router = express.Router()

// Validation Schemas
const assignmentSchema = z.object({
    venueId: z.number().int().positive(),
    staffId: z.number().int().positive(),
    assignmentDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)), // ISO or YYYY-MM-DD
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)"),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)"),
    eventName: z.string().optional(),
    role: z.string().optional().default("Service")
})

// GET /api/staffing/venue/:venueId - Get assignments for a venue
router.get("/venue/:venueId", authenticate, async (req, res, next) => {
    try {
        const { venueId } = req.params

        const assignments = await prisma.venueAssignment.findMany({
            where: {
                venueId: parseInt(venueId),
                status: { not: 'cancelled' }
            },
            include: {
                staff: {
                    select: {
                        id: true,
                        fullName: true,
                        role: true
                    }
                }
            },
            orderBy: {
                assignmentDate: 'desc'
            }
        })

        // Transform for frontend
        const formattedAssignments = assignments.map(a => ({
            id: a.id,
            venueId: a.venueId,
            staffId: a.staffId,
            staffName: a.staff.fullName,
            staffRole: a.role, // Use assignment role, fallback to staff role if needed
            eventName: a.eventName || "Scheduled Event",
            eventDate: a.assignmentDate,
            startTime: a.startTime,
            endTime: a.endTime,
            status: a.status
        }))

        res.json(formattedAssignments)
    } catch (error) {
        next(error)
    }
})

// POST /api/staffing - Create new assignment
router.post("/", authenticate, requireRole('admin', 'manager'), validate(assignmentSchema), async (req, res, next) => {
    try {
        const { venueId, staffId, assignmentDate, startTime, endTime, eventName, role } = req.validatedData

        // Parse date correctly
        const dateObj = new Date(assignmentDate)

        // Check for conflicts
        const existingAssignment = await prisma.venueAssignment.findFirst({
            where: {
                staffId,
                assignmentDate: dateObj,
                status: { not: 'cancelled' },
                OR: [
                    {
                        // Overlaps start
                        startTime: { lte: startTime },
                        endTime: { gt: startTime }
                    },
                    {
                        // Overlaps end
                        startTime: { lt: endTime },
                        endTime: { gte: endTime }
                    }
                ]
            }
        })

        if (existingAssignment) {
            throw new BadRequestError('Staff member is already assigned to another venue at this time')
        }

        const assignment = await prisma.venueAssignment.create({
            data: {
                venueId,
                staffId,
                assignmentDate: dateObj,
                startTime,
                endTime,
                eventName,
                role,
                status: 'scheduled'
            },
            include: {
                venue: true,
                staff: true
            }
        })

        res.status(201).json({
            message: 'Staff assigned successfully',
            assignment
        })
    } catch (error) {
        next(error)
    }
})

// DELETE /api/staffing/:id - Remove/Cancel assignment
router.delete("/:id", authenticate, requireRole('admin', 'manager'), async (req, res, next) => {
    try {
        const { id } = req.params

        await prisma.venueAssignment.delete({
            where: { id: parseInt(id) }
        })

        res.json({ message: 'Assignment removed successfully' })
    } catch (error) {
        if (error.code === 'P2025') {
            next(new NotFoundError('Assignment not found'))
        } else {
            next(error)
        }
    }
})

module.exports = router
