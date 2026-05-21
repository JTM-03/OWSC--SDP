const express = require("express")
const { authenticate, requireRole } = require("../middleware/auth")
const { validate } = require("../middleware/validate")
const { memberStatusSchema, upgradeRequestStatusSchema } = require("../validation/schemas")
const ctrl = require("../controllers/adminController")

const router = express.Router()

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: Get dashboard KPIs and revenue chart (Admin/Staff)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 * /admin/members:
 *   get:
 *     summary: List all members with pagination (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 * /admin/pending-memberships:
 *   get:
 *     summary: List pending membership applications (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 * /admin/upgrade-requests:
 *   get:
 *     summary: List membership upgrade requests (Admin/Staff)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 * /admin/export/{area}:
 *   get:
 *     summary: Export data as CSV (Admin/Staff)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */

router.get("/stats",                        authenticate, requireRole('admin', 'staff'), ctrl.getStats)
router.get("/pending-memberships",          authenticate, requireRole('admin'),          ctrl.getPendingMemberships)
router.get("/members",                      authenticate, requireRole('admin'),          ctrl.getMembers)
router.put("/members/:id/status",           authenticate, requireRole('admin'),          validate(memberStatusSchema),          ctrl.updateMemberStatus)
router.get("/upgrade-requests",             authenticate, requireRole('admin', 'staff'), ctrl.getUpgradeRequests)
router.put("/upgrade-requests/:id/status",  authenticate, requireRole('admin'),          validate(upgradeRequestStatusSchema),  ctrl.updateUpgradeRequestStatus)
router.get("/export/:area",                 authenticate, requireRole('admin', 'staff'), ctrl.exportData)

module.exports = router
