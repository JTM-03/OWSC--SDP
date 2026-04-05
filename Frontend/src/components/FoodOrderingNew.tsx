import image_f71919f55545e0b2e304de8c2304372a8e5dc0f1 from 'figma:asset/f71919f55545e0b2e304de8c2304372a8e5dc0f1.png';
import image_a2235e0be91c8a429694b55c15465c0eeeadc8da from 'figma:asset/a2235e0be91c8a429694b55c15465c0eeeadc8da.png';
import image_123371414d98a3cea5f4c83669ef23e200519f33 from 'figma:asset/123371414d98a3cea5f4c83669ef23e200519f33.png';
import softDrinkImage from 'figma:asset/705c5ff88ba381a18cfab1193e3091cbf620c813.png';
import beefKottuImage from 'figma:asset/397282a1c0d10719e542f516204ae8a864e780db.png';
import fruitJuiceImage from 'figma:asset/ae78ae4fc8f42c7dff16ad24d77ed0a01e5eb981.png';
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Minus, ShoppingCart, Trash2, Search, CheckCircle2, Tag, UtensilsCrossed, CreditCard, Wallet, Upload, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { getImageUrl } from "../utils/image";
import { ImageWithFallback } from "./figma/ImageWithFallback";

import { toast } from "sonner@2.0.3";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { menuAPI, MenuItem as APIMenuItem } from "../api/menu";
import { orderAPI } from "../api/order";

interface FoodOrderingProps {
  onBack: () => void;
}

interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  inStock: boolean;
}

interface CartItem extends MenuItem {
  quantity: number;
}

type OrderStep = 'cart' | 'payment-method' | 'online-payment' | 'order-confirmed';

export function FoodOrdering({ onBack }: FoodOrderingProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [activeTab, setActiveTab] = useState("menu");
  const [orderStep, setOrderStep] = useState<OrderStep>('cart');
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway">("dine-in");

  const SERVICE_CHARGE_RATE = 0.10; // 10% Service Charge
  const [onlinePaymentType, setOnlinePaymentType] = useState<string>("");
  const [paymentDetails, setPaymentDetails] = useState({
    accountNumber: '',
    transactionId: '',
    receiptFile: null as File | null,
  });

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const data = await menuAPI.getAllItems();
        // Map API data to component MenuItem interface
        const mappedData: MenuItem[] = data.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category.toLowerCase(),
          price: item.price,
          image: getImageUrl(item.imageUrl) || "https://images.unsplash.com/photo-1581184953987-5668072c8420?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwcmljZSUyMGFzaWFufGVufDF8fHx8MTc2MDg3OTg3M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
          description: item.description || `Delicious ${item.name} from our ${item.category} menu.`,
          inStock: item.availabilityStatus === 'Available'
        }));
        setMenuItems(mappedData);
      } catch (error) {
        // toast.error("Failed to fetch menu");
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
    const interval = setInterval(fetchMenu, 60000); // 1 minute for menu
    return () => clearInterval(interval);
  }, []);

  const categories = [
    { id: "all", name: "All Items" },
    { id: "starters", name: "Starters" },
    { id: "mains", name: "Main Course" },
    { id: "desserts", name: "Desserts" },
    { id: "beverages", name: "Beverages" },
  ];



  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (item: MenuItem) => {
    if (!item.inStock) {
      toast.error("This item is currently out of stock");
      return;
    }

    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
    toast.success(`${item.name} added to cart`);
    setShowCart(true);
  };

  const updateQuantity = (id: number, change: number) => {
    setCart(cart.map(item =>
      item.id === id
        ? { ...item, quantity: Math.max(1, item.quantity + change) }
        : item
    ).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(item => item.id !== id));
    toast.success("Item removed from cart");
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    setShowCart(false);

    if (paymentMethod === 'cash') {
      // For cash payment, directly create order with "Payment Due" status
      handleCashPayment();
    } else {
      // For online payment, show payment gateway dialog
      setOrderStep('online-payment');
      setShowOrderDialog(true);
    }
  };

  const handleCashPayment = async () => {
    try {
      await orderAPI.createOrder({
        orderType: 'Dine-in',
        items: cart.map(item => ({
          menuItemId: item.id,
          quantity: item.quantity
        }))
      });

      setCart([]);
      setPaymentMethod("");
      setShowPaymentOptions(false);
      setOrderStep('order-confirmed');
      setShowOrderDialog(true);
      toast.success("Order placed successfully! Payment due on delivery.");
    } catch (error: any) {
      const message = error.response?.data?.error || "Failed to place order";
      toast.error(message);
    }
  };

  const handlePaymentMethodContinue = async () => {
    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    if (paymentMethod === 'cash') {
      try {
        await orderAPI.createOrder({
          orderType: 'Dine-in', // Default for now
          items: cart.map(item => ({
            menuItemId: item.id,
            quantity: item.quantity
          }))
        });
        setOrderStep('order-confirmed');
      } catch (error: any) {
        const message = error.response?.data?.error || "Failed to place order";
        toast.error(message);
      }
    } else {
      setOrderStep('online-payment');
    }
  };

  const handleOnlinePaymentSubmit = async () => {
    if (!onlinePaymentType) {
      toast.error("Please select a payment method");
      return;
    }

    if (onlinePaymentType === 'bank' && !paymentDetails.receiptFile) {
      toast.error("Please upload payment receipt");
      return;
    }

    if (onlinePaymentType !== 'bank' && !paymentDetails.accountNumber) {
      toast.error("Please enter your account number");
      return;
    }

    if (onlinePaymentType !== 'bank' && !paymentDetails.transactionId) {
      toast.error("Please enter transaction ID");
      return;
    }

    try {
      await orderAPI.createOrder({
        orderType: 'Dine-in',
        items: cart.map(item => ({
          menuItemId: item.id,
          quantity: item.quantity
        }))
      });

      setCart([]);
      setPaymentMethod("");
      setShowPaymentOptions(false);
      setOnlinePaymentType("");
      setPaymentDetails({ accountNumber: '', transactionId: '', receiptFile: null });
      setOrderStep('order-confirmed');
      toast.success("Payment successful! Order placed.");
    } catch (error: any) {
      const message = error.response?.data?.error || "Failed to place order";
      toast.error(message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentDetails({ ...paymentDetails, receiptFile: e.target.files[0] });
    }
  };

  const handleCloseDialog = () => {
    setShowOrderDialog(false);
    setCart([]);
    setOrderStep('payment-method');
    setPaymentMethod("");
    setOnlinePaymentType("");
    setPaymentDetails({
      accountNumber: '',
      transactionId: '',
      receiptFile: null,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-8">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
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
                <h1>Restaurant & Bar</h1>
                <p className="text-white/80 mt-1">Order food & beverages</p>
              </div>
            </div>
            <Button
              className="bg-secondary text-primary hover:bg-secondary/90 relative"
              onClick={() => {
                console.log("Cart button clicked! Current state:", showCart);
                setShowCart(!showCart);
              }}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Cart ({cart.length})
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-1 mb-8">
            <TabsTrigger value="menu" className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4" />
              Menu
            </TabsTrigger>
          </TabsList>

          {/* Menu Tab */}
          <TabsContent value="menu" className="mt-0">
            <div>
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search food items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 h-12"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="mb-8">
                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-2">
                    {categories.map(category => (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.id ? "default" : "outline"}
                        onClick={() => setSelectedCategory(category.id)}
                        className={selectedCategory === category.id ? "bg-primary text-white" : ""}
                      >
                        {category.name}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Menu Grid */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">Loading menu items...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-muted-foreground mb-2">No items found</h3>
                    <p className="text-sm text-muted-foreground">Try adjusting your search or filter</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredItems.map((item) => (
                    <Card key={item.id} className={`overflow-hidden ${!item.inStock ? 'opacity-60' : ''}`}>
                      <div className="relative h-48 bg-muted">
                        <ImageWithFallback
                          src={item.image}
                          alt={item.name}
                          className={`w-full h-full ${item.category === 'beverages' ? 'object-contain' : 'object-cover'}`}
                        />
                        {!item.inStock && (
                          <Badge className="absolute top-2 right-2 bg-destructive">
                            Out of Stock
                          </Badge>
                        )}
                      </div>
                      <CardHeader>
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <CardDescription>{item.description}</CardDescription>
                      </CardHeader>
                      <CardFooter className="flex justify-between items-center">
                        <span className="text-secondary">Rs. {item.price.toLocaleString()}</span>
                        <Button
                          size="sm"
                          onClick={() => addToCart(item)}
                          disabled={!item.inStock}
                          className="bg-primary text-white"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>


        </Tabs>
      </div>

      {/* Cart Side Sheet */}
      {/* Cart Side Sheet (Manual Implementation) */}
      {showCart && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setShowCart(false)}
          />

          {/* Side Panel */}
          <div className="relative w-full sm:max-w-lg h-full bg-background shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 pb-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Your Cart ({cart.length} items)</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowCart(false)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>

            <div className="px-6 py-2 border-b bg-muted/20">
              <p className="text-sm text-muted-foreground">Review your order and select payment method</p>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center py-16 text-muted-foreground px-6">
                <div>
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Your cart is empty</p>
                  <p className="text-sm mt-2">Add items from the menu to get started</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 px-6 overflow-y-auto custom-scrollbar">
                  <div className="space-y-4 py-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
                        <div className="w-20 h-20 bg-muted rounded overflow-hidden flex-shrink-0">
                          <ImageWithFallback
                            src={item.image}
                            alt={item.name}
                            className={`w-full h-full ${item.category === 'beverages' ? 'object-contain' : 'object-cover'}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="truncate font-medium">{item.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                          <p className="text-secondary mt-1 font-semibold">Rs. {item.price.toLocaleString()}</p>
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.id, -1)}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="w-10 text-center font-medium">{item.quantity}</span>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.id, 1)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                          <p className="text-sm mt-2 text-right font-medium">
                            Subtotal: Rs. {(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 border-t bg-muted/30 space-y-4">
                  {/* Order Type Selection */}
                  {!showPaymentOptions && (
                    <div className="bg-background p-3 rounded-lg border w-full">
                      <Label className="text-sm font-medium mb-2 block">Order Type</Label>
                      <RadioGroup
                        value={orderType}
                        onValueChange={(val: "dine-in" | "takeaway") => setOrderType(val)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="dine-in" id="dt-dine-in" />
                          <Label htmlFor="dt-dine-in" className="cursor-pointer">Dine-in</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="takeaway" id="dt-takeaway" />
                          <Label htmlFor="dt-takeaway" className="cursor-pointer">Takeaway</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">Rs. {cart.reduce((total, item) => total + item.price * item.quantity, 0).toLocaleString()}</span>
                    </div>

                    {orderType === 'dine-in' && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Service Charge (10%)</span>
                        <span>Rs. {(cart.reduce((total, item) => total + item.price * item.quantity, 0) * SERVICE_CHARGE_RATE).toLocaleString()}</span>
                      </div>
                    )}

                    <Separator className="my-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total</span>
                      <span className="text-secondary text-2xl font-bold">
                        Rs. {(
                          cart.reduce((total, item) => total + item.price * item.quantity, 0) *
                          (orderType === 'dine-in' ? (1 + SERVICE_CHARGE_RATE) : 1)
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {!showPaymentOptions ? (
                    <Button
                      className="w-full bg-primary text-white"
                      onClick={() => setShowPaymentOptions(true)}
                      size="lg"
                    >
                      Proceed to Payment
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <Label className="text-base font-semibold">Select Payment Method</Label>
                        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                          <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                            <RadioGroupItem value="cash" id="cash" />
                            <Label htmlFor="cash" className="flex-1 cursor-pointer">
                              <div className="flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-primary" />
                                <div>
                                  <p className="font-medium">Cash Payment</p>
                                  <p className="text-sm text-muted-foreground">Pay when you receive your order</p>
                                </div>
                              </div>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                            <RadioGroupItem value="online" id="online" />
                            <Label htmlFor="online" className="flex-1 cursor-pointer">
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-primary" />
                                <div>
                                  <p className="font-medium">Online Payment</p>
                                  <p className="text-sm text-muted-foreground">Pay now via eZ Cash, mCash, or Bank Transfer</p>
                                </div>
                              </div>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setShowPaymentOptions(false);
                            setPaymentMethod("");
                          }}
                        >
                          Back
                        </Button>
                        <Button
                          className="flex-1 bg-primary text-white"
                          onClick={handleCheckout}
                          disabled={!paymentMethod}
                          size="lg"
                        >
                          Confirm Order
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Order Flow Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={(open) => {
        if (!open && orderStep !== 'order-confirmed') {
          setShowOrderDialog(false);
        } else if (!open && orderStep === 'order-confirmed') {
          handleCloseDialog();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Payment Method Selection */}
          {orderStep === 'payment-method' && (
            <>
              <DialogHeader>
                <DialogTitle>Select Payment Method</DialogTitle>
                <DialogDescription>
                  Choose how you would like to pay for your order
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-6">
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <Card className={`cursor-pointer transition-all ${paymentMethod === 'cash' ? 'border-secondary border-2' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <RadioGroupItem value="cash" id="cash" />
                        <Label htmlFor="cash" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <Wallet className="w-8 h-8 text-secondary" />
                            <div>
                              <h4 className="text-foreground">Cash on Pickup</h4>
                              <p className="text-sm text-muted-foreground">Pay when you collect your order</p>
                            </div>
                          </div>
                        </Label>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`cursor-pointer transition-all ${paymentMethod === 'online' ? 'border-secondary border-2' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <RadioGroupItem value="online" id="online" />
                        <Label htmlFor="online" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-8 h-8 text-secondary" />
                            <div>
                              <h4 className="text-foreground">Online Payment</h4>
                              <p className="text-sm text-muted-foreground">Pay now via eZ Cash, mCash, or Bank Transfer</p>
                            </div>
                          </div>
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                </RadioGroup>

                {/* Order Summary */}
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.quantity}x {item.name}</span>
                          <span className="text-foreground">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                      <Separator className="my-3" />
                      <div className="flex justify-between items-center">
                        <span className="text-foreground">Total Amount:</span>
                        <span className="text-secondary text-xl">Rs. {getTotalPrice().toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => {
                    setShowOrderDialog(false);
                    setShowCart(true);
                  }}>
                    Back to Cart
                  </Button>
                  <Button className="bg-primary text-white" onClick={handlePaymentMethodContinue}>
                    Continue
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Online Payment Portal */}
          {orderStep === 'online-payment' && (
            <>
              <DialogHeader>
                <DialogTitle>Complete Online Payment</DialogTitle>
                <DialogDescription>
                  Enter your payment details to complete the order
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-6">
                {/* Payment Method Selection */}
                <div className="space-y-2">
                  <Label htmlFor="online-payment-type">Select Payment Method</Label>
                  <Select value={onlinePaymentType} onValueChange={setOnlinePaymentType}>
                    <SelectTrigger id="online-payment-type">
                      <SelectValue placeholder="Choose payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ezcash">Dialog eZ Cash</SelectItem>
                      <SelectItem value="mcash">Mobitel mCash</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {onlinePaymentType && (
                  <>
                    {/* Payment Instructions */}
                    <Card className="bg-muted/50">
                      <CardHeader>
                        <CardTitle className="text-lg">Payment Instructions</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        {onlinePaymentType === 'ezcash' && (
                          <>
                            <p><strong>Send money to:</strong> 077 123 4567</p>
                            <p><strong>Recipient Name:</strong> Old Wesleyites Sports Club</p>
                            <p><strong>Amount:</strong> Rs. {getTotalPrice().toLocaleString()}</p>
                          </>
                        )}
                        {onlinePaymentType === 'mcash' && (
                          <>
                            <p><strong>Send money to:</strong> 071 123 4567</p>
                            <p><strong>Recipient Name:</strong> OWSC Restaurant</p>
                            <p><strong>Amount:</strong> Rs. {getTotalPrice().toLocaleString()}</p>
                          </>
                        )}
                        {onlinePaymentType === 'bank' && (
                          <>
                            <p><strong>Bank:</strong> Commercial Bank of Ceylon</p>
                            <p><strong>Account Name:</strong> Old Wesleyites Sports Club</p>
                            <p><strong>Account Number:</strong> 1234567890</p>
                            <p><strong>Branch:</strong> Colombo 07</p>
                            <p><strong>Amount:</strong> Rs. {getTotalPrice().toLocaleString()}</p>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {/* Payment Details Form */}
                    {onlinePaymentType === 'bank' ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="receipt">Upload Payment Receipt</Label>
                          <Input
                            id="receipt"
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileChange}
                          />
                          {paymentDetails.receiptFile && (
                            <p className="text-sm text-green-600 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4" />
                              {paymentDetails.receiptFile.name}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="account-number">Your Account Number</Label>
                          <Input
                            id="account-number"
                            type="text"
                            placeholder="e.g., 077 123 4567"
                            value={paymentDetails.accountNumber}
                            onChange={(e) => setPaymentDetails({ ...paymentDetails, accountNumber: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="transaction-id">Transaction ID</Label>
                          <Input
                            id="transaction-id"
                            type="text"
                            placeholder="Enter transaction reference number"
                            value={paymentDetails.transactionId}
                            onChange={(e) => setPaymentDetails({ ...paymentDetails, transactionId: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setOrderStep('payment-method')}>
                    Back
                  </Button>
                  <Button className="bg-primary text-white" onClick={handleOnlinePaymentSubmit}>
                    Complete Payment
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Order Confirmed */}
          {orderStep === 'order-confirmed' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-6 h-6" />
                  Order Confirmed!
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-6 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-foreground">Your order has been placed successfully!</h3>
                  <p className="text-muted-foreground">
                    {paymentMethod === 'cash'
                      ? "Please pay when you collect your order at the restaurant."
                      : "Your payment has been received and is being verified."}
                  </p>
                </div>

                <Card className="bg-green-50 border-green-200">
                  <CardContent className="py-4 text-sm text-left space-y-2 text-green-800">
                    <p>✓ Order Number: #{Math.floor(Math.random() * 10000)}</p>
                    <p>✓ Estimated preparation time: 15-20 minutes</p>
                    <p>✓ You will be notified when your order is ready</p>
                    {paymentMethod === 'online' && <p>✓ Payment will be verified within 5 minutes</p>}
                  </CardContent>
                </Card>

                <Button className="w-full bg-primary text-white" onClick={handleCloseDialog}>
                  Done
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
