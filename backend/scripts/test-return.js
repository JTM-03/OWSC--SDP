const express = require('express');
const { validate } = require('./src/middleware/validate');
const inventoryRoutes = require('./src/routes/inventory');
const prisma = require('./src/lib/prisma');

async function testReturnRoute() {
  const product = await prisma.product.findFirst();
  const batch = await prisma.stockBatch.findFirst({
    where: { productId: product.id }  
  });
  
  if (!batch) {
    console.log("No batch available for test");
    return;
  }

  const payload = {
    productId: product.id,
    supplierId: batch.supplierId,
    quantity: 1,
    reason: "Defective"
  };

  const req = {
    body: payload,
    user: { id: 1, role: 'admin' }
  };
  
  console.log("Mocking route with payload:", payload);
  try {
     const tx = await prisma.$transaction(async (tx) => {
            const inventory = await tx.inventory.findUnique({
                where: { productId: parseInt(payload.productId) }
            })

            if (!inventory || inventory.currentQuantity < payload.quantity) {
                throw new Error('Insufficient stock to process return')
            }

            const batchRecord = await tx.stockBatch.findFirst({
                where: {
                    productId: parseInt(payload.productId),
                    supplierId: parseInt(payload.supplierId)
                },
                orderBy: { supplyDate: 'desc' }
            })

            if (!batchRecord) {
                throw new Error('No stock batch found for this product and supplier')
            }

            const returnRecord = await tx.return.create({
                data: {
                    batchId: batchRecord.id,
                    quantity: payload.quantity,
                    reason: payload.reason,
                    returnDate: new Date()
                }
            })

            const updatedInventory = await tx.inventory.update({
                where: { productId: parseInt(payload.productId) },
                data: { currentQuantity: { decrement: payload.quantity } }
            })

            await tx.stockMovement.create({
                data: {
                    productId: parseInt(payload.productId),
                    movementType: 'OUT',
                    quantity: payload.quantity,
                    referenceType: 'Return',
                    referenceId: returnRecord.id,
                    reason: `Return to Supplier: ${payload.reason}`
                }
            })

            return { returnRecord, updatedInventory }
        })
        console.log("Success!", tx);
  } catch (e) {
      console.error("Failed transaction!", e);
  } finally {
      await prisma.$disconnect();
  }
}

testReturnRoute();
