/**
 * socketService.js
 *
 * Gracefully degrades when socket.io is not installed.
 * All exported functions are safe no-ops in that case, so the rest of
 * the application (including /api/auth/login) continues to work normally.
 *
 * To enable real-time notifications, run:
 *   npm install socket.io
 * inside the backend directory and restart the server.
 */

let io = null;
let Server = null;
const connectedUsers = new Map();

// Try to load socket.io — if it isn't installed, log a warning and continue.
try {
  Server = require('socket.io').Server;
} catch {
  console.warn('⚠️  socket.io is not installed. Real-time order notifications are disabled.');
  console.warn('   Run: cd backend && npm install socket.io   to enable them.');
}

/**
 * Initialize Socket.io server.
 * Safe no-op when socket.io is not installed.
 */
function initializeSocket(httpServer, options = {}) {
  if (!Server) return null;

  io = new Server(httpServer, {
    cors: {
      origin: (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:3000')
        .split(',')
        .map(o => o.trim())
        .filter(Boolean),
      credentials: true,
      methods: ['GET', 'POST']
    },
    ...options
  });

  io.use((socket, next) => {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'your-secret-key';

    // Strategy 1: token passed explicitly in handshake auth (legacy / non-browser clients)
    const headerToken = socket.handshake.auth?.token;
    if (headerToken) {
      try {
        const decoded = jwt.verify(headerToken, secret);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        return next();
      } catch {
        return next(new Error('Authentication error'));
      }
    }

    // Strategy 2: read the HttpOnly cookie sent automatically by the browser
    const cookieHeader = socket.handshake.headers?.cookie || '';
    const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
    if (match) {
      try {
        const decoded = jwt.verify(decodeURIComponent(match[1]), secret);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        return next();
      } catch {
        return next(new Error('Authentication error'));
      }
    }

    return next(new Error('Authentication error'));
  });

  io.on('connection', (socket) => {
    console.log(`✅ Socket connected: user ${socket.userId}`);

    if (!connectedUsers.has(socket.userId)) {
      connectedUsers.set(socket.userId, new Set());
    }
    connectedUsers.get(socket.userId).add(socket.id);

    socket.join(`user:${socket.userId}`);

    if (socket.userRole === 'admin' || socket.userRole === 'staff') {
      socket.join('admin-staff');
    }

    socket.on('disconnect', () => {
      const sockets = connectedUsers.get(socket.userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) connectedUsers.delete(socket.userId);
      }
    });
  });

  console.log('🔌 Socket.io initialized for real-time notifications');
  return io;
}

function getIO() { return io; }

function notifyNewOrder(order) {
  if (!io) return;
  io.to('admin-staff').emit('order:new', {
    type: 'NEW_ORDER',
    title: 'New Order Placed',
    message: `${order.member?.fullName || 'Member'} placed a new ${order.orderType} order`,
    orderId: order.id,
    orderType: order.orderType,
    memberName: order.member?.fullName,
    memberId: order.memberId,
    totalAmount: order.totalAmount,
    itemCount: order.orderItems?.length || 0,
    timestamp: new Date(),
    orderStatus: order.orderStatus
  });
}

function notifyOrderStatusUpdate(order, previousStatus) {
  if (!io) return;
  const payload = {
    type: 'ORDER_STATUS_UPDATE',
    title: 'Order Status Updated',
    message: `Order #${order.id} changed from ${previousStatus} to ${order.orderStatus}`,
    orderId: order.id,
    orderStatus: order.orderStatus,
    previousStatus,
    memberName: order.member?.fullName,
    memberId: order.memberId,
    timestamp: new Date()
  };
  io.to(`user:${order.memberId}`).emit('order:statusUpdate', payload);
  io.to('admin-staff').emit('order:statusUpdate', payload);
}

function notifyUser(userId, notification) {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification', { ...notification, timestamp: new Date() });
}

function notifyAdminStaff(notification) {
  if (!io) return;
  io.to('admin-staff').emit('notification', { ...notification, timestamp: new Date() });
}

function broadcastNotification(notification) {
  if (!io) return;
  io.emit('notification', { ...notification, timestamp: new Date() });
}

function isUserConnected(userId) {
  return connectedUsers.has(userId) && connectedUsers.get(userId).size > 0;
}

module.exports = {
  initializeSocket,
  getIO,
  notifyNewOrder,
  notifyOrderStatusUpdate,
  notifyUser,
  notifyAdminStaff,
  broadcastNotification,
  isUserConnected
};
