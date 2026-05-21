const prisma = require("../lib/prisma")
const { NotFoundError, BadRequestError } = require("../utils/errors")
const { parsePagination, paginationMeta } = require("../utils/pagination")

// ─── Venue Assignments ────────────────────────────────────────────────────────

/**
 * Return paginated staff assignments for a specific venue.
 * Excludes cancelled assignments.
 * @route GET /api/staffing/venues/:venueId/assignments
 */
exports.getVenueAssignments = async (req, res, next) => {
    try {
        const { venueId } = req.params
        const { skip, take, page, limit } = parsePagination(req.query)
        const where = { venueId: parseInt(venueId), status: { not: 'cancelled' } }

        const [assignments, total] = await Promise.all([
            prisma.venueAssignment.findMany({ where, include: { staff: { select: { id: true, fullName: true, role: true } } }, orderBy: { assignmentDate: 'desc' }, skip, take }),
            prisma.venueAssignment.count({ where })
        ])

        // Shape into a flat display format for the frontend schedule view
        const formatted = assignments.map(a => ({ id: a.id, venueId: a.venueId, staffId: a.staffId, staffName: a.staff.fullName, staffRole: a.role, eventName: a.eventName || "Scheduled Event", eventDate: a.assignmentDate, startTime: a.startTime, endTime: a.endTime, status: a.status }))
        res.json({ data: formatted, meta: paginationMeta(total, page, limit) })
    } catch (error) { next(error) }
}

/**
 * Check which staff members are already assigned during a given time window.
 * Returns a map of staffId → assignment details for conflict detection in the UI.
 * @route GET /api/staffing/availability
 */
exports.checkAvailability = async (req, res, next) => {
    try {
        const { date, startTime, endTime } = req.query
        if (!date || !startTime || !endTime) return res.status(400).json({ error: 'date, startTime, and endTime are required' })

        // Find all non-cancelled assignments that overlap the requested window
        const conflictingAssignments = await prisma.venueAssignment.findMany({
            where: { assignmentDate: new Date(date), status: { not: 'cancelled' }, startTime: { lt: endTime }, endTime: { gt: startTime } },
            select: { staffId: true, startTime: true, endTime: true, eventName: true, venue: { select: { name: true } } }
        })

        // Build a lookup map keyed by staffId for O(1) conflict checks on the frontend
        const busyStaffMap = {}
        conflictingAssignments.forEach(a => {
            busyStaffMap[a.staffId] = { eventName: a.eventName || 'Scheduled Event', venueName: a.venue?.name || 'Unknown Venue', startTime: a.startTime, endTime: a.endTime }
        })

        res.json({ busyStaff: busyStaffMap })
    } catch (error) { next(error) }
}

/**
 * Create a new staff assignment for a venue event.
 * Prevents double-booking by checking for overlapping assignments on the same date.
 * @route POST /api/staffing/assignments
 */
exports.createAssignment = async (req, res, next) => {
    try {
        const { venueId, staffId, assignmentDate, startTime, endTime, eventName, role } = req.validatedData
        const dateObj = new Date(assignmentDate)

        // Conflict check: staff member must not already be assigned during this window
        const existingAssignment = await prisma.venueAssignment.findFirst({
            where: { staffId, assignmentDate: dateObj, status: { not: 'cancelled' }, startTime: { lt: endTime }, endTime: { gt: startTime } },
            include: { venue: true }
        })
        if (existingAssignment) throw new BadRequestError(`Staff member is already assigned to "${existingAssignment.venue?.name || 'another venue'}" from ${existingAssignment.startTime} to ${existingAssignment.endTime} on this date`)

        const assignment = await prisma.venueAssignment.create({
            data: { venueId, staffId, assignmentDate: dateObj, startTime, endTime, eventName, role, status: 'scheduled' },
            include: { venue: true, staff: true }
        })
        res.status(201).json({ message: 'Staff assigned successfully', assignment })
    } catch (error) { next(error) }
}

/**
 * Update an existing staff assignment (admin only).
 * Re-validates for scheduling conflicts when date/time/staff fields change.
 * @route PUT /api/staffing/assignments/:id
 */
exports.updateAssignment = async (req, res, next) => {
    try {
        const { id } = req.params
        const { venueId, staffId, assignmentDate, startTime, endTime, eventName, role, status } = req.body

        // Only run conflict check if the time-sensitive fields are being updated
        if (assignmentDate && startTime && endTime && staffId) {
            const dateObj = new Date(assignmentDate)
            const conflicting = await prisma.venueAssignment.findFirst({
                // Exclude the current assignment from the conflict check
                where: { id: { not: parseInt(id) }, staffId: parseInt(staffId), assignmentDate: dateObj, status: { not: 'cancelled' }, startTime: { lt: endTime }, endTime: { gt: startTime } },
                include: { venue: true }
            })
            if (conflicting) throw new BadRequestError(`Staff member is already assigned to "${conflicting.venue?.name || 'another venue'}" from ${conflicting.startTime} to ${conflicting.endTime} on this date`)
        }

        // Build update payload from only the provided fields
        const updateData = {}
        if (venueId) updateData.venueId = parseInt(venueId)
        if (staffId) updateData.staffId = parseInt(staffId)
        if (assignmentDate) updateData.assignmentDate = new Date(assignmentDate)
        if (startTime) updateData.startTime = startTime
        if (endTime) updateData.endTime = endTime
        if (eventName !== undefined) updateData.eventName = eventName
        if (role) updateData.role = role
        if (status) updateData.status = status

        const assignment = await prisma.venueAssignment.update({ where: { id: parseInt(id) }, data: updateData, include: { venue: true, staff: true } })
        res.json({ message: 'Assignment updated successfully', assignment })
    } catch (error) {
        if (error.code === 'P2025') next(new NotFoundError('Assignment not found'))
        else next(error)
    }
}

/**
 * Delete a staff assignment (admin only).
 * @route DELETE /api/staffing/assignments/:id
 */
exports.deleteAssignment = async (req, res, next) => {
    try {
        await prisma.venueAssignment.delete({ where: { id: parseInt(req.params.id) } })
        res.json({ message: 'Assignment removed successfully' })
    } catch (error) {
        if (error.code === 'P2025') next(new NotFoundError('Assignment not found'))
        else next(error)
    }
}
