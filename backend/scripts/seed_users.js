const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function seed() {
    const passwordHashAdmin = await bcrypt.hash('admin123', 10);
    const passwordHashStaff = await bcrypt.hash('staff123', 10);
    const passwordHashMember = await bcrypt.hash('member123', 10);

    // Admin
    await prisma.member.upsert({
        where: { email: 'admin@owsc.lk' },
        update: {},
        create: {
            fullName: 'System Administrator',
            email: 'admin@owsc.lk',
            username: 'admin',
            passwordHash: passwordHashAdmin,
            role: 'admin',
            status: 'Active',
            nic: '200012345678',
            address: 'OWSC Admin Office',
            phone: '0112345678'
        }
    });

    // Staff
    await prisma.member.upsert({
        where: { email: 'staff@owsc.lk' },
        update: {},
        create: {
            fullName: 'Standard Staff',
            email: 'staff@owsc.lk',
            username: 'staff',
            passwordHash: passwordHashStaff,
            role: 'staff',
            status: 'Active',
            nic: '200012345679',
            address: 'OWSC Staff Quarters',
            phone: '0112345679'
        }
    });

    // Member
    await prisma.member.upsert({
        where: { email: 'member@owsc.lk' },
        update: {},
        create: {
            fullName: 'Wesleyite Member',
            email: 'member@owsc.lk',
            username: 'member',
            passwordHash: passwordHashMember,
            role: 'member',
            status: 'Active',
            nic: '200012345680',
            address: 'Colombo 07',
            phone: '0771234567'
        }
    });

    console.log('✅ Default users seeded successfully');
    await prisma.$disconnect();
}

seed().catch(e => {
    console.error(e);
    process.exit(1);
});
