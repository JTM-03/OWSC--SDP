import { useEffect, useState } from "react";
import { ArrowLeft, Clock, CheckCircle, Package, ChevronRight, XCircle, Loader2, Search, Filter, UtensilsCrossed } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { orderAPI, Order as APIOrder } from "../api/order";
import { toast } from "sonner@2.0.3";

interface MyOrdersProps {
  onBack: () => void;
}

export function MyOrders({ onBack }: MyOrdersProps) {
  const [orders, setOrders] = useState<APIOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<APIOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchOrders = async () => {
    try {
      const data = await orderAPI.getMyOrders();
      setOrders(data);
    } catch (error) {
      // Silent on poll
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000); // Poll every 30s for real-time updates (UC-07)
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case "pending":
      case "preparing":
        return <Clock className="w-4 h-4" />;
      case "ready":
        return <Package className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case "pending":
      case "preparing":
        return "bg-blue-100 text-blue-800 border-blue-200";
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toString().includes(searchTerm) ||
      (order.orderItems || []).some(item => item.menuItem?.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || order.orderStatus.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const activeOrders = filteredOrders.filter(o => o.orderStatus !== "Completed" && o.orderStatus !== "Cancelled");
  const completedOrders = filteredOrders.filter(o => o.orderStatus === "Completed" || o.orderStatus === "Cancelled");

  const OrderListItem = ({ order }: { order: APIOrder }) => (
    <Card
      className="cursor-pointer hover:shadow-md transition-all hover:border-secondary border border-muted"
      onClick={() => setSelectedOrder(order)}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="font-serif text-[#1a2b3c]">Order # {order.id}</h4>
              <Badge className={`${getStatusColor(order.orderStatus)} border font-medium`}>
                <span className="flex items-center gap-1">
                  {getStatusIcon(order.orderStatus)}
                  {order.orderStatus}
                </span>
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {new Date(order.orderDate).toLocaleString()}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-[#fdf2d0] text-[#1a2b3c] hover:bg-[#fdf2d0]">
                {order.orderType}
              </Badge>
              <Badge variant="outline" className="text-muted-foreground">
                {order.orderItems?.length || 0} items
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-secondary">Rs. {order.totalAmount.toLocaleString()}</p>
            <div className="flex items-center justify-end text-xs text-muted-foreground mt-1">
              Details <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
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
              <h1 className="font-serif">My Restaurant Orders</h1>
              <p className="text-white/80 text-sm mt-1">Track your dining experience in real-time</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Filters Sidebar - Matching Venue Layout */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-md border-none bg-white">
              <CardHeader className="border-b border-[#fdf2d0] pb-4">
                <CardTitle className="text-lg font-serif flex items-center gap-2">
                  <Filter className="w-5 h-5 text-secondary" />
                  Filter Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="search" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Order ID or Item..."
                      className="pl-9 h-11"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Order Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status" className="h-11">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="preparing">Preparing</SelectItem>
                      <SelectItem value="ready">Ready for Pickup</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-[#fdf2d0]/30 rounded-xl border border-[#fdf2d0]">
                  <p className="text-xs text-[#1a2b3c]/60 leading-relaxed italic">
                    Your order status updates automatically every 30 seconds.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Orders List Main Panel */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl shadow-sm">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground font-medium">Synchronizing with kitchen...</p>
              </div>
            ) : (
              <Tabs defaultValue="active" className="w-full">
                <TabsList className="bg-white p-1 rounded-xl shadow-sm mb-6 inline-flex border border-muted">
                  <TabsTrigger value="active" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-[#1a2b3c] data-[state=active]:text-white">
                    Active ({activeOrders.length})
                  </TabsTrigger>
                  <TabsTrigger value="history" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-[#1a2b3c] data-[state=active]:text-white">
                    Completed
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4">
                  {activeOrders.length === 0 ? (
                    <Card className="border-dashed py-16 bg-[#fdf2d0]/10">
                      <CardContent className="text-center">
                        <UtensilsCrossed className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-20" />
                        <h3 className="text-lg font-serif text-[#1a2b3c]">No Active Orders</h3>
                        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                          Hungry? Head over to the Restaurant to place a member order.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    activeOrders.map((order) => <OrderListItem key={order.id} order={order} />)
                  )}
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  {completedOrders.length === 0 ? (
                    <Card className="border-dashed py-16">
                      <CardContent className="text-center text-muted-foreground">
                        Your order history will appear here.
                      </CardContent>
                    </Card>
                  ) : (
                    completedOrders.map((order) => <OrderListItem key={order.id} order={order} />)
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={selectedOrder !== null} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-0 border-none shadow-2xl">
          {selectedOrder && (
            <div className="animate-in fade-in zoom-in duration-300">
              <div className="bg-[#1a2b3c] text-[#fdf2d0] p-8">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-serif mb-1">Order Summary</h2>
                    <p className="text-[#fdf2d0]/60 text-sm"># {selectedOrder.id} • {new Date(selectedOrder.orderDate).toLocaleString()}</p>
                  </div>
                  <Badge className={`${getStatusColor(selectedOrder.orderStatus)} h-8 px-4 text-xs font-bold uppercase tracking-wider`}>
                    {selectedOrder.orderStatus}
                  </Badge>
                </div>
              </div>

              <div className="p-8 space-y-8">
                {/* Order Status Timeline */}
                {selectedOrder.orderStatus !== "Cancelled" && (
                  <div className="bg-[#f8f9fa] p-6 rounded-2xl border border-muted">
                    <h4 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-6">Status Tracker</h4>
                    <div className="flex items-center justify-between relative px-4">
                      <div className="absolute top-5 left-8 right-8 h-0.5 bg-muted" />
                      <div
                        className="absolute top-5 left-8 h-0.5 bg-secondary transition-all duration-700"
                        style={{
                          width: selectedOrder.orderStatus === "Preparing" ? "33%" :
                            selectedOrder.orderStatus === "Ready" ? "66%" :
                              selectedOrder.orderStatus === "Completed" ? "100%" : "0%"
                        }}
                      />

                      {['Placed', 'Preparing', 'Ready', 'Completed'].map((step, idx) => {
                        const states = [['Pending'], ['Preparing'], ['Ready'], ['Completed']];
                        const isActive = idx === 0 || states.slice(1, idx + 1).some(s => s.includes(selectedOrder.orderStatus));

                        return (
                          <div key={step} className="relative flex flex-col items-center z-10">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 text-xs font-bold transition-colors duration-500 ${isActive ? "bg-secondary text-primary shadow-lg border-4 border-white" : "bg-white text-muted-foreground border-2 border-muted"
                              }`}>
                              {idx + 1}
                            </div>
                            <span className={`text-[10px] uppercase font-bold tracking-tighter ${isActive ? "text-[#1a2b3c]" : "text-muted-foreground"}`}>{step}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="space-y-4">
                  <h4 className="font-serif text-[#1a2b3c] flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-secondary" />
                    Kitchen Manifest
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.orderItems?.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-white border border-muted rounded-xl hover:border-secondary transition-colors">
                        <div className="flex flex-col">
                          <span className="font-medium text-[#1a2b3c]">{item.menuItem?.name || 'Manual Item'}</span>
                          <span className="text-xs text-muted-foreground font-mono">QTY: {item.quantity} × Rs. {item.unitPrice.toLocaleString()}</span>
                        </div>
                        <span className="font-bold text-[#1a2b3c]">Rs. {(item.quantity * item.unitPrice).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="bg-[#1a2b3c] text-[#fdf2d0] rounded-2xl p-6 flex justify-between items-center shadow-xl">
                  <div>
                    <p className="text-xs uppercase tracking-widest font-bold opacity-60">Total Billable Amount</p>
                    <p className="text-sm font-medium">{selectedOrder.orderType} Experience</p>
                  </div>
                  <p className="text-3xl font-bold font-serif text-secondary">Rs. {selectedOrder.totalAmount.toLocaleString()}</p>
                </div>

                <div className="text-center pt-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Loyalty points will be credited upon completion
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
