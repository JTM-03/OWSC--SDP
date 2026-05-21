const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function executeMigration() {
    try {
        console.log("Reading SQL migration file...");
        const sqlPath = path.join(__dirname, "prisma/migrations/manual_add_receipt_urls.sql");
        const sql = fs.readFileSync(sqlPath, "utf-8");

        console.log("Executing SQL migration...");
        // Split by semicolon and execute each statement
        const statements = sql.split(";").filter(stmt => stmt.trim() && !stmt.trim().startsWith("--"));
        
        for (const statement of statements) {
            if (statement.trim()) {
                console.log(`Executing: ${statement.substring(0, 50)}...`);
                await prisma.$executeRawUnsafe(statement);
            }
        }

        console.log("✓ Migration completed successfully!");
        
        // Verify columns were added
        console.log("\nVerifying columns...");
        const membershipCheck = await prisma.$queryRawUnsafe(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'MembershipPayment' AND column_name = 'ReceiptUrl'`
        );
        const orderCheck = await prisma.$queryRawUnsafe(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'OrderPayment' AND column_name = 'ReceiptUrl'`
        );
        const bookingCheck = await prisma.$queryRawUnsafe(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'BookingPayment' AND column_name = 'ReceiptUrl'`
        );

        console.log("MembershipPayment.ReceiptUrl:", membershipCheck.length > 0 ? "✓ EXISTS" : "✗ MISSING");
        console.log("OrderPayment.ReceiptUrl:", orderCheck.length > 0 ? "✓ EXISTS" : "✗ MISSING");
        console.log("BookingPayment.ReceiptUrl:", bookingCheck.length > 0 ? "✓ EXISTS" : "✗ MISSING");

        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

executeMigration();
