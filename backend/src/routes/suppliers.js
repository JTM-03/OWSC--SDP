const express = require("express")
const prisma = require("../lib/prisma")
const { authenticate, requireRole } = require("../middleware/auth")
const { z } = require('zod')
const { validate } = require("../middleware/validate")
const { NotFoundError, BadRequestError } = require("../utils/errors")

const router = express.Router()

// Schema for validation
const supplierSchema = z.object({
    name: z.string().min(1, 'Supplier name is required'),
    contactPerson: z.string().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    email: z.string().email('Invalid email').optional().or(z.literal(''))
})

// GET /api/suppliers - List all suppliers with their supplied items
router.get("/", authenticate, requireRole('admin', 'staff'), async (req, res, next) => {
    try {
        const suppliers = await prisma.supplier.findMany({
            include: {
                stockBatches: {
                    select: {
                        product: {
                            select: {
                                productName: true,
                                unit: true
                            }
                        }
                    },
                    distinct: ['productId'] // Get unique products per supplier
                }
            }
        })

        // Transform data to simpler format
        const formattedSuppliers = suppliers.map(s => ({
            ...s,
            items: s.stockBatches.map(batch => batch.product.productName)
        }))

        res.json(formattedSuppliers)
    } catch (error) {
        next(error)
    }
})

// POST /api/suppliers - Create new supplier
router.post("/", authenticate, requireRole('admin'), validate(supplierSchema), async (req, res, next) => {
    try {
        const { name, contactPerson, phone, email } = req.validatedData
        const supplier = await prisma.supplier.create({
            data: { name, contactPerson, phone, email }
        })
        res.status(201).json({ message: "Supplier added successfully", supplier })
    } catch (error) {
        next(error)
    }
})

// PUT /api/suppliers/:id - Update supplier
router.put("/:id", authenticate, requireRole('admin'), validate(supplierSchema), async (req, res, next) => {
    try {
        const { id } = req.params
        const { name, contactPerson, phone, email } = req.validatedData
        const supplier = await prisma.supplier.update({
            where: { id: parseInt(id) },
            data: { name, contactPerson, phone, email }
        })
        res.json({ message: "Supplier updated successfully", supplier })
    } catch (error) {
        if (error.code === 'P2025') next(new NotFoundError("Supplier not found"))
        else next(error)
    }
})

// DELETE /api/suppliers/:id - Delete supplier
router.delete("/:id", authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { id } = req.params
        // Check relationships (deliveries/stock batches) - Optional: soft delete or block
        // For now, strict delete (will fail if used)
        await prisma.supplier.delete({
            where: { id: parseInt(id) }
        })
        res.json({ message: "Supplier deleted successfully" })
    } catch (error) {
        if (error.code === 'P2003') next(new BadRequestError("Cannot delete supplier with associated records"))
        else if (error.code === 'P2025') next(new NotFoundError("Supplier not found"))
        else next(error)
    }
})

module.exports = router
