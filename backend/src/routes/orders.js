const express = require("express")
const prisma = require("../lib/prisma")
const { validate } = require("../middleware/validate")
const { orderSchema } = require("../validation/schemas")
const { authenticate, requireRole } = require("../middleware/auth")
const { NotFoundError, BadRequestError } = require("../utils/errors")
const { isRestrictedDate } = require("../utils/dateRestriction")
const { notifyNewOrder, notifyOrderStatusUpdate } = require("../services/socketService")

const router = express.Router()

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: List all orders (Admin/Staff only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of orders (active + last 24h completed)
 *   post:
 *     summary: Place a new food order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderType, items]
 *             properties:
 *               orderType:
 *                 type: string
 *                 enum: [Dine-in, Takeaway]
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     menuItemId: { type: integer, example: 1 }
 *                     quantity:   { type: integer, example: 2 }
 *     responses:
 *       201:
 *         description: Order placed
 *       400:
 *         description: Restricted date or unavailable item
 *
 * /orders/my:
 *   get:
 *     summary: Get current user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's orders
 *
 * /orders/{id}/status:
 *   put:
 *     summary: Update order status (Admin/Staff only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [Pending, Preparing, Ready, Completed, Cancelled] }
 *     responses:
 *       200:
 *         description: Order status updated
 *       404:
 *         description: Order not found
 */

// GET /api/orders - List all orders (Staff/Admin only)
router.get("/", authenticate, requireRole('admin', 'staff'), async (req, res, next) => {
    try {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const orders = await prisma.order.findMany({
            where: {
                OR: [
                    { orderStatus: { notIn: ['Completed', 'Cancelled', 'completed', 'cancelled'] } },
                    { 
                        orderStatus: { in: ['Completed', 'Cancelled', 'completed', 'cancelled'] },
                        orderDate: { gte: twentyFourHoursAgo }
                    }
                ]
            },
            include: {
                member: {
                    select: { id: true, fullName: true, email: true }
                },
                staff: {
                    select: { id: true, fullName: true, username: true }
                },
                orderItems: {
                    include: { menuItem: true }
                },
                payments: true
            },
            orderBy: { orderDate: 'desc' }
        })
        res.json(orders)
    } catch (error) {
        next(error)
    }
})

// GET /api/orders/my - Get current user's orders
router.get("/my", authenticate, async (req, res, next) => {
    try {
        const orders = await prisma.order.findMany({
            where: { memberId: req.user.id },
            include: {
                orderItems: {
                    include: { menuItem: true }
                },
                payments: true
            },
            orderBy: { orderDate: 'desc' }
        })
        res.json(orders)
    } catch (error) {
        next(error)
    }
})

// POST /api/orders - Place a new order
router.post("/", authenticate, validate(orderSchema), async (req, res, next) => {
    try {
        if (isRestrictedDate(new Date())) {
            throw new BadRequestError('Cannot place food orders on Sundays or Poya days.');
        }

        const { orderType, items, serviceFee, paymentMethod } = req.validatedData
        const memberId = req.user.id

        // ── Rule 1: Active membership required ──────────────────────────────
        const member = await prisma.member.findUnique({
            where: { id: memberId },
            select: {
                id: true, fullName: true, email: true,
                status: true, noShowCount: true,
                memberships: {
                    where: { status: 'Active', endDate: { gte: new Date() } },
                    take: 1,
                    select: { id: true }
                }
            }
        });

        if (!member) throw new NotFoundError('Member not found');

        const hasActiveMembership = member.memberships.length > 0;

        if (!hasActiveMembership) {
            throw new BadRequestError(
                'Your membership is not active. Please renew your membership before placing orders.'
            );
        }

        // ── Rule 2: Validate items, quantities, and per-item max limits ──────
        let subtotalAmount = 0;
        const orderItemsData = [];

        for (const item of items) {
            const menuItem = await prisma.menuItem.findUnique({
                where: { id: item.menuItemId }
            });

            if (!menuItem) {
                throw new NotFoundError(`Menu item with ID ${item.menuItemId} not found`);
            }

            if (menuItem.availabilityStatus === 'Unavailable') {
                throw new BadRequestError(`"${menuItem.name}" is currently unavailable`);
            }

            // Hard per-item max (stored on the menu item, default 20)
            const maxAllowed = menuItem.maxPerOrder ?? 20;
            if (item.quantity > maxAllowed) {
                throw new BadRequestError(
                    `Maximum ${maxAllowed} units allowed per order for "${menuItem.name}". ` +
                    `Please split into multiple orders or contact a manager.`
                );
            }

            const itemTotal = Number(menuItem.price) * item.quantity;
            subtotalAmount += itemTotal;

            orderItemsData.push({
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                unitPrice: menuItem.price
            });
        }

        const serviceFeeAmount = serviceFee
            ? parseFloat(serviceFee)
            : subtotalAmount * 0.10;
        const totalAmount = subtotalAmount + serviceFeeAmount;

        // ── Rule 3: Cash-on-grab eligibility ────────────────────────────────
        const CASH_ORDER_CAP = 5000; // Rs. 5,000 hard limit for cash orders

        if (paymentMethod === 'cash') {
            // 3a. Order value cap
            if (totalAmount > CASH_ORDER_CAP) {
                throw new BadRequestError(
                    `Cash payment is only available for orders under Rs. ${CASH_ORDER_CAP.toLocaleString()}. ` +
                    `Please use a digital payment method for this order.`
                );
            }

            // 3b. No-show history — permanently disable cash after 1 no-show
            if (member.noShowCount >= 1) {
                throw new BadRequestError(
                    'Cash payment has been disabled for your account due to a previous unpaid order. ' +
                    'Please use a digital payment method.'
                );
            }
        }

        // ── Create order ─────────────────────────────────────────────────────
        const order = await prisma.$transaction(async (tx) => {
            const newOrder = await tx.order.create({
                data: {
                    memberId,
                    staffId: orderType === 'Dine-in' ? req.user.id : null,
                    orderType,
                    subtotalAmount,
                    serviceFee: serviceFeeAmount,
                    totalAmount,
                    orderStatus: 'Pending',
                    orderItems: {
                        create: orderItemsData
                    }
                },
                include: {
                    orderItems: { include: { menuItem: true } },
                    staff:  { select: { id: true, fullName: true, username: true } },
                    member: { select: { id: true, fullName: true, email: true } }
                }
            });
            return newOrder;
        });

        // Emit real-time notification to admin and staff
        notifyNewOrder(order);

        res.status(201).json({
            message: 'Order placed successfully',
            order
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/orders/:id/status - Update order status (Staff/Admin only)
router.put("/:id/status", authenticate, requireRole('admin', 'staff'), async (req, res, next) => {
    try {
        const { id } = req.params
        const { status } = req.body

        if (!status) {
            throw new BadRequestError('Status is required')
        }

        // Get the current order to know the previous status
        const currentOrder = await prisma.order.findUnique({
            where: { id: parseInt(id) }
        });

        if (!currentOrder) {
            throw new NotFoundError('Order not found');
        }

        const previousStatus = currentOrder.orderStatus;

        const order = await prisma.order.update({
            where: { id: parseInt(id) },
            data: { orderStatus: status },
            include: {
                orderItems: { include: { menuItem: true } },
                member: { select: { id: true, fullName: true, email: true } }
            }
        });

        // ── No-show tracking ─────────────────────────────────────────────────
        // If a Pending order is cancelled by staff, it means the member placed
        // a cash order and didn't show up — increment their no-show counter.
        if (
            status === 'Cancelled' &&
            previousStatus === 'Pending' &&
            order.memberId
        ) {
            await prisma.member.update({
                where: { id: order.memberId },
                data: { noShowCount: { increment: 1 } }
            }).catch(err => console.error('Failed to increment noShowCount:', err.message));
        }

        // Emit real-time notification for status update
        notifyOrderStatusUpdate(order, previousStatus);

        res.json({
            message: 'Order status updated successfully',
            order
        })
    } catch (error) {
        if (error.code === 'P2025') {
            next(new NotFoundError('Order not found'))
        } else {
            next(error)
        }
    }
})

module.exports = router
