const express = require("express")
const prisma = require("../lib/prisma")
const { authenticate, requireRole } = require("../middleware/auth")
const { parsePagination, paginationMeta } = require("../utils/pagination")

const router = express.Router()

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: Get dashboard KPIs and revenue chart (Admin/Staff)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [week, month], default: week }
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *
 * /admin/members:
 *   get:
 *     summary: List all members with pagination (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Filter by name or email
 *     responses:
 *       200:
 *         description: Paginated member list
 *
 * /admin/pending-memberships:
 *   get:
 *     summary: List pending membership applications (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated pending memberships
 *
 * /admin/upgrade-requests:
 *   get:
 *     summary: List membership upgrade requests (Admin/Staff)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated upgrade requests
 *
 * /admin/export/{area}:
 *   get:
 *     summary: Export data as CSV (Admin/Staff)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: area
 *         required: true
 *         schema: { type: string, enum: [members, bookings, orders, inventory, revenue] }
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [week, month], default: week }
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema: { type: string }
 */

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
            // Prisma doesn't support comparing two columns directly,
            // so we fetch all inventory and filter in JS
            const allInventory = await prisma.inventory.findMany({
                include: { product: true }
            })

            const lowItems = allInventory.filter(item => 
                parseFloat(item.currentQuantity) <= parseFloat(item.reorderLevel)
            )

            lowStockCount = lowItems.length
            lowStockItems = lowItems.slice(0, 10)
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
        const { skip, take, page, limit } = parsePagination(req.query)

        const [memberships, total] = await Promise.all([
            prisma.user.findMany({
                where: { status: 'Pending' },
                include: {
                    member: {
                        select: {
                            id: true, fullName: true, email: true, phone: true,
                            nic: true, address: true, emergencyContact: true,
                            emergencyPhone: true, registrationDate: true, paymentSlipUrl: true
                        }
                    }
                },
                skip,
                take,
            }),
            prisma.user.count({ where: { status: 'Pending' } })
        ])

        res.json({ data: memberships, meta: paginationMeta(total, page, limit) })
    } catch (error) {
        next(error)
    }
})

// GET /api/admin/members - List all members
router.get("/members", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { skip, take, page, limit } = parsePagination(req.query)
        const { search } = req.query

        const where = {
            role: 'member',
            ...(search && {
                OR: [
                    { fullName: { contains: search, mode: 'insensitive' } },
                    { email:    { contains: search, mode: 'insensitive' } },
                ]
            })
        }

        const [members, total] = await Promise.all([
            prisma.member.findMany({
                where,
                include: {
                    memberships: {
                        orderBy: { startDate: 'desc' },
                        take: 1,
                        include: {
                            payments: {
                                orderBy: { paymentDate: 'desc' },
                                take: 1,
                                select: { id: true, amount: true, paymentMethod: true, paymentStatus: true, paymentDate: true, receiptUrl: true }
                            }
                        }
                    }
                },
                skip,
                take,
            }),
            prisma.member.count({ where })
        ])

        res.json({ data: members, meta: paginationMeta(total, page, limit) })
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
        const { skip, take, page, limit } = parsePagination(req.query)

        const [requests, total] = await Promise.all([
            prisma.membershipUpgradeRequest.findMany({
                include: {
                    member: { select: { id: true, fullName: true, email: true, phone: true } }
                },
                orderBy: { requestDate: 'desc' },
                skip,
                take,
            }),
            prisma.membershipUpgradeRequest.count()
        ])

        res.json({ data: requests, meta: paginationMeta(total, page, limit) })
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

// ─── CSV Export Routes ────────────────────────────────────────────────
// GET /api/admin/export/:area - Export data as CSV
router.get("/export/:area", authenticate, requireRole('admin', 'staff'), async (req, res, next) => {
    try {
        const { area } = req.params
        const { range = 'week' } = req.query

        const startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        if (range === 'month') {
            startDate.setDate(1)
        } else {
            startDate.setDate(startDate.getDate() - 6)
        }

        let csv = ''
        let filename = ''

        switch (area) {
            case 'members': {
                const members = await prisma.member.findMany({
                    include: {
                        memberships: {
                            orderBy: { startDate: 'desc' },
                            take: 1
                        }
                    }
                })

                csv = 'Member ID,Full Name,Email,Phone,NIC,Address,Role,Status,Registration Date,Membership Type,Membership Status,Membership Fee,Start Date,End Date\n'
                members.forEach(m => {
                    const ms = m.memberships?.[0]
                    csv += `${m.id},"${m.fullName || ''}","${m.email || ''}","${m.phone || ''}","${m.nic || ''}","${(m.address || '').replace(/"/g, '""')}","${m.role || ''}","${m.status || ''}","${m.registrationDate ? new Date(m.registrationDate).toLocaleDateString() : ''}","${ms?.membershipType || ''}","${ms?.status || ''}",${ms?.membershipFee || 0},"${ms?.startDate ? new Date(ms.startDate).toLocaleDateString() : ''}","${ms?.endDate ? new Date(ms.endDate).toLocaleDateString() : ''}"\n`
                })
                filename = 'Members_Report.csv'
                break
            }

            case 'bookings': {
                const bookings = await prisma.venueBooking.findMany({
                    include: {
                        member: { select: { fullName: true, email: true, phone: true } },
                        venue: { select: { name: true, facilities: true, capacity: true } }
                    },
                    orderBy: { bookingDate: 'desc' }
                })

                csv = 'Booking ID,Member Name,Member Email,Venue,Facilities,Booking Date,Time Slot,Status,Cancellation Reason\n'
                bookings.forEach(b => {
                    csv += `${b.id},"${b.member?.fullName || ''}","${b.member?.email || ''}","${b.venue?.name || ''}","${(b.venue?.facilities || '').replace(/"/g, '""')}","${b.bookingDate ? new Date(b.bookingDate).toLocaleDateString() : ''}","${b.timeSlot || ''}","${b.bookingStatus || ''}","${(b.cancellationReason || '').replace(/"/g, '""')}"\n`
                })
                filename = 'Venue_Bookings_Report.csv'
                break
            }

            case 'orders': {
                const orders = await prisma.order.findMany({
                    where: { orderDate: { gte: startDate } },
                    include: {
                        member: { select: { fullName: true, email: true } },
                        orderItems: { include: { menuItem: true } },
                        payments: true
                    },
                    orderBy: { orderDate: 'desc' }
                })

                csv = 'Order ID,Member Name,Order Type,Order Date,Status,Items,Total Amount,Payment Status\n'
                orders.forEach(o => {
                    const itemsList = (o.orderItems || []).map(i => `${i.quantity}x ${i.menuItem?.name || 'Unknown'}`).join('; ')
                    const paymentStatus = o.payments?.length > 0 ? 'Paid' : 'Unpaid'
                    csv += `${o.id},"${o.member?.fullName || ''}","${o.orderType || ''}","${new Date(o.orderDate).toLocaleString()}","${o.orderStatus || ''}","${itemsList}",${o.totalAmount || 0},"${paymentStatus}"\n`
                })
                filename = 'Food_Orders_Report.csv'
                break
            }

            case 'inventory': {
                const items = await prisma.inventory.findMany({
                    include: { product: true }
                })

                csv = 'Product ID,Product Name,Category,Unit,Current Quantity,Reorder Level,Status\n'
                items.forEach(item => {
                    const pct = item.reorderLevel > 0 ? (item.currentQuantity / item.reorderLevel) * 100 : 100
                    let status = 'Good'
                    if (pct <= 50) status = 'Critical'
                    else if (pct <= 100) status = 'Low'
                    csv += `${item.productId},"${item.product?.productName || ''}","${item.product?.category || ''}","${item.product?.unit || ''}",${item.currentQuantity},${item.reorderLevel},"${status}"\n`
                })
                filename = 'Inventory_Report.csv'
                break
            }

            case 'revenue': {
                const daysToShow = range === 'month' ? 30 : 7
                csv = 'Date,Order Revenue,Booking Revenue,Total Revenue\n'

                for (let i = daysToShow - 1; i >= 0; i--) {
                    const date = new Date()
                    date.setDate(date.getDate() - i)
                    date.setHours(0, 0, 0, 0)
                    const nextDate = new Date(date)
                    nextDate.setDate(nextDate.getDate() + 1)

                    const dayOrderRev = await prisma.orderPayment.aggregate({
                        _sum: { amount: true },
                        where: { paymentDate: { gte: date, lt: nextDate } }
                    })
                    const dayBookingRev = await prisma.bookingPayment.aggregate({
                        _sum: { amount: true },
                        where: { paymentDate: { gte: date, lt: nextDate } }
                    })

                    const orderRev = dayOrderRev._sum.amount || 0
                    const bookingRev = dayBookingRev._sum.amount || 0
                    csv += `"${date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}",${orderRev},${bookingRev},${orderRev + bookingRev}\n`
                }
                filename = 'Revenue_Report.csv'
                break
            }

            default:
                return res.status(400).json({ error: 'Invalid export area' })
        }

        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        res.send(csv)
    } catch (error) {
        next(error)
    }
})

module.exports = router

