const express = require("express");
const prisma = require("../lib/prisma");
const { authenticate } = require("../middleware/auth");
const { BadRequestError } = require("../utils/errors");
const { isRestrictedDate } = require("../utils/dateRestriction");
const upload = require("../config/upload");

const router = express.Router();

/**
 * @swagger
 * /tables/book:
 *   post:
 *     summary: Book restaurant tables
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [location, tableCount, reservationDate, reservationTime]
 *             properties:
 *               location:        { type: string, enum: [Indoor, Outdoor] }
 *               tableCount:      { type: integer, example: 2 }
 *               reservationDate: { type: string, format: date, example: "2026-05-01" }
 *               reservationTime: { type: string, example: "19:00" }
 *               receipt:         { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Tables booked successfully
 *       400:
 *         description: Not enough tables or restricted date
 */

router.post("/book", authenticate, upload.single('receipt'), async (req, res, next) => {
    try {
        const memberId = req.user.id;
        const { location, tableCount, reservationDate, reservationTime } = req.body;
        
        if (!location || !tableCount || !reservationDate || !reservationTime) {
            throw new BadRequestError("Missing required fields");
        }
        
        if (isRestrictedDate(reservationDate)) {
            throw new BadRequestError("Cannot book tables on Sundays or Poya days.");
        }

        // ── Rule: After 10 PM, no table bookings for today ───────────────────
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const reservationDateStr = reservationDate.split('T')[0]; // handle ISO strings
        if (reservationDateStr === todayStr && now.getHours() >= 22) {
            throw new BadRequestError("Table bookings for today are not accepted after 10:00 PM.");
        }
        
        const count = parseInt(tableCount);
        if (isNaN(count) || count <= 0) {
            throw new BadRequestError("Invalid table count");
        }
        
        // Validate location
        const normalizedLocation = location === 'Indoor' ? 'Indoor' : 'Outdoor';
        
        // Find existing tables
        const tables = await prisma.restaurantTable.findMany({
            where: { location: normalizedLocation }
        });
        
        // Define max constraints based on plan
        const maxTables = normalizedLocation === 'Indoor' ? 15 : 20;
        
        // Auto-seed table slots to support the logic
        if (tables.length < maxTables) {
            const currentCount = tables.length;
            const newTablesData = [];
            for (let i = currentCount + 1; i <= maxTables; i++) {
                newTablesData.push({
                    tableNumber: `${normalizedLocation.substring(0,3).toUpperCase()}-${i}`,
                    capacity: 5,
                    location: normalizedLocation,
                    status: "Available"
                });
            }
            await prisma.restaurantTable.createMany({
                data: newTablesData,
                skipDuplicates: true
            });
        }
        
        const allLocationTables = await prisma.restaurantTable.findMany({
            where: { location: normalizedLocation }
        });
        
        const dateObj = new Date(reservationDate);
        const startOfDay = new Date(dateObj);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateObj);
        endOfDay.setHours(23, 59, 59, 999);
        
        // ── Day-lock: a table booked at ANY time today is unavailable all day ──
        // This prevents double-booking the same physical table across different time slots.
        const existingReservations = await prisma.tableReservation.findMany({
            where: {
                reservationDate: { gte: startOfDay, lte: endOfDay },
                status: { not: 'Cancelled' },
                table: { location: normalizedLocation }
            },
            include: { table: true }
        });
        
        // Count distinct tables already locked today (not just the same time slot)
        const lockedTableIds = [...new Set(existingReservations.map(r => r.tableId))];
        const availableCount = allLocationTables.length - lockedTableIds.length;

        if (availableCount < count) {
            throw new BadRequestError(
                `Not enough tables available for ${new Date(reservationDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}. ` +
                `Only ${availableCount} table${availableCount !== 1 ? 's' : ''} left.`
            );
        }
        
        const availableTables = allLocationTables.filter(t => !lockedTableIds.includes(t.id));
        
        const reservationsToCreate = [];
        for (let i = 0; i < count; i++) {
            reservationsToCreate.push({
                memberId,
                tableId: availableTables[i].id,
                reservationDate: new Date(reservationDate),
                reservationTime,
                partySize: 5, // 5 per table
                status: 'Pending' // the receipt could stand as verification payload
            });
        }
        
        const created = await prisma.$transaction(
            reservationsToCreate.map(data => prisma.tableReservation.create({ data }))
        );
        
        res.status(201).json({
            message: "Tables booked successfully",
            reservations: created
        });
        
    } catch (error) {
        next(error);
    }
});

module.exports = router;
