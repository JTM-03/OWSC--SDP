import { useState, useEffect } from "react";
import { ArrowLeft, Clock, CheckCircle, Package, Filter, Loader2, XCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { toast } from "sonner@2.0.3";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { orderAPI, Order } from "../api/order";

interface OrderManagementProps {
  onBack: () => void;
}

export function OrderManagement({ onBack }: OrderManagementProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const data = await orderAPI.getAllOrders();
      setOrders(data);
    } catch (error) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Optional: Polling for real-time updates
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const moveOrder = async (orderId: number, newStatus: string) => {
    try {
      await orderAPI.updateStatus(orderId, newStatus);
      toast.success(`Order #${orderId} moved to ${newStatus}`);
      fetchOrders(); // Refresh to ensure sync
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === "all" || order.orderStatus.toLowerCase() === statusFilter.toLowerCase();
    const matchesType = typeFilter === "all" || order.orderType.toLowerCase() === typeFilter.toLowerCase();
    const matchesSearch = order.id.toString().includes(searchTerm) ||
      (order.orderStatus && order.orderStatus.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesType && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
      case "new":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "preparing":
      case "in-progress":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "ready":
        return "bg-green-100 text-green-800 border-green-200";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
      case "new":
        return <Clock className="w-4 h-4" />;
      case "preparing":
      case "in-progress":
        return <Package className="w-4 h-4" />;
      case "ready":
        return <CheckCircle className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const newOrders = filteredOrders.filter(o => ["new", "pending"].includes(o.orderStatus.toLowerCase()));
  const preparingOrders = filteredOrders.filter(o => ["preparing", "in-progress"].includes(o.orderStatus.toLowerCase()));
  const readyOrders = filteredOrders.filter(o => ["ready"].includes(o.orderStatus.toLowerCase()));

  const OrderCard = ({ order }: { order: Order }) => (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Order #{order.id}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(order.orderDate).toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-2 flex-col items-end">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {order.orderType}
            </Badge>
            <Badge variant="outline" className={getStatusColor(order.orderStatus)}>
              {getStatusIcon(order.orderStatus)}
              <span className="ml-1 capitalize">{order.orderStatus}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Items:</p>
            <ul className="text-sm space-y-1">
              {order.orderItems?.map((item, idx) => (
                <li key={idx} className="text-foreground">• {item.menuItem?.name || `Item #${item.menuItemId}`} x{item.quantity}</li>
              ))}
            </ul>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-secondary font-bold">Rs. {order.totalAmount.toLocaleString()}</span>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Update Status:</p>
            <Select
              value={order.orderStatus}
              onValueChange={(value) => moveOrder(order.id, value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Preparing">Preparing</SelectItem>
                <SelectItem value="Ready">Ready</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={logo} alt="OWSC Logo" className="h-10 w-10 object-contain" />
            <div>
              <h1>Order Management</h1>
              <p className="text-white/80 mt-1">Track and manage all F&B orders</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Search</label>
                <Input
                  placeholder="Search by order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Order Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="dine-in">Dine-In</SelectItem>
                    <SelectItem value="takeaway">Takeaway</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="new">New / Pending</SelectItem>
                    <SelectItem value="preparing">Preparing</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kanban Board */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* New Orders Column */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-foreground">New Orders</h3>
                <Badge variant="secondary">{newOrders.length}</Badge>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 min-h-[600px]">
                {newOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
                {newOrders.length === 0 && (
                  <div className="text-center text-muted-foreground py-12">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No new orders</p>
                  </div>
                )}
              </div>
            </div>

            {/* Preparing Column */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-foreground">Preparing</h3>
                <Badge variant="secondary">{preparingOrders.length}</Badge>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 min-h-[600px]">
                {preparingOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
                {preparingOrders.length === 0 && (
                  <div className="text-center text-muted-foreground py-12">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No orders in preparation</p>
                  </div>
                )}
              </div>
            </div>

            {/* Ready Column */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-foreground">Ready for Pickup</h3>
                <Badge variant="secondary">{readyOrders.length}</Badge>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 min-h-[600px]">
                {readyOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
                {readyOrders.length === 0 && (
                  <div className="text-center text-muted-foreground py-12">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No orders ready</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}