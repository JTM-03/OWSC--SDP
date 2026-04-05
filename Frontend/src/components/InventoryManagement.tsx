import { useEffect, useState } from "react";
import { ArrowLeft, Search, Plus, Package, Loader2, Truck, CheckCircle, XCircle, Undo2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { toast } from "sonner@2.0.3";
import { inventoryAPI, InventoryItem as APIInventoryItem } from "../api/inventory";
import { supplierAPI, Supplier } from "../api/suppliers";
import { deliveryAPI, Delivery } from "../api/deliveries";
import { Trash2, Phone, Mail, User } from "lucide-react";

interface InventoryManagementProps {
  onBack: () => void;
}

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  unit: string;
  lastDelivery: string;
}

export function InventoryManagement({ onBack }: InventoryManagementProps) {
  const [items, setItems] = useState<APIInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "critical" | "low" | "good">("all");
  const [deliveryQuantity, setDeliveryQuantity] = useState("");
  const [deliverySupplierId, setDeliverySupplierId] = useState("");
  const [selectedItem, setSelectedItem] = useState<APIInventoryItem | null>(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    productName: "",
    category: "Ingredients",
    unit: "kg",
    reorderLevel: "10",
    initialQuantity: "0"
  });

  const [returns, setReturns] = useState<any[]>([]);

  // Supplier State


  // Delivery State
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    supplierId: "",
    items: [] as { productId: number; productName: string; quantity: number }[]
  });
  const [currentOrderItem, setCurrentOrderItem] = useState({ productId: "", quantity: "" });

  const [activeTab, setActiveTab] = useState<'inventory' | 'suppliers' | 'deliveries' | 'returns'>('inventory');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: ""
  });

  // Return State
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [returnItem, setReturnItem] = useState({
    productId: "",
    supplierId: "",
    quantity: "",
    reason: ""
  });

  const handleCreateProduct = async () => {
    if (!newItem.productName || !newItem.category || !newItem.unit) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await inventoryAPI.createProduct({
        productName: newItem.productName,
        category: newItem.category,
        unit: newItem.unit,
        reorderLevel: parseFloat(newItem.reorderLevel) || 10,
        initialQuantity: parseFloat(newItem.initialQuantity) || 0
      });
      toast.success("Product created successfully");
      setIsAddDialogOpen(false);
      setNewItem({
        productName: "",
        category: "Ingredients",
        unit: "kg",
        reorderLevel: "10",
        initialQuantity: "0"
      });
      fetchInventory();
    } catch (error) {
      toast.error("Failed to create product");
    }
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchInventory = async () => {
    try {
      const data = await inventoryAPI.getAll();
      setItems(data);
    } catch (error) {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchInventory();
    fetchSuppliers();
    fetchDeliveries();
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const data = await inventoryAPI.getReturns();
      setReturns(data);
    } catch (error) {
      // silent error
    }
  };

  const fetchDeliveries = async () => {
    try {
      const data = await deliveryAPI.getAll();
      setDeliveries(data);
    } catch (error) {
      // silent error
    }
  };

  const handleCreateOrder = async () => {
    if (!newOrder.supplierId || newOrder.items.length === 0) {
      toast.error("Please select a supplier and add at least one item");
      return;
    }

    try {
      await deliveryAPI.create({
        supplierId: parseInt(newOrder.supplierId),
        items: newOrder.items.map(i => ({ productId: i.productId, quantity: i.quantity }))
      });
      toast.success("Order placed successfully");
      setIsOrderDialogOpen(false);
      setNewOrder({ supplierId: "", items: [] });
      fetchDeliveries();
    } catch (error) {
      toast.error("Failed to place order");
    }
  };

  const handleUpdateDeliveryStatus = async (id: number, status: string) => {
    try {
      await deliveryAPI.updateStatus(id, status);
      toast.success(`Order marked as ${status}`);
      fetchDeliveries();
      // If completed, we might want to refresh inventory too if logic was added there
      if (status === 'Completed') fetchInventory();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const addItemToOrder = () => {
    if (!currentOrderItem.productId || !currentOrderItem.quantity) return;
    const product = items.find(i => i.productId === parseInt(currentOrderItem.productId));
    if (!product) return;

    setNewOrder({
      ...newOrder,
      items: [...newOrder.items, {
        productId: product.productId,
        productName: product.product.productName,
        quantity: parseFloat(currentOrderItem.quantity)
      }]
    });
    setCurrentOrderItem({ productId: "", quantity: "" });
  };

  const fetchSuppliers = async () => {
    try {
      const data = await supplierAPI.getAll();
      setSuppliers(data);
    } catch (error) {
      // silent error if suppliers fail to load initially
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplier.name) {
      toast.error("Supplier name is required");
      return;
    }

    try {
      await supplierAPI.create(newSupplier);
      toast.success("Supplier added successfully");
      setIsAddSupplierOpen(false);
      setNewSupplier({ name: "", contactPerson: "", phone: "", email: "" });
      fetchSuppliers();
    } catch (error) {
      toast.error("Failed to add supplier");
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    try {
      await supplierAPI.delete(id);
      toast.success("Supplier deleted successfully");
      fetchSuppliers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete supplier");
    }
  };

  const getStockStatus = (quantity: number, reorderLevel: number) => {
    const percentage = (quantity / reorderLevel) * 100;
    if (percentage <= 50) return { status: "Critical", color: "bg-red-500" };
    if (percentage <= 100) return { status: "Low", color: "bg-orange-500" };
    return { status: "Good", color: "bg-green-500" };
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product.category.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === "all") return true;

    const stockStatus = getStockStatus(item.currentQuantity, item.reorderLevel);
    return stockStatus.status.toLowerCase() === statusFilter;
  });

  const handleRecordDelivery = async () => {
    if (!selectedItem || !deliveryQuantity || !deliverySupplierId) {
      toast.error("Please enter a valid quantity and select a supplier");
      return;
    }

    try {
      await inventoryAPI.recordDelivery({
        productId: selectedItem.productId,
        quantity: parseFloat(deliveryQuantity),
        supplierId: parseInt(deliverySupplierId)
      });
      toast.success(`Delivery recorded for ${selectedItem.product.productName}`);
      setIsDialogOpen(false);
      setDeliveryQuantity("");
      setDeliverySupplierId("");
      setSelectedItem(null);
      fetchInventory();
    } catch (error) {
      toast.error("Failed to record delivery");
    }
  };


  const handleRecordReturn = async () => {
    if (!returnItem.productId || !returnItem.supplierId || !returnItem.quantity || !returnItem.reason) {
      toast.error("All fields are required for return");
      return;
    }

    try {
      await inventoryAPI.returnItem({
        productId: parseInt(returnItem.productId),
        supplierId: parseInt(returnItem.supplierId),
        quantity: parseFloat(returnItem.quantity),
        reason: returnItem.reason
      });
      toast.success("Return recorded successfully");
      setIsReturnDialogOpen(false);
      setReturnItem({ productId: "", supplierId: "", quantity: "", reason: "" });
      fetchInventory();
      fetchReturns();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to record return");
    }
  };

  const openDeliveryDialog = (item: APIInventoryItem) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <img src={logo} alt="Logo" className="h-8 w-8 object-contain" />
              <div>
                <h1 className="text-xl font-bold">Inventory & Supply Chain</h1>
                <p className="text-white/70 text-sm">Manage stock, deliveries and suppliers</p>
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <Button
                variant={activeTab === 'inventory' ? "secondary" : "ghost"}
                onClick={() => setActiveTab('inventory')}
                className={activeTab === 'inventory' ? "text-primary" : "text-white hover:bg-white/10"}
              >
                <Package className="w-4 h-4 mr-2" /> Inventory
              </Button>
              <Button
                variant={activeTab === 'suppliers' ? "secondary" : "ghost"}
                onClick={() => setActiveTab('suppliers')}
                className={activeTab === 'suppliers' ? "text-primary" : "text-white hover:bg-white/10"}
              >
                <User className="w-4 h-4 mr-2" /> Suppliers
              </Button>
              <Button
                variant={activeTab === 'returns' ? "secondary" : "ghost"}
                onClick={() => setActiveTab('returns')}
                className={activeTab === 'returns' ? "text-primary" : "text-white hover:bg-white/10"}
              >
                <Undo2 className="w-4 h-4 mr-2" /> Returns
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {activeTab === 'inventory' && (
          /* INVENTORY VIEW */
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search products..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="critical">Critical Stock</SelectItem>
                    <SelectItem value="low">Low Stock</SelectItem>
                    <SelectItem value="good">Good Stock</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary text-white">
                  <Plus className="w-4 h-4 mr-2" /> Add Product
                </Button>
                <Button onClick={() => setIsReturnDialogOpen(true)} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                  <Undo2 className="w-4 h-4 mr-2" /> Return Item
                </Button>
              </div>
            </div>

            <div className="grid gap-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{items.length}</div>
                    <p className="text-xs text-muted-foreground">Across {new Set(items.map(i => i.product.category)).size} categories</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-500">
                      {items.filter(i => getStockStatus(i.currentQuantity, i.reorderLevel).status !== "Good").length}
                    </div>
                    <p className="text-xs text-muted-foreground">Items requiring attention</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Rs. 0</div>
                    <p className="text-xs text-muted-foreground">Estimated inventory value</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Current Inventory</CardTitle>
                  <CardDescription>Monitor stock levels and manage reorders</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Stock Level</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No items found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredItems.map((item) => {
                          const status = getStockStatus(item.currentQuantity, item.reorderLevel);
                          return (
                            <TableRow key={item.productId}>
                              <TableCell className="font-medium">{item.product.productName}</TableCell>
                              <TableCell>{item.product.category}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono">
                                    {item.currentQuantity} {item.product.unit}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={`${status.color} hover:${status.color} text-white border-0`}>
                                  {status.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openDeliveryDialog(item)}
                                >
                                  Restock
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        {activeTab === 'suppliers' && (
          /* SUPPLIERS VIEW */
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Supplier Directory</h2>
                <p className="text-muted-foreground">Manage your vendor relationships</p>
              </div>
              <Button onClick={() => setIsAddSupplierOpen(true)} className="bg-primary text-white">
                <Plus className="w-4 h-4 mr-2" /> Add Supplier
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suppliers.map(supplier => (
                <Card key={supplier.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-bold">{supplier.name}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteSupplier(supplier.id)} className="text-destructive hover:bg-destructive/10 -mt-2 -mr-2">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-2">
                    {supplier.contactPerson && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{supplier.contactPerson}</span>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span>{supplier.email}</span>
                      </div>
                    )}
                    {supplier.items && supplier.items.length > 0 && (
                      <div className="pt-2 border-t mt-2">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Supplies:</p>
                        <div className="flex flex-wrap gap-1">
                          {supplier.items.map((item, idx) => (
                            <span key={idx} className="bg-secondary/50 text-secondary-foreground text-[10px] px-2 py-0.5 rounded-full">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {suppliers.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-lg">
                  No suppliers found. Add one to get started.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'deliveries' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Delivery Orders</h2>
                <p className="text-muted-foreground">Track and manage supply orders</p>
              </div>
              <Button onClick={() => setIsOrderDialogOpen(true)} className="bg-primary text-white">
                <Plus className="w-4 h-4 mr-2" /> New Order
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
                <CardDescription>View status of ongoing and past deliveries</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No orders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      deliveries.map((delivery) => (
                        <TableRow key={delivery.id}>
                          <TableCell className="font-mono">#{delivery.id}</TableCell>
                          <TableCell>{delivery.supplier.name}</TableCell>
                          <TableCell>{new Date(delivery.deliveryDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {delivery.deliveryItems.map((item, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {item.product.productName} ({item.quantity} {item.product.unit})
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={delivery.deliveryStatus === 'Completed' ? 'bg-green-500' : 'bg-blue-500'}>
                              {delivery.deliveryStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {delivery.deliveryStatus !== 'Completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleUpdateDeliveryStatus(delivery.id, 'Completed')}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" /> Mark Received
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'returns' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Return Records</h2>
                <p className="text-muted-foreground">View items returned to suppliers</p>
              </div>
              <Button onClick={() => setIsReturnDialogOpen(true)} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                <Undo2 className="w-4 h-4 mr-2" /> New Return
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Return History</CardTitle>
                <CardDescription>View status of returned inventory items</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return ID</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No return records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      returns.map((ret) => (
                        <TableRow key={ret.id}>
                          <TableCell className="font-mono">#{ret.id}</TableCell>
                          <TableCell className="font-medium">
                            {ret.productName} 
                            <Badge variant="outline" className="ml-2 text-xs">
                              {ret.quantity} {ret.unit}
                            </Badge>
                          </TableCell>
                          <TableCell>{ret.supplierName}</TableCell>
                          <TableCell className="italic text-muted-foreground">{ret.reason}</TableCell>
                          <TableCell>{ret.date}</TableCell>
                          <TableCell>
                            <Badge className={ret.status === 'Completed' ? 'bg-green-500' : 'bg-orange-500'}>
                              {ret.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 border-b">
            <DialogTitle>Add New Inventory Item</DialogTitle>
            <DialogDescription>Create a new product to track in inventory</DialogDescription>
          </DialogHeader>
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                placeholder="e.g. Basmati Rice"
                value={newItem.productName}
                onChange={(e) => setNewItem({ ...newItem, productName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newItem.category}
                  onValueChange={(value) => setNewItem({ ...newItem, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ingredients">Ingredients</SelectItem>
                    <SelectItem value="Beverages">Beverages</SelectItem>
                    <SelectItem value="Consumables">Consumables</SelectItem>
                    <SelectItem value="Cleaning">Cleaning</SelectItem>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={newItem.unit}
                  onValueChange={(value) => setNewItem({ ...newItem, unit: value })}
                >
                  <SelectTrigger id="unit">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                    <SelectItem value="g">Grams (g)</SelectItem>
                    <SelectItem value="l">Liters (l)</SelectItem>
                    <SelectItem value="ml">Milliliters (ml)</SelectItem>
                    <SelectItem value="units">Units</SelectItem>
                    <SelectItem value="packs">Packs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reorder">Reorder Level</Label>
                <Input
                  id="reorder"
                  type="number"
                  value={newItem.reorderLevel}
                  onChange={(e) => setNewItem({ ...newItem, reorderLevel: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initial">Initial Quantity</Label>
                <Input
                  id="initial"
                  type="number"
                  value={newItem.initialQuantity}
                  onChange={(e) => setNewItem({ ...newItem, initialQuantity: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 border-t bg-muted/20">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-secondary text-primary hover:bg-secondary/90" onClick={handleCreateProduct}>
              Create Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Dialog - For Stock Update */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 border-b">
            <DialogTitle>Record New Delivery</DialogTitle>
            <DialogDescription>
              Add stock for {selectedItem?.product.productName}
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Select
                value={deliverySupplierId}
                onValueChange={(value) => setDeliverySupplierId(value)}
              >
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity Delivered</Label>
              <div className="flex gap-2">
                <Input
                  id="quantity"
                  type="number"
                  placeholder="0"
                  value={deliveryQuantity}
                  onChange={(e) => setDeliveryQuantity(e.target.value)}
                  className="flex-1"
                />
                <div className="flex items-center px-3 bg-muted rounded-md">
                  <span className="text-sm text-muted-foreground">{selectedItem?.product.unit}</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-muted rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1 font-medium">Current Stock</p>
              <p className="text-xl font-bold text-primary">{selectedItem?.currentQuantity} {selectedItem?.product.unit}</p>
            </div>
          </div>

          <DialogFooter className="p-6 border-t bg-muted/20">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-secondary hover:bg-secondary/90 text-primary font-bold px-8"
              onClick={handleRecordDelivery}
            >
              Record Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Supplier Dialog */}
      <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 border-b">
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogDescription>Enter the details of your new vendor</DialogDescription>
          </DialogHeader>
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="sName">Supplier Name</Label>
              <Input
                id="sName"
                value={newSupplier.name}
                onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sContact">Contact Person</Label>
              <Input
                id="sContact"
                value={newSupplier.contactPerson}
                onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sPhone">Phone</Label>
              <Input
                id="sPhone"
                value={newSupplier.phone}
                onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sEmail">Email</Label>
              <Input
                id="sEmail"
                type="email"
                value={newSupplier.email}
                onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="p-6 border-t bg-muted/20">
            <Button variant="outline" onClick={() => setIsAddSupplierOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSupplier} className="bg-primary text-white">Add Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Order Dialog */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 border-b">
            <DialogTitle>Create New Order</DialogTitle>
            <DialogDescription>Select supplier and items to order</DialogDescription>
          </DialogHeader>
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select
                value={newOrder.supplierId}
                onValueChange={(val) => setNewOrder({ ...newOrder, supplierId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg p-4 space-y-4 bg-muted/10">
              <h4 className="text-sm font-bold text-primary italic">Order Items</h4>
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs uppercase font-bold tracking-wider opacity-60">Product</Label>
                  <Select
                    value={currentOrderItem.productId}
                    onValueChange={(val) => setCurrentOrderItem({ ...currentOrderItem, productId: val })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select Product" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map(i => (
                        <SelectItem key={i.productId} value={i.productId.toString()}>
                          {i.product.productName} ({i.currentQuantity} {i.product.unit} available)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-2">
                  <Label className="text-xs uppercase font-bold tracking-wider opacity-60">Quantity</Label>
                  <Input
                    type="number"
                    value={currentOrderItem.quantity}
                    onChange={(e) => setCurrentOrderItem({ ...currentOrderItem, quantity: e.target.value })}
                    className="bg-background"
                  />
                </div>
                <Button variant="secondary" onClick={addItemToOrder} className="font-bold">Add Item</Button>
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {newOrder.items.length > 0 ? (
                    newOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-background border p-3 rounded-lg text-sm shadow-sm">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">x{item.quantity}</Badge>
                            <span className="font-medium">{item.productName}</span>
                        </div>
                        <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-50"
                        onClick={() => setNewOrder({
                            ...newOrder,
                            items: newOrder.items.filter((_, i) => i !== idx)
                        })}
                        >
                        <XCircle className="w-5 h-5" />
                        </Button>
                    </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-muted-foreground text-xs italic opacity-50 border-2 border-dashed rounded-lg">
                        No items added to this order yet.
                    </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 border-t bg-muted/20">
            <Button variant="outline" onClick={() => setIsOrderDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateOrder} disabled={newOrder.items.length === 0} className="bg-primary text-white font-bold px-8">
                Send Delivery Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Item Dialog */}
      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 border-b">
            <DialogTitle>Record Item Return</DialogTitle>
            <DialogDescription>Return damaged or expired items to supplier</DialogDescription>
          </DialogHeader>
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select
                value={returnItem.productId}
                onValueChange={(val) => setReturnItem({ ...returnItem, productId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Product" />
                </SelectTrigger>
                <SelectContent>
                  {items.map(i => (
                    <SelectItem key={i.productId} value={i.productId.toString()}>
                      {i.product.productName} ({i.currentQuantity} {i.product.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select
                value={returnItem.supplierId}
                onValueChange={(val) => setReturnItem({ ...returnItem, supplierId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="return-qty">Quantity to Return</Label>
              <Input
                id="return-qty"
                type="number"
                placeholder="0.0"
                value={returnItem.quantity}
                onChange={(e) => setReturnItem({ ...returnItem, quantity: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Return</Label>
              <Input
                id="reason"
                placeholder="e.g. Damaged in transit, Expired"
                value={returnItem.reason}
                onChange={(e) => setReturnItem({ ...returnItem, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="p-6 border-t bg-muted/20">
            <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRecordReturn} className="font-bold px-8">
              Return Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
