const { PrismaClient } = require('@prisma/client')

const prismaClient = new PrismaClient()

const prisma = prismaClient.$extends({
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                const result = await query(args)

                // Log mutations
                if (['create', 'update', 'delete', 'upsert', 'createMany', 'updateMany', 'deleteMany'].includes(operation)) {
                    // Asynchronous logging to avoid blocking main flow (fire & forget style for speed, 
                    // but could await if strict audit is required. For user experience, we'll fire & forget but log errors)
                    (async () => {
                        try {
                            if (model === 'AuditLog') return; // Prevent recursion

                            await prismaClient.auditLog.create({
                                data: {
                                    tableName: model,
                                    action: operation.toUpperCase(),
                                    recordId: result && result.id ? result.id : (args.where && args.where.id ? args.where.id : 0),
                                    oldValue: operation.includes('update') || operation.includes('delete') ? JSON.stringify(args) : null,
                                    newValue: JSON.stringify(args.data || args),
                                    changedBy: null // Cannot easily get User ID here without AsyncLocalStorage
                                    // changedDate is auto-populated via @default(now()) in the schema
                                }
                            })
                        } catch (err) {
                            console.error('[AuditLog] Failed to log change:', err)
                        }
                    })()
                }
                return result
            }
        }
    }
})

module.exports = prisma
