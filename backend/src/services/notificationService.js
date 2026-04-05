const prisma = require("../lib/prisma");

/**
 * Creates a notification for a specific user
 * @param {number} memberId - The recipient's ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (alert, info, promotion, reminder)
 */
async function sendNotification(memberId, title, message, type = 'info') {
    try {
        // 1. Create the base notification content
        const notification = await prisma.notification.create({
            data: {
                title,
                message,
                notificationType: type,
                createdDate: new Date()
            }
        });

        // 2. Link to user
        await prisma.userNotification.create({
            data: {
                notificationId: notification.id,
                memberId: memberId,
                readStatus: false,
                sentDate: new Date()
            }
        });

        console.log(`🔔 Notification sent to Member ${memberId}: ${title}`);
    } catch (error) {
        console.error("❌ Failed to send notification:", error);
        // Don't throw, just log. Notifications shouldn't break main flow.
    }
}

/**
 * Broadcasts a notification to all active members
 */
async function broadcastNotification(title, message, type = 'announcement') {
    try {
        const members = await prisma.member.findMany({ where: { status: 'Active' }, select: { id: true } });

        const notification = await prisma.notification.create({
            data: {
                title,
                message,
                notificationType: type,
                createdDate: new Date()
            }
        });

        const userNotifications = members.map(m => ({
            notificationId: notification.id,
            memberId: m.id,
            readStatus: false,
            sentDate: new Date()
        }));

        await prisma.userNotification.createMany({
            data: userNotifications
        });

        console.log(`📢 Broadcast sent to ${members.length} members: ${title}`);
    } catch (error) {
        console.error("❌ Failed to broadcast:", error);
    }
}

module.exports = { sendNotification, broadcastNotification };
