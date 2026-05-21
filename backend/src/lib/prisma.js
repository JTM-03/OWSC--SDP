const { PrismaClient } = require('@prisma/client')

/**
 * Use the test database URL when running in test mode so tests never
 * touch production data. Falls back to the standard DATABASE_URL.
 */
const datasourceUrl =
    process.env.NODE_ENV === 'test'
        ? process.env.TEST_DATABASE_URL
        : process.env.DATABASE_URL

const prismaClient = new PrismaClient({ datasourceUrl })

/**
 * Extended Prisma client with automatic audit logging.
 *
 * Every mutating operation (create, update, delete, upsert, *Many) is
 * intercepted and an AuditLog record is written asynchronously.
 *
 * Design decisions:
 * - Fire-and-forget: audit writes never block the main operation
 * - AuditLog writes are skipped to prevent infinite recursion
 * - changedBy is null because AsyncLocalStorage is not set up; it can be
 *   wired in later if per-user audit trails are required
 */
const prisma = prismaClient.$extends({
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                // Execute the actual database operation first
                const result = await query(args)

                const MUTATIONS = ['create', 'update', 'delete', 'upsert', 'createMany', 'updateMany', 'deleteMany']

                if (MUTATIONS.includes(operation)) {
                    // Write audit log asynchronously — errors are logged but never thrown
                    ;(async () => {
                        try {
                            // Skip AuditLog writes to avoid infinite recursion
                            if (model === 'AuditLog') return

                            await prismaClient.auditLog.create({
                                data: {
                                    tableName: model,
                                    action: operation.toUpperCase(),
                                    // Use result.id if available, otherwise fall back to the where clause id
                                    recordId: result?.id ?? args.where?.id ?? 0,
                                    // Capture the before-state for updates and deletes
                                    oldValue: (operation.includes('update') || operation.includes('delete'))
                                        ? JSON.stringify(args)
                                        : null,
                                    newValue: JSON.stringify(args.data || args),
                                    changedBy: null  // TODO: wire in via AsyncLocalStorage for per-user tracking
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
