import { useEffect, useState } from "react";
import { ArrowLeft, UtensilsCrossed, Search, Plus, Edit, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Switch } from "./ui/switch";
import { toast } from "sonner@2.0.3";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { menuAPI, MenuItem as APIMenuItem } from "../api/menu";
import { getImageUrl } from "../utils/image";

interface MenuManagementProps {
  onBack: () => void;
}

// MenuItem is now imported from ../api/menu as APIMenuItem

export function MenuManagement({ onBack }: MenuManagementProps) {
  const [items, setItems] = useState<APIMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<APIMenuItem | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    category: "mains",
    available: true,
    image: "",
    popular: false,
    imageFile: null as File | null,
  });

  const fetchMenu = async () => {
    try {
      const data = await menuAPI.getAllItems();
      setItems(data);
    } catch (error) {
      toast.error("Failed to load menu items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesAvailability =
      availabilityFilter === "all" ||
      (availabilityFilter === "available" && item.availabilityStatus === 'Available') ||
      (availabilityFilter === "unavailable" && item.availabilityStatus === 'Unavailable');
    return matchesSearch && matchesCategory && matchesAvailability;
  });

  const getCategoryBadge = (category: string) => {
    const categoryConfig: Record<string, { label: string, className: string }> = {
      starters: { label: "Starters", className: "bg-blue-100 text-blue-800 border-blue-200" },
      mains: { label: "Mains", className: "bg-purple-100 text-purple-800 border-purple-200" },
      desserts: { label: "Desserts", className: "bg-pink-100 text-pink-800 border-pink-200" },
      beverages: { label: "Beverages", className: "bg-green-100 text-green-800 border-green-200" },
    };
    return categoryConfig[category.toLowerCase()] || { label: category, className: "bg-gray-100 text-gray-800" };
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      category: "mains",
      available: true,
      image: "",
      popular: false,
      imageFile: null,
    });
  };

  const openAddDialog = () => {
    resetForm();
    setAddDialogOpen(true);
  };

  const openEditDialog = (item: APIMenuItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      price: item.price,
      category: item.category as any,
      available: item.availabilityStatus === 'Available',
      image: item.imageUrl || "",
      popular: item.isPopular || false,
      imageFile: null,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (item: APIMenuItem) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const handleAddItem = async () => {
    if (!formData.name || !formData.description || formData.price <= 0) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      if (formData.imageFile) {
        const submitData = new FormData();
        submitData.append("name", formData.name);
        submitData.append("category", formData.category);
        submitData.append("price", String(formData.price));
        submitData.append("description", formData.description);
        submitData.append("isPopular", String(formData.popular));
        submitData.append("availabilityStatus", formData.available ? "Available" : "Unavailable");
        submitData.append("image", formData.imageFile);

        await menuAPI.addItem(submitData);
      } else {
        await menuAPI.addItem({
          name: formData.name,
          category: formData.category,
          price: formData.price,
          description: formData.description,
          imageUrl: formData.image,
          isPopular: formData.popular,
          availabilityStatus: formData.available ? 'Available' : 'Unavailable'
        });
      }
      
      toast.success("Menu item added successfully");
      setAddDialogOpen(false);
      resetForm();
      fetchMenu();
    } catch (error) {
      toast.error("Failed to add menu item");
    }
  };

  const handleEditItem = async () => {
    if (!selectedItem) return;

    try {
      if (formData.imageFile) {
        const submitData = new FormData();
        submitData.append("name", formData.name);
        submitData.append("category", formData.category);
        submitData.append("price", String(formData.price));
        submitData.append("description", formData.description);
        submitData.append("isPopular", String(formData.popular));
        submitData.append("availabilityStatus", formData.available ? "Available" : "Unavailable");
        submitData.append("image", formData.imageFile);

        await menuAPI.updateItem(selectedItem.id, submitData);
      } else {
        await menuAPI.updateItem(selectedItem.id, {
          name: formData.name,
          category: formData.category,
          price: formData.price,
          description: formData.description,
          imageUrl: formData.image,
          isPopular: formData.popular,
          availabilityStatus: formData.available ? 'Available' : 'Unavailable'
        });
      }

      toast.success("Menu item updated successfully");
      setEditDialogOpen(false);
      resetForm();
      setSelectedItem(null);
      fetchMenu();
    } catch (error) {
      toast.error("Failed to update menu item");
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;

    try {
      await menuAPI.deleteItem(selectedItem.id);
      toast.success("Menu item removed");
      setDeleteDialogOpen(false);
      setSelectedItem(null);
      fetchMenu();
    } catch (error) {
      toast.error("Failed to remove menu item");
    }
  };

  const toggleAvailability = async (item: APIMenuItem) => {
    try {
      const newStatus = item.availabilityStatus === 'Available' ? 'Unavailable' : 'Available';
      await menuAPI.updateItem(item.id, {
        availabilityStatus: newStatus
      });
      toast.success(`Item marked as ${newStatus}`);
      fetchMenu();
    } catch (error) {
      toast.error("Failed to update availability");
    }
  };

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
              <h1>Menu Management</h1>
              <p className="text-white/80 mt-1">Manage restaurant menu items</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Items</p>
                  <h3 className="text-primary">{items.length}</h3>
                </div>
                <UtensilsCrossed className="w-8 h-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Available</p>
                  <h3 className="text-green-600">
                    {items.filter(i => i.availabilityStatus === 'Available').length}
                  </h3>
                </div>
                <UtensilsCrossed className="w-8 h-8 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Popular Items</p>
                  <h3 className="text-secondary">
                    {items.filter(i => i.isPopular).length}
                  </h3>
                </div>
                <UtensilsCrossed className="w-8 h-8 text-secondary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Categories</p>
                  <h3 className="text-blue-600">{new Set(items.map(i => i.category)).size}</h3>
                </div>
                <UtensilsCrossed className="w-8 h-8 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Menu Items</CardTitle>
                <CardDescription>Manage your restaurant menu</CardDescription>
              </div>
              <Button
                className="bg-secondary text-primary hover:bg-secondary/90"
                onClick={openAddDialog}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Menu Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="starters">Starters</SelectItem>
                  <SelectItem value="mains">Mains</SelectItem>
                  <SelectItem value="desserts">Desserts</SelectItem>
                  <SelectItem value="beverages">Beverages</SelectItem>
                </SelectContent>
              </Select>

              <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full py-24 flex flex-col items-center justify-center">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">Loading menu items...</p>
                </div>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const categoryBadge = getCategoryBadge(item.category as any);
                  const isAvailable = item.availabilityStatus === 'Available';
                  return (
                    <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-video w-full bg-muted relative overflow-hidden">
                        <ImageWithFallback
                          src={getImageUrl(item.imageUrl)}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        {item.isPopular && (
                          <Badge className="absolute top-2 right-2 bg-secondary text-primary">
                            Popular
                          </Badge>
                        )}
                      </div>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{item.name}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className={categoryBadge.className}>
                            {categoryBadge.label}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              isAvailable
                                ? "bg-green-100 text-green-800 border-green-200"
                                : "bg-red-100 text-red-800 border-red-200"
                            }
                          >
                            {item.availabilityStatus}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-secondary text-xl">Rs. {item.price.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground"># {item.id}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => openEditDialog(item)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={`flex-1 ${isAvailable ? '' : 'bg-green-50'}`}
                            onClick={() => toggleAvailability(item)}
                          >
                            {isAvailable ? "Mark Unavailable" : "Mark Available"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(item)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card className="md:col-span-2 lg:col-span-3">
                  <CardContent className="py-16 text-center">
                    <UtensilsCrossed className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                    <p className="text-muted-foreground">No menu items found</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add Menu Item Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Menu Item</DialogTitle>
              <DialogDescription>
                Enter the details of the new menu item
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-4 -mr-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="add-name">Item Name *</Label>
                  <Input
                    id="add-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Chicken Rice"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="add-description">Description *</Label>
                  <Textarea
                    id="add-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the dish..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-price">Price (Rs.) *</Label>
                  <Input
                    id="add-price"
                    type="number"
                    value={formData.price || ""}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as APIMenuItem["category"] })}
                  >
                    <SelectTrigger id="add-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starters">Starters</SelectItem>
                      <SelectItem value="mains">Mains</SelectItem>
                      <SelectItem value="desserts">Desserts</SelectItem>
                      <SelectItem value="beverages">Beverages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Upload Image / Picture</Label>
                  <div className="flex flex-col gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormData({ ...formData, imageFile: file, image: "" });
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground text-center">OR</p>
                    <Input
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value, imageFile: null })}
                      placeholder="Enter Image URL directly..."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="add-available">Available</Label>
                    <p className="text-sm text-muted-foreground">
                      Item is currently available for orders
                    </p>
                  </div>
                  <Switch
                    id="add-available"
                    checked={formData.available}
                    onCheckedChange={(checked) => setFormData({ ...formData, available: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="add-popular">Popular Item</Label>
                    <p className="text-sm text-muted-foreground">
                      Mark as a popular/featured item
                    </p>
                  </div>
                  <Switch
                    id="add-popular"
                    checked={formData.popular}
                    onCheckedChange={(checked) => setFormData({ ...formData, popular: checked })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-secondary text-primary hover:bg-secondary/90"
                onClick={handleAddItem}
              >
                Add Menu Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Menu Item Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Menu Item</DialogTitle>
              <DialogDescription>
                Update the menu item's information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-4 -mr-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit-name">Item Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Chicken Rice"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit-description">Description *</Label>
                  <Textarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the dish..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-price">Price (Rs.) *</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    value={formData.price || ""}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as APIMenuItem["category"] })}
                  >
                    <SelectTrigger id="edit-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starters">Starters</SelectItem>
                      <SelectItem value="mains">Mains</SelectItem>
                      <SelectItem value="desserts">Desserts</SelectItem>
                      <SelectItem value="beverages">Beverages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Upload Image / Picture</Label>
                  <div className="flex flex-col gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormData({ ...formData, imageFile: file, image: "" });
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground text-center">OR</p>
                    <Input
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value, imageFile: null })}
                      placeholder="Enter Image URL directly..."
                    />
                    {formData.image && !formData.imageFile && (
                      <p className="text-xs text-muted-foreground mt-1">Current image path loaded.</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="edit-available">Available</Label>
                    <p className="text-sm text-muted-foreground">
                      Item is currently available for orders
                    </p>
                  </div>
                  <Switch
                    id="edit-available"
                    checked={formData.available}
                    onCheckedChange={(checked) => setFormData({ ...formData, available: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="edit-popular">Popular Item</Label>
                    <p className="text-sm text-muted-foreground">
                      Mark as a popular/featured item
                    </p>
                  </div>
                  <Switch
                    id="edit-popular"
                    checked={formData.popular}
                    onCheckedChange={(checked) => setFormData({ ...formData, popular: checked })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-secondary text-primary hover:bg-secondary/90"
                onClick={handleEditItem}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Menu Item</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove this item from the menu?
              </DialogDescription>
            </DialogHeader>
            {selectedItem && (
              <div className="py-4">
                <div className="flex gap-4 p-4 bg-muted rounded-lg">
                  <div className="w-20 h-20 bg-background rounded overflow-hidden flex-shrink-0">
                    <ImageWithFallback
                      src={getImageUrl(selectedItem.imageUrl)}
                      alt={selectedItem.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{selectedItem.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{selectedItem.description}</p>
                    <p className="text-secondary mt-2">Rs. {selectedItem.price.toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  This action cannot be undone. The item will be permanently removed from the menu.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteItem}
              >
                Remove Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
