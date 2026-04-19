import { useEffect, useRef, useState } from 'react';
import { orderAPI, Order } from '../api/order';

interface UseSocketOptions {
  enabled?: boolean;
  onNewOrder?: (order: any) => void;
  onOrderStatusUpdate?: (data: any) => void;
  onNotification?: (notification: any) => void;
  pollInterval?: number;
}

/**
 * Polling-based hook that mimics a real-time socket interface.
 *
 * KEY DESIGN: callbacks are stored in refs so they never appear in the
 * dependency array of useEffect/useCallback. This prevents the classic
 * "new function reference → effect re-runs → infinite loop" problem.
 */
export function useSocket(options: UseSocketOptions = {}) {
  const {
    enabled = true,
    onNewOrder,
    onOrderStatusUpdate,
    onNotification,
    pollInterval = 8000,   // 8 s is plenty for a notification poll
  } = options;

  const [isConnected, setIsConnected] = useState(false);

  // ── Stable refs for callbacks ──────────────────────────────────────────
  // Storing callbacks in refs means their identity never changes, so they
  // are safe to call from inside the interval without being listed as deps.
  const onNewOrderRef        = useRef(onNewOrder);
  const onOrderStatusRef     = useRef(onOrderStatusUpdate);
  const onNotificationRef    = useRef(onNotification);

  // Keep refs current on every render without triggering effects
  onNewOrderRef.current     = onNewOrder;
  onOrderStatusRef.current  = onOrderStatusUpdate;
  onNotificationRef.current = onNotification;

  // ── Polling state ──────────────────────────────────────────────────────
  const knownOrdersRef  = useRef<Map<number, string>>(new Map()); // id → status
  const initializedRef  = useRef(false);
  const isConnectedRef  = useRef(false); // avoid setState on every successful poll

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      try {
        const orders: Order[] = await orderAPI.getAllOrders();
        if (cancelled) return;

        const isFirstRun = !initializedRef.current;

        orders.forEach((order) => {
          const prevStatus = knownOrdersRef.current.get(order.id);

          if (prevStatus === undefined) {
            // Brand-new order — only notify after the initial snapshot
            if (!isFirstRun) {
              onNewOrderRef.current?.({
                type: 'NEW_ORDER',
                title: 'New Order Placed',
                message: `${order.member?.fullName ?? 'A member'} placed a new ${order.orderType} order`,
                orderId: order.id,
                orderType: order.orderType,
                memberName: order.member?.fullName ?? 'Member',
                memberId: order.memberId,
                totalAmount: order.totalAmount,
                itemCount: order.orderItems?.length ?? 0,
                orderStatus: order.orderStatus,
                timestamp: new Date(),
              });
            }
          } else if (prevStatus !== order.orderStatus) {
            // Status changed on a known order
            onOrderStatusRef.current?.({
              type: 'ORDER_STATUS_UPDATE',
              title: 'Order Status Updated',
              message: `Order #${order.id} changed from ${prevStatus} to ${order.orderStatus}`,
              orderId: order.id,
              orderStatus: order.orderStatus,
              previousStatus: prevStatus,
              memberName: order.member?.fullName ?? 'Member',
              memberId: order.memberId,
              timestamp: new Date(),
            });
          }

          knownOrdersRef.current.set(order.id, order.orderStatus);
        });

        if (isFirstRun) initializedRef.current = true;

        // Only call setState when the value actually changes
        if (!isConnectedRef.current) {
          isConnectedRef.current = true;
          setIsConnected(true);
        }
      } catch {
        if (!cancelled && isConnectedRef.current) {
          isConnectedRef.current = false;
          setIsConnected(false);
        }
      }
    }

    // Initial poll, then on interval
    poll();
    const id = setInterval(poll, pollInterval);

    return () => {
      cancelled = true;
      clearInterval(id);
      // Reset state for next mount
      initializedRef.current  = false;
      isConnectedRef.current  = false;
      knownOrdersRef.current.clear();
    };
    // pollInterval and enabled are the only real deps — callbacks are via refs
  }, [enabled, pollInterval]);

  return { isConnected };
}
