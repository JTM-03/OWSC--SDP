const express = require("express")
const prisma = require("../lib/prisma")
const { authenticate, requireRole } = require("../middleware/auth")
const { z } = require('zod')
const { validate } = require("../middleware/validate")
const { NotFoundError, BadRequestError } = require("../utils/errors")

const router = express.Router()

const createDeliverySchema = z.object({
    supplierId: z.number().int(),
    items: z.array(z.object({
        productId: z.number().int(),
        quantity: z.number().positive()
    })).min(1, "At least one item is required")
})

const updateStatusSchema = z.object({
    status: z.enum(['On-Process', 'Completed', 'Cancelled'])
})

// GET /api/deliveries - List all deliveries
router.get("/", authenticate, requireRole('admin', 'staff'), async (req, res, next) => {
    try {
        const deliveries = await prisma.delivery.findMany({
            include: {
                supplier: true,
                deliveryItems: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                deliveryDate: 'desc'
            }
        })
        res.json(deliveries)
    } catch (error) {
        next(error)
    }
})

// POST /api/deliveries - Create new delivery (Order)
router.post("/", authenticate, requireRole('admin', 'staff'), validate(createDeliverySchema), async (req, res, next) => {
    try {
        const { supplierId, items } = req.validatedData

        // Verify supplier exists
        const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
        if (!supplier) throw new NotFoundError("Supplier not found")

        // Create Delivery in Transaction
        const delivery = await prisma.$transaction(async (tx) => {
            const newDelivery = await tx.delivery.create({
                data: {
                    supplierId,
                    deliveryDate: new Date(),
                    deliveryStatus: 'On-Process',
                    deliveryItems: {
                        create: items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity
                        }))
                    }
                },
                include: {
                    deliveryItems: { include: { product: true } },
                    supplier: true
                }
            })
            return newDelivery
        })

        // Simulate Email Sending
        console.log(`[EMAIL SIMULATION] Sending order email to ${supplier.email || 'Supplier'} for Delivery #${delivery.id}`)

        res.status(201).json({
            message: "Order placed and email sent successfully",
            delivery
        })
    } catch (error) {
        next(error)
    }
})

// PUT /api/deliveries/:id/status - Update delivery status
router.put("/:id/status", authenticate, requireRole('admin', 'staff'), validate(updateStatusSchema), async (req, res, next) => {
    try {
        const { id } = req.params
        const { status } = req.validatedData
        const deliveryId = parseInt(id)

        // 1. Check if delivery exists and its current status
        const currentDelivery = await prisma.delivery.findUnique({
            where: { id: deliveryId },
            include: { deliveryItems: true }
        })

        if (!currentDelivery) throw new NotFoundError("Delivery not found")

        // 2. If trying to complete, check if already completed
        if (status === 'Completed' && currentDelivery.deliveryStatus === 'Completed') {
            return res.json({ message: "Delivery is already completed", delivery: currentDelivery })
        }

        // 3. Perform Update in Transaction
        const updatedDelivery = await prisma.$transaction(async (tx) => {
            // Update Delivery Status
            const delivery = await tx.delivery.update({
                where: { id: deliveryId },
                data: { deliveryStatus: status },
                include: { supplier: true, deliveryItems: { include: { product: true } } }
            })

            // If marking as Completed, update inventory stock
            if (status === 'Completed') {
                for (const item of currentDelivery.deliveryItems) {
                    // 1. Update Inventory
                    await tx.inventory.upsert({
                        where: { productId: item.productId },
                        update: { currentQuantity: { increment: item.quantity } },
                        create: {
                            productId: item.productId,
                            currentQuantity: item.quantity,
                            reorderLevel: 10 // Default
                        }
                    })

                    // 2. Create Stock Batch (Crucial for Returns)
                    await tx.stockBatch.create({
                        data: {
                            productId: item.productId,
                            supplierId: currentDelivery.supplierId,
                            quantity: item.quantity,
                            supplyDate: new Date(),
                            // expiryDate: null // Can be added later
                        }
                    })

                    // 3. Record Stock Movement
                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            movementType: 'IN',
                            quantity: item.quantity,
                            referenceType: 'Delivery',
                            referenceId: deliveryId,
                            reason: `Delivery #${deliveryId} received`
                        }
                    })
                }
            }

            return delivery
        })

        res.json({ message: `Delivery status updated to ${status}`, delivery: updatedDelivery })
    } catch (error) {
        if (error.code === 'P2025') next(new NotFoundError("Delivery or Inventory record not found"))
        else next(error)
    }
})

module.exports = router
