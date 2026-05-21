const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('Venues:', JSON.stringify(await prisma.venue.findMany(), null, 2));
  console.log('MenuItems:', JSON.stringify(await prisma.menuItem.findMany(), null, 2));
  console.log('Events:', JSON.stringify(await prisma.event.findMany(), null, 2));
  console.log('Promotions:', JSON.stringify(await prisma.promotion.findMany(), null, 2));
}
main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
