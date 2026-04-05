const express = require("express")
const prisma = require("../lib/prisma")
const { authenticate, requireRole } = require("../middleware/auth")
const { z } = require('zod')
const { validate } = require("../middleware/validate")

const router = express.Router()

const eventSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    date: z.string().datetime().or(z.string()), // Accept ISO string or regular string date
    time: z.string().min(1, "Time is required"),
    location: z.string().min(1, "Location is required"),
    imageUrl: z.string().optional(),
    ticketPrice: z.number().nullable().optional(),
    category: z.string().default("social"),
    totalTickets: z.number().default(100),
    status: z.enum(['Upcoming', 'Completed', 'Cancelled']).default('Upcoming')
})

// GET /api/events - List all events
router.get("/", async (req, res, next) => {
    try {
        const events = await prisma.event.findMany({
            orderBy: { date: 'asc' }
        })
        res.json(events)
    } catch (error) {
        next(error)
    }
})

// POST /api/events - Create new event (Admin only)
router.post("/", authenticate, requireRole('admin'), validate(eventSchema), async (req, res, next) => {
    try {
        console.log("Creating event:", req.validatedData);
        // data contains validated fields
        const data = req.validatedData;

        const event = await prisma.event.create({
            data: {
                ...data,
                date: new Date(data.date), // Ensure Date object
            }
        })

        res.status(201).json(event)
    } catch (error) {
        next(error)
    }
})

// PUT /api/events/:id - Update event (Admin only)
router.put("/:id", authenticate, requireRole('admin'), validate(eventSchema), async (req, res, next) => {
    try {
        const { id } = req.params
        const data = req.validatedData;

        const event = await prisma.event.update({
            where: { id: parseInt(id) },
            data: {
                ...data,
                date: new Date(data.date),
            }
        })

        res.json(event)
    } catch (error) {
        next(error)
    }
})

// DELETE /api/events/:id - Delete event (Admin only)
router.delete("/:id", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { id } = req.params
        await prisma.event.delete({
            where: { id: parseInt(id) }
        })
        res.json({ message: 'Event deleted successfully' })
    } catch (error) {
        next(error)
    }
})

module.exports = router
