const express = require("express");
const prisma = require("../lib/prisma");
const { authenticate } = require("../middleware/auth");
const { BadRequestError } = require("../utils/errors");
const { isRestrictedDate } = require("../utils/dateRestriction");
const upload = require("../config/upload");

const router = express.Router();

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
        const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0));
        const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999));
        
        // Check for booked tables
        const existingReservations = await prisma.tableReservation.findMany({
            where: {
                reservationDate: { gte: startOfDay, lte: endOfDay },
                reservationTime: reservationTime,
                status: { not: 'Cancelled' },
                table: { location: normalizedLocation }
            },
            include: { table: true }
        });
        
        if (existingReservations.length + count > maxTables) {
            throw new BadRequestError(`Not enough tables available. Only ${maxTables - existingReservations.length} left.`);
        }
        
        const bookedTableIds = existingReservations.map(r => r.tableId);
        const availableTables = allLocationTables.filter(t => !bookedTableIds.includes(t.id));
        
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
