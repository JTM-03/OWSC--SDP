const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkDatabase() {
    try {
        console.log("Checking database structure...\n");

        // Get all tables
        const tables = await prisma.$queryRawUnsafe(
            `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
        );

        console.log("Available tables:");
        tables.forEach((t) => console.log(`  - ${t.table_name}`));

        // Check MembershipPayment columns
        console.log("\nMembershipPayment columns:");
        const membershipCols = await prisma.$queryRawUnsafe(
            `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'MembershipPayment' ORDER BY column_name`
        );
        membershipCols.forEach((c) => console.log(`  - ${c.column_name}: ${c.data_type}`));

        // Check OrderPayment columns
        console.log("\nOrderPayment columns:");
        const orderCols = await prisma.$queryRawUnsafe(
            `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'OrderPayment' ORDER BY column_name`
        );
        orderCols.forEach((c) => console.log(`  - ${c.column_name}: ${c.data_type}`));

        // Check BookingPayment columns
        console.log("\nBookingPayment columns:");
        const bookingCols = await prisma.$queryRawUnsafe(
            `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'BookingPayment' ORDER BY column_name`
        );
        bookingCols.forEach((c) => console.log(`  - ${c.column_name}: ${c.data_type}`));

        process.exit(0);
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

checkDatabase();
