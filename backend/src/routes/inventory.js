const express = require("express")
const prisma = require("../lib/prisma")
const { authenticate, requireRole } = require("../middleware/auth")
const { NotFoundError, BadRequestError } = require("../utils/errors")

const router = express.Router()

// GET /api/inventory - List all inventory items
router.get("/", authenticate, requireRole('admin', 'staff'), async (req, res, next) => {
    try {
        const inventory = await prisma.inventory.findMany({
            include: {
                product: true
            }
        })
        res.json(inventory)
    } catch (error) {
        next(error)
    }
})

// GET /api/inventory/deliveries - List recent deliveries (Stock Batches)
router.get("/deliveries", authenticate, requireRole('admin', 'staff'), async (req, res, next) => {
    try {
        const deliveries = await prisma.stockBatch.findMany({
            include: {
                product: {
                    select: { productName: true, unit: true }
                },
                supplier: {
                    select: { name: true }
                }
            },
            orderBy: { supplyDate: 'desc' },
            take: 50
        })

        // Transform for frontend
        const formatted = deliveries.map(d => ({
            id: d.id,
            supplier: d.supplier?.name || 'Unknown',
            items: `${d.product.productName} (${d.quantity} ${d.product.unit})`,
            date: new Date(d.supplyDate).toLocaleDateString(),
            status: 'Received', // All recorded batches are received
            invoiceNo: `BATCH-${d.id}`
        }))

        res.json(formatted)
    } catch (error) {
        next(error)
    }
})

// POST /api/inventory/product - Create new inventory item (Product + Initial Stock)
router.post("/product", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { productName, category, unit, reorderLevel, initialQuantity } = req.body

        if (!productName || !category || !unit) {
            throw new BadRequestError('Product name, category, and unit are required')
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Product
            const product = await tx.product.create({
                data: {
                    productName,
                    category,
                    unit
                }
            })

            // 2. Create Inventory Record
            const inventory = await tx.inventory.create({
                data: {
                    productId: product.id,
                    currentQuantity: parseFloat(initialQuantity) || 0,
                    reorderLevel: parseFloat(reorderLevel) || 10
                }
            })

            // 3. Record Initial Stock Batch (Opening Stock)
            if (initialQuantity > 0) {
                await tx.stockBatch.create({
                    data: {
                        productId: product.id,
                        quantity: parseFloat(initialQuantity),
                        supplyDate: new Date(),
                        supplierId: 1 // Default supplier for now
                    }
                })

                // 4. Record Stock Movement
                await tx.stockMovement.create({
                    data: {
                        productId: product.id,
                        movementType: 'IN',
                        quantity: parseFloat(initialQuantity),
                        referenceType: 'Adjustment',
                        referenceId: 0,
                        reason: 'Opening Stock'
                    }
                })
            }

            return inventory
        })

        res.status(201).json({
            message: 'Product created successfully',
            inventory: result
        })
    } catch (error) {
        next(error)
    }
})

// POST /api/inventory/delivery - Record a delivery (increases stock)
router.post("/delivery", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { productId, quantity, supplierId } = req.body

        if (!productId || !quantity) {
            throw new BadRequestError('Product ID and quantity are required')
        }

        const product = await prisma.product.findUnique({ where: { id: parseInt(productId) } })
        if (!product) {
            throw new NotFoundError('Product not found')
        }

        // Use transaction to update inventory and create batch/movement
        const result = await prisma.$transaction(async (tx) => {
            // Update or create inventory
            const inventory = await tx.inventory.upsert({
                where: { productId: product.id },
                update: { currentQuantity: { increment: parseFloat(quantity) } },
                create: { productId: product.id, currentQuantity: parseFloat(quantity), reorderLevel: 10 }
            })

            // Record stock batch
            await tx.stockBatch.create({
                data: {
                    productId: product.id,
                    quantity: parseFloat(quantity),
                    supplyDate: new Date(),
                    supplierId: supplierId || 1 // Default supplier if not provided
                }
            })

            // Record movement
            await tx.stockMovement.create({
                data: {
                    productId: product.id,
                    movementType: 'IN',
                    quantity: parseFloat(quantity),
                    referenceType: 'Delivery',
                    referenceId: 0, // Placeholder
                    movementDate: new Date(),
                    reason: 'Bulk delivery recording'
                }
            })

            return inventory
        })

        res.json({
            message: 'Delivery recorded successfully',
            inventory: result
        })
    } catch (error) {
        next(error)
    }
})

// POST /api/inventory/return - Record a return (decreases stock)
router.post("/return", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { productId, supplierId, quantity, reason } = req.body

        if (!productId || !quantity || !reason || !supplierId) {
            throw new BadRequestError('Product ID, supplier ID, quantity, and reason are required')
        }

        const returnQty = parseFloat(quantity)
        if (returnQty <= 0) throw new BadRequestError('Return quantity must be positive')

        const result = await prisma.$transaction(async (tx) => {
            // 1. Check current inventory
            const inventory = await tx.inventory.findUnique({
                where: { productId: parseInt(productId) }
            })

            if (!inventory || inventory.currentQuantity < returnQty) {
                throw new BadRequestError('Insufficient stock to process return')
            }

            // 2. Find a suitable StockBatch to deduct from
            let batch = await tx.stockBatch.findFirst({
                where: {
                    productId: parseInt(productId),
                    supplierId: parseInt(supplierId)
                },
                orderBy: { supplyDate: 'desc' }
            })

            if (!batch) {
                // Fallback to any recent batch for this product
                batch = await tx.stockBatch.findFirst({
                    where: { productId: parseInt(productId) },
                    orderBy: { supplyDate: 'desc' }
                })
            }

            if (!batch) {
                // If literally no batch exists create a dummy one
                batch = await tx.stockBatch.create({
                    data: {
                        productId: parseInt(productId),
                        supplierId: parseInt(supplierId),
                        quantity: 0,
                        supplyDate: new Date()
                    }
                })
            }

            // 3. Create Return Record
            const returnRecord = await tx.return.create({
                data: {
                    batchId: batch.id,
                    quantity: returnQty,
                    reason: reason,
                    returnDate: new Date(),
                    status: 'Completed'
                }
            })

            // 4. Update Inventory
            const updatedInventory = await tx.inventory.update({
                where: { productId: parseInt(productId) },
                data: { currentQuantity: { decrement: returnQty } }
            })

            // 5. Record Stock Movement
            await tx.stockMovement.create({
                data: {
                    productId: parseInt(productId),
                    movementType: 'OUT',
                    quantity: returnQty,
                    referenceType: 'Return',
                    referenceId: returnRecord.id,
                    reason: `Return to Supplier: ${reason}`
                }
            })

            return { returnRecord, updatedInventory }
        })

        res.status(201).json({
            message: 'Return recorded successfully',
            data: result
        })
    } catch (error) {
        next(error)
    }
})

// GET /api/inventory/returns - List return records
router.get("/returns", authenticate, requireRole('admin', 'staff'), async (req, res, next) => {
    try {
        const returns = await prisma.return.findMany({
            include: {
                batch: {
                    include: {
                        product: { select: { productName: true, unit: true } },
                        supplier: { select: { name: true } }
                    }
                }
            },
            orderBy: { returnDate: 'desc' }
        })

        const formatted = returns.map(r => ({
            id: r.id,
            productName: r.batch?.product?.productName || 'Unknown Product',
            supplierName: r.batch?.supplier?.name || 'Unknown Supplier',
            quantity: r.quantity,
            unit: r.batch?.product?.unit || '',
            reason: r.reason,
            date: new Date(r.returnDate).toLocaleDateString(),
            status: r.status
        }))

        res.json(formatted)
    } catch (error) {
        next(error)
    }
})

module.exports = router
