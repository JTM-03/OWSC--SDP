const express = require("express")
const { authenticate, requireRole } = require("../middleware/auth")
const { validate } = require("../middleware/validate")
const { z } = require('zod')
const ctrl = require("../controllers/membershipController")

const router = express.Router()

const upgradeSchema = z.object({
    newPlanId: z.string().min(1),
    reason:    z.string().optional()
})

/**
 * @swagger
 * /membership/plans:
 *   get:
 *     summary: List all available membership plans
 *     tags: [Membership]
 * /membership/register:
 *   post:
 *     summary: Submit a membership application
 *     tags: [Membership]
 *     security:
 *       - bearerAuth: []
 * /membership/my:
 *   get:
 *     summary: Get current user's membership
 *     tags: [Membership]
 *     security:
 *       - bearerAuth: []
 * /membership/all:
 *   get:
 *     summary: List all memberships (Admin only)
 *     tags: [Membership]
 *     security:
 *       - bearerAuth: []
 * /membership/{id}/status:
 *   put:
 *     summary: Approve or reject a membership (Admin only)
 *     tags: [Membership]
 *     security:
 *       - bearerAuth: []
 * /membership/upgrade-request:
 *   post:
 *     summary: Request a membership upgrade
 *     tags: [Membership]
 *     security:
 *       - bearerAuth: []
 * /membership/upgrade-requests:
 *   get:
 *     summary: List all upgrade requests (Admin only)
 *     tags: [Membership]
 *     security:
 *       - bearerAuth: []
 * /membership/upgrade-requests/{id}/approve:
 *   put:
 *     summary: Approve or reject an upgrade request (Admin only)
 *     tags: [Membership]
 *     security:
 *       - bearerAuth: []
 */

router.get("/plans",                              ctrl.getPlans)
router.post("/register",                          authenticate, ctrl.register)
router.get("/my",                                 authenticate, ctrl.getMyMembership)
router.get("/all",                                authenticate, requireRole('admin'), ctrl.getAllMemberships)
router.put("/:id/status",                         authenticate, requireRole('admin'), ctrl.updateMembershipStatus)
router.post("/upgrade-request",                   authenticate, validate(upgradeSchema), ctrl.requestUpgrade)
router.get("/upgrade-requests",                   authenticate, requireRole('admin'), ctrl.getUpgradeRequests)
router.put("/upgrade-requests/:id/approve",       authenticate, requireRole('admin'), ctrl.approveUpgradeRequest)
router.get("/admin/members",                      authenticate, requireRole('admin'), ctrl.getAdminMembers)

module.exports = router
