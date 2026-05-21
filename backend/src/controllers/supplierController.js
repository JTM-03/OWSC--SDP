const prisma = require("../lib/prisma")
const { NotFoundError, BadRequestError } = require("../utils/errors")
const { parsePagination, paginationMeta } = require("../utils/pagination")

// ─── Supplier CRUD ────────────────────────────────────────────────────────────

/**
 * Return paginated list of suppliers with optional name search.
 * Includes a deduplicated list of product names supplied by each supplier.
 * @route GET /api/suppliers
 */
exports.listSuppliers = async (req, res, next) => {
    try {
        const { skip, take, page, limit } = parsePagination(req.query)
        const { search } = req.query
        const where = search ? { name: { contains: search, mode: 'insensitive' } } : {}

        const [suppliers, total] = await Promise.all([
            // Use distinct to avoid duplicate product entries per supplier
            prisma.supplier.findMany({ where, include: { stockBatches: { select: { product: { select: { productName: true, unit: true } } }, distinct: ['productId'] } }, skip, take }),
            prisma.supplier.count({ where })
        ])

        // Flatten the nested product names into a simple array for the frontend
        const formatted = suppliers.map(s => ({ ...s, items: s.stockBatches.map(b => b.product.productName) }))
        res.json({ data: formatted, meta: paginationMeta(total, page, limit) })
    } catch (error) { next(error) }
}

/**
 * Create a new supplier (admin only).
 * @route POST /api/suppliers
 */
exports.createSupplier = async (req, res, next) => {
    try {
        const { name, contactPerson, phone, email } = req.validatedData
        const supplier = await prisma.supplier.create({ data: { name, contactPerson, phone, email } })
        res.status(201).json({ message: "Supplier added successfully", supplier })
    } catch (error) { next(error) }
}

/**
 * Update an existing supplier's contact details (admin only).
 * @route PUT /api/suppliers/:id
 */
exports.updateSupplier = async (req, res, next) => {
    try {
        const { id } = req.params
        const { name, contactPerson, phone, email } = req.validatedData
        const supplier = await prisma.supplier.update({ where: { id: parseInt(id) }, data: { name, contactPerson, phone, email } })
        res.json({ message: "Supplier updated successfully", supplier })
    } catch (error) {
        if (error.code === 'P2025') next(new NotFoundError("Supplier not found"))
        else next(error)
    }
}

/**
 * Delete a supplier (admin only).
 * Blocked if the supplier has associated stock batches or deliveries (foreign key constraint).
 * @route DELETE /api/suppliers/:id
 */
exports.deleteSupplier = async (req, res, next) => {
    try {
        await prisma.supplier.delete({ where: { id: parseInt(req.params.id) } })
        res.json({ message: "Supplier deleted successfully" })
    } catch (error) {
        // P2003: foreign key constraint — supplier has linked records
        if (error.code === 'P2003') next(new BadRequestError("Cannot delete supplier with associated records"))
        else if (error.code === 'P2025') next(new NotFoundError("Supplier not found"))
        else next(error)
    }
}
