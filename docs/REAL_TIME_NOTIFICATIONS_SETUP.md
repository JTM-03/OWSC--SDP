# Real-Time Order Notifications Implementation

## Overview

This document describes the real-time notification system for online orders placed by members. When a member places an order, instant notifications are sent to admin and staff portals via WebSocket (Socket.io).

## Architecture

### Backend Components

#### 1. Socket Service (`backend/src/services/socketService.js`)
- **Purpose**: Manages Socket.io server initialization and event broadcasting
- **Key Functions**:
  - `initializeSocket(httpServer)` - Initialize Socket.io with CORS and authentication
  - `notifyNewOrder(order)` - Emit new order notification to admin/staff
  - `notifyOrderStatusUpdate(order, previousStatus)` - Emit order status changes
  - `notifyUser(userId, notification)` - Send notification to specific user
  - `notifyAdminStaff(notification)` - Broadcast to all admin/staff users

#### 2. Server Update (`backend/src/server.js`)
- Changed from `app.listen()` to `http.createServer(app)` for Socket.io support
- Initializes Socket.io with authentication middleware
- Logs connection status

#### 3. Orders Route Update (`backend/src/routes/orders.js`)
- **POST /api/orders** - Calls `notifyNewOrder()` after order creation
- **PUT /api/orders/:id/status** - Calls `notifyOrderStatusUpdate()` on status change
- Includes member data in order response for notification display

### Frontend Components

#### 1. Socket Hook (`Frontend/src/hooks/useSocket.ts`)
- **Purpose**: React hook for Socket.io connection management
- **Features**:
  - Automatic connection/disconnection
  - JWT token authentication
  - Event listeners for order notifications
  - Reconnection logic with exponential backoff
  - Returns socket instance and emit function

#### 2. Notification Center (`Frontend/src/components/OrderNotificationCenter.tsx`)
- **Purpose**: Displays real-time order notifications in a floating panel
- **Features**:
  - Bell icon with unread count badge
  - Notification panel with scrollable list
  - Auto-hide notifications after 8 seconds
  - Toast notifications via Sonner
  - Click to view order details
  - Connection status indicator (green dot)
  - Separate styling for NEW_ORDER vs ORDER_STATUS_UPDATE

#### 3. Dashboard Integration
- **AdminDashboard.tsx** - Added `<OrderNotificationCenter />` component
- **StaffDashboard.tsx** - Added `<OrderNotificationCenter />` component
- Both dashboards now receive real-time order notifications

## Real-Time Events

### Event: `order:new`
**Emitted when**: Member places a new online order
**Sent to**: `admin-staff` room (all connected admin/staff users)
**Payload**:
```json
{
  "type": "NEW_ORDER",
  "title": "New Order Placed",
  "message": "John Doe placed a new Takeaway order",
  "orderId": 123,
  "orderType": "Takeaway",
  "memberName": "John Doe",
  "memberId": 45,
  "totalAmount": 2500,
  "itemCount": 3,
  "timestamp": "2024-04-19T10:30:00Z",
  "orderStatus": "Pending"
}
```

### Event: `order:statusUpdate`
**Emitted when**: Order status is updated by staff/admin
**Sent to**: 
- Member (via `user:{memberId}` room)
- All admin/staff (via `admin-staff` room)
**Payload**:
```json
{
  "type": "ORDER_STATUS_UPDATE",
  "title": "Order Status Updated",
  "message": "Order #123 status changed from Pending to Preparing",
  "orderId": 123,
  "orderStatus": "Preparing",
  "previousStatus": "Pending",
  "memberName": "John Doe",
  "memberId": 45,
  "timestamp": "2024-04-19T10:35:00Z"
}
```

## Installation & Setup

### Backend Setup

1. **Install dependencies**:
```bash
cd backend
npm install
```

2. **Environment variables** (already configured):
- `FRONTEND_URL` - Frontend origin(s) for CORS
- `JWT_SECRET` - Used for Socket.io authentication
- `PORT` - Server port (default: 5000)

3. **Start server**:
```bash
npm run dev  # Development with nodemon
npm start   # Production
```

### Frontend Setup

1. **Install dependencies**:
```bash
cd Frontend
npm install
```

2. **Environment variables** (`.env` or `.env.local`):
```
VITE_API_URL=http://localhost:5000
```

3. **Start development server**:
```bash
npm run dev
```

## Usage

### For Admin/Staff Users

1. **Automatic Connection**: When admin/staff logs in and views the dashboard, Socket.io automatically connects
2. **Receive Notifications**: 
   - Bell icon appears in bottom-right corner
   - Unread count badge shows number of new notifications
   - Toast notification appears for each new order
   - Notification panel shows full details
3. **View Order**: Click "View Order" button to navigate to order management

### For Members

1. **Order Placement**: When member places order via online ordering
2. **Status Updates**: Member receives notifications when order status changes
3. **Real-time Updates**: No need to refresh page - updates appear instantly

## Socket.io Rooms

### Room: `admin-staff`
- **Members**: All connected users with `admin` or `staff` role
- **Events**: `order:new`, `order:statusUpdate`, `orders:updated`
- **Purpose**: Broadcast order events to all staff/admin

### Room: `user:{userId}`
- **Members**: Specific user (member)
- **Events**: `order:statusUpdate`, `notification`
- **Purpose**: Send user-specific notifications

## Authentication Flow

1. **Frontend**: Retrieves JWT token from localStorage
2. **Socket Connection**: Sends token in `auth` object
3. **Backend Middleware**: Verifies JWT and extracts user ID and role
4. **Authorization**: User joined to appropriate rooms based on role

## Error Handling

### Connection Errors
- Automatic reconnection with exponential backoff (1s → 5s)
- Max 5 reconnection attempts
- Console logs for debugging

### Authentication Errors
- Invalid/missing token → Connection rejected
- User must login again to reconnect

### Notification Errors
- Socket service checks if `io` is initialized before emitting
- Errors logged but don't break order flow

## Performance Considerations

### Scalability
- Socket.io uses adapter pattern (default: in-memory)
- For production with multiple servers, use Redis adapter:
```javascript
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");

const pubClient = createClient();
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

### Bandwidth
- Only admin/staff receive order notifications
- Members only receive their own order updates
- Efficient JSON payloads (~500 bytes per notification)

### Connection Limits
- Default: 1000 concurrent connections per process
- Configurable via Socket.io options

## Testing

### Manual Testing

1. **Open two browser windows**:
   - Window 1: Admin/Staff dashboard
   - Window 2: Member ordering page

2. **Place order as member**:
   - Admin/Staff window should show notification immediately
   - Bell icon updates with unread count
   - Toast notification appears

3. **Update order status**:
   - Admin/Staff updates order status
   - Member receives notification in real-time

### Browser Console Debugging

```javascript
// Check Socket.io connection
console.log(socket.connected); // true/false

// Listen to all events
socket.onAny((event, ...args) => {
  console.log(event, args);
});

// Manually emit event (for testing)
socket.emit('test-event', { data: 'test' });
```

## Troubleshooting

### Notifications Not Appearing

1. **Check Socket.io Connection**:
   - Open browser DevTools → Network tab
   - Look for WebSocket connection to `/socket.io/`
   - Should show "101 Switching Protocols"

2. **Verify Authentication**:
   - Check localStorage for `token`
   - Verify JWT is valid (not expired)
   - Check backend logs for auth errors

3. **Check CORS**:
   - Verify `FRONTEND_URL` includes correct origin
   - Check browser console for CORS errors

4. **Verify User Role**:
   - Only `admin` and `staff` receive order notifications
   - Check user role in database

### High Latency

1. **Network Issues**:
   - Check network tab for slow connections
   - Consider using Socket.io polling fallback

2. **Server Load**:
   - Check server CPU/memory usage
   - Monitor number of connected clients

3. **Database Queries**:
   - Ensure order queries are optimized
   - Add indexes on `memberId`, `orderStatus`

## Future Enhancements

1. **Kitchen Display System (KDS)**
   - Real-time order queue for kitchen staff
   - Order status updates with timers
   - Sound/visual alerts for new orders

2. **Push Notifications**
   - Firebase Cloud Messaging (FCM) integration
   - Browser push notifications
   - Mobile app notifications

3. **Email/SMS Notifications**
   - Email alerts for important orders
   - SMS for urgent status updates
   - Notification preferences UI

4. **Order Analytics**
   - Real-time order metrics dashboard
   - Peak hour analysis
   - Staff performance tracking

5. **Advanced Filtering**
   - Filter notifications by order type
   - Notification preferences per user
   - Do Not Disturb mode

## Files Modified/Created

### Backend
- ✅ `backend/src/services/socketService.js` (NEW)
- ✅ `backend/src/server.js` (MODIFIED)
- ✅ `backend/src/routes/orders.js` (MODIFIED)
- ✅ `backend/package.json` (MODIFIED - added socket.io)

### Frontend
- ✅ `Frontend/src/hooks/useSocket.ts` (NEW)
- ✅ `Frontend/src/components/OrderNotificationCenter.tsx` (NEW)
- ✅ `Frontend/src/components/AdminDashboard.tsx` (MODIFIED)
- ✅ `Frontend/src/components/StaffDashboard.tsx` (MODIFIED)
- ✅ `Frontend/package.json` (MODIFIED - added socket.io-client)

## Support

For issues or questions:
1. Check browser console for errors
2. Check backend logs for Socket.io errors
3. Verify network connectivity
4. Ensure JWT token is valid
5. Check user role and permissions
