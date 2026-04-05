
const { PrismaClient } = require('./src/lib/prisma');
const prisma = new PrismaClient();

async function main() {
    console.log("Connecting to DB...");
    try {
        const items = await prisma.menuItem.findMany();
        console.log("Found items:", items.length);
        items.forEach(item => {
            console.log(`ID: ${item.id}, Name: ${item.name}, Image: ${item.imageUrl}`);
        });
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
