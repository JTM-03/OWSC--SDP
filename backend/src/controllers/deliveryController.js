const prisma = require("../lib/prisma")
const { NotFoundError } = require("../utils/errors")
const { parsePagination, paginationMeta } = require("../utils/pagination")

// ─── Delivery Management ──────────────────────────────────────────────────────

/**
 * Return paginated list of deliveries with supplier and item details.
 * Supports optional filtering by delivery status.
 * @route GET /api/deliveries
 */
exports.listDeliveries = async (req, res, next) => {
    try {
        const { skip, take, page, limit } = parsePagination(req.query)
        const { status } = req.query
        const where = status ? { deliveryStatus: status } : {}

        const [deliveries, total] = await Promise.all([
            prisma.delivery.findMany({ where, include: { supplier: true, deliveryItems: { include: { product: true } } }, orderBy: { deliveryDate: 'desc' }, skip, take }),
            prisma.delivery.count({ where })
        ])
        res.json({ data: deliveries, meta: paginationMeta(total, page, limit) })
    } catch (error) { next(error) }
}

/**
 * Create a new delivery order for a supplier.
 * Starts with status 'On-Process' — inventory is only updated when marked Completed.
 * Simulates sending an order email to the supplier (email integration placeholder).
 * @route POST /api/deliveries
 */
exports.createDelivery = async (req, res, next) => {
    try {
        const { supplierId, items } = req.validatedData
        const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
        if (!supplier) throw new NotFoundError("Supplier not found")

        const delivery = await prisma.$transaction(async (tx) => {
            return await tx.delivery.create({
                data: { supplierId, deliveryDate: new Date(), deliveryStatus: 'On-Process', deliveryItems: { create: items.map(item => ({ productId: item.productId, quantity: item.quantity })) } },
                include: { deliveryItems: { include: { product: true } }, supplier: true }
            })
        })

        // TODO: Replace with real email integration via emailService
        console.log(`[EMAIL SIMULATION] Sending order email to ${supplier.email || 'Supplier'} for Delivery #${delivery.id}`)
        res.status(201).json({ message: "Order placed and email sent successfully", delivery })
    } catch (error) { next(error) }
}

/**
 * Update a delivery's status.
 * When marked 'Completed', automatically:
 *  - Increments inventory quantities for each delivered item
 *  - Creates stock batch records for traceability
 *  - Logs inbound stock movements for audit
 * Idempotent: completing an already-completed delivery is a no-op.
 * @route PUT /api/deliveries/:id/status
 */
exports.updateDeliveryStatus = async (req, res, next) => {
    try {
        const { id } = req.params
        const { status } = req.validatedData
        const deliveryId = parseInt(id)

        const currentDelivery = await prisma.delivery.findUnique({ where: { id: deliveryId }, include: { deliveryItems: true } })
        if (!currentDelivery) throw new NotFoundError("Delivery not found")

        // Guard against double-processing a completed delivery
        if (status === 'Completed' && currentDelivery.deliveryStatus === 'Completed') {
            return res.json({ message: "Delivery is already completed", delivery: currentDelivery })
        }

        const updatedDelivery = await prisma.$transaction(async (tx) => {
            const delivery = await tx.delivery.update({ where: { id: deliveryId }, data: { deliveryStatus: status }, include: { supplier: true, deliveryItems: { include: { product: true } } } })

            if (status === 'Completed') {
                // Process each delivered item: update inventory, create batch, log movement
                for (const item of currentDelivery.deliveryItems) {
                    await tx.inventory.upsert({ where: { productId: item.productId }, update: { currentQuantity: { increment: item.quantity } }, create: { productId: item.productId, currentQuantity: item.quantity, reorderLevel: 10 } })
                    await tx.stockBatch.create({ data: { productId: item.productId, supplierId: currentDelivery.supplierId, quantity: item.quantity, supplyDate: new Date() } })
                    await tx.stockMovement.create({ data: { productId: item.productId, movementType: 'IN', quantity: item.quantity, referenceType: 'Delivery', referenceId: deliveryId, reason: `Delivery #${deliveryId} received` } })
                }
            }
            return delivery
        })

        res.json({ message: `Delivery status updated to ${status}`, delivery: updatedDelivery })
    } catch (error) {
        if (error.code === 'P2025') next(new NotFoundError("Delivery or Inventory record not found"))
        else next(error)
    }
}
