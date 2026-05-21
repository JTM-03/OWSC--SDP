const express = require("express")
const { authenticate, requireRole } = require("../middleware/auth")
const { validate } = require("../middleware/validate")
const { staffRoleSchema } = require("../validation/schemas")
const ctrl = require("../controllers/staffController")

const router = express.Router()

/**
 * @swagger
 * /staff:
 *   get:
 *     summary: List all staff members with pagination (Admin)
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 * /staff/{id}/role:
 *   put:
 *     summary: Update a staff member's role (Admin)
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 * /staff/assign:
 *   post:
 *     summary: Assign a staff member to a venue (Admin)
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 */

router.get("/",          authenticate, requireRole('admin'), ctrl.listStaff)
router.put("/:id/role",  authenticate, requireRole('admin'), validate(staffRoleSchema), ctrl.updateRole)
router.post("/assign",   authenticate, requireRole('admin'), ctrl.assignStaff)

module.exports = router
