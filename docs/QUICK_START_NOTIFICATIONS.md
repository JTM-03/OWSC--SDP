# Quick Start: Real-Time Order Notifications

## What Was Implemented

✅ **Real-time order notifications** for admin and staff portals when members place online orders
✅ **WebSocket-based communication** using Socket.io for instant updates
✅ **Notification Center UI** with bell icon, unread count, and notification panel
✅ **Order status updates** - Members and staff get notified when order status changes
✅ **Auto-reconnection** with exponential backoff for reliability

## Installation (5 minutes)

### Step 1: Install Dependencies

**Backend**:
```bash
cd backend
npm install
```

**Frontend**:
```bash
cd Frontend
npm install
```

### Step 2: Start the Servers

**Backend** (Terminal 1):
```bash
cd backend
npm run dev
```

You should see:
```
🚀 Server is running on port 5000
🔌 Socket.io initialized for real-time notifications
```

**Frontend** (Terminal 2):
```bash
cd Frontend
npm run dev
```

## Testing the Notifications

### Scenario 1: New Order Notification

1. **Open two browser windows**:
   - Window A: `http://localhost:5173` (or your frontend URL)
   - Window B: Same URL

2. **Login in both windows**:
   - Window A: Login as **Admin** or **Staff**
   - Window B: Login as **Member**

3. **Place an order in Window B**:
   - Navigate to ordering page
   - Add items to cart
   - Place order

4. **See notification in Window A**:
   - Bell icon appears in bottom-right corner
   - Unread count badge shows "1"
   - Toast notification appears
   - Notification panel shows order details
   - Click "View Order" to see full details

### Scenario 2: Order Status Update

1. **In Window A (Admin/Staff)**:
   - Go to Orders tab
   - Find the order from Scenario 1
   - Change status from "Pending" → "Preparing"

2. **In Window B (Member)**:
   - Notification appears automatically
   - Shows "Order status changed to Preparing"
   - No page refresh needed

## Key Features

### Notification Center (Bottom-Right Corner)

- **Bell Icon**: Click to open/close notification panel
- **Red Badge**: Shows unread notification count
- **Green Dot**: Indicates Socket.io connection status
- **Notification Panel**: 
  - Shows all recent notifications
  - Auto-hides after 8 seconds
  - Click "View Order" to navigate to order details
  - Click X to dismiss individual notifications

### Notification Types

**NEW_ORDER** (Orange):
- Triggered when member places order
- Shows: Member name, order type, item count, total amount
- Sent to: All admin/staff users

**ORDER_STATUS_UPDATE** (Blue):
- Triggered when order status changes
- Shows: Previous status → New status
- Sent to: Member + All admin/staff

## Architecture Overview

```
Member Places Order
        ↓
Backend: POST /api/orders
        ↓
Socket.io: notifyNewOrder()
        ↓
Broadcast to admin-staff room
        ↓
Admin/Staff Portals: Receive order:new event
        ↓
OrderNotificationCenter: Display notification
```

## File Structure

```
backend/
├── src/
│   ├── services/
│   │   └── socketService.js          (NEW - Socket.io management)
│   ├── routes/
│   │   └── orders.js                 (MODIFIED - emit notifications)
│   └── server.js                     (MODIFIED - initialize Socket.io)
└── package.json                      (MODIFIED - added socket.io)

Frontend/
├── src/
│   ├── hooks/
│   │   └── useSocket.ts              (NEW - Socket.io hook)
│   ├── components/
│   │   ├── OrderNotificationCenter.tsx (NEW - notification UI)
│   │   ├── AdminDashboard.tsx        (MODIFIED - added notification center)
│   │   └── StaffDashboard.tsx        (MODIFIED - added notification center)
│   └── package.json                  (MODIFIED - added socket.io-client)
```

## Environment Variables

### Backend (.env)
```
PORT=5000
FRONTEND_URL=http://localhost:5173,http://localhost:3000
JWT_SECRET=your-secret-key
DATABASE_URL=your-database-url
```

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:5000
```

## Troubleshooting

### Notifications Not Appearing?

1. **Check Socket.io Connection**:
   - Open DevTools → Network tab
   - Look for WebSocket connection to `/socket.io/`
   - Should show "101 Switching Protocols"

2. **Check User Role**:
   - Only `admin` and `staff` receive order notifications
   - Verify user role in database

3. **Check Browser Console**:
   - Look for connection errors
   - Verify JWT token is present in localStorage

4. **Check Backend Logs**:
   - Look for "✅ User X connected" messages
   - Look for "📢 Order notification sent" messages

### Connection Keeps Dropping?

- Check network stability
- Verify FRONTEND_URL includes correct origin
- Check server logs for errors

## Next Steps

1. **Test with multiple users**: Open 3+ browser windows to simulate real usage
2. **Monitor performance**: Check browser DevTools for network activity
3. **Customize notifications**: Edit `OrderNotificationCenter.tsx` to change styling/behavior
4. **Add more events**: Extend `socketService.js` for other real-time events

## Production Deployment

### Backend Changes Needed

1. **Use Redis Adapter** (for multiple server instances):
```javascript
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");

const pubClient = createClient();
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

2. **Update CORS**:
```javascript
cors: {
  origin: process.env.FRONTEND_URL.split(','),
  credentials: true
}
```

3. **Enable HTTPS**:
```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('path/to/key.pem'),
  cert: fs.readFileSync('path/to/cert.pem')
};

https.createServer(options, app).listen(PORT);
```

### Frontend Changes Needed

1. **Update API URL**:
```typescript
const socket = io(process.env.VITE_API_URL || 'https://api.yourdomain.com', {
  // ...
});
```

2. **Add error tracking**: Integrate with Sentry or similar

## Support & Documentation

- Full documentation: See `REAL_TIME_NOTIFICATIONS_SETUP.md`
- Socket.io docs: https://socket.io/docs/
- React hooks: https://react.dev/reference/react/hooks

---

**Status**: ✅ Ready for testing and deployment
