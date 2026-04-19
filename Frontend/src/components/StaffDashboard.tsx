import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ClipboardList, LogOut, UtensilsCrossed, Loader2 } from "lucide-react";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { orderAPI, Order } from "../api/order";
import { OrderNotificationCenter } from "./OrderNotificationCenter";

interface StaffDashboardProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

interface TodayStats {
  total: number;
  dineIn: number;
  takeaway: number;
}

export function StaffDashboard({ onNavigate, onLogout }: StaffDashboardProps) {
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchTodayStats = async () => {
      try {
        const orders = await orderAPI.getAllOrders();

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayOrders = (Array.isArray(orders) ? orders : []).filter((o: Order) => {
          return new Date(o.orderDate) >= todayStart;
        });

        const dineIn   = todayOrders.filter(o => o.orderType === 'Dine-in').length;
        const takeaway = todayOrders.filter(o => o.orderType === 'Takeaway').length;

        setStats({ total: todayOrders.length, dineIn, takeaway });
      } catch {
        setStats({ total: 0, dineIn: 0, takeaway: 0 });
      } finally {
        setLoadingStats(false);
      }
    };

    fetchTodayStats();
    const interval = setInterval(fetchTodayStats, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: logo + title */}
            <div className="flex items-center gap-4">
              <img src={logo} alt="OWSC Logo" className="h-10 w-10 object-contain" />
              <div>
                <h1 className="text-xl font-bold leading-tight">Staff Portal</h1>
                <p className="text-white/70 text-xs">Operations Management</p>
              </div>
            </div>

            {/* Right: notification bell + logout */}
            <div className="flex items-center gap-2">
              <OrderNotificationCenter
                onOrderClick={() => onNavigate('orders')}
              />

              {/* Divider */}
              <div className="w-px h-6 bg-white/20 mx-1" />

              <Button
                variant="ghost"
                className="text-white/80 hover:text-white hover:bg-white/10 gap-2 text-sm"
                onClick={onLogout}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-primary mb-2">Welcome, Staff Member</h2>
          <p className="text-muted-foreground">
            Manage daily operations and customer orders
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="w-5 h-5 text-purple-500" />
                Today's Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading…</span>
                </div>
              ) : (
                <>
                  <p className="text-3xl text-primary mb-3">{stats?.total ?? 0}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Dine-In:</span>
                      <span className="text-foreground">{stats?.dineIn ?? 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Take-Away:</span>
                      <span className="text-foreground">{stats?.takeaway ?? 0}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => onNavigate('inplace-orders')}>
            <CardHeader>
              <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <UtensilsCrossed className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle>In-Place Orders</CardTitle>
              <CardDescription>
                Record dine-in orders for customers at tables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Record Order
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => onNavigate('orders')}>
            <CardHeader>
              <div className="w-14 h-14 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                <ClipboardList className="w-8 h-8 text-teal-600" />
              </div>
              <CardTitle>Order Management</CardTitle>
              <CardDescription>
                View and manage customer orders for food and beverages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Orders
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
