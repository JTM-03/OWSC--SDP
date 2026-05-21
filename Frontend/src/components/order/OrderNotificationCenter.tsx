import { useState, useCallback, useRef } from 'react';
import { Bell, X, AlertCircle, Clock, ShoppingBag } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useSocket } from '../../hooks/useSocket';
import { toast } from 'sonner@2.0.3';

interface OrderNotification {
  id: string;
  type: 'NEW_ORDER' | 'ORDER_STATUS_UPDATE';
  title: string;
  message: string;
  orderId?: number;
  orderType?: string;
  memberName?: string;
  totalAmount?: number;
  itemCount?: number;
  orderStatus?: string;
  timestamp: Date;
  read: boolean;
}

interface OrderNotificationCenterProps {
  onOrderClick?: (orderId: number) => void;
  autoHideDuration?: number;
}

export function OrderNotificationCenter({
  onOrderClick,
  autoHideDuration = 8000,
}: OrderNotificationCenterProps) {
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const autoHideRef = useRef(autoHideDuration);
  autoHideRef.current = autoHideDuration;

  const handleNewOrder = useCallback((notification: any) => {
    const id = `order-${notification.orderId}-${Date.now()}`;
    const newNotif: OrderNotification = {
      id,
      type: 'NEW_ORDER',
      title: notification.title,
      message: notification.message,
      orderId: notification.orderId,
      orderType: notification.orderType,
      memberName: notification.memberName,
      totalAmount: notification.totalAmount,
      itemCount: notification.itemCount,
      orderStatus: notification.orderStatus,
      timestamp: new Date(notification.timestamp),
      read: false,
    };

    setNotifications(prev => [newNotif, ...prev.slice(0, 49)]);
    setUnreadCount(prev => prev + 1);

    toast.success(notification.title, {
      description: notification.message,
      duration: autoHideRef.current,
    });

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, autoHideRef.current);
  }, []);

  const handleOrderStatusUpdate = useCallback((data: any) => {
    const id = `status-${data.orderId}-${Date.now()}`;
    const newNotif: OrderNotification = {
      id,
      type: 'ORDER_STATUS_UPDATE',
      title: data.title,
      message: data.message,
      orderId: data.orderId,
      orderStatus: data.orderStatus,
      timestamp: new Date(data.timestamp),
      read: false,
    };

    setNotifications(prev => [newNotif, ...prev.slice(0, 49)]);
    setUnreadCount(prev => prev + 1);

    toast.info(data.title, {
      description: data.message,
      duration: autoHideRef.current,
    });

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, autoHideRef.current);
  }, []);

  const { isConnected } = useSocket({
    onNewOrder: handleNewOrder,
    onOrderStatusUpdate: handleOrderStatusUpdate,
  });

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const removeNotification = (id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (notif && !notif.read) setUnreadCount(prev => Math.max(0, prev - 1));
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // ── Render: inline header widget (no fixed positioning) ────────────────
  return (
    <div className="relative">
      {/* Bell button — styled to sit in a dark header */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* Live indicator dot */}
        <span
          className={`absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-primary ${
            isConnected ? 'bg-emerald-400' : 'bg-slate-500'
          }`}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <>
          {/* Backdrop — closes panel on outside click */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 top-full mt-2 w-[22rem] z-50 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[32rem]">

            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white flex-shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-sm text-slate-800">Notifications</span>
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0 h-4 rounded-full">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-700" onClick={() => setIsOpen(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto flex-1 min-h-0">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <Bell className="w-5 h-5 opacity-50" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">All caught up</p>
                  <p className="text-xs text-slate-400 mt-1">New orders will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map(notif => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 transition-colors ${
                        notif.read ? 'bg-white' : 'bg-blue-50/40'
                      } hover:bg-slate-50`}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
                          notif.type === 'NEW_ORDER' ? 'bg-orange-100' : 'bg-blue-100'
                        }`}>
                          {notif.type === 'NEW_ORDER'
                            ? <ShoppingBag className="w-4 h-4 text-orange-600" />
                            : <Clock className="w-4 h-4 text-blue-600" />
                          }
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-sm font-semibold text-slate-800 leading-tight">
                              {notif.title}
                            </p>
                            <button
                              onClick={() => removeNotification(notif.id)}
                              className="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors mt-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                            {notif.message}
                          </p>

                          {/* Order details pill */}
                          {notif.type === 'NEW_ORDER' && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                #{notif.orderId}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                                {notif.orderType}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                {notif.itemCount} item{(notif.itemCount ?? 0) !== 1 ? 's' : ''}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                                Rs. {notif.totalAmount?.toLocaleString()}
                              </span>
                            </div>
                          )}

                          {notif.type === 'ORDER_STATUS_UPDATE' && (
                            <div className="mt-2 flex gap-1.5">
                              <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                #{notif.orderId}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                {notif.orderStatus}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[11px] text-slate-400">
                              {notif.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {notif.type === 'NEW_ORDER' && (
                              <button
                                onClick={() => {
                                  onOrderClick?.(notif.orderId!);
                                  removeNotification(notif.id);
                                  setIsOpen(false);
                                }}
                                className="text-[11px] font-semibold text-primary hover:underline"
                              >
                                View order →
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                <p className="text-[11px] text-slate-400 text-center">
                  Showing {notifications.length} recent notification{notifications.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
