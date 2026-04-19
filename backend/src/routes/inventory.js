const express = require("express")
const prisma = require("../lib/prisma")
const { authenticate, requireRole } = require("../middleware/auth")
const { NotFoundError, BadRequestError } = require("../utils/errors")
const { parsePagination, paginationMeta } = require("../utils/pagination")

const router = express.Router()

/**
 * @swagger
 * /inventory:
 *   get:
 *     summary: List all inventory items with pagination (Admin/Staff)
 *     tags: [Inventory]
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
 *         description: Filter by product name
 *       - in: query
 *         name: lowStock
 *         schema: { type: boolean }
 *         description: If true, return only low-stock items
 *     responses:
 *       200:
 *         description: Paginated inventory list
 *
 * /inventory/deliveries:
 *   get:
 *     summary: List recent stock deliveries with pagination (Admin/Staff)
 *     tags: [Inventory]
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
 *         description: Paginated deliveries
 *
 * /inventory/returns:
 *   get:
 *     summary: List return records with pagination (Admin/Staff)
 *     tags: [Inventory]
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
 *         description: Paginated returns
 *
 * /inventory/product:
 *   post:
 *     summary: Create a new inventory product (Admin)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productName, category, unit]
 *             properties:
 *               productName:     { type: string }
 *               category:        { type: string }
 *               unit:            { type: string }
 *               reorderLevel:    { type: number }
 *               initialQuantity: { type: number }
 *     responses:
 *       201:
 *         description: Product created
 *
 * /inventory/update:
 *   post:
 *     summary: Record a stock delivery or usage (Admin/Staff)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity, type]
 *             properties:
 *               productId:  { type: integer }
 *               quantity:   { type: number }
 *               supplierId: { type: integer }
 *               type:       { type: string, enum: [delivery, used] }
 *               reason:     { type: string }
 *     responses:
 *       200:
 *         description: Stock updated
 *
 * /inventory/return:
 *   post:
 *     summary: Record a supplier return (Admin)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, supplierId, quantity, reason]
 *             properties:
 *               productId:  { type: integer }
 *               supplierId: { type: integer }
 *               quantity:   { type: number }
 *               reason:     { type: string }
 *     responses:
 *       201:
 *         description: Return recorded
 */

// GET /api/inventory - List all inventory items
router.get("/", authenticate, requireRole('admin', 'staff'), async (req, res, next) => {
    try {
        const { skip, take, page, limit } = parsePagination(req.query)
        const { search, lowStock } = req.query

        const where = {
            ...(search && {
                product: { productName: { contains: search, mode: 'insensitive' } }
            })
        }

        const [inventory, total] = await Promise.all([
            prisma.inventory.findMany({
                where,
                include: {
                    product: {
                        include: {
                            // Get the most recent delivery item to derive unit cost
                            deliveryItems: {
                                orderBy: { id: 'desc' },
                                take: 1,
                                select: { unitPrice: true }
                            }
                        }
                    }
                },
                skip,
                take,
            }),
            prisma.inventory.count({ where })
        ])

        // Optional low-stock filter (done in JS since Prisma can't compare two columns)
        const filtered = lowStock === 'true'
            ? inventory.filter(i => parseFloat(i.currentQuantity) <= parseFloat(i.reorderLevel))
            : inventory

        // Attach unitCost from the latest delivery so the frontend can calculate total value
        const data = filtered.map(item => ({
            ...item,
            product: {
                ...item.product,
                unitCost: parseFloat(item.product.deliveryItems?.[0]?.unitPrice ?? 0)
            }
        }))

        res.json({ data, meta: paginationMeta(total, page, limit) })
    } catch (error) {
        next(error)
    }
})

// GET /api/inventory/deliveries - List recent deliveries (Stock Batches)
router.get("/deliveries", authenticate, requireRole('admin', 'staff'), async (req, res, next) => {
    try {
        const { skip, take, page, limit } = parsePagination(req.query)

        const [deliveries, total] = await Promise.all([
            prisma.stockBatch.findMany({
                include: {
                    product: { select: { productName: true, unit: true } },
                    supplier: { select: { name: true } }
                },
                orderBy: { supplyDate: 'desc' },
                skip,
                take,
            }),
            prisma.stockBatch.count()
        ])

        const formatted = deliveries.map(d => ({
            id: d.id,
            supplier: d.supplier?.name || 'Unknown',
            items: `${d.product.productName} (${d.quantity} ${d.product.unit})`,
            date: new Date(d.supplyDate).toLocaleDateString(),
            status: 'Received',
            invoiceNo: `BATCH-${d.id}`
        }))

        res.json({ data: formatted, meta: paginationMeta(total, page, limit) })
    } catch (error) {
        next(error)
    }
})

// POST /api/inventory/product - Create new inventory item (Product + Initial Stock)
router.post("/product", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { productName, category, unit, reorderLevel, initialQuantity, supplierId } = req.body

        if (!productName || !category || !unit) {
            throw new BadRequestError('Product name, category, and unit are required')
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Product
            const product = await tx.product.create({
                data: { productName, category, unit }
            })

            // 2. Create Inventory Record
            const inventory = await tx.inventory.create({
                data: {
                    productId: product.id,
                    currentQuantity: parseFloat(initialQuantity) || 0,
                    reorderLevel: parseFloat(reorderLevel) || 10
                }
            })

            // 3. Record Initial Stock Batch only if we have a valid supplier
            if (parseFloat(initialQuantity) > 0) {
                // Use the provided supplierId, or fall back to the first available supplier
                let resolvedSupplierId = supplierId ? parseInt(supplierId) : null

                if (resolvedSupplierId) {
                    // Validate the provided supplierId exists
                    const supplierExists = await tx.supplier.findUnique({
                        where: { id: resolvedSupplierId },
                        select: { id: true }
                    })
                    if (!supplierExists) resolvedSupplierId = null
                }

                if (!resolvedSupplierId) {
                    // Fall back to first available supplier
                    const firstSupplier = await tx.supplier.findFirst({
                        select: { id: true },
                        orderBy: { id: 'asc' }
                    })
                    resolvedSupplierId = firstSupplier?.id ?? null
                }

                if (resolvedSupplierId) {
                    await tx.stockBatch.create({
                        data: {
                            productId: product.id,
                            quantity: parseFloat(initialQuantity),
                            supplyDate: new Date(),
                            supplierId: resolvedSupplierId
                        }
                    })
                }

                // 4. Always record the Stock Movement regardless of supplier
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

// POST /api/inventory/update - Record stock update (delivery or usage)
router.post("/update", authenticate, requireRole('admin', 'staff'), async (req, res, next) => {
    try {
        const { productId, quantity, supplierId, type, reason } = req.body

        if (!productId || !quantity || !type) {
            throw new BadRequestError('Product ID, quantity, and type (delivery/used) are required')
        }

        const product = await prisma.product.findUnique({ where: { id: parseInt(productId) } })
        if (!product) {
            throw new NotFoundError('Product not found')
        }

        const updateQty = parseFloat(quantity)
        if (updateQty <= 0) throw new BadRequestError('Quantity must be positive')

        // Use transaction to update inventory and create movement
        const result = await prisma.$transaction(async (tx) => {
            const movementType = type === 'delivery' ? 'IN' : 'OUT'
            
            // 1. Update inventory
            const inventory = await tx.inventory.upsert({
                where: { productId: product.id },
                update: { 
                    currentQuantity: movementType === 'IN' 
                        ? { increment: updateQty } 
                        : { decrement: updateQty } 
                },
                create: { 
                    productId: product.id, 
                    currentQuantity: movementType === 'IN' ? updateQty : 0, 
                    reorderLevel: 10 
                }
            })

            if (inventory.currentQuantity < 0) {
                throw new BadRequestError('Insufficient stock for this operation')
            }

            // 2. Record stock batch (only for deliveries)
            if (movementType === 'IN') {
                const resolvedSupplierId = parseInt(supplierId) || null
                // Only create batch if we have a valid supplier
                if (resolvedSupplierId) {
                    const supplierExists = await tx.supplier.findUnique({ where: { id: resolvedSupplierId }, select: { id: true } })
                    if (supplierExists) {
                        await tx.stockBatch.create({
                            data: {
                                productId: product.id,
                                quantity: updateQty,
                                supplyDate: new Date(),
                                supplierId: resolvedSupplierId
                            }
                        })
                    }
                }
            }

            // 3. Record movement
            await tx.stockMovement.create({
                data: {
                    productId: product.id,
                    movementType: movementType,
                    quantity: updateQty,
                    referenceType: type === 'delivery' ? 'Delivery' : 'Usage',
                    referenceId: 0,
                    movementDate: new Date(),
                    reason: reason || (type === 'delivery' ? 'Stock delivery' : 'Daily usage')
                }
            })

            return inventory
        })

        res.json({
            message: `Stock ${type === 'delivery' ? 'increased' : 'decreased'} successfully`,
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
        const { skip, take, page, limit } = parsePagination(req.query)

        const [returns, total] = await Promise.all([
            prisma.return.findMany({
                include: {
                    batch: {
                        include: {
                            product: { select: { productName: true, unit: true } },
                            supplier: { select: { name: true } }
                        }
                    }
                },
                orderBy: { returnDate: 'desc' },
                skip,
                take,
            }),
            prisma.return.count()
        ])

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

        res.json({ data: formatted, meta: paginationMeta(total, page, limit) })
    } catch (error) {
        next(error)
    }
})

module.exports = router
