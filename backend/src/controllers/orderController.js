const prisma = require("../lib/prisma")
const { NotFoundError, BadRequestError } = require("../utils/errors")
const { isRestrictedDate } = require("../utils/dateRestriction")
const { notifyNewOrder, notifyOrderStatusUpdate } = require("../services/socketService")

// ─── Order Listing ────────────────────────────────────────────────────────────

/**
 * List orders for the kitchen/staff dashboard.
 * Returns all active (non-terminal) orders plus completed/cancelled orders
 * from the last 24 hours so staff can see recent history without clutter.
 * Includes payments so the UI can show payment status and receipt URL.
 * @route GET /api/orders
 */
exports.listOrders = async (req, res, next) => {
    try {
        const twentyFourHoursAgo = new Date()
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

        const orders = await prisma.order.findMany({
            where: {
                OR: [
                    // Always show orders that are still in progress
                    { orderStatus: { notIn: ['Completed', 'Cancelled', 'completed', 'cancelled'] } },
                    // Show terminal orders only if they're within the last 24 hours
                    { orderStatus: { in: ['Completed', 'Cancelled', 'completed', 'cancelled'] }, orderDate: { gte: twentyFourHoursAgo } }
                ]
            },
            include: {
                member: { select: { id: true, fullName: true, email: true } },
                staff: { select: { id: true, fullName: true, username: true } },
                orderItems: { include: { menuItem: true } },
                // Include payments so staff can see payment status and receipt URL
                payments: {
                    orderBy: { paymentDate: 'desc' },
                    take: 1,
                    select: { id: true, amount: true, paymentMethod: true, paymentStatus: true, receiptUrl: true, paymentDate: true }
                }
            },
            orderBy: { orderDate: 'desc' }
        })
        res.json(orders)
    } catch (error) { next(error) }
}

/**
 * Return all orders placed by the authenticated member.
 * @route GET /api/orders/my
 */
exports.getMyOrders = async (req, res, next) => {
    try {
        const orders = await prisma.order.findMany({
            where: { memberId: req.user.id },
            include: { orderItems: { include: { menuItem: true } }, payments: true },
            orderBy: { orderDate: 'desc' }
        })
        res.json(orders)
    } catch (error) { next(error) }
}

// ─── Order Creation ───────────────────────────────────────────────────────────

/**
 * Place a new food/beverage order.
 * Enforces:
 *  - No orders on restricted dates (Sundays, Poya days)
 *  - Active membership required for regular members
 *  - Per-item quantity caps
 *  - Cash payment cap (Rs. 5,000) and no-cash rule for members with unpaid orders
 *  - Inventory availability check (STRICT-tracked items block the order if out of stock)
 * Deducts inventory and records stock movements atomically.
 * Uses checkoutId for idempotency to prevent duplicate orders on retry.
 * @route POST /api/orders
 */
exports.createOrder = async (req, res, next) => {
    try {
        if (isRestrictedDate(new Date())) throw new BadRequestError('Cannot place food orders on Sundays or Poya days.')

        const { orderType, items, serviceFee, paymentMethod, tableNumber, checkoutId } = req.validatedData
        const memberId = req.user.id
        const isStaff = req.user.role === 'staff' || req.user.role === 'admin'

        // Idempotency check: if this checkoutId was already processed, return the existing order
        if (checkoutId) {
            const existingOrder = await prisma.order.findUnique({
                where: { checkoutId },
                include: { orderItems: { include: { menuItem: true } }, staff: { select: { id: true, fullName: true, username: true } }, member: { select: { id: true, fullName: true, email: true } } }
            })
            if (existingOrder) return res.status(200).json({ message: 'Order already processed safely.', order: existingOrder })
        }

        // Fetch member with active membership check
        const member = await prisma.member.findUnique({
            where: { id: memberId },
            select: { id: true, fullName: true, email: true, status: true, noShowCount: true, memberships: { where: { status: 'Active', endDate: { gte: new Date() } }, take: 1, select: { id: true } } }
        })
        if (!member) throw new NotFoundError('Member not found')

        // Staff/admin can order without an active membership; regular members cannot
        if (!isStaff && member.memberships.length === 0) {
            throw new BadRequestError('Your membership is not active. Please renew your membership before placing orders.')
        }

        let subtotalAmount = 0
        const orderItemsData = []

        // Validate each item: existence, availability, and per-order quantity cap
        for (const item of items) {
            const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } })
            if (!menuItem) throw new NotFoundError(`Menu item with ID ${item.menuItemId} not found`)
            if (menuItem.availabilityStatus === 'Unavailable') throw new BadRequestError(`"${menuItem.name}" is currently unavailable`)

            const maxAllowed = menuItem.maxPerOrder ?? 20
            if (item.quantity > maxAllowed) throw new BadRequestError(`Maximum ${maxAllowed} units allowed per order for "${menuItem.name}".`)

            subtotalAmount += Number(menuItem.price) * item.quantity
            orderItemsData.push({ menuItemId: item.menuItemId, quantity: item.quantity, unitPrice: menuItem.price })
        }

        // Service fee is 10% for Dine-in only — Takeaway orders have no service charge
        const serviceFeeAmount = serviceFee
            ? parseFloat(serviceFee)
            : orderType === 'Dine-in' ? subtotalAmount * 0.10 : 0
        const totalAmount = subtotalAmount + serviceFeeAmount

        // Cash payment restrictions for regular members
        const CASH_ORDER_CAP = 5000
        if (!isStaff && paymentMethod === 'cash') {
            if (totalAmount > CASH_ORDER_CAP) throw new BadRequestError(`Cash payment is only available for orders under Rs. ${CASH_ORDER_CAP.toLocaleString()}.`)
            // Members with a previous no-show (unpaid order) lose cash payment privilege
            if (member.noShowCount >= 1) throw new BadRequestError('Cash payment has been disabled for your account due to a previous unpaid order.')
        }

        // Resolve table ID from table number string if provided
        let restaurantTableId = null
        if (tableNumber) {
            const table = await prisma.restaurantTable.findUnique({ where: { tableNumber: String(tableNumber) } })
            if (table) restaurantTableId = table.id
        }

        // Aggregate total ingredient requirements across all order items
        const ingredientMap = new Map()
        for (const item of items) {
            const recipes = await prisma.menuItemIngredient.findMany({
                where: { menuItemId: item.menuItemId },
                include: { inventory: { include: { product: true } } }
            })
            for (const recipe of recipes) {
                const productId = recipe.productId
                const needed = Number(recipe.quantityPerUnit) * item.quantity
                if (ingredientMap.has(productId)) ingredientMap.get(productId).totalQty += needed
                else ingredientMap.set(productId, { totalQty: needed, trackType: recipe.inventory.trackType, name: recipe.inventory.product.productName, currentQty: Number(recipe.inventory.currentQuantity) })
            }
        }

        // Sort for consistent lock ordering to avoid deadlocks in concurrent transactions
        const requiredIngredients = [...ingredientMap.entries()]
            .map(([productId, data]) => ({ productId, ...data }))
            .sort((a, b) => a.productId - b.productId)

        // Pre-flight stock check before entering the transaction (fast fail)
        for (const ing of requiredIngredients) {
            if (ing.trackType === 'STRICT' && ing.currentQty < ing.totalQty) {
                throw new BadRequestError(`Order blocked: "${ing.name}" is out of stock. Available: ${ing.currentQty}, Required: ${ing.totalQty}.`)
            }
        }

        const order = await prisma.$transaction(async (tx) => {
            for (const ing of requiredIngredients) {
                if (ing.trackType === 'STRICT') {
                    // Re-check inside the transaction to guard against race conditions
                    const live = await tx.inventory.findUnique({ where: { productId: ing.productId }, select: { currentQuantity: true } })
                    if (!live || Number(live.currentQuantity) < ing.totalQty) throw new BadRequestError(`Order blocked: "${ing.name}" just ran out of stock. Please try again.`)
                }
                // Deduct consumed ingredients from inventory
                await tx.inventory.update({ where: { productId: ing.productId }, data: { currentQuantity: { decrement: ing.totalQty } } })
                // Record the outbound stock movement for audit/reporting
                await tx.stockMovement.create({ data: { productId: ing.productId, movementType: 'OUT', quantity: ing.totalQty, referenceType: 'Order', referenceId: 0, reason: `Consumed by ${orderType} order` } })
            }

            return await tx.order.create({
                data: { checkoutId: checkoutId || null, memberId, staffId: isStaff ? memberId : null, restaurantTableId, orderType, subtotalAmount, serviceFee: serviceFeeAmount, totalAmount, orderStatus: 'Pending', orderItems: { create: orderItemsData } },
                include: { orderItems: { include: { menuItem: true } }, staff: { select: { id: true, fullName: true, username: true } }, member: { select: { id: true, fullName: true, email: true } } }
            })
        })

        // Broadcast new order to kitchen staff via Socket.io
        notifyNewOrder(order)
        res.status(201).json({ message: 'Order placed successfully', order })
    } catch (error) { next(error) }
}

// ─── Order Status Management ──────────────────────────────────────────────────

/**
 * Update the status of an order (kitchen/staff action).
 * - Increments noShowCount when a Pending order is cancelled (unpaid order penalty)
 * - Sends in-app notification, socket event, and email for key status transitions
 * @route PUT /api/orders/:id/status
 */
exports.updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params
        const { status } = req.body
        if (!status) throw new BadRequestError('Status is required')

        const currentOrder = await prisma.order.findUnique({ where: { id: parseInt(id) } })
        if (!currentOrder) throw new NotFoundError('Order not found')

        const previousStatus = currentOrder.orderStatus

        const order = await prisma.order.update({
            where: { id: parseInt(id) },
            data: { orderStatus: status },
            include: { orderItems: { include: { menuItem: true } }, member: { select: { id: true, fullName: true, email: true } } }
        })

        // Penalise members who had a Pending (unpaid) order cancelled — restricts future cash payments
        if (status === 'Cancelled' && previousStatus === 'Pending' && order.memberId) {
            await prisma.member.update({ where: { id: order.memberId }, data: { noShowCount: { increment: 1 } } })
                .catch(err => console.error('Failed to increment noShowCount:', err.message))
        }

        const { notifyUser } = require("../services/socketService")
        const { sendNotification } = require("../services/notificationService")
        const { sendOrderStatusEmail } = require("../services/emailService")

        // Human-readable status messages for member notifications
        const statusMessages = { 'Preparing': 'Your order is now being prepared by the kitchen.', 'Ready': 'Your order is ready! Please collect it or wait for service.', 'Completed': 'Your order has been completed. Thank you!', 'Cancelled': 'Your order has been cancelled.' }
        const statusMsg = statusMessages[status] || `Your order status has been updated to ${status}.`

        await sendNotification(order.memberId, `Order #${order.id} — ${status}`, statusMsg, status === 'Cancelled' ? 'alert' : status === 'Completed' ? 'success' : 'info')
        notifyUser(order.memberId, { type: 'ORDER_STATUS_UPDATE', title: `Order #${order.id} — ${status}`, message: statusMsg, orderId: order.id, orderStatus: status, previousStatus })

        // Only send emails for meaningful status transitions (not every minor update)
        if (['Preparing', 'Ready', 'Completed', 'Cancelled'].includes(status)) {
            const memberRecord = await prisma.member.findUnique({ where: { id: order.memberId }, select: { fullName: true, email: true } })
            if (memberRecord?.email) sendOrderStatusEmail(memberRecord, order, status, statusMsg).catch(err => console.error('Order status email failed:', err.message))
        }

        // Broadcast status change to all connected staff/admin clients
        notifyOrderStatusUpdate(order, previousStatus)
        res.json({ message: 'Order status updated successfully', order })
    } catch (error) {
        if (error.code === 'P2025') next(new NotFoundError('Order not found'))
        else next(error)
    }
}

// ─── Payment Status Management ────────────────────────────────────────────────

/**
 * Update the payment status of an order (admin/staff only).
 * - 'Paid'   → marks the most recent payment as Completed
 * - 'Unpaid' → marks the most recent payment as Pending
 * If no payment record exists yet (cash order with no receipt), one is created.
 * Sends an in-app notification to the member when marked Paid.
 * @route PUT /api/orders/:id/payment-status
 */
exports.updatePaymentStatus = async (req, res, next) => {
    try {
        const { id } = req.params
        const { paymentStatus } = req.body

        // Only allow toggling between these two states
        if (!['Paid', 'Unpaid'].includes(paymentStatus)) {
            throw new BadRequestError('paymentStatus must be Paid or Unpaid')
        }

        const order = await prisma.order.findUnique({
            where: { id: parseInt(id) },
            include: {
                payments: { orderBy: { paymentDate: 'desc' }, take: 1 }
            }
        })
        if (!order) throw new NotFoundError('Order not found')

        const dbStatus = paymentStatus === 'Paid' ? 'Completed' : 'Pending'

        let payment
        if (order.payments.length > 0) {
            // Update the existing payment record
            payment = await prisma.orderPayment.update({
                where: { id: order.payments[0].id },
                data: { paymentStatus: dbStatus }
            })
        } else {
            // No payment record yet (e.g. cash order) — create one
            payment = await prisma.orderPayment.create({
                data: {
                    orderId: order.id,
                    memberId: order.memberId,
                    amount: order.totalAmount,
                    paymentMethod: 'Cash',
                    paymentStatus: dbStatus,
                    paymentDate: new Date()
                }
            })
        }

        // Notify the member when their payment is confirmed
        if (paymentStatus === 'Paid') {
            const { sendNotification } = require('../services/notificationService')
            await sendNotification(
                order.memberId,
                `Order #${order.id} — Payment Confirmed`,
                `Your payment of Rs. ${Number(order.totalAmount).toLocaleString()} for Order #${order.id} has been confirmed.`,
                'success'
            )
        }

        res.json({ message: `Payment status updated to ${paymentStatus}`, payment })
    } catch (error) { next(error) }
}
