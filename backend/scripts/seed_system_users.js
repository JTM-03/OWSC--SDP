const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    const users = [
        {
            username: 'admin',
            email: 'admin@system.com',
            role: 'admin',
            fullName: 'System Admin',
            password: 'password123',
            nic: '999999999V',
            phone: '0771234567',
            address: 'Admin HQ'
        },
        {
            username: 'staff',
            email: 'staff@system.com',
            role: 'staff',
            fullName: 'System Staff',
            password: 'password123',
            nic: '888888888V',
            phone: '0777654321',
            address: 'Staff Room'
        },
        {
            username: 'member',
            email: 'member@system.com',
            role: 'member',
            fullName: 'System Member',
            password: 'password123',
            nic: '777777777V',
            phone: '0779876543',
            address: 'Member Lounge'
        }
    ];

    for (const user of users) {
        const existing = await prisma.member.findFirst({
            where: {
                OR: [
                    { username: user.username },
                    { email: user.email }
                ]
            }
        });

        if (!existing) {
            const passwordHash = await bcrypt.hash(user.password, 10);
            await prisma.member.create({
                data: {
                    username: user.username,
                    email: user.email,
                    passwordHash,
                    fullName: user.fullName,
                    role: user.role,
                    nic: user.nic,
                    phone: user.phone,
                    address: user.address,
                    status: 'Active',
                    notificationPreference: 'Email'
                }
            });
            console.log(`✅ Created user: ${user.username} (${user.role})`);
        } else {
            console.log(`⚠️ User already exists: ${user.username}`);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
