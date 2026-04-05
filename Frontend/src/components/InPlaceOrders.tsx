import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Minus, ShoppingCart, User, Loader2, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner@2.0.3";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { menuAPI, MenuItem } from "../api/menu";
import { orderAPI } from "../api/order";

interface InPlaceOrdersProps {
  onBack: () => void;
}

interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
}

export function InPlaceOrders({ onBack }: InPlaceOrdersProps) {
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoading(true);
        const data = await menuAPI.getAllItems();
        setMenuItems(data);
      } catch (error) {
        toast.error("Failed to load menu items");
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const addToOrder = (item: MenuItem) => {
    const existingItem = orderItems.find(oi => oi.menuItem.id === item.id);
    if (existingItem) {
      setOrderItems(orderItems.map(oi =>
        oi.menuItem.id === item.id
          ? { ...oi, quantity: oi.quantity + 1 }
          : oi
      ));
    } else {
      setOrderItems([...orderItems, { menuItem: item, quantity: 1 }]);
    }
    toast.success(`Added ${item.name} to order`);
  };

  const updateQuantity = (itemId: number, delta: number) => {
    setOrderItems(orderItems.map(oi => {
      if (oi.menuItem.id === itemId) {
        const newQuantity = oi.quantity + delta;
        return { ...oi, quantity: newQuantity };
      }
      return oi;
    }).filter(oi => oi.quantity > 0));
  };

  const removeFromOrder = (itemId: number) => {
    setOrderItems(orderItems.filter(oi => oi.menuItem.id !== itemId));
  };

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => total + (item.menuItem.price * item.quantity), 0);
  };

  const handleSubmitOrder = async () => {
    if (!customerName || !tableNumber || orderItems.length === 0) {
      toast.error("Please complete all fields and add items to order");
      return;
    }

    try {
      // Backend expects: orderType, items: [{ menuItemId, quantity }]
      // Note: Backend might rely on logged-in user context. 
      // For "In-Place", we might need to handle "Memberless" orders or assign to a generic "Walk-in" or the logged-in staff.
      // Assuming 'Dine-in' type for in-place.

      await orderAPI.createOrder({
        orderType: 'Dine-in',
        items: orderItems.map(item => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity
        }))
      });

      toast.success("Order placed successfully!", {
        description: `Order for ${customerName} at Table ${tableNumber} has been sent to kitchen`,
      });

      // Reset form
      setCustomerName("");
      setTableNumber("");
      setOrderItems([]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to place order");
    }
  };

  const normalizeCategory = (cat: string) => {
    // Backend categories might be capitalized or differ slightly
    // Let's normalize to lowercase map
    const map: { [key: string]: string } = {
      'starters': 'starters',
      'starter': 'starters',
      'mains': 'mains',
      'main': 'mains',
      'desserts': 'desserts',
      'dessert': 'desserts',
      'beverages': 'beverages',
      'beverage': 'beverages',
      'drinks': 'beverages'
    };
    return map[cat.toLowerCase()] || 'other';
  };

  const starterItems = menuItems.filter(item => normalizeCategory(item.category) === "starters");
  const mainItems = menuItems.filter(item => normalizeCategory(item.category) === "mains");
  const dessertItems = menuItems.filter(item => normalizeCategory(item.category) === "desserts");
  const beverageItems = menuItems.filter(item => normalizeCategory(item.category) === "beverages");

  const MenuItemCard = ({ item }: { item: MenuItem }) => {
    const inOrder = orderItems.find(oi => oi.menuItem.id === item.id);
    const isAvailable = item.availabilityStatus === 'Available'; // Check backend field

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <h4 className="text-foreground">{item.name}</h4>
              <p className="text-secondary">Rs. {item.price.toLocaleString()}</p>
            </div>
            {inOrder && (
              <Badge variant="secondary" className="ml-2">
                {inOrder.quantity}
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            className="w-full bg-primary text-white"
            onClick={() => addToOrder(item)}
            disabled={!isAvailable}
          >
            {isAvailable ? <Plus className="w-4 h-4 mr-1" /> : null}
            {isAvailable ? "Add" : "Unavailable"}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg sticky top-0 z-40">
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
              <h1>In-Place Order</h1>
              <p className="text-white/80 mt-1">Record dine-in orders</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu Items */}
          <div className="lg:col-span-2">
            {/* Customer Details */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Customer Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tableNumber">Table Number</Label>
                    <Input
                      id="tableNumber"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="e.g., T-12"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Menu Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Menu</CardTitle>
                <CardDescription>Select items to add to order</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                ) : (
                  <Tabs defaultValue="starters">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="starters">Starters</TabsTrigger>
                      <TabsTrigger value="mains">Mains</TabsTrigger>
                      <TabsTrigger value="desserts">Desserts</TabsTrigger>
                      <TabsTrigger value="beverages">Beverages</TabsTrigger>
                    </TabsList>

                    <TabsContent value="starters" className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {starterItems.length > 0 ? starterItems.map(item => (
                          <MenuItemCard key={item.id} item={item} />
                        )) : <p className="text-muted-foreground text-center col-span-2">No starters found.</p>}
                      </div>
                    </TabsContent>

                    <TabsContent value="mains" className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {mainItems.length > 0 ? mainItems.map(item => (
                          <MenuItemCard key={item.id} item={item} />
                        )) : <p className="text-muted-foreground text-center col-span-2">No mains found.</p>}
                      </div>
                    </TabsContent>

                    <TabsContent value="desserts" className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dessertItems.length > 0 ? dessertItems.map(item => (
                          <MenuItemCard key={item.id} item={item} />
                        )) : <p className="text-muted-foreground text-center col-span-2">No desserts found.</p>}
                      </div>
                    </TabsContent>

                    <TabsContent value="beverages" className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {beverageItems.length > 0 ? beverageItems.map(item => (
                          <MenuItemCard key={item.id} item={item} />
                        )) : <p className="text-muted-foreground text-center col-span-2">No beverages found.</p>}
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Current Order
                </CardTitle>
                {customerName && tableNumber && (
                  <CardDescription>
                    {customerName} - Table {tableNumber}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {orderItems.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                    <p className="text-muted-foreground">No items added</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {orderItems.map(item => (
                        <div key={item.menuItem.id} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                          <div className="flex-1">
                            <p className="text-sm">{item.menuItem.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Rs. {item.menuItem.price.toLocaleString()} each
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.menuItem.id, -1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.menuItem.id, 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 ml-2"
                              onClick={() => removeFromOrder(item.menuItem.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>Rs. {calculateTotal().toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service Charge (10%)</span>
                        <span>Rs. {(calculateTotal() * 0.1).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-lg">Total</span>
                        <span className="text-secondary text-xl">
                          Rs. {(calculateTotal() * 1.1).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full bg-secondary text-primary hover:bg-secondary/90"
                      onClick={handleSubmitOrder}
                    >
                      Place Order
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
