require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('=== PostgreSQL Full Verification ===\n');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    console.log('');

    // 1. Check all tables exist
    console.log('--- 1. TABLE CHECK ---');
    const tables = await prisma.$queryRawUnsafe(
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    );
    console.log(`Total tables: ${tables.length}`);
    tables.forEach(t => console.log(`  ✓ ${t.tablename}`));

    const expectedTables = [
        'AuditLog', 'BookingPayment', 'Cart', 'CartItem', 'CartItemModifier',
        'Delivery', 'DeliveryItem', 'Event', 'Inventory', 'Member',
        'User', 'MembershipPayment', 'MembershipUpgradeRequest', 'MenuItem',
        'Modifier', 'Notification', 'Order', 'OrderItem', 'OrderItemModifier',
        'OrderPayment', 'Product', 'Promotion', 'RestaurantTable', 'Return',
        'Shift', 'StockBatch', 'StockMovement', 'Supplier', 'TableReservation',
        'UserNotification', 'Venue', 'VenueAssignment', 'VenueBooking', 'VenueFeedback'
    ];
    const actualNames = tables.map(t => t.tablename);
    const missing = expectedTables.filter(t => !actualNames.includes(t));
    if (missing.length > 0) {
        console.log(`\n  ✗ MISSING TABLES: ${missing.join(', ')}`);
    } else {
        console.log(`\n  ✓ All ${expectedTables.length} expected tables present`);
    }

    // 2. Check foreign keys (relationships)
    console.log('\n--- 2. FOREIGN KEY CHECK ---');
    const fks = await prisma.$queryRawUnsafe(`
    SELECT 
      tc.table_name AS "from_table",
      kcu.column_name AS "from_column",
      ccu.table_name AS "to_table",
      ccu.column_name AS "to_column"
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name
  `);
    console.log(`Total foreign keys: ${fks.length}`);
    fks.forEach(fk => {
        console.log(`  ✓ ${fk.from_table}.${fk.from_column} → ${fk.to_table}.${fk.to_column}`);
    });

    // 3. Check unique constraints
    console.log('\n--- 3. UNIQUE CONSTRAINTS ---');
    const uniques = await prisma.$queryRawUnsafe(`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public'
    ORDER BY tc.table_name
  `);
    console.log(`Total unique constraints: ${uniques.length}`);
    uniques.forEach(u => console.log(`  ✓ ${u.table_name}.${u.column_name}`));

    // 4. Check column details for key tables
    console.log('\n--- 4. KEY TABLE COLUMN CHECK ---');
    const keyTables = ['Member', 'Venue', 'VenueBooking', 'MenuItem', 'Order', 'Product', 'Inventory'];
    for (const table of keyTables) {
        const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = '${table}' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
        console.log(`\n  ${table} (${cols.length} columns):`);
        cols.forEach(c => {
            const nullable = c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            const def = c.column_default ? ` [default: ${c.column_default.substring(0, 30)}]` : '';
            console.log(`    - ${c.column_name}: ${c.data_type} ${nullable}${def}`);
        });
    }

    // 5. Test Prisma model access (CRUD readiness)
    console.log('\n--- 5. PRISMA MODEL ACCESS TEST ---');
    const models = [
        { name: 'member', fn: () => prisma.member.count() },
        { name: 'user (membership)', fn: () => prisma.user.count() },
        { name: 'venue', fn: () => prisma.venue.count() },
        { name: 'venueBooking', fn: () => prisma.venueBooking.count() },
        { name: 'menuItem', fn: () => prisma.menuItem.count() },
        { name: 'order', fn: () => prisma.order.count() },
        { name: 'product', fn: () => prisma.product.count() },
        { name: 'inventory', fn: () => prisma.inventory.count() },
        { name: 'supplier', fn: () => prisma.supplier.count() },
        { name: 'delivery', fn: () => prisma.delivery.count() },
        { name: 'notification', fn: () => prisma.notification.count() },
        { name: 'auditLog', fn: () => prisma.auditLog.count() },
        { name: 'cart', fn: () => prisma.cart.count() },
        { name: 'event', fn: () => prisma.event.count() },
        { name: 'promotion', fn: () => prisma.promotion.count() },
        { name: 'restaurantTable', fn: () => prisma.restaurantTable.count() },
        { name: 'stockBatch', fn: () => prisma.stockBatch.count() },
        { name: 'stockMovement', fn: () => prisma.stockMovement.count() },
    ];

    let allPassed = true;
    for (const model of models) {
        try {
            const count = await model.fn();
            console.log(`  ✓ ${model.name}: accessible (${count} rows)`);
        } catch (err) {
            console.log(`  ✗ ${model.name}: FAILED - ${err.message}`);
            allPassed = false;
        }
    }

    console.log('\n=== VERIFICATION SUMMARY ===');
    console.log(`Tables: ${tables.length}/34`);
    console.log(`Foreign Keys: ${fks.length}`);
    console.log(`Unique Constraints: ${uniques.length}`);
    console.log(`Prisma Models: ${allPassed ? 'ALL ACCESSIBLE ✓' : 'SOME FAILED ✗'}`);
    console.log(`Missing Tables: ${missing.length === 0 ? 'NONE ✓' : missing.join(', ')}`);
    console.log('');

    if (missing.length === 0 && allPassed) {
        console.log('★ DATABASE FULLY VERIFIED - ALL GOOD! ★');
    } else {
        console.log('✗ ISSUES FOUND - SEE ABOVE');
    }
}

main()
    .catch(e => console.error('FATAL:', e))
    .finally(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
