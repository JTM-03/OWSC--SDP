const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Connecting to database...')
        const count = await prisma.member.count()
        console.log(`Successfully connected. Member count: ${count}`)

        // Check if AuditLog table is accessible (since we changed it)
        console.log('Checking AuditLog table...')
        const logCount = await prisma.auditLog.count()
        console.log(`AuditLog count: ${logCount}`)

    } catch (e) {
        console.error('Database Verification Error:', e)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

main()
