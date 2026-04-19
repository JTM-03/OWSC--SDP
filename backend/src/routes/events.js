const express = require("express")
const prisma = require("../lib/prisma")
const { authenticate, requireRole } = require("../middleware/auth")
const { z } = require('zod')
const { validate } = require("../middleware/validate")
const { parsePagination, paginationMeta } = require("../utils/pagination")

const router = express.Router()

/**
 * @swagger
 * /events:
 *   get:
 *     summary: List all events with pagination
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Upcoming, Completed, Cancelled] }
 *     responses:
 *       200:
 *         description: Paginated events
 *   post:
 *     summary: Create a new event (Admin)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, date, time, location]
 *             properties:
 *               title:        { type: string }
 *               description:  { type: string }
 *               date:         { type: string, format: date-time }
 *               time:         { type: string, example: "18:00" }
 *               location:     { type: string }
 *               imageUrl:     { type: string }
 *               ticketPrice:  { type: number }
 *               category:     { type: string }
 *               totalTickets: { type: integer }
 *               status:       { type: string, enum: [Upcoming, Completed, Cancelled] }
 *     responses:
 *       201:
 *         description: Event created
 *
 * /events/{id}:
 *   put:
 *     summary: Update an event (Admin)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Event updated
 *   delete:
 *     summary: Delete an event (Admin)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Event deleted
 */

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
        const { skip, take, page, limit } = parsePagination(req.query)
        const { status } = req.query

        const where = status ? { status } : {}

        const [events, total] = await Promise.all([
            prisma.event.findMany({
                where,
                orderBy: { date: 'asc' },
                skip,
                take,
            }),
            prisma.event.count({ where })
        ])

        res.json({ data: events, meta: paginationMeta(total, page, limit) })
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
