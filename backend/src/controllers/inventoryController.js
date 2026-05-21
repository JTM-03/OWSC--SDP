const prisma = require("../lib/prisma")
const { NotFoundError, BadRequestError } = require("../utils/errors")
const { parsePagination, paginationMeta } = require("../utils/pagination")

// ─── Inventory Listing ────────────────────────────────────────────────────────

/**
 * Return paginated inventory list with optional search and low-stock filter.
 * Attaches the most recent delivery unit price to each product for cost display.
 * @route GET /api/inventory
 */
exports.listInventory = async (req, res, next) => {
    try {
        const { skip, take, page, limit } = parsePagination(req.query)
        const { search, lowStock } = req.query

        const where = { ...(search && { product: { productName: { contains: search, mode: 'insensitive' } } }) }

        const [inventory, total] = await Promise.all([
            // Include the latest delivery item to surface the current unit cost
            prisma.inventory.findMany({ where, include: { product: { include: { deliveryItems: { orderBy: { id: 'desc' }, take: 1, select: { unitPrice: true } } } } }, skip, take }),
            prisma.inventory.count({ where })
        ])

        // Apply low-stock filter in memory (avoids a complex Prisma where clause)
        const filtered = lowStock === 'true' ? inventory.filter(i => parseFloat(i.currentQuantity) <= parseFloat(i.reorderLevel)) : inventory
        const data = filtered.map(item => ({ ...item, product: { ...item.product, unitCost: parseFloat(item.product.deliveryItems?.[0]?.unitPrice ?? 0) } }))

        res.json({ data, meta: paginationMeta(total, page, limit) })
    } catch (error) { next(error) }
}

/**
 * Return paginated list of stock batch deliveries formatted for the deliveries table.
 * @route GET /api/inventory/deliveries
 */
exports.listDeliveries = async (req, res, next) => {
    try {
        const { skip, take, page, limit } = parsePagination(req.query)
        const [deliveries, total] = await Promise.all([
            prisma.stockBatch.findMany({ include: { product: { select: { productName: true, unit: true } }, supplier: { select: { name: true } } }, orderBy: { supplyDate: 'desc' }, skip, take }),
            prisma.stockBatch.count()
        ])

        // Shape into a flat display format with a synthetic invoice number
        const formatted = deliveries.map(d => ({ id: d.id, supplier: d.supplier?.name || 'Unknown', items: `${d.product.productName} (${d.quantity} ${d.product.unit})`, date: new Date(d.supplyDate).toLocaleDateString(), status: 'Received', invoiceNo: `BATCH-${d.id}` }))
        res.json({ data: formatted, meta: paginationMeta(total, page, limit) })
    } catch (error) { next(error) }
}

/**
 * Return paginated list of stock returns with product and supplier details.
 * @route GET /api/inventory/returns
 */
exports.listReturns = async (req, res, next) => {
    try {
        const { skip, take, page, limit } = parsePagination(req.query)
        const [returns, total] = await Promise.all([
            prisma.return.findMany({ include: { batch: { include: { product: { select: { productName: true, unit: true } }, supplier: { select: { name: true } } } } }, orderBy: { returnDate: 'desc' }, skip, take }),
            prisma.return.count()
        ])

        const formatted = returns.map(r => ({ id: r.id, productName: r.batch?.product?.productName || 'Unknown Product', supplierName: r.batch?.supplier?.name || 'Unknown Supplier', quantity: r.quantity, unit: r.batch?.product?.unit || '', reason: r.reason, date: new Date(r.returnDate).toLocaleDateString(), status: r.status }))
        res.json({ data: formatted, meta: paginationMeta(total, page, limit) })
    } catch (error) { next(error) }
}

// ─── Product & Stock Management ───────────────────────────────────────────────

/**
 * Create a new product and its inventory record.
 * If an initial quantity is provided, also creates a stock batch and an opening-stock movement.
 * Falls back to the first available supplier if the specified one doesn't exist.
 * @route POST /api/inventory/products
 */
exports.createProduct = async (req, res, next) => {
    try {
        const { productName, category, unit, reorderLevel, initialQuantity, supplierId } = req.body
        if (!productName || !category || !unit) throw new BadRequestError('Product name, category, and unit are required')

        const result = await prisma.$transaction(async (tx) => {
            const product = await tx.product.create({ data: { productName, category, unit } })
            const inventory = await tx.inventory.create({ data: { productId: product.id, currentQuantity: parseFloat(initialQuantity) || 0, reorderLevel: parseFloat(reorderLevel) || 10 } })

            if (parseFloat(initialQuantity) > 0) {
                // Resolve supplier: use provided ID, fall back to first supplier in DB
                let resolvedSupplierId = supplierId ? parseInt(supplierId) : null
                if (resolvedSupplierId) {
                    const supplierExists = await tx.supplier.findUnique({ where: { id: resolvedSupplierId }, select: { id: true } })
                    if (!supplierExists) resolvedSupplierId = null
                }
                if (!resolvedSupplierId) {
                    const firstSupplier = await tx.supplier.findFirst({ select: { id: true }, orderBy: { id: 'asc' } })
                    resolvedSupplierId = firstSupplier?.id ?? null
                }
                if (resolvedSupplierId) {
                    await tx.stockBatch.create({ data: { productId: product.id, quantity: parseFloat(initialQuantity), supplyDate: new Date(), supplierId: resolvedSupplierId } })
                }
                // Record the opening stock as an inbound movement for audit trail
                await tx.stockMovement.create({ data: { productId: product.id, movementType: 'IN', quantity: parseFloat(initialQuantity), referenceType: 'Adjustment', referenceId: 0, reason: 'Opening Stock' } })
            }
            return inventory
        })

        res.status(201).json({ message: 'Product created successfully', inventory: result })
    } catch (error) { next(error) }
}

/**
 * Manually adjust stock quantity (delivery IN or usage OUT).
 * Creates a stock batch record for deliveries and always logs a stock movement.
 * Prevents inventory from going negative.
 * @route POST /api/inventory/stock
 */
exports.updateStock = async (req, res, next) => {
    try {
        const { productId, quantity, supplierId, type, reason } = req.body
        if (!productId || !quantity || !type) throw new BadRequestError('Product ID, quantity, and type (delivery/used) are required')

        const product = await prisma.product.findUnique({ where: { id: parseInt(productId) } })
        if (!product) throw new NotFoundError('Product not found')

        const updateQty = parseFloat(quantity)
        if (updateQty <= 0) throw new BadRequestError('Quantity must be positive')

        const result = await prisma.$transaction(async (tx) => {
            const movementType = type === 'delivery' ? 'IN' : 'OUT'
            const inventory = await tx.inventory.upsert({
                where: { productId: product.id },
                update: { currentQuantity: movementType === 'IN' ? { increment: updateQty } : { decrement: updateQty } },
                create: { productId: product.id, currentQuantity: movementType === 'IN' ? updateQty : 0, reorderLevel: 10 }
            })
            // Guard against negative stock after decrement
            if (inventory.currentQuantity < 0) throw new BadRequestError('Insufficient stock for this operation')

            if (movementType === 'IN') {
                const resolvedSupplierId = parseInt(supplierId) || null
                if (resolvedSupplierId) {
                    const supplierExists = await tx.supplier.findUnique({ where: { id: resolvedSupplierId }, select: { id: true } })
                    if (supplierExists) await tx.stockBatch.create({ data: { productId: product.id, quantity: updateQty, supplyDate: new Date(), supplierId: resolvedSupplierId } })
                }
            }

            await tx.stockMovement.create({ data: { productId: product.id, movementType, quantity: updateQty, referenceType: type === 'delivery' ? 'Delivery' : 'Usage', referenceId: 0, movementDate: new Date(), reason: reason || (type === 'delivery' ? 'Stock delivery' : 'Daily usage') } })
            return inventory
        })

        res.json({ message: `Stock ${type === 'delivery' ? 'increased' : 'decreased'} successfully`, inventory: result })
    } catch (error) { next(error) }
}

/**
 * Record a stock return to a supplier.
 * Deducts the returned quantity from inventory and logs an outbound movement.
 * Finds or creates a stock batch to associate the return with.
 * @route POST /api/inventory/returns
 */
exports.recordReturn = async (req, res, next) => {
    try {
        const { productId, supplierId, quantity, reason } = req.body
        if (!productId || !quantity || !reason || !supplierId) throw new BadRequestError('Product ID, supplier ID, quantity, and reason are required')

        const returnQty = parseFloat(quantity)
        if (returnQty <= 0) throw new BadRequestError('Return quantity must be positive')

        const result = await prisma.$transaction(async (tx) => {
            const inventory = await tx.inventory.findUnique({ where: { productId: parseInt(productId) } })
            if (!inventory || inventory.currentQuantity < returnQty) throw new BadRequestError('Insufficient stock to process return')

            // Find the most recent batch from this supplier, or any batch, or create a placeholder
            let batch = await tx.stockBatch.findFirst({ where: { productId: parseInt(productId), supplierId: parseInt(supplierId) }, orderBy: { supplyDate: 'desc' } })
            if (!batch) batch = await tx.stockBatch.findFirst({ where: { productId: parseInt(productId) }, orderBy: { supplyDate: 'desc' } })
            if (!batch) batch = await tx.stockBatch.create({ data: { productId: parseInt(productId), supplierId: parseInt(supplierId), quantity: 0, supplyDate: new Date() } })

            const returnRecord = await tx.return.create({ data: { batchId: batch.id, quantity: returnQty, reason, returnDate: new Date(), status: 'Completed' } })
            const updatedInventory = await tx.inventory.update({ where: { productId: parseInt(productId) }, data: { currentQuantity: { decrement: returnQty } } })
            await tx.stockMovement.create({ data: { productId: parseInt(productId), movementType: 'OUT', quantity: returnQty, referenceType: 'Return', referenceId: returnRecord.id, reason: `Return to Supplier: ${reason}` } })

            return { returnRecord, updatedInventory }
        })

        res.status(201).json({ message: 'Return recorded successfully', data: result })
    } catch (error) { next(error) }
}
