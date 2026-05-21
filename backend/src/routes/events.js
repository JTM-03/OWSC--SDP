const express = require("express")
const { authenticate, requireRole } = require("../middleware/auth")
const { validate } = require("../middleware/validate")
const { z } = require('zod')
const ctrl = require("../controllers/eventController")

const router = express.Router()

const eventSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    date: z.string().datetime().or(z.string()),
    time: z.string().min(1, "Time is required"),
    location: z.string().min(1, "Location is required"),
    imageUrl: z.string().optional(),
    ticketPrice: z.number().nullable().optional(),
    category: z.string().default("social"),
    totalTickets: z.number().default(100),
    status: z.enum(['Upcoming', 'Completed', 'Cancelled']).default('Upcoming')
})

/**
 * @swagger
 * /events:
 *   get:
 *     summary: List all events with pagination
 *     tags: [Events]
 *   post:
 *     summary: Create a new event (Admin)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 * /events/{id}:
 *   put:
 *     summary: Update an event (Admin)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     summary: Delete an event (Admin)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 */

router.get("/",       ctrl.listEvents)
router.post("/",      authenticate, requireRole('admin'), validate(eventSchema), ctrl.createEvent)
router.put("/:id",    authenticate, requireRole('admin'), validate(eventSchema), ctrl.updateEvent)
router.delete("/:id", authenticate, requireRole('admin'), ctrl.deleteEvent)

module.exports = router
