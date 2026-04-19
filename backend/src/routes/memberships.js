const express = require("express")
const prisma = require("../lib/prisma")
const { authenticate, requireRole } = require("../middleware/auth")
const { NotFoundError, BadRequestError } = require("../utils/errors")
const { z } = require('zod')
const { validate } = require("../middleware/validate")

const router = express.Router()

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

const upgradeSchema = z.object({
    newPlanId: z.string().min(1),
    reason:    z.string().optional()
})

const MEMBERSHIP_PLANS = [
    { id: 'full',      name: 'Full Member',      price: 15000, durationMonths: 12,   description: 'All facilities access, Voting rights, Event bookings, Guest privileges, Priority support' },
    { id: 'associate', name: 'Associate Member',  price: 10000, durationMonths: 12,   description: 'Sports facilities, Dining access, Event discounts, Limited guests' },
    { id: 'sport',     name: 'Sport Member',      price: 5000,  durationMonths: 12,   description: 'All sports facilities, Coaching programs, Tournament entry, Basic dining' },
    { id: 'social',    name: 'Social Member',     price: 10000, durationMonths: 12,   description: 'Restaurant & bar, Social events, Lounge access, Special offers' },
    { id: 'lifetime',  name: 'Lifetime Member',   price: 25000, durationMonths: 9999, description: 'All privileges forever, Priority bookings, VIP events access, Unlimited guests, Transferable' }
]

// GET /api/membership/plans
router.get("/plans", (req, res) => {
    res.json(MEMBERSHIP_PLANS)
})

// POST /api/membership/register - Submit membership application
router.post("/register", authenticate, async (req, res, next) => {
    try {
        const { planId } = req.body
        const memberId = req.user.id

        const plan = MEMBERSHIP_PLANS.find(p => p.id === planId)
        if (!plan) {
            throw new BadRequestError('Invalid membership plan selected')
        }

        const existingMembership = await prisma.user.findFirst({
            where: {
                memberId,
                status:  'Active',
                endDate: { gte: new Date() }
            }
        })

        if (existingMembership) {
            throw new BadRequestError('You already have an active membership')
        }

        const startDate = new Date()
        const endDate   = new Date()
        endDate.setMonth(endDate.getMonth() + plan.durationMonths)

        // FIX: field is "membershipType" (schema), NOT "type"
        const membership = await prisma.user.create({
            data: {
                memberId,
                startDate,
                endDate,
                status:         'Pending',
                membershipFee:  plan.price,
                membershipType: plan.id  // FIX: was "type: plan.id" in some versions
            }
        })

        res.status(201).json({
            message: 'Membership application submitted successfully',
            membership
        })
    } catch (error) {
        next(error)
    }
})

// GET /api/membership/my - Get user's membership details
router.get("/my", authenticate, async (req, res, next) => {
    try {
        const membership = await prisma.user.findFirst({
            where:    { memberId: req.user.id },
            orderBy:  { startDate: 'desc' },
            include:  { payments: true }
        })

        res.json(membership)
    } catch (error) {
        next(error)
    }
})

// GET /api/membership/all - List all memberships (Admin only)
router.get("/all", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const memberships = await prisma.user.findMany({
            include: {
                member: {
                    select: { id: true, fullName: true, email: true }
                },
                payments: true
            },
            orderBy: { startDate: 'desc' }
        })
        res.json(memberships)
    } catch (error) {
        next(error)
    }
})

// PUT /api/membership/:id/status - Approve/Reject membership (Admin only)
router.put("/:id/status", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { id }     = req.params
        const { status } = req.body

        if (!['Active', 'Expired', 'Cancelled', 'Pending'].includes(status)) {
            throw new BadRequestError('Invalid status')
        }

        const membership = await prisma.user.update({
            where:   { id: parseInt(id) },
            data:    { status },
            include: { member: true }
        })

        if (status === 'Active') {
            await prisma.member.update({
                where: { id: membership.memberId },
                data:  { status: 'Active' }
            })
            const { sendMembershipApprovedEmail } = require("../services/emailService")
            if (membership.member?.email) {
                sendMembershipApprovedEmail(membership.member).catch(err =>
                    console.error("Failed to send approval email:", err.message)
                )
            }
        }

        if (status === 'Cancelled') {
            const { sendMembershipRejectedEmail } = require("../services/emailService")
            if (membership.member?.email) {
                sendMembershipRejectedEmail(membership.member, req.body.reason || null).catch(err =>
                    console.error("Failed to send rejection email:", err.message)
                )
            }
        }

        res.json({
            message: `Membership status updated to ${status}`,
            membership
        })    } catch (error) {
        if (error.code === 'P2025') {
            next(new NotFoundError('Membership not found'))
        } else {
            next(error)
        }
    }
})

// POST /api/membership/upgrade-request
router.post("/upgrade-request", authenticate, validate(upgradeSchema), async (req, res, next) => {
    try {
        const { newPlanId, reason } = req.validatedData
        const memberId = req.user.id

        const currentMembership = await prisma.user.findFirst({
            where: {
                memberId,
                status: 'Active'
            },
            orderBy: { startDate: 'desc' }
        })

        if (!currentMembership) {
            throw new BadRequestError('No active membership found to upgrade')
        }

        // FIX: field is "membershipType" in schema, NOT "type"
        if (currentMembership.membershipType === newPlanId) {
            throw new BadRequestError('You are already on this plan')
        }

        const existingRequest = await prisma.membershipUpgradeRequest.findFirst({
            where: { memberId, status: 'Pending' }
        })

        if (existingRequest) {
            throw new BadRequestError('You already have a pending upgrade request')
        }

        // FIX: oldPlanId now correctly reads from membershipType
        const request = await prisma.membershipUpgradeRequest.create({
            data: {
                memberId,
                oldPlanId: currentMembership.membershipType,  // FIX: was currentMembership.type
                newPlanId,
                status: 'Pending'
            }
        })

        res.status(201).json({
            message: 'Upgrade request submitted successfully',
            request
        })
    } catch (error) {
        next(error)
    }
})

// GET /api/membership/upgrade-requests - List all (Admin only)
router.get("/upgrade-requests", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const requests = await prisma.membershipUpgradeRequest.findMany({
            include: {
                member: {
                    select: { id: true, fullName: true, email: true }
                }
            },
            orderBy: { requestDate: 'desc' }
        })
        res.json(requests)
    } catch (error) {
        next(error)
    }
})

// PUT /api/membership/upgrade-requests/:id/approve - Approve/Reject upgrade (Admin only)
router.put("/upgrade-requests/:id/approve", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { id }     = req.params
        const { status } = req.body

        if (!['Approved', 'Rejected'].includes(status)) {
            throw new BadRequestError('Invalid status')
        }

        const request = await prisma.membershipUpgradeRequest.findUnique({
            where: { id: parseInt(id) }
        })

        if (!request) {
            throw new NotFoundError('Request not found')
        }

        if (request.status !== 'Pending') {
            throw new BadRequestError('Request is already processed')
        }

        const result = await prisma.$transaction(async (tx) => {
            const updatedRequest = await tx.membershipUpgradeRequest.update({
                where: { id: request.id },
                data:  { status }
            })

            if (status === 'Approved') {
                // End current active membership
                await tx.user.updateMany({
                    where: { memberId: request.memberId, status: 'Active' },
                    data:  { status: 'Upgraded', endDate: new Date() }
                })

                const plan = MEMBERSHIP_PLANS.find(p => p.id === request.newPlanId)
                if (!plan) throw new Error('Plan not found in config')

                const endDate = new Date()
                if (plan.id === 'lifetime') {
                    endDate.setFullYear(endDate.getFullYear() + 100)
                } else {
                    endDate.setFullYear(endDate.getFullYear() + 1)
                }

                // FIX: field is "membershipType" NOT "type"
                await tx.user.create({
                    data: {
                        memberId:       request.memberId,
                        startDate:      new Date(),
                        endDate,
                        status:         'Active',
                        membershipFee:  plan.price,
                        membershipType: request.newPlanId  // FIX: was "type: request.newPlanId"
                    }
                })
            }

            return updatedRequest
        })

        res.json({
            message: `Request ${status.toLowerCase()} successfully`,
            request: result
        })
    } catch (error) {
        next(error)
    }
})

// ─────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/admin/members
 * FIX: This route was MISSING entirely — causing the frontend
 * /admin/members call to 404 and return an error object instead
 * of an array, which broke members.filter() in MembershipManagement.tsx
 *
 * Returns all Member records with their latest membership included,
 * shaped to match the APIMember interface in membership.ts
 */
router.get("/admin/members", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const members = await prisma.member.findMany({
            where: {
                role: 'member'  // exclude admin accounts from the list
            },
            select: {
                id:               true,
                fullName:         true,
                email:            true,
                phone:            true,
                status:           true,
                role:             true,
                registrationDate: true,
                memberships: {
                    // FIX: relation name is "memberships" (Member.memberships -> User[])
                    orderBy: { startDate: 'desc' },
                    take:    1,  // only return the most recent membership
                    select: {
                        id:             true,
                        memberId:       true,
                        startDate:      true,
                        endDate:        true,
                        status:         true,
                        membershipFee:  true,
                        membershipType: true  // this maps to "type" on the frontend via the Membership interface
                    }
                }
            },
            orderBy: { registrationDate: 'desc' }
        })

        // FIX: reshape memberships so the frontend's Membership.type field works
        // The schema column is "membershipType" but the APIMember interface expects "type"
        const shaped = members.map(m => ({
            ...m,
            memberships: m.memberships.map(ms => ({
                ...ms,
                type: ms.membershipType  // add "type" alias so frontend code works without changes
            }))
        }))

        res.json(shaped)
    } catch (error) {
        next(error)
    }
})

module.exports = router