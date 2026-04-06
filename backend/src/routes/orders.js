const express = require("express")
const prisma = require("../lib/prisma")
const { validate } = require("../middleware/validate")
const { orderSchema } = require("../validation/schemas")
const { authenticate, requireRole } = require("../middleware/auth")
const { NotFoundError, BadRequestError } = require("../utils/errors")
const { isRestrictedDate } = require("../utils/dateRestriction")

const router = express.Router()

// GET /api/orders - List all orders (Staff/Admin only)
router.get("/", authenticate, requireRole('admin', 'staff'), async (req, res, next) => {
    try {
        const orders = await prisma.order.findMany({
            include: {
                member: {
                    select: { id: true, fullName: true, email: true }
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

        const { orderType, items } = req.validatedData
        const memberId = req.user.id

        // Calculate total amount and verify items
        let totalAmount = 0
        const orderItemsData = []

        for (const item of items) {
            const menuItem = await prisma.menuItem.findUnique({
                where: { id: item.menuItemId }
            })

            if (!menuItem) {
                throw new NotFoundError(`Menu item with ID ${item.menuItemId} not found`)
            }

            if (menuItem.availabilityStatus === 'Unavailable') {
                throw new BadRequestError(`Menu item ${menuItem.name} is currently unavailable`)
            }

            const itemTotal = menuItem.price * item.quantity
            totalAmount += itemTotal

            orderItemsData.push({
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                unitPrice: menuItem.price
            })
        }

        // Create order with transactions
        const order = await prisma.$transaction(async (tx) => {
            const newOrder = await tx.order.create({
                data: {
                    memberId,
                    orderType,
                    totalAmount,
                    orderStatus: 'Pending',
                    orderItems: {
                        create: orderItemsData
                    }
                },
                include: {
                    orderItems: {
                        include: { menuItem: true }
                    }
                }
            })
            return newOrder
        })

        res.status(201).json({
            message: 'Order placed successfully',
            order
        })
    } catch (error) {
        next(error)
    }
})

// PUT /api/orders/:id/status - Update order status (Staff/Admin only)
router.put("/:id/status", authenticate, requireRole('admin', 'staff'), async (req, res, next) => {
    try {
        const { id } = req.params
        const { status } = req.body

        if (!status) {
            throw new BadRequestError('Status is required')
        }

        const order = await prisma.order.update({
            where: { id: parseInt(id) },
            data: { orderStatus: status },
            include: {
                orderItems: {
                    include: { menuItem: true }
                }
            }
        })

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
