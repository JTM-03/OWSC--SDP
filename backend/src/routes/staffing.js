const express = require("express")
const { validate } = require("../middleware/validate")
const { authenticate, requireRole } = require("../middleware/auth")
const { assignmentUpdateSchema } = require("../validation/schemas")
const { z } = require("zod")
const ctrl = require("../controllers/staffingController")

const router = express.Router()

// Create schema stays inline (complex regex patterns)
const assignmentSchema = z.object({
    venueId: z.number().int().positive('Invalid venue ID'),
    staffId: z.number().int().positive('Invalid staff ID'),
    assignmentDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
    eventName: z.string().max(100, 'Event name must not exceed 100 characters').optional(),
    role: z.string().max(50, 'Role must not exceed 50 characters').optional().default("Service")
}).refine(data => {
    const start = parseInt(data.startTime.replace(':', ''))
    const end = parseInt(data.endTime.replace(':', ''))
    return end > start
}, { message: 'End time must be after start time', path: ['endTime'] })

router.get("/venue/:venueId",      authenticate, ctrl.getVenueAssignments)
router.get("/check-availability",  authenticate, ctrl.checkAvailability)
router.post("/",                   authenticate, requireRole('admin', 'manager'), validate(assignmentSchema),       ctrl.createAssignment)
router.put("/:id",                 authenticate, requireRole('admin', 'manager'), validate(assignmentUpdateSchema), ctrl.updateAssignment)
router.delete("/:id",              authenticate, requireRole('admin', 'manager'), ctrl.deleteAssignment)

module.exports = router
