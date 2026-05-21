const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const supplier = await prisma.supplier.findUnique({
            where: { id: 1 }
        })

        if (supplier) {
            console.log('Supplier 1 exists:', supplier.name)
        } else {
            console.log('Supplier 1 MISSING. Creating default supplier...')
            await prisma.supplier.create({
                data: {
                    id: 1,
                    name: 'Default Supplier',
                    contactPerson: 'Manager',
                    phone: '000-000-0000',
                    email: 'supplier@example.com'
                }
            })
            console.log('Supplier 1 created.')
        }
    } catch (e) {
        console.error('Error verifying supplier:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
