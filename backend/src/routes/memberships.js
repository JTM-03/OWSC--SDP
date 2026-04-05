const express = require("express")
const prisma = require("../lib/prisma")
const { authenticate, requireRole } = require("../middleware/auth")
const { NotFoundError, BadRequestError } = require("../utils/errors")


const { z } = require('zod')
const { validate } = require("../middleware/validate")

const router = express.Router()

const upgradeSchema = z.object({
    newPlanId: z.string().min(1),
    reason: z.string().optional()
})

// GET /api/membership/plans - List available plans (Mock plans for now as they are not in DB schema yet, or we use a static list)
// Looking at schema.prisma, there is no "MembershipPlan" model, just "Membership" associated with a member.
// I'll use a static set of plans for the registry but store the status in the Membership model.
const MEMBERSHIP_PLANS = [
    { id: 'full', name: 'Full Member', price: 15000, durationMonths: 12, description: 'All facilities access, Voting rights, Event bookings, Guest privileges, Priority support' },
    { id: 'associate', name: 'Associate Member', price: 10000, durationMonths: 12, description: 'Sports facilities, Dining access, Event discounts, Limited guests' },
    { id: 'sport', name: 'Sport Member', price: 5000, durationMonths: 12, description: 'All sports facilities, Coaching programs, Tournament entry, Basic dining' },
    { id: 'social', name: 'Social Member', price: 10000, durationMonths: 12, description: 'Restaurant & bar, Social events, Lounge access, Special offers' },
    { id: 'lifetime', name: 'Lifetime Member', price: 25000, durationMonths: 9999, description: 'All privileges forever, Priority bookings, VIP events access, Unlimited guests, Transferable' }
]

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

        // Check if user already has an active membership
        const existingMembership = await prisma.user.findFirst({
            where: {
                memberId,
                status: 'Active',
                endDate: { gte: new Date() }
            }
        })

        if (existingMembership) {
            throw new BadRequestError('You already have an active membership')
        }

        // Create membership (Status Pending until payment verified)
        const startDate = new Date()
        const endDate = new Date()
        endDate.setMonth(endDate.getMonth() + plan.durationMonths)

        const membership = await prisma.user.create({
            data: {
                memberId,
                startDate,
                endDate,
                status: 'Pending',
                membershipFee: plan.price,
                membershipType: plan.id
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
            where: { memberId: req.user.id },
            orderBy: { startDate: 'desc' },
            include: {
                payments: true
            }
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
        const { id } = req.params
        const { status } = req.body

        if (!['Active', 'Expired', 'Cancelled', 'Pending'].includes(status)) {
            throw new BadRequestError('Invalid status')
        }

        const membership = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { status },
            include: { member: true }
        })

        if (status === 'Active') {
            await prisma.member.update({
                where: { id: membership.memberId },
                data: { status: 'Active' }
            })

            // Send confirmation email
            const { sendMembershipApprovedEmail } = require("../services/emailService")
            // Fetch member details (email) if not already loaded fully (it is loaded partially in include: { member: true })
            // The include { member: true } in line 131 fetches the member object.
            if (membership.member && membership.member.email) {
                // Run in background, don't await blocking response
                sendMembershipApprovedEmail(membership.member).catch(err => console.error("Failed to send approval email", err))
            }
        }

        res.json({
            message: `Membership status updated to ${status}`,
            membership
        })
    } catch (error) {
        if (error.code === 'P2025') {
            next(new NotFoundError('Membership not found'))
        } else {
            next(error)
        }
    }
})

// POST /api/membership/upgrade-request - Request membership upgrade
router.post("/upgrade-request", authenticate, validate(upgradeSchema), async (req, res, next) => {
    try {
        const { newPlanId, reason } = req.validatedData
        const memberId = req.user.id

        // Get current active membership
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

        if (currentMembership.type === newPlanId) {
            throw new BadRequestError('You are already on this plan')
        }

        // Check if there is already a pending request
        const existingRequest = await prisma.membershipUpgradeRequest.findFirst({
            where: {
                memberId,
                status: 'Pending'
            }
        })

        if (existingRequest) {
            throw new BadRequestError('You already have a pending upgrade request')
        }

        const request = await prisma.membershipUpgradeRequest.create({
            data: {
                memberId,
                oldPlanId: currentMembership.type,
                newPlanId,
                status: 'Pending',
                // reason // If schema supported reason, but we didn't add it to DB. We can add 'adminComment' later if needed.
                // For now, simple request.
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

// GET /api/membership/upgrade-requests - List all upgrade requests (Admin only)
router.get("/upgrade-requests", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const requests = await prisma.membershipUpgradeRequest.findMany({
            include: {
                member: {
                    select: { id: true, fullName: true, email: true, membershipRequests: false } // Select specific fields
                }
            },
            orderBy: { requestDate: 'desc' }
        })
        res.json(requests)
    } catch (error) {
        next(error)
    }
})

// PUT /api/membership/upgrade-requests/:id/approve - Approve upgrade (Admin only)
router.put("/upgrade-requests/:id/approve", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { id } = req.params
        const { status } = req.body // Approved, Rejected

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

        // Transaction to update request and membership
        const result = await prisma.$transaction(async (tx) => {
            // Update request status
            const updatedRequest = await tx.membershipUpgradeRequest.update({
                where: { id: request.id },
                data: { status }
            })

            if (status === 'Approved') {
                // Deactivate old membership (optional, or just create new one superseding it)
                // Strategy: End current membership NOW, start new one NOW.

                await tx.user.updateMany({
                    where: {
                        memberId: request.memberId,
                        status: 'Active'
                    },
                    data: {
                        status: 'Upgraded', // Or Expired/Cancelled
                        endDate: new Date()
                    }
                })

                // Create new membership
                const plan = MEMBERSHIP_PLANS.find(p => p.id === request.newPlanId)
                if (!plan) throw new Error('Plan not found config error')

                const endDate = new Date()
                if (plan.id === 'lifetime') {
                    endDate.setFullYear(endDate.getFullYear() + 100)
                } else {
                    endDate.setFullYear(endDate.getFullYear() + 1)
                }

                await tx.user.create({
                    data: {
                        memberId: request.memberId,
                        startDate: new Date(),
                        endDate,
                        status: 'Active', // Auto-active for upgrade? Or Pending Payment?
                        // User requirement: "admin approves... change the stored one in db". Implies immediate effect.
                        membershipFee: plan.price,
                        membershipType: request.newPlanId
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

module.exports = router
