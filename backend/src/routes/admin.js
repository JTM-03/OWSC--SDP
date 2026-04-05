const express = require("express")
const prisma = require("../lib/prisma")
const { authenticate, requireRole } = require("../middleware/auth")

const router = express.Router()

// GET /api/admin/stats - Get dashboard statistics
router.get("/stats", authenticate, requireRole('admin', 'staff'), async (req, res, next) => {
    try {
        const { range = 'week' } = req.query

        // Calculate start date based on range
        const startDate = new Date()
        startDate.setHours(0, 0, 0, 0)

        if (range === 'month') {
            startDate.setDate(1) // Start of current month
        } else {
            // Default to week (last 7 days)
            startDate.setDate(startDate.getDate() - 6)
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Revenue for the selected period
        const orderPayments = await prisma.orderPayment.aggregate({
            _sum: { amount: true },
            where: { paymentDate: { gte: startDate } }
        })

        const bookingPayments = await prisma.bookingPayment.aggregate({
            _sum: { amount: true },
            where: { paymentDate: { gte: startDate } }
        })

        const totalRevenue = (orderPayments._sum.amount || 0) + (bookingPayments._sum.amount || 0)

        // Active Bookings (Future bookings)
        const activeBookingsCount = await prisma.venueBooking.count({
            where: {
                bookingStatus: 'Confirmed',
                bookingDate: { gte: today }
            }
        })

        // Pending Approvals (Membership)
        const pendingApprovalsCount = await prisma.user.count({
            where: { status: 'Pending' }
        })

        // Low Stock Items
        let lowStockItems = []
        let lowStockCount = 0

        try {
            const items = await prisma.inventory.findMany({
                where: {
                    currentQuantity: { lt: prisma.inventory.fields.reorderLevel }
                },
                include: { product: true },
                take: 10
            })

            lowStockItems = items
            lowStockCount = await prisma.inventory.count({
                where: {
                    currentQuantity: { lt: prisma.inventory.fields.reorderLevel }
                }
            })
        } catch (error) {
            console.error('Error fetching low stock items:', error)
        }

        // Format items for the frontend
        const formattedLowStockItems = lowStockItems.map(item => ({
            id: item.productId,
            name: item.product?.productName || 'Unknown Product',
            quantity: item.currentQuantity,
            reorderLevel: item.reorderLevel,
            status: item.currentQuantity === 0 ? 'Out of Stock' : 'Low Stock'
        }))

        // Revenue Data for Chart (Daily breakdown for the selected range)
        const chartData = []
        // Determine number of days to show
        const daysToShow = range === 'month' ? 30 : 7

        for (let i = daysToShow - 1; i >= 0; i--) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            date.setHours(0, 0, 0, 0)

            const nextDate = new Date(date)
            nextDate.setDate(nextDate.getDate() + 1)

            const dayRev = await prisma.orderPayment.aggregate({
                _sum: { amount: true },
                where: { paymentDate: { gte: date, lt: nextDate } }
            })

            const dayBookingRev = await prisma.bookingPayment.aggregate({
                _sum: { amount: true },
                where: { paymentDate: { gte: date, lt: nextDate } }
            })

            chartData.push({
                day: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                revenue: (dayRev._sum.amount || 0) + (dayBookingRev._sum.amount || 0)
            })
        }

        res.json({
            kpis: {
                revenue: totalRevenue,
                activeBookings: activeBookingsCount,
                pendingApprovals: pendingApprovalsCount,
                lowStock: lowStockCount
            },
            revenueData: chartData,
            lowStockItems: formattedLowStockItems
        })
    } catch (error) {
        next(error)
    }
})

// GET /api/admin/pending-memberships
router.get("/pending-memberships", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const memberships = await prisma.user.findMany({
            where: { status: 'Pending' },
            include: {
                member: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phone: true,
                        nic: true,
                        address: true,
                        emergencyContact: true,
                        emergencyPhone: true,
                        registrationDate: true,
                        paymentSlipUrl: true
                    }
                }
            }
        })
        res.json(memberships)
    } catch (error) {
        next(error)
    }
})

// GET /api/admin/members - List all members
router.get("/members", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const members = await prisma.member.findMany({
            where: { role: 'member' },
            include: {
                memberships: {
                    orderBy: { startDate: 'desc' },
                    take: 1
                }
            }
        })
        res.json(members)
    } catch (error) {
        next(error)
    }
})

// PUT /api/admin/members/:id/status - Update member account status
router.put("/members/:id/status", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { id } = req.params
        const { status } = req.body

        const member = await prisma.member.update({
            where: { id: parseInt(id) },
            data: { status }
        })

        res.json(member)
    } catch (error) {
        next(error)
    }
})
// GET /api/admin/upgrade-requests - Get all membership upgrade requests
router.get("/upgrade-requests", authenticate, requireRole('admin', 'staff'), async (req, res, next) => {
    try {
        const requests = await prisma.membershipUpgradeRequest.findMany({
            include: {
                member: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phone: true
                    }
                }
            },
            orderBy: { requestDate: 'desc' }
        })
        res.json(requests)
    } catch (error) {
        next(error)
    }
})

// PUT /api/admin/upgrade-requests/:id/status - Approve or Reject an upgrade request
router.put("/upgrade-requests/:id/status", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { id } = req.params
        const { status } = req.body // 'Approved' or 'Rejected'

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ message: "Invalid status" })
        }

        const updatedRequest = await prisma.membershipUpgradeRequest.update({
            where: { id: parseInt(id) },
            data: { 
                status,
                processedDate: new Date()
            }
        })

        // If approved, you might want to automate membership creation here.
        // For now, we'll just update the request status.

        res.json(updatedRequest)
    } catch (error) {
        next(error)
    }
})

module.exports = router
