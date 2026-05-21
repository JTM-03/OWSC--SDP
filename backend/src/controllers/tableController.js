const prisma = require("../lib/prisma")
const { BadRequestError } = require("../utils/errors")
const { isRestrictedDate } = require("../utils/dateRestriction")

// ─── Table Reservations ───────────────────────────────────────────────────────

/**
 * Book one or more restaurant tables for the authenticated member.
 * Enforces:
 *  - No bookings on restricted dates (Sundays, Poya days)
 *  - No same-day bookings after 10 PM
 *  - Availability check against existing reservations for the date
 * Auto-provisions tables up to the location's maximum capacity if they don't exist yet.
 * Creates one reservation record per requested table.
 * @route POST /api/tables/book
 */
exports.bookTables = async (req, res, next) => {
    try {
        const memberId = req.user.id
        const { location, tableCount, reservationDate, reservationTime } = req.body

        if (!location || !tableCount || !reservationDate || !reservationTime) throw new BadRequestError("Missing required fields")
        if (isRestrictedDate(reservationDate)) throw new BadRequestError("Cannot book tables on Sundays or Poya days.")

        // Cut-off for same-day table bookings is 10 PM
        const now = new Date()
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        const reservationDateStr = reservationDate.split('T')[0]
        if (reservationDateStr === todayStr && now.getHours() >= 22) throw new BadRequestError("Table bookings for today are not accepted after 10:00 PM.")

        const count = parseInt(tableCount)
        if (isNaN(count) || count <= 0) throw new BadRequestError("Invalid table count")

        const normalizedLocation = location === 'Indoor' ? 'Indoor' : 'Outdoor'
        // Maximum table capacity per location
        const maxTables = normalizedLocation === 'Indoor' ? 15 : 20

        const tables = await prisma.restaurantTable.findMany({ where: { location: normalizedLocation } })

        // Lazily create table records up to the location maximum if they don't exist yet
        if (tables.length < maxTables) {
            const newTablesData = []
            for (let i = tables.length + 1; i <= maxTables; i++) {
                newTablesData.push({ tableNumber: `${normalizedLocation.substring(0, 3).toUpperCase()}-${i}`, capacity: 5, location: normalizedLocation, status: "Available" })
            }
            await prisma.restaurantTable.createMany({ data: newTablesData, skipDuplicates: true })
        }

        const allLocationTables = await prisma.restaurantTable.findMany({ where: { location: normalizedLocation } })

        const dateObj = new Date(reservationDate)
        const startOfDay = new Date(dateObj); startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(dateObj); endOfDay.setHours(23, 59, 59, 999)

        // Find all tables already reserved on the requested date (excluding cancellations)
        const existingReservations = await prisma.tableReservation.findMany({
            where: { reservationDate: { gte: startOfDay, lte: endOfDay }, status: { not: 'Cancelled' }, table: { location: normalizedLocation } },
            include: { table: true }
        })

        // Deduplicate reserved table IDs to get the count of locked tables
        const lockedTableIds = [...new Set(existingReservations.map(r => r.tableId))]
        const availableCount = allLocationTables.length - lockedTableIds.length

        if (availableCount < count) {
            throw new BadRequestError(`Not enough tables available for ${new Date(reservationDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}. Only ${availableCount} table${availableCount !== 1 ? 's' : ''} left.`)
        }

        // Pick the first N available tables and build reservation records
        const availableTables = allLocationTables.filter(t => !lockedTableIds.includes(t.id))
        const reservationsToCreate = []
        for (let i = 0; i < count; i++) {
            reservationsToCreate.push({ memberId, tableId: availableTables[i].id, reservationDate: new Date(reservationDate), reservationTime, partySize: 5, status: 'Pending' })
        }

        // Create all reservations in a single transaction
        const created = await prisma.$transaction(reservationsToCreate.map(data => prisma.tableReservation.create({ data })))
        res.status(201).json({ message: "Tables booked successfully", reservations: created })
    } catch (error) { next(error) }
}
