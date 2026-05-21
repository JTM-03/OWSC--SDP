const express = require("express")
const { authenticate } = require("../middleware/auth")
const { validate } = require("../middleware/validate")
const { notificationSendSchema } = require("../validation/schemas")
const ctrl = require("../controllers/notificationController")

const router = express.Router()

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get current user's notifications with pagination
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 * /notifications/send:
 *   post:
 *     summary: Send a notification to a user (Admin/System)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */

router.get("/",     authenticate, ctrl.getNotifications)
router.post("/send", authenticate, validate(notificationSendSchema), ctrl.sendNotification)

module.exports = router
