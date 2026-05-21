require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

console.log('URL:', process.env.DATABASE_URL);

const prisma = new PrismaClient({
    log: ['error', 'warn'],
});

async function main() {
    try {
        console.log('Connecting...');
        const result = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM pg_tables WHERE schemaname = \'public\'');
        console.log('SUCCESS! Tables in public schema:', result[0].count);

        // List all tables
        const tables = await prisma.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
        tables.forEach(t => console.log('  -', t.tablename));

    } catch (error) {
        console.error('Connection failed:', error.message);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

main();
