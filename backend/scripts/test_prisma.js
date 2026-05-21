const dotenv = require("dotenv");
dotenv.config();

try {
    console.log("URL:", process.env.DATABASE_URL);
    console.log("Requiring Prisma Client...");
    const { PrismaClient } = require('@prisma/client');
    console.log("Instantiating Prisma Client...");

    // Standard 5.x instantiation
    const prisma = new PrismaClient();

    console.log("Connecting...");
    prisma.$connect().then(() => {
        console.log("Connected success!");
        process.exit(0);
    }).catch(e => {
        console.error("Connection failed:", e);
        process.exit(1);
    });
} catch (e) {
    console.error("Immediate crash:", e);
}
