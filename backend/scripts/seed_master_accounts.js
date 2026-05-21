/**
 * Master Account Seeder
 * Creates one Admin, one Staff, and one Member account for system control.
 * Run: node seed_master_accounts.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const ACCOUNTS = [
    {
        fullName:               'OWSC Administrator',
        email:                  'admin@owsc.lk',
        username:               'owsc_admin',
        password:               'Admin@OWSC2026',
        role:                   'admin',
        nic:                    '200000000001',
        phone:                  '0112345678',
        address:                'OWSC Administration Office, Colombo 07',
        notificationPreference: 'Email',
        status:                 'Active'
    },
    {
        fullName:               'OWSC Staff Officer',
        email:                  'staff@owsc.lk',
        username:               'owsc_staff',
        password:               'Staff@OWSC2026',
        role:                   'staff',
        nic:                    '200000000002',
        phone:                  '0112345679',
        address:                'OWSC Staff Quarters, Colombo 07',
        notificationPreference: 'Email',
        status:                 'Active'
    },
    {
        fullName:               'OWSC Member',
        email:                  'member@owsc.lk',
        username:               'owsc_member',
        password:               'Member@OWSC2026',
        role:                   'member',
        nic:                    '200000000003',
        phone:                  '0771234567',
        address:                'Colombo 07',
        notificationPreference: 'Email',
        status:                 'Active'
    }
];

async function main() {
    console.log('\n🌱 Seeding master accounts...\n');

    for (const account of ACCOUNTS) {
        // Remove any existing account with same email or username (clean slate)
        await prisma.member.deleteMany({
            where: {
                OR: [
                    { email: account.email },
                    { username: account.username }
                ]
            }
        });

        const passwordHash = await bcrypt.hash(account.password, 10);

        const created = await prisma.member.create({
            data: {
                fullName:               account.fullName,
                email:                  account.email,
                username:               account.username,
                passwordHash,
                role:                   account.role,
                nic:                    account.nic,
                phone:                  account.phone,
                address:                account.address,
                notificationPreference: account.notificationPreference,
                status:                 account.status
            },
            select: { id: true, fullName: true, email: true, username: true, role: true }
        });

        console.log(`✅ [${created.role.toUpperCase()}] ${created.fullName}`);
        console.log(`   ID       : ${created.id}`);
        console.log(`   Email    : ${created.email}`);
        console.log(`   Username : ${created.username}`);
        console.log(`   Password : ${account.password}`);
        console.log('');
    }

    console.log('✅ All master accounts created successfully.\n');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e.message);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
