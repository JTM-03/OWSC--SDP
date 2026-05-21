const express = require("express")
const { validate } = require("../middleware/validate")
const { venueSchema } = require("../validation/schemas")
const { authenticate, requireRole } = require("../middleware/auth")
const upload = require("../config/upload")
const ctrl = require("../controllers/venueController")

const router = express.Router()

/**
 * @swagger
 * /venues:
 *   get:
 *     summary: List all venues
 *     tags: [Venues]
 *   post:
 *     summary: Create a new venue (Admin only)
 *     tags: [Venues]
 *     security:
 *       - bearerAuth: []
 * /venues/search:
 *   get:
 *     summary: Search available venues by date and time
 *     tags: [Venues]
 * /venues/{id}:
 *   get:
 *     summary: Get venue details
 *     tags: [Venues]
 *   put:
 *     summary: Update a venue (Admin only)
 *     tags: [Venues]
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     summary: Delete a venue (Admin only)
 *     tags: [Venues]
 *     security:
 *       - bearerAuth: []
 * /venues/bookings:
 *   post:
 *     summary: Create a venue booking
 *     tags: [Venues]
 *     security:
 *       - bearerAuth: []
 * /venues/bookings/my:
 *   get:
 *     summary: Get current user's bookings
 *     tags: [Venues]
 *     security:
 *       - bearerAuth: []
 * /venues/bookings/all:
 *   get:
 *     summary: Get all bookings (Admin only)
 *     tags: [Venues]
 *     security:
 *       - bearerAuth: []
 * /venues/bookings/calendar:
 *   get:
 *     summary: Get bookings for calendar view
 *     tags: [Venues]
 *     security:
 *       - bearerAuth: []
 */

router.get("/",       ctrl.listVenues)
router.get("/search", ctrl.searchVenues)

// Booking routes (must come before /:id to avoid conflicts)
router.post("/bookings",                    authenticate, upload.single('receipt'), ctrl.createBooking)
router.get("/bookings/my",                  authenticate, ctrl.getMyBookings)
router.get("/bookings/all",                 authenticate, requireRole('admin'), ctrl.getAllBookings)
router.get("/bookings/calendar",            authenticate, ctrl.getCalendar)
router.put("/bookings/:id/cancel",          authenticate, ctrl.cancelBooking)
router.put("/bookings/:id/admin-cancel",    authenticate, requireRole('admin'), ctrl.adminCancelBooking)
router.put("/bookings/:id/verify-payment",  authenticate, requireRole('admin'), ctrl.verifyBookingPayment)
router.put("/bookings/:id",                 authenticate, requireRole('admin'), ctrl.updateBooking)

// Venue CRUD
router.get("/:id",    ctrl.getVenue)
router.post("/",      authenticate, requireRole('admin'), validate(venueSchema), ctrl.createVenue)
router.put("/:id",    authenticate, requireRole('admin'), validate(venueSchema), ctrl.updateVenue)
router.delete("/:id", authenticate, requireRole('admin'), ctrl.deleteVenue)

module.exports = router
