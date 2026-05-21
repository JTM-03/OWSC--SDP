require('dotenv').config();
const prisma = require('./src/lib/prisma');

async function testUsers() {
    try {
        console.log('🔍 Testing users in database...\n');
        
        const users = await prisma.member.findMany({
            select: {
                id: true,
                fullName: true,
                email: true,
                username: true,
                role: true,
                status: true,
                registrationDate: true
            },
            take: 10
        });

        console.log(`Found ${users.length} users:\n`);
        users.forEach(user => {
            console.log(`✓ ID: ${user.id}`);
            console.log(`  Name: ${user.fullName}`);
            console.log(`  Email: ${user.email}`);
            console.log(`  Username: ${user.username}`);
            console.log(`  Role: ${user.role}`);
            console.log(`  Status: ${user.status}`);
            console.log(`  Registered: ${user.registrationDate}\n`);
        });

        // Check for admin users
        const admins = await prisma.member.findMany({
            where: { role: 'admin' },
            select: { id: true, fullName: true, email: true, status: true }
        });

        console.log(`\n👤 Admin users: ${admins.length}`);
        if (admins.length > 0) {
            admins.forEach(admin => {
                console.log(`  - ${admin.fullName} (${admin.email}): ${admin.status}`);
            });
        }

        // Check for active users
        const active = await prisma.member.findMany({
            where: { status: 'Active' },
            select: { id: true, fullName: true, role: true }
        });

        console.log(`\n✅ Active users: ${active.length}`);
        
        // Check for pending users
        const pending = await prisma.member.findMany({
            where: { status: 'Pending' },
            select: { id: true, fullName: true }
        });

        console.log(`⏳ Pending users: ${pending.length}\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testUsers();
