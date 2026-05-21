const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        console.log('--- Debugging Membership Upgrade ---')

        // 1. Get all members
        const members = await prisma.member.findMany({
            include: {
                memberships: {
                    where: { status: 'Active' },
                    orderBy: { startDate: 'desc' },
                    take: 1
                },
                membershipRequests: {
                    where: { status: 'Pending' }
                }
            }
        })

        console.log(`Found ${members.length} members.`)

        for (const m of members) {
            console.log(`\nUser: ${m.email} (ID: ${m.id})`)

            // Active Membership
            if (m.memberships.length > 0) {
                console.log(`  - Active Plan: ${m.memberships[0].type} (Ends: ${m.memberships[0].endDate})`)
            } else {
                console.log(`  - NO ACTIVE MEMBERSHIP (Upgrade will fail with "No active membership")`)
            }

            // Pending Requests
            if (m.membershipRequests.length > 0) {
                console.log(`  - PENDING UPGRADE REQUEST: ${m.membershipRequests[0].oldPlanId} -> ${m.membershipRequests[0].newPlanId}`)
                console.log(`    (Upgrade will fail with "Already have pending request")`)
            } else {
                console.log(`  - No pending requests`)
            }
        }

    } catch (e) {
        console.error('Error:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
