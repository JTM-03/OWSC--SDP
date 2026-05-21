# Real-Time Notification Flow Diagrams

## 1. New Order Notification Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MEMBER PLACES ORDER                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                    Frontend: POST /api/orders
                    (with JWT token)
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND PROCESSING                              │
│                                                                         │
│  1. Validate order items                                               │
│  2. Calculate totals (subtotal + 10% service fee)                      │
│  3. Create order in database                                           │
│  4. Include member data in response                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                    notifyNewOrder(order)
                    (Socket.io service)
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    SOCKET.IO BROADCAST                                  │
│                                                                         │
│  Event: order:new                                                       │
│  Room: admin-staff                                                      │
│  Payload: {                                                             │
│    type: "NEW_ORDER",                                                   │
│    title: "New Order Placed",                                           │
│    message: "John Doe placed a new Takeaway order",                     │
│    orderId: 123,                                                        │
│    orderType: "Takeaway",                                               │
│    memberName: "John Doe",                                              │
│    totalAmount: 2500,                                                   │
│    itemCount: 3,                                                        │
│    timestamp: "2024-04-19T10:30:00Z"                                    │
│  }                                                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
        ┌───────────────────────────┴───────────────────────────┐
        ↓                                                       ↓
┌──────────────────────────┐                         ┌──────────────────────────┐
│   ADMIN PORTAL           │                         │   STAFF PORTAL           │
│                          │                         │                          │
│  1. Receive order:new    │                         │  1. Receive order:new    │
│  2. Update unread count  │                         │  2. Update unread count  │
│  3. Show toast notif     │                         │  3. Show toast notif     │
│  4. Add to panel         │                         │  4. Add to panel         │
│  5. Bell icon updates    │                         │  5. Bell icon updates    │
│                          │                         │                          │
│  ┌────────────────────┐  │                         │  ┌────────────────────┐  │
│  │ 🔔 1               │  │                         │  │ 🔔 1               │  │
│  │ New Order Placed   │  │                         │  │ New Order Placed   │  │
│  │ John Doe - $2,500  │  │                         │  │ John Doe - $2,500  │  │
│  │ [View Order]       │  │                         │  │ [View Order]       │  │
│  └────────────────────┘  │                         │  └────────────────────┘  │
│                          │                         │                          │
└──────────────────────────┘                         └──────────────────────────┘
```

## 2. Order Status Update Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    STAFF UPDATES ORDER STATUS                           │
│                    (Pending → Preparing)                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                    Frontend: PUT /api/orders/123/status
                    Body: { status: "Preparing" }
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND PROCESSING                              │
│                                                                         │
│  1. Get current order (previousStatus = "Pending")                      │
│  2. Update order status to "Preparing"                                  │
│  3. Include member data in response                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
            notifyOrderStatusUpdate(order, "Pending")
                    (Socket.io service)
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    SOCKET.IO BROADCAST                                  │
│                                                                         │
│  Event: order:statusUpdate                                              │
│  Rooms: user:45 (member) + admin-staff                                  │
│  Payload: {                                                             │
│    type: "ORDER_STATUS_UPDATE",                                         │
│    title: "Order Status Updated",                                       │
│    message: "Order #123 status changed from Pending to Preparing",      │
│    orderId: 123,                                                        │
│    orderStatus: "Preparing",                                            │
│    previousStatus: "Pending",                                           │
│    memberName: "John Doe",                                              │
│    timestamp: "2024-04-19T10:35:00Z"                                    │
│  }                                                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
        ┌───────────────────────────┴───────────────────────────┐
        ↓                                                       ↓
┌──────────────────────────┐                         ┌──────────────────────────┐
│   MEMBER PORTAL          │                         │   ADMIN/STAFF PORTAL     │
│   (John Doe)             │                         │                          │
│                          │                         │  1. Receive update       │
│  1. Receive update       │                         │  2. Update order list    │
│  2. Show notification    │                         │  3. Show notification    │
│  3. Update order status  │                         │  4. Update unread count  │
│                          │                         │                          │
│  ┌────────────────────┐  │                         │  ┌────────────────────┐  │
│  │ 🔔 Order Updated   │  │                         │  │ 🔔 Order Updated   │  │
│  │ Status: Preparing  │  │                         │  │ Order #123         │  │
│  │ Your order is      │  │                         │  │ Pending→Preparing  │  │
│  │ being prepared     │  │                         │  │ [View Order]       │  │
│  └────────────────────┘  │                         │  └────────────────────┘  │
│                          │                         │                          │
└──────────────────────────┘                         └──────────────────────────┘
```

## 3. Socket.io Connection Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                                │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  useSocket Hook                                                  │  │
│  │  ├─ Get JWT token from localStorage                             │  │
│  │  ├─ Connect to Socket.io with auth                             │  │
│  │  ├─ Listen for order:new event                                 │  │
│  │  ├─ Listen for order:statusUpdate event                        │  │
│  │  └─ Handle reconnection logic                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  OrderNotificationCenter Component                               │  │
│  │  ├─ Display bell icon with unread count                         │  │
│  │  ├─ Show notification panel                                     │  │
│  │  ├─ Handle notification clicks                                  │  │
│  │  └─ Auto-hide notifications                                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↕
                        WebSocket Connection
                        (Socket.io Protocol)
                                    ↕
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Node.js)                               │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Socket.io Server (socketService.js)                            │  │
│  │                                                                  │  │
│  │  Authentication Middleware:                                     │  │
│  │  ├─ Extract JWT token from handshake                           │  │
│  │  ├─ Verify token signature                                     │  │
│  │  ├─ Extract userId and role                                    │  │
│  │  └─ Reject if invalid                                          │  │
│  │                                                                  │  │
│  │  Room Management:                                               │  │
│  │  ├─ admin-staff room (all admin/staff users)                   │  │
│  │  ├─ user:{userId} room (individual user)                       │  │
│  │  └─ Track connected users in Map                               │  │
│  │                                                                  │  │
│  │  Event Broadcasting:                                            │  │
│  │  ├─ notifyNewOrder() → io.to('admin-staff').emit()            │  │
│  │  ├─ notifyOrderStatusUpdate() → io.to('user:X').emit()        │  │
│  │  └─ notifyAdminStaff() → io.to('admin-staff').emit()          │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Orders Route (orders.js)                                        │  │
│  │  ├─ POST /api/orders → notifyNewOrder()                         │  │
│  │  └─ PUT /api/orders/:id/status → notifyOrderStatusUpdate()      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 4. Notification Center UI Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ADMIN/STAFF PORTAL                              │
│                                                                         │
│  [Header with navigation]                                              │
│                                                                         │
│  [Main content area]                                                   │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                                         │
│                                                ────────────────────────┐ │
│                                                │ 🔔 1                 │ │
│                                                │ ┌──────────────────┐ │ │
│                                                │ │ New Order Placed │ │ │
│                                                │ │ John Doe         │ │ │
│                                                │ │ Takeaway - $2500 │ │ │
│                                                │ │ 3 items          │ │ │
│                                                │ │                  │ │ │
│                                                │ │ [View Order]     │ │ │
│                                                │ └──────────────────┘ │ │
│                                                │                      │ │
│                                                │ ┌──────────────────┐ │ │
│                                                │ │ Order Updated    │ │ │
│                                                │ │ Status: Preparing│ │ │
│                                                │ │ 10:35 AM         │ │ │
│                                                │ └──────────────────┘ │ │
│                                                │                      │ │
│                                                └──────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 5. Authentication & Authorization Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    USER LOGIN                                           │
│                                                                         │
│  1. Enter credentials (email/password)                                 │
│  2. Backend validates and returns JWT token                            │
│  3. Frontend stores token in localStorage                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    SOCKET.IO CONNECTION                                 │
│                                                                         │
│  Frontend:                                                              │
│  1. Retrieve JWT from localStorage                                     │
│  2. Create Socket.io connection with auth: { token }                   │
│  3. Send handshake to backend                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    BACKEND AUTHENTICATION                               │
│                                                                         │
│  Socket.io Middleware:                                                  │
│  1. Extract token from socket.handshake.auth.token                     │
│  2. Verify JWT signature using JWT_SECRET                              │
│  3. Extract userId and role from decoded token                         │
│  4. Attach to socket object: socket.userId, socket.userRole            │
│  5. Call next() to allow connection                                    │
│                                                                         │
│  If token invalid/missing:                                              │
│  → Reject connection with "Authentication error"                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    ROOM ASSIGNMENT                                      │
│                                                                         │
│  Based on user role:                                                    │
│                                                                         │
│  If role === 'admin' OR role === 'staff':                              │
│  ├─ Join 'admin-staff' room                                            │
│  ├─ Receive order:new events                                           │
│  └─ Receive order:statusUpdate events                                  │
│                                                                         │
│  All users:                                                             │
│  ├─ Join 'user:{userId}' room                                          │
│  └─ Receive personal notifications                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION DELIVERY                                │
│                                                                         │
│  New Order:                                                             │
│  → io.to('admin-staff').emit('order:new', notification)               │
│  → Only admin/staff receive                                            │
│                                                                         │
│  Order Status Update:                                                   │
│  → io.to('user:45').emit('order:statusUpdate', notification)          │
│  → io.to('admin-staff').emit('order:statusUpdate', notification)       │
│  → Member + all admin/staff receive                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 6. Reconnection Logic

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    NORMAL CONNECTION                                    │
│                                                                         │
│  Socket.io connected = true                                            │
│  Green indicator visible                                               │
│  Receiving notifications                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                    Network Interruption
                    (WiFi drops, etc.)
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    DISCONNECTION DETECTED                               │
│                                                                         │
│  Socket.io connected = false                                           │
│  Green indicator disappears                                            │
│  Notifications queued locally                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    AUTOMATIC RECONNECTION                               │
│                                                                         │
│  Attempt 1: Wait 1 second → Try to reconnect                           │
│  Attempt 2: Wait 2 seconds → Try to reconnect                          │
│  Attempt 3: Wait 3 seconds → Try to reconnect                          │
│  Attempt 4: Wait 4 seconds → Try to reconnect                          │
│  Attempt 5: Wait 5 seconds → Try to reconnect                          │
│                                                                         │
│  Max attempts: 5                                                        │
│  Max wait time: 5 seconds                                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                    Network Restored
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    RECONNECTION SUCCESSFUL                              │
│                                                                         │
│  Socket.io connected = true                                            │
│  Green indicator reappears                                             │
│  Resume receiving notifications                                        │
│  Fetch any missed notifications from server                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

These diagrams illustrate the complete flow of the real-time notification system from order placement through delivery to admin and staff portals.
