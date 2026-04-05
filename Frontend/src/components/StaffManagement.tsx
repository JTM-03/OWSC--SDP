import { useEffect, useState } from "react";
import { ArrowLeft, Users, Search, Plus, Edit, Trash2, Mail, Phone, Shield, UserCheck, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { toast } from "sonner@2.0.3";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { staffAPI, StaffMember as APIStaffMember } from "../api/staff";
import { authAPI } from "../api/auth";

interface StaffManagementProps {
  onBack: () => void;
}

interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: "admin" | "staff" | "member";
  status: "Active" | "Inactive" | "Pending";
  registrationDate: string;
}

export function StaffManagement({ onBack }: StaffManagementProps) {
  const [allStaff, setAllStaff] = useState<APIStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<APIStaffMember | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    role: "staff",
  });

  const fetchStaff = async () => {
    try {
      const data = await staffAPI.getAll();
      setAllStaff(data);
    } catch (error) {
      toast.error("Failed to load staff members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const filteredStaff = allStaff.filter((staff) => {
    const matchesSearch =
      staff.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || staff.role === roleFilter;
    const matchesStatus = statusFilter === "all" || staff.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string, className: string }> = {
      admin: { label: "Admin", className: "bg-purple-100 text-purple-800 border-purple-200" },
      staff: { label: "Staff", className: "bg-blue-100 text-blue-800 border-blue-200" },
      member: { label: "Member", className: "bg-green-100 text-green-800 border-green-200" },
    };
    return roleConfig[role] || { label: role, className: "bg-gray-100 text-gray-800" };
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      username: "",
      password: "",
      role: "staff",
    });
  };

  const openAddDialog = () => {
    resetForm();
    setAddDialogOpen(true);
  };

  const openEditDialog = (staff: APIStaffMember) => {
    setSelectedStaff(staff);
    setFormData({
      fullName: staff.fullName,
      email: staff.email,
      phone: staff.phone || "",
      username: staff.username,
      password: "",
      role: staff.role,
    });
    setEditDialogOpen(true);
  };

  const handleAddStaff = async () => {
    if (!formData.fullName || !formData.email || !formData.username || !formData.password) {
      toast.error("Please fill all required fields");
      return;
    }

    // Password rules validation
    if (formData.password.length < 8 || !/[A-Z]/.test(formData.password) || !/[a-z]/.test(formData.password) || !/[0-9]/.test(formData.password) || !/[^A-Za-z0-9]/.test(formData.password)) {
      toast.error("Please ensure your password meets all requirements");
      return;
    }

    try {
      await authAPI.register({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        username: formData.username,
        role: formData.role as any
      });
      toast.success("Staff member added successfully");
      setAddDialogOpen(false);
      resetForm();
      fetchStaff();
    } catch (error: any) {
      const errorMessage = error.response?.data?.details?.[0]?.message || 
                          error.response?.data?.message || 
                          error.response?.data?.error ||
                          "Failed to add staff member";
      toast.error(errorMessage);
    }
  };

  const handleEditStaff = async () => {
    if (!selectedStaff) return;

    try {
      await staffAPI.updateRole(selectedStaff.id, formData.role);
      toast.success("Staff member updated successfully");
      setEditDialogOpen(false);
      resetForm();
      setSelectedStaff(null);
      fetchStaff();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          "Failed to update staff member";
      toast.error(errorMessage);
    }
  };

  const handleDeleteStaff = () => {
    if (!selectedStaff) return;

    toast.success("Staff member removed", {
      description: `${selectedStaff.fullName} has been removed from the system`,
    });
    setDeleteDialogOpen(false);
    setSelectedStaff(null);
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
              <h1>Staff Management</h1>
              <p className="text-white/80 mt-1">Manage staff members and roles</p>
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
                  <p className="text-sm text-muted-foreground mb-1">Total Staff</p>
                  <h3 className="text-primary">{allStaff.length}</h3>
                </div>
                <Users className="w-8 h-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Active</p>
                  <h3 className="text-green-600">
                    {allStaff.filter(s => s.status === "Active").length}
                  </h3>
                </div>
                <UserCheck className="w-8 h-8 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Admin</p>
                  <h3 className="text-purple-600">
                    {allStaff.filter(s => s.role === "admin").length}
                  </h3>
                </div>
                <Shield className="w-8 h-8 text-purple-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Staff</p>
                  <h3 className="text-blue-600">
                    {allStaff.filter(s => s.role === "staff").length}
                  </h3>
                </div>
                <Users className="w-8 h-8 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Staff Members</CardTitle>
                <CardDescription>Manage your staff members and their roles</CardDescription>
              </div>
              <Button
                className="bg-secondary text-primary hover:bg-secondary/90"
                onClick={openAddDialog}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Staff Member
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Staff Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                        <p className="text-muted-foreground">Loading staff...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredStaff.length > 0 ? (
                    filteredStaff.map((staff) => {
                      const roleBadge = getRoleBadge(staff.role);
                      return (
                        <TableRow key={staff.id}>
                          <TableCell className="font-medium"># {staff.id}</TableCell>
                          <TableCell>{staff.fullName}</TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="w-3 h-3" />
                                {staff.email}
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="w-3 h-3" />
                                {staff.phone || "No phone"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={roleBadge.className}>
                              {roleBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{staff.username}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                staff.status === "Active"
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : "bg-gray-100 text-gray-800 border-gray-200"
                              }
                            >
                              {staff.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(staff.registrationDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(staff)}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        No staff members found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Add Staff Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="max-w-md p-0 overflow-hidden flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 border-b">
              <DialogTitle>Add New Staff Member</DialogTitle>
              <DialogDescription>
                Enter the details of the new staff member
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Full Name *</Label>
                <Input
                  id="add-name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-email">Email Address *</Label>
                <Input
                  id="add-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@owsc.lk"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-username">Username *</Label>
                <Input
                  id="add-username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Choose a username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-password">Password *</Label>
                <Input
                  id="add-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
                {formData.password && (
                  <div className="text-xs space-y-1 mt-2 p-3 bg-muted/50 rounded-lg border">
                    <p className={`flex items-center gap-1 ${formData.password.length >= 8 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <CheckCircle2 className="w-3 h-3" /> At least 8 characters
                    </p>
                    <p className={`flex items-center gap-1 ${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <CheckCircle2 className="w-3 h-3" /> One uppercase letter
                    </p>
                    <p className={`flex items-center gap-1 ${/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <CheckCircle2 className="w-3 h-3" /> One lowercase letter
                    </p>
                    <p className={`flex items-center gap-1 ${/[0-9]/.test(formData.password) ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <CheckCircle2 className="w-3 h-3" /> One number
                    </p>
                    <p className={`flex items-center gap-1 ${/[^A-Za-z0-9]/.test(formData.password) ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <CheckCircle2 className="w-3 h-3" /> One special character
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-phone">Phone Number</Label>
                <Input
                  id="add-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="07X XXX XXXX"
                />
              </div>

              <div className="space-y-2 pb-4">
                <Label htmlFor="add-role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger id="add-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="p-6 border-t bg-muted/20">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-secondary text-primary hover:bg-secondary/90 font-bold"
                onClick={handleAddStaff}
              >
                Add Staff Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Staff Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md p-0 overflow-hidden flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 border-b">
              <DialogTitle>Edit Staff Member</DialogTitle>
              <DialogDescription>
                Update the staff member's information
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={formData.fullName} readOnly disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground border italic">
                Currently, only role updates are supported via this interface. Profile details can be managed by the user in their settings.
              </div>
            </div>
            <DialogFooter className="p-6 border-t bg-muted/20">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-secondary text-primary hover:bg-secondary/90 font-bold"
                onClick={handleEditStaff}
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
              <DialogTitle>Remove Staff Member</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove this staff member?
              </DialogDescription>
            </DialogHeader>
            {selectedStaff && (
              <div className="py-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">{selectedStaff.fullName}</p>
                  <p className="text-sm text-muted-foreground mt-1">{selectedStaff.email}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  This action cannot be undone. The staff member will lose access to the system.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteStaff}
              >
                Remove Staff Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
