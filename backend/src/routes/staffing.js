const express = require("express")
const prisma = require("../lib/prisma")
const { z } = require("zod")
const { validate } = require("../middleware/validate")
const { authenticate, requireRole } = require("../middleware/auth")
const { NotFoundError, BadRequestError } = require("../utils/errors")
const { parsePagination, paginationMeta } = require("../utils/pagination")

const router = express.Router()

/**
 * @swagger
 * /staffing/venue/{venueId}:
 *   get:
 *     summary: Get staff assignments for a venue with pagination
 *     tags: [Staffing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: venueId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated assignments
 *
 * /staffing/check-availability:
 *   get:
 *     summary: Check which staff are busy for a given date/time
 *     tags: [Staffing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: startTime
 *         required: true
 *         schema: { type: string, example: "09:00" }
 *       - in: query
 *         name: endTime
 *         required: true
 *         schema: { type: string, example: "17:00" }
 *     responses:
 *       200:
 *         description: Map of busy staff IDs
 *
 * /staffing:
 *   post:
 *     summary: Create a new staff assignment (Admin/Manager)
 *     tags: [Staffing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [venueId, staffId, assignmentDate, startTime, endTime]
 *             properties:
 *               venueId:        { type: integer }
 *               staffId:        { type: integer }
 *               assignmentDate: { type: string, format: date }
 *               startTime:      { type: string, example: "09:00" }
 *               endTime:        { type: string, example: "17:00" }
 *               eventName:      { type: string }
 *               role:           { type: string }
 *     responses:
 *       201:
 *         description: Assignment created
 *
 * /staffing/{id}:
 *   put:
 *     summary: Update a staff assignment (Admin/Manager)
 *     tags: [Staffing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Assignment updated
 *   delete:
 *     summary: Remove a staff assignment (Admin/Manager)
 *     tags: [Staffing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Assignment removed
 */

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
        const { skip, take, page, limit } = parsePagination(req.query)

        const where = {
            venueId: parseInt(venueId),
            status: { not: 'cancelled' }
        }

        const [assignments, total] = await Promise.all([
            prisma.venueAssignment.findMany({
                where,
                include: {
                    staff: { select: { id: true, fullName: true, role: true } }
                },
                orderBy: { assignmentDate: 'desc' },
                skip,
                take,
            }),
            prisma.venueAssignment.count({ where })
        ])

        const formatted = assignments.map(a => ({
            id: a.id,
            venueId: a.venueId,
            staffId: a.staffId,
            staffName: a.staff.fullName,
            staffRole: a.role,
            eventName: a.eventName || "Scheduled Event",
            eventDate: a.assignmentDate,
            startTime: a.startTime,
            endTime: a.endTime,
            status: a.status
        }))

        res.json({ data: formatted, meta: paginationMeta(total, page, limit) })
    } catch (error) {
        next(error)
    }
})

// GET /api/staffing/check-availability - Check which staff are busy for a given date/time
router.get("/check-availability", authenticate, async (req, res, next) => {
    try {
        const { date, startTime, endTime } = req.query

        if (!date || !startTime || !endTime) {
            return res.status(400).json({ error: 'date, startTime, and endTime are required' })
        }

        const dateObj = new Date(date)

        // Find all assignments for this date that overlap with the requested time
        // Overlap condition: existingStart < requestedEnd AND existingEnd > requestedStart
        const conflictingAssignments = await prisma.venueAssignment.findMany({
            where: {
                assignmentDate: dateObj,
                status: { not: 'cancelled' },
                startTime: { lt: endTime },
                endTime: { gt: startTime }
            },
            select: {
                staffId: true,
                startTime: true,
                endTime: true,
                eventName: true,
                venue: { select: { name: true } }
            }
        })

        // Return map of staffId -> conflict details
        const busyStaffMap = {}
        conflictingAssignments.forEach(a => {
            busyStaffMap[a.staffId] = {
                eventName: a.eventName || 'Scheduled Event',
                venueName: a.venue?.name || 'Unknown Venue',
                startTime: a.startTime,
                endTime: a.endTime
            }
        })

        res.json({ busyStaff: busyStaffMap })
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

        // Proper overlap check: existingStart < newEnd AND existingEnd > newStart
        const existingAssignment = await prisma.venueAssignment.findFirst({
            where: {
                staffId,
                assignmentDate: dateObj,
                status: { not: 'cancelled' },
                startTime: { lt: endTime },
                endTime: { gt: startTime }
            },
            include: { venue: true }
        })

        if (existingAssignment) {
            throw new BadRequestError(
                `Staff member is already assigned to "${existingAssignment.venue?.name || 'another venue'}" from ${existingAssignment.startTime} to ${existingAssignment.endTime} on this date`
            )
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

// PUT /api/staffing/:id - Update an existing assignment
router.put("/:id", authenticate, requireRole('admin', 'manager'), async (req, res, next) => {
    try {
        const { id } = req.params
        const { venueId, staffId, assignmentDate, startTime, endTime, eventName, role, status } = req.body

        // If changing date/time/staff, check for conflicts
        if (assignmentDate && startTime && endTime && staffId) {
            const dateObj = new Date(assignmentDate)

            const conflicting = await prisma.venueAssignment.findFirst({
                where: {
                    id: { not: parseInt(id) }, // Exclude current assignment
                    staffId: parseInt(staffId),
                    assignmentDate: dateObj,
                    status: { not: 'cancelled' },
                    startTime: { lt: endTime },
                    endTime: { gt: startTime }
                },
                include: { venue: true }
            })

            if (conflicting) {
                throw new BadRequestError(
                    `Staff member is already assigned to "${conflicting.venue?.name || 'another venue'}" from ${conflicting.startTime} to ${conflicting.endTime} on this date`
                )
            }
        }

        const updateData = {}
        if (venueId) updateData.venueId = parseInt(venueId)
        if (staffId) updateData.staffId = parseInt(staffId)
        if (assignmentDate) updateData.assignmentDate = new Date(assignmentDate)
        if (startTime) updateData.startTime = startTime
        if (endTime) updateData.endTime = endTime
        if (eventName !== undefined) updateData.eventName = eventName
        if (role) updateData.role = role
        if (status) updateData.status = status

        const assignment = await prisma.venueAssignment.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                venue: true,
                staff: true
            }
        })

        res.json({
            message: 'Assignment updated successfully',
            assignment
        })
    } catch (error) {
        if (error.code === 'P2025') {
            next(new NotFoundError('Assignment not found'))
        } else {
            next(error)
        }
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
