const express = require("express")
const { authenticate } = require("../middleware/auth")
const { validate } = require("../middleware/validate")
const { tableBookingSchema } = require("../validation/schemas")
const upload = require("../config/upload")
const ctrl = require("../controllers/tableController")

const router = express.Router()

/**
 * @swagger
 * /tables/book:
 *   post:
 *     summary: Book restaurant tables
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 */

router.post("/book", authenticate, upload.single('receipt'), validate(tableBookingSchema), ctrl.bookTables)

module.exports = router
