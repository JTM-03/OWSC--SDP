import { useState } from "react";
import { ArrowLeft, Plus, Package, AlertTriangle, TruckIcon, Search } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { toast } from "sonner@2.0.3";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";

interface StaffInventoryProps {
  onBack: () => void;
}

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  lastDelivery: string;
  branch: string;
}

interface Supplier {
  id: number;
  name: string;
  contact: string;
  email: string;
  category: string;
}

interface Delivery {
  id: string;
  supplier: string;
  items: string;
  date: string;
  invoiceNo: string;
  status: string;
}

export function StaffInventory({ onBack }: StaffInventoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deliveryForm, setDeliveryForm] = useState({
    supplier: "",
    item: "",
    quantity: "",
    invoiceNo: "",
  });
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contact: "",
    email: "",
    category: "",
  });

  const inventoryItems: InventoryItem[] = [
    {
      id: 1,
      name: "Chicken (Fresh)",
      category: "Meat",
      quantity: 12,
      unit: "kg",
      reorderLevel: 25,
      lastDelivery: "Oct 15, 2025",
      branch: "main",
    },
    {
      id: 2,
      name: "Fresh Fish",
      category: "Seafood",
      quantity: 3,
      unit: "kg",
      reorderLevel: 10,
      lastDelivery: "Oct 18, 2025",
      branch: "main",
    },
    {
      id: 3,
      name: "Coconut Milk",
      category: "Condiments",
      quantity: 8,
      unit: "cans",
      reorderLevel: 25,
      lastDelivery: "Oct 10, 2025",
      branch: "main",
    },
    {
      id: 4,
      name: "Roti (Frozen)",
      category: "Dry Goods",
      quantity: 45,
      unit: "pieces",
      reorderLevel: 30,
      lastDelivery: "Oct 17, 2025",
      branch: "main",
    },
    {
      id: 5,
      name: "Curd",
      category: "Dairy",
      quantity: 18,
      unit: "pots",
      reorderLevel: 15,
      lastDelivery: "Oct 19, 2025",
      branch: "main",
    },
    {
      id: 6,
      name: "Beef (Fresh)",
      category: "Meat",
      quantity: 8,
      unit: "kg",
      reorderLevel: 15,
      lastDelivery: "Oct 16, 2025",
      branch: "main",
    },
    {
      id: 7,
      name: "Mushrooms",
      category: "Vegetables",
      quantity: 2,
      unit: "kg",
      reorderLevel: 5,
      lastDelivery: "Oct 14, 2025",
      branch: "main",
    },
    {
      id: 8,
      name: "Lion Lager Beer",
      category: "Beverages",
      quantity: 48,
      unit: "bottles",
      reorderLevel: 36,
      lastDelivery: "Oct 18, 2025",
      branch: "main",
    },
  ];

  const suppliers: Supplier[] = [
    {
      id: 1,
      name: "Lanka Fresh Suppliers",
      contact: "0112 345 678",
      email: "orders@lankafresh.lk",
      category: "Meat & Seafood",
    },
    {
      id: 2,
      name: "Ceylon Dairy Co.",
      contact: "0117 890 123",
      email: "sales@ceylondairy.lk",
      category: "Dairy Products",
    },
    {
      id: 3,
      name: "Island Beverages Ltd",
      contact: "0114 567 890",
      email: "orders@islandbev.lk",
      category: "Beverages",
    },
    {
      id: 4,
      name: "Green Valley Farms",
      contact: "0118 901 234",
      email: "info@greenvalley.lk",
      category: "Vegetables & Fruits",
    },
  ];

  const recentDeliveries: Delivery[] = [
    {
      id: "DEL-001",
      supplier: "Lanka Fresh Suppliers",
      items: "Chicken 30kg, Fish 20kg",
      date: "Oct 19, 2025",
      invoiceNo: "INV-2345",
      status: "received",
    },
    {
      id: "DEL-002",
      supplier: "Island Beverages Ltd",
      items: "Lion Lager 60 bottles",
      date: "Oct 18, 2025",
      invoiceNo: "INV-2344",
      status: "received",
    },
    {
      id: "DEL-003",
      supplier: "Ceylon Dairy Co.",
      items: "Curd 40 pots, Milk 20L",
      date: "Oct 19, 2025",
      invoiceNo: "INV-2346",
      status: "received",
    },
  ];

  const getItemStatus = (item: InventoryItem) => {
    if (item.quantity === 0) return "out-of-stock";
    if (item.quantity < item.reorderLevel) return "low-stock";
    return "in-stock";
  };

  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = item.branch === selectedBranch;
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || getItemStatus(item) === statusFilter;
    return matchesSearch && matchesBranch && matchesCategory && matchesStatus;
  });

  const lowStockItems = inventoryItems.filter(item => 
    item.quantity < item.reorderLevel && item.branch === selectedBranch
  );

  const handleRecordDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Delivery recorded successfully!", {
      description: `${deliveryForm.quantity} units of ${deliveryForm.item} added to inventory`,
    });
    setDeliveryForm({ supplier: "", item: "", quantity: "", invoiceNo: "" });
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name,
      contact: supplier.contact,
      email: supplier.email,
      category: supplier.category,
    });
    setIsEditDialogOpen(true);
  };

  const handleAddSupplier = () => {
    setSupplierForm({
      name: "",
      contact: "",
      email: "",
      category: "",
    });
    setIsAddDialogOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      toast.success("Supplier updated successfully!", {
        description: `${supplierForm.name} has been updated`,
      });
    } else {
      toast.success("Supplier added successfully!", {
        description: `${supplierForm.name} has been added to the directory`,
      });
    }
    setIsEditDialogOpen(false);
    setIsAddDialogOpen(false);
    setEditingSupplier(null);
    setSupplierForm({ name: "", contact: "", email: "", category: "" });
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
              <h1>Inventory Management</h1>
              <p className="text-white/80 mt-1">Track stock levels and manage deliveries</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
          </TabsList>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            {/* Filters and Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    placeholder="Search inventory..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Main Branch - Colombo 7</SelectItem>
                  <SelectItem value="mount">Mount Lavinia Branch</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Meat">Meat</SelectItem>
                  <SelectItem value="Seafood">Seafood</SelectItem>
                  <SelectItem value="Dairy">Dairy</SelectItem>
                  <SelectItem value="Condiments">Condiments</SelectItem>
                  <SelectItem value="Dry Goods">Dry Goods</SelectItem>
                  <SelectItem value="Beverages">Beverages</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-secondary text-primary">
                    <TruckIcon className="w-5 h-5 mr-2" />
                    Record Delivery
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Stock Delivery</DialogTitle>
                    <DialogDescription>
                      Add new stock delivery to inventory
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleRecordDelivery} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="supplier">Supplier</Label>
                      <Select value={deliveryForm.supplier} onValueChange={(value) => setDeliveryForm({...deliveryForm, supplier: value})}>
                        <SelectTrigger id="supplier">
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map(supplier => (
                            <SelectItem key={supplier.id} value={supplier.name}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="item">Item</Label>
                      <Select value={deliveryForm.item} onValueChange={(value) => setDeliveryForm({...deliveryForm, item: value})}>
                        <SelectTrigger id="item">
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems.map(item => (
                            <SelectItem key={item.id} value={item.name}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        placeholder="Enter quantity"
                        value={deliveryForm.quantity}
                        onChange={(e) => setDeliveryForm({...deliveryForm, quantity: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoiceNo">Invoice Number</Label>
                      <Input
                        id="invoiceNo"
                        placeholder="Enter invoice number"
                        value={deliveryForm.invoiceNo}
                        onChange={(e) => setDeliveryForm({...deliveryForm, invoiceNo: e.target.value})}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full bg-primary text-white">
                      Record Delivery
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
              <Card className="border-orange-500 bg-orange-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <AlertTriangle className="w-5 h-5" />
                    Low Stock Alert
                  </CardTitle>
                  <CardDescription>
                    {lowStockItems.length} items are below reorder level
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {lowStockItems.map(item => (
                      <div key={item.id} className="flex justify-between items-center p-2 bg-white rounded">
                        <span className="text-sm">{item.name}</span>
                        <Badge variant="destructive">
                          {item.quantity} {item.unit} (Min: {item.reorderLevel})
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Inventory Table */}
            <div className="grid gap-4">
              {filteredItems.map((item) => (
                <Card key={item.id} className={item.quantity < item.reorderLevel ? "border-orange-300" : ""}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Package className="w-5 h-5 text-primary" />
                          <h3 className="text-primary">{item.name}</h3>
                          {item.quantity < item.reorderLevel && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Low Stock
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
                          <div>
                            <p className="text-muted-foreground">Category</p>
                            <p>{item.category}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Current Stock</p>
                            <p className="text-primary">
                              {item.quantity} {item.unit}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Reorder Level</p>
                            <p>{item.reorderLevel} {item.unit}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Last Delivery</p>
                            <p>{item.lastDelivery}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Suppliers Tab */}
          <TabsContent value="suppliers" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-primary">Supplier Directory</h2>
                <p className="text-muted-foreground">Manage supplier contacts and information</p>
              </div>
              <Button className="bg-secondary text-primary" onClick={handleAddSupplier}>
                <Plus className="w-5 h-5 mr-2" />
                Add Supplier
              </Button>
            </div>

            <div className="grid gap-4">
              {suppliers.map((supplier) => (
                <Card key={supplier.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-primary mb-1">{supplier.name}</h3>
                        <Badge variant="outline" className="mb-3">{supplier.category}</Badge>
                        <div className="space-y-1 text-sm">
                          <p className="text-muted-foreground">
                            <strong>Contact:</strong> {supplier.contact}
                          </p>
                          <p className="text-muted-foreground">
                            <strong>Email:</strong> {supplier.email}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleEditSupplier(supplier)}>
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries" className="space-y-6">
            <div>
              <h2 className="text-primary">Recent Deliveries</h2>
              <p className="text-muted-foreground">Track and manage stock deliveries</p>
            </div>

            <div className="grid gap-4">
              {recentDeliveries.map((delivery) => (
                <Card key={delivery.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <TruckIcon className="w-5 h-5 text-green-600" />
                          <h3 className="text-primary">{delivery.id}</h3>
                          <Badge className="bg-green-100 text-green-800">
                            {delivery.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
                          <div>
                            <p className="text-muted-foreground">Supplier</p>
                            <p>{delivery.supplier}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Items</p>
                            <p>{delivery.items}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Date</p>
                            <p>{delivery.date}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Invoice</p>
                            <p>{delivery.invoiceNo}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Supplier Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogDescription>
              Update supplier information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSupplier} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Supplier Name</Label>
              <Input
                id="edit-name"
                placeholder="Enter supplier name"
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Input
                id="edit-category"
                placeholder="e.g., Meat & Seafood"
                value={supplierForm.category}
                onChange={(e) => setSupplierForm({...supplierForm, category: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contact">Contact Number</Label>
              <Input
                id="edit-contact"
                placeholder="0112 345 678"
                value={supplierForm.contact}
                onChange={(e) => setSupplierForm({...supplierForm, contact: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="supplier@example.lk"
                value={supplierForm.email}
                onChange={(e) => setSupplierForm({...supplierForm, email: e.target.value})}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-primary text-white">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Supplier Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogDescription>
              Add a new supplier to the directory
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSupplier} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Supplier Name</Label>
              <Input
                id="add-name"
                placeholder="Enter supplier name"
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-category">Category</Label>
              <Input
                id="add-category"
                placeholder="e.g., Meat & Seafood"
                value={supplierForm.category}
                onChange={(e) => setSupplierForm({...supplierForm, category: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-contact">Contact Number</Label>
              <Input
                id="add-contact"
                placeholder="0112 345 678"
                value={supplierForm.contact}
                onChange={(e) => setSupplierForm({...supplierForm, contact: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">Email Address</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="supplier@example.lk"
                value={supplierForm.email}
                onChange={(e) => setSupplierForm({...supplierForm, email: e.target.value})}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-secondary text-primary">
                Add Supplier
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
