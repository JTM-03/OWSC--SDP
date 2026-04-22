import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  enabled?: boolean;
  onNewOrder?: (order: any) => void;
  onOrderStatusUpdate?: (data: any) => void;
  onNotification?: (notification: any) => void;
  /** @deprecated kept for API compatibility — no longer used */
  pollInterval?: number;
}

/**
 * Real-time Socket.io hook.
 *
 * Connects to the backend using the HttpOnly JWT cookie that the browser
 * sends automatically — no token extraction needed.
 *
 * Rooms on the server:
 *   user:{id}    — personal notifications (order status, booking updates)
 *   admin-staff  — new order alerts for staff/admin
 *
 * Events listened to:
 *   order:new          → onNewOrder
 *   order:statusUpdate → onOrderStatusUpdate
 *   notification       → onNotification
 */
export function useSocket(options: UseSocketOptions = {}) {
  const { enabled = true, onNewOrder, onOrderStatusUpdate, onNotification } = options;

  const [isConnected, setIsConnected] = useState(false);

  // Store callbacks in refs so the effect never needs to re-run when they change
  const onNewOrderRef     = useRef(onNewOrder);
  const onStatusRef       = useRef(onOrderStatusUpdate);
  const onNotificationRef = useRef(onNotification);

  onNewOrderRef.current     = onNewOrder;
  onStatusRef.current       = onOrderStatusUpdate;
  onNotificationRef.current = onNotification;

  useEffect(() => {
    if (!enabled) return;

    // Determine the socket server URL.
    // In dev: Vite proxy forwards /api → localhost:5000, but Socket.io needs
    // a direct connection to the backend origin.
    // In production: same origin (Nginx proxies /socket.io/ → backend).
    const socketUrl =
      import.meta.env.DEV
        ? 'http://localhost:5000'   // dev: connect directly to backend
        : window.location.origin;  // prod: same origin, Nginx handles the proxy

    const socket: Socket = io(socketUrl, {
      // The browser sends the HttpOnly cookie automatically — no manual token needed
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('🔌 Socket connection error:', err.message);
      setIsConnected(false);
    });

    // ── New order placed by a member ──────────────────────────────────────
    socket.on('order:new', (data) => {
      onNewOrderRef.current?.(data);
    });

    // ── Order status changed (kitchen update) ─────────────────────────────
    socket.on('order:statusUpdate', (data) => {
      onStatusRef.current?.(data);
    });

    // ── Generic notification (booking confirmed, payment verified, etc.) ──
    socket.on('notification', (data) => {
      onNotificationRef.current?.(data);
    });

    return () => {
      socket.disconnect();
      setIsConnected(false);
    };
  }, [enabled]); // only re-run if enabled changes

  return { isConnected };
}
