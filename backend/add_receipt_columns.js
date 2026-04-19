const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkBookingPayment() {
    try {
        console.log("Checking BookingPayment columns (full list):");
        const cols = await prisma.$queryRawUnsafe(
            `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'BookingPayment' ORDER BY column_name`
        );
        cols.forEach((c) => console.log(`  - ${c.column_name}: ${c.data_type}`));

        console.log("\nLooking for ReceiptUrl specifically:");
        const receiptUrl = await prisma.$queryRawUnsafe(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'BookingPayment' AND column_name = 'ReceiptUrl'`
        );
        
        if (receiptUrl.length > 0) {
            console.log("✓ ReceiptUrl found in BookingPayment");
        } else {
            console.log("✗ ReceiptUrl NOT found in BookingPayment");
        }

        // Now add the columns with the correct names (ReceiptUrl with capital U)
        console.log("\nAdding ReceiptUrl columns...");
        
        try {
            await prisma.$executeRawUnsafe('ALTER TABLE "MembershipPayment" ADD COLUMN "ReceiptUrl" TEXT');
            console.log("✓ Added ReceiptUrl to MembershipPayment");
        } catch (e) {
            console.log("MembershipPayment ReceiptUrl:", e.message.includes("already exists") ? "✓ Already exists" : e.message);
        }

        try {
            await prisma.$executeRawUnsafe('ALTER TABLE "OrderPayment" ADD COLUMN "ReceiptUrl" TEXT');
            console.log("✓ Added ReceiptUrl to OrderPayment");
        } catch (e) {
            console.log("OrderPayment ReceiptUrl:", e.message.includes("already exists") ? "✓ Already exists" : e.message);
        }

        try {
            await prisma.$executeRawUnsafe('ALTER TABLE "BookingPayment" ADD COLUMN "ReceiptUrl" TEXT');
            console.log("✓ Added ReceiptUrl to BookingPayment");
        } catch (e) {
            console.log("BookingPayment ReceiptUrl:", e.message.includes("already exists") ? "✓ Already exists" : e.message);
        }

        // Verify
        console.log("\nVerifying columns added:");
        const membershipCheck = await prisma.$queryRawUnsafe(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'MembershipPayment' AND column_name = 'ReceiptUrl'`
        );
        console.log("MembershipPayment.ReceiptUrl:", membershipCheck.length > 0 ? "✓ YES" : "✗ NO");

        const orderCheck = await prisma.$queryRawUnsafe(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'OrderPayment' AND column_name = 'ReceiptUrl'`
        );
        console.log("OrderPayment.ReceiptUrl:", orderCheck.length > 0 ? "✓ YES" : "✗ NO");

        const bookingCheck = await prisma.$queryRawUnsafe(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'BookingPayment' AND column_name = 'ReceiptUrl'`
        );
        console.log("BookingPayment.ReceiptUrl:", bookingCheck.length > 0 ? "✓ YES" : "✗ NO");

        process.exit(0);
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

checkBookingPayment();
