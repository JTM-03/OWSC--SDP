const prisma = require("../lib/prisma")
const { NotFoundError, BadRequestError } = require("../utils/errors")

// ─── Plan Configuration ───────────────────────────────────────────────────────

// Membership plan catalogue with pricing and duration in months
const MEMBERSHIP_PLANS = [
    { id: 'full',      name: 'Full Member',     price: 15000, durationMonths: 12,   description: 'All facilities access, Voting rights, Event bookings, Guest privileges, Priority support' },
    { id: 'associate', name: 'Associate Member', price: 10000, durationMonths: 12,   description: 'Sports facilities, Dining access, Event discounts, Limited guests' },
    { id: 'sport',     name: 'Sport Member',     price: 5000,  durationMonths: 12,   description: 'All sports facilities, Coaching programs, Tournament entry, Basic dining' },
    { id: 'social',    name: 'Social Member',    price: 10000, durationMonths: 12,   description: 'Restaurant & bar, Social events, Lounge access, Special offers' },
    // Lifetime plan uses a 9999-month duration as a proxy for "forever"
    { id: 'lifetime',  name: 'Lifetime Member',  price: 25000, durationMonths: 9999, description: 'All privileges forever, Priority bookings, VIP events access, Unlimited guests, Transferable' }
]

/**
 * Return the list of available membership plans (public).
 * @route GET /api/membership/plans
 */
exports.getPlans = (req, res) => res.json(MEMBERSHIP_PLANS)

// ─── Member Self-Service ──────────────────────────────────────────────────────

/**
 * Submit a new membership application for the authenticated member.
 * Prevents duplicate active memberships.
 * @route POST /api/membership/register
 */
exports.register = async (req, res, next) => {
    try {
        const { planId } = req.body
        const memberId = req.user.id

        const plan = MEMBERSHIP_PLANS.find(p => p.id === planId)
        if (!plan) throw new BadRequestError('Invalid membership plan selected')

        // Block if the member already has a non-expired active membership
        const existingMembership = await prisma.user.findFirst({ where: { memberId, status: 'Active', endDate: { gte: new Date() } } })
        if (existingMembership) throw new BadRequestError('You already have an active membership')

        const startDate = new Date()
        const endDate = new Date()
        endDate.setMonth(endDate.getMonth() + plan.durationMonths)

        const membership = await prisma.user.create({ data: { memberId, startDate, endDate, status: 'Pending', membershipFee: plan.price, membershipType: plan.id } })
        res.status(201).json({ message: 'Membership application submitted successfully', membership })
    } catch (error) { next(error) }
}

/**
 * Return the authenticated member's most recent membership record with payments.
 * @route GET /api/membership/my
 */
exports.getMyMembership = async (req, res, next) => {
    try {
        const membership = await prisma.user.findFirst({ where: { memberId: req.user.id }, orderBy: { startDate: 'desc' }, include: { payments: true } })
        res.json(membership)
    } catch (error) { next(error) }
}

// ─── Admin Membership Management ─────────────────────────────────────────────

/**
 * Return all membership records with member details and payment history (admin only).
 * @route GET /api/membership
 */
exports.getAllMemberships = async (req, res, next) => {
    try {
        const memberships = await prisma.user.findMany({ include: { member: { select: { id: true, fullName: true, email: true } }, payments: true }, orderBy: { startDate: 'desc' } })
        res.json(memberships)
    } catch (error) { next(error) }
}

/**
 * Update a membership's status (admin only).
 * Activating a membership also sets the member's account status to Active
 * and sends an approval email. Cancelling sends a rejection email.
 * @route PUT /api/membership/:id/status
 */
exports.updateMembershipStatus = async (req, res, next) => {
    try {
        const { id } = req.params
        const { status } = req.body

        if (!['Active', 'Expired', 'Cancelled', 'Pending'].includes(status)) throw new BadRequestError('Invalid status')

        const membership = await prisma.user.update({ where: { id: parseInt(id) }, data: { status }, include: { member: true } })

        // Activating a membership unlocks the member's account and notifies them
        if (status === 'Active') {
            await prisma.member.update({ where: { id: membership.memberId }, data: { status: 'Active' } })
            const { sendMembershipApprovedEmail } = require("../services/emailService")
            if (membership.member?.email) sendMembershipApprovedEmail(membership.member).catch(err => console.error("Failed to send approval email:", err.message))
        }

        // Cancelling a membership sends a rejection email with an optional reason
        if (status === 'Cancelled') {
            const { sendMembershipRejectedEmail } = require("../services/emailService")
            if (membership.member?.email) sendMembershipRejectedEmail(membership.member, req.body.reason || null).catch(err => console.error("Failed to send rejection email:", err.message))
        }

        res.json({ message: `Membership status updated to ${status}`, membership })
    } catch (error) {
        if (error.code === 'P2025') next(new NotFoundError('Membership not found'))
        else next(error)
    }
}

// ─── Upgrade Requests ─────────────────────────────────────────────────────────

/**
 * Submit a plan upgrade request for the authenticated member.
 * Requires an existing active membership and blocks duplicate pending requests.
 * @route POST /api/membership/upgrade
 */
exports.requestUpgrade = async (req, res, next) => {
    try {
        const { newPlanId, reason } = req.validatedData
        const memberId = req.user.id

        const currentMembership = await prisma.user.findFirst({ where: { memberId, status: 'Active' }, orderBy: { startDate: 'desc' } })
        if (!currentMembership) throw new BadRequestError('No active membership found to upgrade')
        if (currentMembership.membershipType === newPlanId) throw new BadRequestError('You are already on this plan')

        // Prevent spamming upgrade requests
        const existingRequest = await prisma.membershipUpgradeRequest.findFirst({ where: { memberId, status: 'Pending' } })
        if (existingRequest) throw new BadRequestError('You already have a pending upgrade request')

        const request = await prisma.membershipUpgradeRequest.create({ data: { memberId, oldPlanId: currentMembership.membershipType, newPlanId, status: 'Pending' } })
        res.status(201).json({ message: 'Upgrade request submitted successfully', request })
    } catch (error) { next(error) }
}

/**
 * Return all membership upgrade requests (admin only).
 * @route GET /api/membership/upgrade-requests
 */
exports.getUpgradeRequests = async (req, res, next) => {
    try {
        const requests = await prisma.membershipUpgradeRequest.findMany({ include: { member: { select: { id: true, fullName: true, email: true } } }, orderBy: { requestDate: 'desc' } })
        res.json(requests)
    } catch (error) { next(error) }
}

/**
 * Approve or reject a membership upgrade request (admin only).
 * On approval: expires the current membership and creates a new one for the target plan.
 * The entire operation runs in a transaction to ensure consistency.
 * @route PUT /api/membership/upgrade-requests/:id
 */
exports.approveUpgradeRequest = async (req, res, next) => {
    try {
        const { id } = req.params
        const { status } = req.body

        if (!['Approved', 'Rejected'].includes(status)) throw new BadRequestError('Invalid status')

        const request = await prisma.membershipUpgradeRequest.findUnique({ where: { id: parseInt(id) } })
        if (!request) throw new NotFoundError('Request not found')
        if (request.status !== 'Pending') throw new BadRequestError('Request is already processed')

        const result = await prisma.$transaction(async (tx) => {
            const updatedRequest = await tx.membershipUpgradeRequest.update({ where: { id: request.id }, data: { status } })

            if (status === 'Approved') {
                // Mark the current active membership as Upgraded (not Expired) to preserve history
                await tx.user.updateMany({ where: { memberId: request.memberId, status: 'Active' }, data: { status: 'Upgraded', endDate: new Date() } })

                const plan = MEMBERSHIP_PLANS.find(p => p.id === request.newPlanId)
                if (!plan) throw new Error('Plan not found in config')

                const endDate = new Date()
                // Lifetime memberships get a 100-year end date as a practical "forever"
                if (plan.id === 'lifetime') endDate.setFullYear(endDate.getFullYear() + 100)
                else endDate.setFullYear(endDate.getFullYear() + 1)

                await tx.user.create({ data: { memberId: request.memberId, startDate: new Date(), endDate, status: 'Active', membershipFee: plan.price, membershipType: request.newPlanId } })
            }

            return updatedRequest
        })

        res.json({ message: `Request ${status.toLowerCase()} successfully`, request: result })
    } catch (error) { next(error) }
}

/**
 * Return all members with their most recent membership details (admin view).
 * Shapes the membership data to include a 'type' alias for frontend compatibility.
 * @route GET /api/membership/admin/members
 */
exports.getAdminMembers = async (req, res, next) => {
    try {
        const members = await prisma.member.findMany({
            where: { role: 'member' },
            select: { id: true, fullName: true, email: true, phone: true, status: true, role: true, registrationDate: true, memberships: { orderBy: { startDate: 'desc' }, take: 1, select: { id: true, memberId: true, startDate: true, endDate: true, status: true, membershipFee: true, membershipType: true } } },
            orderBy: { registrationDate: 'desc' }
        })

        // Add a 'type' alias to each membership for frontend compatibility
        const shaped = members.map(m => ({ ...m, memberships: m.memberships.map(ms => ({ ...ms, type: ms.membershipType })) }))
        res.json(shaped)
    } catch (error) { next(error) }
}
