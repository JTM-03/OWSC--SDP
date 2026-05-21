const prisma = require("../lib/prisma")
const { parsePagination, paginationMeta } = require("../utils/pagination")

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────

/**
 * Return dashboard KPIs, per-day revenue chart data, and low-stock alerts.
 * Supports 'week' (last 7 days) and 'month' (current calendar month) ranges.
 * Revenue is the sum of order payments + booking payments in the period.
 * @route GET /api/admin/stats
 */
exports.getStats = async (req, res, next) => {
    try {
        const { range = 'week' } = req.query
        const startDate = new Date(); startDate.setHours(0, 0, 0, 0)
        // Month range starts from the 1st of the current month; week range goes back 6 days
        if (range === 'month') startDate.setDate(1)
        else startDate.setDate(startDate.getDate() - 6)

        const today = new Date(); today.setHours(0, 0, 0, 0)

        // Aggregate revenue from both payment tables for the selected period
        const orderPayments = await prisma.orderPayment.aggregate({ _sum: { amount: true }, where: { paymentDate: { gte: startDate } } })
        const bookingPayments = await prisma.bookingPayment.aggregate({ _sum: { amount: true }, where: { paymentDate: { gte: startDate } } })
        const totalRevenue = (orderPayments._sum.amount || 0) + (bookingPayments._sum.amount || 0)

        // Count upcoming confirmed bookings and memberships awaiting approval
        const activeBookingsCount = await prisma.venueBooking.count({ where: { bookingStatus: 'Confirmed', bookingDate: { gte: today } } })
        const pendingApprovalsCount = await prisma.user.count({ where: { status: 'Pending' } })

        // Identify inventory items at or below their reorder threshold
        let lowStockItems = [], lowStockCount = 0
        try {
            const allInventory = await prisma.inventory.findMany({ include: { product: true } })
            const lowItems = allInventory.filter(item => parseFloat(item.currentQuantity) <= parseFloat(item.reorderLevel))
            lowStockCount = lowItems.length
            lowStockItems = lowItems.slice(0, 10) // Cap at 10 for the dashboard widget
        } catch (error) { console.error('Error fetching low stock items:', error) }

        const formattedLowStockItems = lowStockItems.map(item => ({
            id: item.productId, name: item.product?.productName || 'Unknown Product',
            quantity: item.currentQuantity, reorderLevel: item.reorderLevel,
            status: item.currentQuantity === 0 ? 'Out of Stock' : 'Low Stock'
        }))

        // Build per-day revenue data points for the chart
        const daysToShow = range === 'month' ? 30 : 7
        const chartData = []
        for (let i = daysToShow - 1; i >= 0; i--) {
            const date = new Date(); date.setDate(date.getDate() - i); date.setHours(0, 0, 0, 0)
            const nextDate = new Date(date); nextDate.setDate(nextDate.getDate() + 1)
            const dayRev = await prisma.orderPayment.aggregate({ _sum: { amount: true }, where: { paymentDate: { gte: date, lt: nextDate } } })
            const dayBookingRev = await prisma.bookingPayment.aggregate({ _sum: { amount: true }, where: { paymentDate: { gte: date, lt: nextDate } } })
            chartData.push({ day: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }), revenue: (dayRev._sum.amount || 0) + (dayBookingRev._sum.amount || 0) })
        }

        res.json({ kpis: { revenue: totalRevenue, activeBookings: activeBookingsCount, pendingApprovals: pendingApprovalsCount, lowStock: lowStockCount }, revenueData: chartData, lowStockItems: formattedLowStockItems })
    } catch (error) { next(error) }
}

// ─── Member Management ────────────────────────────────────────────────────────

/**
 * Return paginated list of membership applications with status 'Pending'.
 * Includes the associated member's personal details and payment slip URL.
 * @route GET /api/admin/memberships/pending
 */
exports.getPendingMemberships = async (req, res, next) => {
    try {
        const { skip, take, page, limit } = parsePagination(req.query)
        const [memberships, total] = await Promise.all([
            prisma.user.findMany({
                where: { status: 'Pending' },
                include: { member: { select: { id: true, fullName: true, email: true, phone: true, nic: true, address: true, emergencyContact: true, emergencyPhone: true, registrationDate: true, paymentSlipUrl: true } } },
                skip, take
            }),
            prisma.user.count({ where: { status: 'Pending' } })
        ])
        res.json({ data: memberships, meta: paginationMeta(total, page, limit) })
    } catch (error) { next(error) }
}

/**
 * Return paginated list of all members, with optional name/email search.
 * Includes each member's most recent membership and payment record.
 * @route GET /api/admin/members
 */
exports.getMembers = async (req, res, next) => {
    try {
        const { skip, take, page, limit } = parsePagination(req.query)
        const { search } = req.query
        const where = { role: 'member', ...(search && { OR: [{ fullName: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }) }

        const [members, total] = await Promise.all([
            prisma.member.findMany({
                where,
                include: { memberships: { orderBy: { startDate: 'desc' }, take: 1, include: { payments: { orderBy: { paymentDate: 'desc' }, take: 1, select: { id: true, amount: true, paymentMethod: true, paymentStatus: true, paymentDate: true, receiptUrl: true } } } } },
                skip, take
            }),
            prisma.member.count({ where })
        ])
        res.json({ data: members, meta: paginationMeta(total, page, limit) })
    } catch (error) { next(error) }
}

/**
 * Update a member's account status (e.g. Active, Suspended, Inactive).
 * @route PUT /api/admin/members/:id/status
 */
exports.updateMemberStatus = async (req, res, next) => {
    try {
        const { id } = req.params
        const { status } = req.body
        const member = await prisma.member.update({ where: { id: parseInt(id) }, data: { status } })
        res.json(member)
    } catch (error) { next(error) }
}

// ─── Membership Upgrade Requests ──────────────────────────────────────────────

/**
 * Return paginated list of all membership upgrade requests.
 * @route GET /api/admin/upgrade-requests
 */
exports.getUpgradeRequests = async (req, res, next) => {
    try {
        const { skip, take, page, limit } = parsePagination(req.query)
        const [requests, total] = await Promise.all([
            prisma.membershipUpgradeRequest.findMany({ include: { member: { select: { id: true, fullName: true, email: true, phone: true } } }, orderBy: { requestDate: 'desc' }, skip, take }),
            prisma.membershipUpgradeRequest.count()
        ])
        res.json({ data: requests, meta: paginationMeta(total, page, limit) })
    } catch (error) { next(error) }
}

/**
 * Approve or reject a membership upgrade request.
 * @route PUT /api/admin/upgrade-requests/:id
 */
exports.updateUpgradeRequestStatus = async (req, res, next) => {
    try {
        const { id } = req.params
        const { status } = req.body
        if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ message: "Invalid status" })

        const updatedRequest = await prisma.membershipUpgradeRequest.update({ where: { id: parseInt(id) }, data: { status, processedDate: new Date() } })
        res.json(updatedRequest)
    } catch (error) { next(error) }
}

// ─── CSV & PDF Data Export ────────────────────────────────────────────────────

/**
 * Export data as a downloadable CSV or PDF file.
 * Supported areas: members, bookings, orders, inventory, revenue.
 * Format is controlled by ?format=csv (default) or ?format=pdf
 * @route GET /api/admin/export/:area
 */
exports.exportData = async (req, res, next) => {
    try {
        const { area } = req.params
        const { range = 'week', format = 'csv' } = req.query

        const startDate = new Date(); startDate.setHours(0, 0, 0, 0)
        if (range === 'month') startDate.setDate(1)
        else startDate.setDate(startDate.getDate() - 6)

        // ── Fetch data for the requested area ─────────────────────────────────
        let rows = []
        let headers = []
        let title = ''
        let filename = ''

        switch (area) {
            case 'members': {
                const members = await prisma.member.findMany({ include: { memberships: { orderBy: { startDate: 'desc' }, take: 1 } } })
                title = 'Members Report'
                filename = 'Members_Report'
                headers = ['ID', 'Full Name', 'Email', 'Phone', 'NIC', 'Address', 'Role', 'Status', 'Registration Date', 'Membership Type', 'Membership Status', 'Membership Fee', 'Start Date', 'End Date']
                rows = members.map(m => {
                    const ms = m.memberships?.[0]
                    return [m.id, m.fullName || '', m.email || '', m.phone || '', m.nic || '', m.address || '', m.role || '', m.status || '', m.registrationDate ? new Date(m.registrationDate).toLocaleDateString() : '', ms?.membershipType || '', ms?.status || '', ms?.membershipFee || 0, ms?.startDate ? new Date(ms.startDate).toLocaleDateString() : '', ms?.endDate ? new Date(ms.endDate).toLocaleDateString() : '']
                })
                break
            }
            case 'bookings': {
                const bookings = await prisma.venueBooking.findMany({ include: { member: { select: { fullName: true, email: true, phone: true } }, venue: { select: { name: true, facilities: true, capacity: true } } }, orderBy: { bookingDate: 'desc' } })
                title = 'Venue Bookings Report'
                filename = 'Venue_Bookings_Report'
                headers = ['Booking ID', 'Member Name', 'Member Email', 'Venue', 'Facilities', 'Booking Date', 'Time Slot', 'Status', 'Cancellation Reason']
                rows = bookings.map(b => [b.id, b.member?.fullName || '', b.member?.email || '', b.venue?.name || '', b.venue?.facilities || '', b.bookingDate ? new Date(b.bookingDate).toLocaleDateString() : '', b.timeSlot || '', b.bookingStatus || '', b.cancellationReason || ''])
                break
            }
            case 'orders': {
                const orders = await prisma.order.findMany({ where: { orderDate: { gte: startDate } }, include: { member: { select: { fullName: true, email: true } }, orderItems: { include: { menuItem: true } }, payments: true }, orderBy: { orderDate: 'desc' } })
                title = 'Food Orders Report'
                filename = 'Food_Orders_Report'
                headers = ['Order ID', 'Member Name', 'Order Type', 'Order Date', 'Status', 'Items', 'Total Amount', 'Payment Status']
                rows = orders.map(o => {
                    const itemsList = (o.orderItems || []).map(i => `${i.quantity}x ${i.menuItem?.name || 'Unknown'}`).join('; ')
                    return [o.id, o.member?.fullName || '', o.orderType || '', new Date(o.orderDate).toLocaleString(), o.orderStatus || '', itemsList, o.totalAmount || 0, o.payments?.length > 0 ? 'Paid' : 'Unpaid']
                })
                break
            }
            case 'inventory': {
                const items = await prisma.inventory.findMany({ include: { product: true } })
                title = 'Inventory Report'
                filename = 'Inventory_Report'
                headers = ['Product ID', 'Product Name', 'Category', 'Unit', 'Current Quantity', 'Reorder Level', 'Status']
                rows = items.map(item => {
                    const pct = item.reorderLevel > 0 ? (item.currentQuantity / item.reorderLevel) * 100 : 100
                    const status = pct <= 50 ? 'Critical' : pct <= 100 ? 'Low' : 'Good'
                    return [item.productId, item.product?.productName || '', item.product?.category || '', item.product?.unit || '', item.currentQuantity, item.reorderLevel, status]
                })
                break
            }
            case 'revenue': {
                const daysToShow = range === 'month' ? 30 : 7
                title = 'Revenue Report'
                filename = 'Revenue_Report'
                headers = ['Date', 'Order Revenue', 'Booking Revenue', 'Total Revenue']
                rows = []
                for (let i = daysToShow - 1; i >= 0; i--) {
                    const date = new Date(); date.setDate(date.getDate() - i); date.setHours(0, 0, 0, 0)
                    const nextDate = new Date(date); nextDate.setDate(nextDate.getDate() + 1)
                    const dayOrderRev = await prisma.orderPayment.aggregate({ _sum: { amount: true }, where: { paymentDate: { gte: date, lt: nextDate } } })
                    const dayBookingRev = await prisma.bookingPayment.aggregate({ _sum: { amount: true }, where: { paymentDate: { gte: date, lt: nextDate } } })
                    const orderRev = dayOrderRev._sum.amount || 0
                    const bookingRev = dayBookingRev._sum.amount || 0
                    rows.push([date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }), orderRev, bookingRev, Number(orderRev) + Number(bookingRev)])
                }
                break
            }
            default:
                return res.status(400).json({ error: 'Invalid export area' })
        }

        // ── CSV output ────────────────────────────────────────────────────────
        if (format === 'pdf') {
            const PDFDocument = require('pdfkit')
            const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' })

            res.setHeader('Content-Type', 'application/pdf')
            res.setHeader('Content-Disposition', `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.pdf"`)
            doc.pipe(res)

            // ── Header ────────────────────────────────────────────────────────
            doc.fontSize(18).font('Helvetica-Bold').text('OWSC — Old Wesleyites Sports Club', { align: 'center' })
            doc.fontSize(13).font('Helvetica').text(title, { align: 'center' })
            doc.fontSize(9).fillColor('#666').text(`Generated: ${new Date().toLocaleString()}  |  Range: ${range === 'month' ? 'This Month' : 'This Week'}`, { align: 'center' })
            doc.moveDown(0.5)
            doc.moveTo(40, doc.y).lineTo(800, doc.y).strokeColor('#D4AF37').lineWidth(1.5).stroke()
            doc.moveDown(0.5)

            // ── Table ─────────────────────────────────────────────────────────
            const colCount = headers.length
            const tableWidth = 760
            const colWidth = Math.floor(tableWidth / colCount)
            const rowHeight = 18
            let x = 40
            let y = doc.y

            // Header row
            doc.fillColor('#1a2b3c').rect(x, y, tableWidth, rowHeight).fill()
            doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
            headers.forEach((h, i) => {
                doc.text(String(h), x + i * colWidth + 4, y + 5, { width: colWidth - 8, ellipsis: true })
            })
            y += rowHeight

            // Data rows
            doc.font('Helvetica').fontSize(7.5)
            rows.forEach((row, rowIdx) => {
                // Alternate row shading
                if (rowIdx % 2 === 0) {
                    doc.fillColor('#f5f5f5').rect(x, y, tableWidth, rowHeight).fill()
                }
                doc.fillColor('#222')
                row.forEach((cell, i) => {
                    doc.text(String(cell ?? ''), x + i * colWidth + 4, y + 5, { width: colWidth - 8, ellipsis: true })
                })
                y += rowHeight

                // Page break if needed
                if (y > doc.page.height - 60) {
                    doc.addPage()
                    y = 40
                }
            })

            // ── Footer ────────────────────────────────────────────────────────
            doc.moveTo(40, doc.page.height - 40).lineTo(800, doc.page.height - 40).strokeColor('#D4AF37').lineWidth(0.5).stroke()
            doc.fontSize(7).fillColor('#999').text(`OWSC Confidential — ${rows.length} records`, 40, doc.page.height - 30, { align: 'center', width: tableWidth })

            doc.end()
        } else {
            // ── CSV output ────────────────────────────────────────────────────
            const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`
            let csv = headers.map(escape).join(',') + '\n'
            rows.forEach(row => { csv += row.map(escape).join(',') + '\n' })

            res.setHeader('Content-Type', 'text/csv; charset=utf-8')
            res.setHeader('Content-Disposition', `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.csv"`)
            res.send(csv)
        }
    } catch (error) { next(error) }
}
