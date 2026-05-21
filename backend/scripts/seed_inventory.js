const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedInventory() {
    console.log('🌱 Seeding inventory data...');

    // Create sample products
    const products = [
        { productName: 'Rice', category: 'Grains', unit: 'kg' },
        { productName: 'Chicken', category: 'Meat', unit: 'kg' },
        { productName: 'Tomatoes', category: 'Vegetables', unit: 'kg' },
        { productName: 'Milk', category: 'Dairy', unit: 'liters' },
        { productName: 'Eggs', category: 'Dairy', unit: 'dozen' },
        { productName: 'Flour', category: 'Grains', unit: 'kg' },
        { productName: 'Sugar', category: 'Dry Goods', unit: 'kg' },
        { productName: 'Cooking Oil', category: 'Oils', unit: 'liters' },
        { productName: 'Salt', category: 'Spices', unit: 'kg' },
        { productName: 'Pepper', category: 'Spices', unit: 'kg' },
    ];

    for (const productData of products) {
        const product = await prisma.product.upsert({
            where: { id: products.indexOf(productData) + 1 },
            update: {},
            create: {
                ...productData
            }
        });

        // Create inventory for this product
        await prisma.inventory.upsert({
            where: { productId: product.id },
            update: {},
            create: {
                productId: product.id,
                currentQuantity: Math.floor(Math.random() * 100) + 50, // Random quantity between 50-150
                reorderLevel: 20
            }
        });

        console.log(`  ✓ Created product: ${product.productName}`);
    }

    console.log('✅ Inventory data seeded successfully');
    await prisma.$disconnect();
}

seedInventory().catch(e => {
    console.error('❌ Error seeding inventory:', e);
    process.exit(1);
});
