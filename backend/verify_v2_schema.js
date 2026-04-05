const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Verifying V2.0 Schema...');

    // 1. Create a Modifier
    const modifier = await prisma.modifier.create({
        data: {
            name: 'Extra Cheese',
            additionalPrice: 1.50,
            category: 'Topping'
        }
    });
    console.log('Created modifier:', modifier);

    // 2. Create MenuItem
    const menuItem = await prisma.menuItem.create({
        data: {
            name: 'Test Burger',
            category: 'Main Course',
            price: 10.00,
            isVegetarian: false
        }
    });
    console.log('Created menuItem:', menuItem);

    // 3. Create Member & Cart
    const uniqueSuffix = Date.now();
    const member = await prisma.member.create({
        data: {
            fullName: 'V2 Test User',
            nic: `123456789${uniqueSuffix}`, // Unique constraint
            address: '123 Test St',
            phone: '555-0100',
            email: `v2test${uniqueSuffix}@example.com`,
            username: `v2user${uniqueSuffix}`,
            passwordHash: 'hash',
            role: 'member'
        }
    });

    const cart = await prisma.cart.create({
        data: {
            memberId: member.id
        }
    });

    // 4. Add Item to Cart with Modifier
    const cartItem = await prisma.cartItem.create({
        data: {
            cartId: cart.id,
            menuItemId: menuItem.id,
            quantity: 1,
            unitPrice: 10.00
        }
    });

    const cartItemModifier = await prisma.cartItemModifier.create({
        data: {
            cartItemId: cartItem.id,
            modifierId: modifier.id
        }
    });
    console.log('Linked modifier to cart item:', cartItemModifier);

    // Clean up
    await prisma.cartItemModifier.delete({ where: { id: cartItemModifier.id } });
    await prisma.cartItem.delete({ where: { id: cartItem.id } });
    await prisma.cart.delete({ where: { id: cart.id } });
    await prisma.member.delete({ where: { id: member.id } });
    await prisma.menuItem.delete({ where: { id: menuItem.id } });
    await prisma.modifier.delete({ where: { id: modifier.id } });

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
