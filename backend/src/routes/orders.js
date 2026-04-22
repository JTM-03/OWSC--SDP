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

        const { orderType, items, serviceFee, paymentMethod, tableNumber, checkoutId } = req.validatedData
        const memberId = req.user.id
        const isStaff = req.user.role === 'staff' || req.user.role === 'admin'

        // ── LAYER 1: IDEMPOTENCY — Network drop / double-tap protection ──────
        // If the same checkoutId arrives twice (Wi-Fi retry, double-tap), return
        // the already-created order instead of charging again.
        if (checkoutId) {
            const existingOrder = await prisma.order.findUnique({
                where: { checkoutId },
                include: {
                    orderItems: { include: { menuItem: true } },
                    staff:  { select: { id: true, fullName: true, username: true } },
                    member: { select: { id: true, fullName: true, email: true } }
                }
            });
            if (existingOrder) {
                return res.status(200).json({
                    message: 'Order already processed safely.',
                    order: existingOrder
                });
            }
        }

        // ── Rule: Active membership required (members only — staff bypass) ───
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

        if (!isStaff) {
            const hasActiveMembership = member.memberships.length > 0;
            if (!hasActiveMembership) {
                throw new BadRequestError(
                    'Your membership is not active. Please renew your membership before placing orders.'
                );
            }
        }

        // ── Validate menu items and build order data ──────────────────────────
        let subtotalAmount = 0;
        const orderItemsData = [];

        for (const item of items) {
            const menuItem = await prisma.menuItem.findUnique({
                where: { id: item.menuItemId }
            });

            if (!menuItem) throw new NotFoundError(`Menu item with ID ${item.menuItemId} not found`);
            if (menuItem.availabilityStatus === 'Unavailable') {
                throw new BadRequestError(`"${menuItem.name}" is currently unavailable`);
            }

            const maxAllowed = menuItem.maxPerOrder ?? 20;
            if (item.quantity > maxAllowed) {
                throw new BadRequestError(
                    `Maximum ${maxAllowed} units allowed per order for "${menuItem.name}".`
                );
            }

            subtotalAmount += Number(menuItem.price) * item.quantity;
            orderItemsData.push({
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                unitPrice: menuItem.price
            });
        }

        const serviceFeeAmount = serviceFee ? parseFloat(serviceFee) : subtotalAmount * 0.10;
        const totalAmount = subtotalAmount + serviceFeeAmount;

        // ── Cash eligibility (members only) ──────────────────────────────────
        const CASH_ORDER_CAP = 5000;
        if (!isStaff && paymentMethod === 'cash') {
            if (totalAmount > CASH_ORDER_CAP) {
                throw new BadRequestError(
                    `Cash payment is only available for orders under Rs. ${CASH_ORDER_CAP.toLocaleString()}.`
                );
            }
            if (member.noShowCount >= 1) {
                throw new BadRequestError(
                    'Cash payment has been disabled for your account due to a previous unpaid order.'
                );
            }
        }

        // ── Resolve restaurantTableId ─────────────────────────────────────────
        let restaurantTableId = null;
        if (tableNumber) {
            const table = await prisma.restaurantTable.findUnique({
                where: { tableNumber: String(tableNumber) }
            });
            if (table) restaurantTableId = table.id;
        }

        // ── LAYER 2 + 3 + 4: Hybrid inventory check inside atomic transaction ─
        //
        // LAYER 2 (Hybrid): STRICT items block the order if out of stock.
        //                   BULK items allow negative stock (reconcile end-of-day).
        // LAYER 3 (Atomic): Prisma uses { decrement } so PostgreSQL does the math,
        //                   preventing two concurrent requests from reading the same
        //                   stale value and both thinking stock is available.
        // LAYER 4 (Anti-deadlock): We sort ingredients by productId before touching
        //                   them so every transaction locks rows in the same order,
        //                   eliminating circular wait deadlocks under high concurrency.

        // Aggregate all ingredients needed across all ordered items
        const ingredientMap = new Map(); // productId → { totalQty, trackType, name }

        for (const item of items) {
            const recipes = await prisma.menuItemIngredient.findMany({
                where: { menuItemId: item.menuItemId },
                include: { inventory: { include: { product: true } } }
            });

            for (const recipe of recipes) {
                const productId = recipe.productId;
                const needed = Number(recipe.quantityPerUnit) * item.quantity;
                if (ingredientMap.has(productId)) {
                    ingredientMap.get(productId).totalQty += needed;
                } else {
                    ingredientMap.set(productId, {
                        totalQty: needed,
                        trackType: recipe.inventory.trackType,
                        name: recipe.inventory.product.productName,
                        currentQty: Number(recipe.inventory.currentQuantity)
                    });
                }
            }
        }

        // LAYER 4: Sort by productId to guarantee consistent lock order
        const requiredIngredients = [...ingredientMap.entries()]
            .map(([productId, data]) => ({ productId, ...data }))
            .sort((a, b) => a.productId - b.productId);

        // LAYER 2: Pre-flight STRICT check (fast fail before entering transaction)
        for (const ing of requiredIngredients) {
            if (ing.trackType === 'STRICT' && ing.currentQty < ing.totalQty) {
                throw new BadRequestError(
                    `Order blocked: "${ing.name}" is out of stock. ` +
                    `Available: ${ing.currentQty}, Required: ${ing.totalQty}.`
                );
            }
        }

        // ── Atomic transaction: inventory decrement + order creation ──────────
        const order = await prisma.$transaction(async (tx) => {

            // LAYER 3 + 4: Decrement each ingredient atomically in sorted order
            for (const ing of requiredIngredients) {
                // Re-read inside transaction for STRICT items to catch race conditions
                if (ing.trackType === 'STRICT') {
                    const live = await tx.inventory.findUnique({
                        where: { productId: ing.productId },
                        select: { currentQuantity: true }
                    });
                    if (!live || Number(live.currentQuantity) < ing.totalQty) {
                        throw new BadRequestError(
                            `Order blocked: "${ing.name}" just ran out of stock. Please try again.`
                        );
                    }
                }

                // Atomic decrement — PostgreSQL does the math, not Node.js
                await tx.inventory.update({
                    where: { productId: ing.productId },
                    data: { currentQuantity: { decrement: ing.totalQty } }
                });

                // Record the stock movement for audit trail
                await tx.stockMovement.create({
                    data: {
                        productId: ing.productId,
                        movementType: 'OUT',
                        quantity: ing.totalQty,
                        referenceType: 'Order',
                        referenceId: 0, // will be updated after order creation if needed
                        reason: `Consumed by ${orderType} order`
                    }
                });
            }

            // Create the order with the idempotency key
            const newOrder = await tx.order.create({
                data: {
                    checkoutId: checkoutId || null,
                    memberId,
                    staffId: isStaff ? memberId : null,
                    restaurantTableId,
                    orderType,
                    subtotalAmount,
                    serviceFee: serviceFeeAmount,
                    totalAmount,
                    orderStatus: 'Pending',
                    orderItems: { create: orderItemsData }
                },
                include: {
                    orderItems: { include: { menuItem: true } },
                    staff:  { select: { id: true, fullName: true, username: true } },
                    member: { select: { id: true, fullName: true, email: true } }
                }
            });

            return newOrder;
        });

        notifyNewOrder(order);

        res.status(201).json({ message: 'Order placed successfully', order });
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

        // ── Notify member of status change ───────────────────────────────────
        const { notifyUser } = require("../services/socketService");
        const { sendNotification } = require("../services/notificationService");
        const { sendOrderStatusEmail } = require("../services/emailService");

        const statusMessages = {
            'Preparing': 'Your order is now being prepared by the kitchen.',
            'Ready':     'Your order is ready! Please collect it or wait for service.',
            'Completed': 'Your order has been completed. Thank you!',
            'Cancelled': 'Your order has been cancelled.'
        };
        const statusMsg = statusMessages[status] || `Your order status has been updated to ${status}.`;

        // DB notification
        await sendNotification(
            order.memberId,
            `Order #${order.id} — ${status}`,
            statusMsg,
            status === 'Cancelled' ? 'alert' : status === 'Completed' ? 'success' : 'info'
        );

        // Real-time socket push to member's dashboard
        notifyUser(order.memberId, {
            type: 'ORDER_STATUS_UPDATE',
            title: `Order #${order.id} — ${status}`,
            message: statusMsg,
            orderId: order.id,
            orderStatus: status,
            previousStatus
        });

        // Email for meaningful status transitions
        if (['Preparing', 'Ready', 'Completed', 'Cancelled'].includes(status)) {
            const memberRecord = await prisma.member.findUnique({
                where: { id: order.memberId },
                select: { fullName: true, email: true }
            });
            if (memberRecord?.email) {
                sendOrderStatusEmail(memberRecord, order, status, statusMsg)
                    .catch(err => console.error('Order status email failed:', err.message));
            }
        }

        // Emit real-time notification to admin and staff
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
