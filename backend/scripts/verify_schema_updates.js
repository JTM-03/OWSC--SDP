const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Verifying schema updates...');

    // 1. Check Table Management
    const table = await prisma.restaurantTable.create({
        data: {
            tableNumber: 'T-999',
            capacity: 4,
            location: 'Test Zone'
        }
    });
    console.log('Created table:', table);

    // 2. Check Member Shift Link
    // Need a member first.
    let member = await prisma.member.findFirst();
    if (!member) {
        member = await prisma.member.create({
            data: {
                fullName: 'Test User',
                email: 'test@example.com',
                username: 'testuser',
                passwordHash: 'hash',
                role: 'staff'
            }
        });
    }

    const shift = await prisma.shift.create({
        data: {
            staffId: member.id,
            notes: 'Test Shift'
        }
    });
    console.log('Created shift:', shift);

    // 3. Check Cart
    const cart = await prisma.cart.create({
        data: {
            memberId: member.id
        }
    });
    console.log('Created cart:', cart);

    // Clean up
    await prisma.cart.delete({ where: { id: cart.id } });
    await prisma.shift.delete({ where: { id: shift.id } });
    await prisma.restaurantTable.delete({ where: { id: table.id } });
    // keep member if it was existing, or delete if created? 
    // For simplicity, just leave the member if created, or delete if unique constraint issue for next run.
    // Actually, we can just delete member if we created it.
    if (member.username === 'testuser') {
        await prisma.member.delete({ where: { id: member.id } });
    }

    console.log('Verification successful!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
