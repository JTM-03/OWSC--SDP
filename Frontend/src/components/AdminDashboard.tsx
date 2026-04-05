import { useEffect, useState } from "react";
import { DollarSign, Calendar, Package, Users, TrendingUp, Clock, Send, BarChart3, UserCog, UtensilsCrossed, MapPin, Ticket, Loader2, LogOut, Eye, User, Shield, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { adminAPI, AdminStats, PendingMembership } from "../api/admin";
import { toast } from "sonner@2.0.3";
import { MembershipManagement } from "./MembershipManagement";
import { PromotionsManager } from "./PromotionsManager";
import { MenuManagement } from "./MenuManagement";
import { InventoryManagement } from "./InventoryManagement";
import { Reports } from "./Reports";
import { StaffManagement } from "./StaffManagement";
import { VenueStaffing } from "./VenueStaffing";
import { EventsManagement } from "./EventsManagement";
import { OrderManagement } from "./OrderManagement";
import { VenueBookingsManagement } from "./VenueBookingsManagement";

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function AdminDashboard({ onNavigate, onLogout }: AdminDashboardProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<PendingMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedMember, setSelectedMember] = useState<PendingMembership | null>(null);

  const fetchAdminData = async () => {
    try {
      const [statsData, pendingData] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getPendingMemberships()
      ]);
      setStats(statsData);
      setPendingApprovals(pendingData);
    } catch (error) {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateStatus = async (id: number, status: 'Active' | 'Cancelled') => {
    try {
      await adminAPI.updateMembershipStatus(id, status);
      toast.success(`Membership ${status === 'Active' ? 'approved' : 'rejected'}`);
      fetchAdminData();
    } catch (error) {
      toast.error("Action failed");
    }
  };

  const revenueData = stats?.revenueData || [
    { day: "Mon", revenue: 0 },
    { day: "Tue", revenue: 0 },
    { day: "Wed", revenue: 0 },
    { day: "Thu", revenue: 0 },
    { day: "Fri", revenue: 0 },
    { day: "Sat", revenue: 0 },
    { day: "Sun", revenue: 0 },
  ];

  const lowStockItems = stats?.lowStockItems || [];

  const kpiData = [
    {
      title: "Today's Revenue",
      value: `Rs. ${(stats?.kpis.revenue || 0).toLocaleString()}`,
      change: "+0% today",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Active Bookings",
      value: (stats?.kpis.activeBookings || 0).toString(),
      change: "Current month",
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Low Stock Items",
      value: (stats?.kpis.lowStock || 0).toString(),
      change: "Needs attention",
      icon: Package,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Pending Approvals",
      value: pendingApprovals.length.toString(),
      change: "Member requests",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img src={logo} alt="OWSC Logo" className="h-10 w-10 object-contain" />
              <div>
                <h1 className="text-xl font-bold">Admin Portal</h1>
                <p className="text-xs text-white/80">Premium Venue Management</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-transparent h-auto p-0 flex flex-wrap gap-3 justify-center mb-8">
            {[
              { value: "overview", label: "Overview" },
              { value: "members", label: "Membership" },
              { value: "orders", label: "Orders" },
              { value: "inventory", label: "Inventory" },
              { value: "menu", label: "Menu" },
              { value: "promotions", label: "Promotions" },
              { value: "bookings", label: "Bookings" },
              { value: "staff", label: "Staff" },
              { value: "venue-staff", label: "Venue Staffing" },
              { value: "events", label: "Events" },
              { value: "reports", label: "Reports" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="px-6 py-3 rounded-lg border bg-card shadow-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-accent hover:text-accent-foreground transition-all duration-200"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {kpiData.map((kpi, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{kpi.title}</p>
                        <h3 className="text-2xl font-bold text-primary mb-1">{kpi.value}</h3>
                        <p className={`text-xs font-medium ${kpi.color}`}>{kpi.change}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${kpi.bgColor}`}>
                        <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Revenue Chart and Other Widgets */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Revenue Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Weekly Revenue</CardTitle>
                  <CardDescription>Last 7 days performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `Rs.${value}`} />
                      <Tooltip
                        formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, 'Revenue']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="revenue" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Low Stock Alert */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-orange-600" />
                    Low Stock Alert
                  </CardTitle>
                  <CardDescription>Items need reordering</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lowStockItems.length > 0 ? lowStockItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-100 rounded-lg">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">{item.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} / {item.reorderLevel} units
                          </p>
                        </div>
                        <Badge variant="destructive" className="h-6">Low</Badge>
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground text-center py-4">Inventory is healthy</p>
                    )}
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => setActiveTab('inventory')}
                    >
                      Manage Inventory
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Member Approvals */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Pending Member Approvals</CardTitle>
                    <CardDescription>Review and approve new member applications</CardDescription>
                  </div>
                  <Badge variant="secondary">{pendingApprovals.length} pending</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                  ) : pendingApprovals.length > 0 ? (
                    pendingApprovals.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-secondary" />
                          </div>
                          <div>
                            <h4 className="font-medium">{item.member.fullName}</h4>
                            <p className="text-sm text-muted-foreground">{item.member.email}</p>
                            <p className="text-xs text-muted-foreground mt-1">Applied: {new Date(item.startDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedMember(item)} className="text-muted-foreground hover:text-primary">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(item.id, 'Cancelled')} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            Reject
                          </Button>
                          <Button size="sm" className="bg-secondary hover:bg-secondary/90 text-primary font-medium" onClick={() => handleUpdateStatus(item.id, 'Active')}>
                            Approve
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-muted-foreground">No pending applications</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            {/* Member Details Dialog */}
            <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
              <DialogContent className="max-w-4xl p-0 overflow-hidden flex flex-col max-h-[90vh] w-[95vw]">
                <DialogHeader className="p-6 border-b bg-card">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <DialogTitle className="text-3xl font-bold tracking-tight text-[#1a2b3c]">Membership Application</DialogTitle>
                        {selectedMember && (
                          <DialogDescription className="text-muted-foreground flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" />
                            Submitted on {new Date(selectedMember.startDate).toLocaleDateString(undefined, { dateStyle: 'long' })}
                          </DialogDescription>
                        )}
                      </div>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                        Pending Review
                      </Badge>
                    </div>
                  </div>
                </DialogHeader>

                <div className="p-8 overflow-y-auto flex-1">
                  {selectedMember && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                      {/* Left Column: Details */}
                      <div className="space-y-8">
                          {/* Section 1: Personal Info */}
                          <div className="space-y-6">
                            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest border-b border-primary/10 pb-2">
                              <User className="w-4 h-4" /> Personal Info
                            </div>
                            <div className="space-y-4">
                              <div className="grid gap-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Full Name</span>
                                <p className="text-sm font-semibold text-[#1a2b3c]">{selectedMember.member.fullName}</p>
                              </div>
                              <div className="grid gap-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase text-xs">Email Address</span>
                                <p className="text-sm font-medium text-foreground">{selectedMember.member.email}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="grid gap-1">
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase text-xs">Phone</span>
                                      <p className="text-sm font-medium text-foreground">{selectedMember.member.phone || 'N/A'}</p>
                                  </div>
                                  <div className="grid gap-1">
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase text-xs">NIC/Passport</span>
                                      <p className="text-sm font-medium text-foreground">{selectedMember.member.nic || 'N/A'}</p>
                                  </div>
                              </div>
                            </div>
                          </div>

                          {/* Section 2: Membership Details */}
                          <div className="space-y-6">
                            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest border-b border-primary/10 pb-2">
                              <Shield className="w-4 h-4" /> Membership Request
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase text-xs">Plan Type</span>
                                <Badge className="w-fit bg-secondary/10 text-secondary border-secondary/20 font-bold px-3 py-0.5 capitalize">
                                  {selectedMember.membershipType}
                                </Badge>
                              </div>
                              <div className="grid gap-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase text-xs">Fee Amount</span>
                                <p className="text-lg font-black text-secondary">Rs. {selectedMember.membershipFee.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                      </div>

                      {/* Right Column: Verification & Actions */}
                      <div className="space-y-8 flex flex-col h-full">
                          <div className="space-y-6 flex-1">
                              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest border-b border-primary/10 pb-2">
                                  <DollarSign className="w-4 h-4" /> Payment Slip
                              </div>
                              
                              <div className="flex-1 mt-1 rounded-xl border bg-muted/5 shadow-sm overflow-hidden min-h-[250px] relative">
                                  {selectedMember.member.paymentSlipUrl ? (
                                      <div className="w-full h-full flex items-center justify-center p-4">
                                          {selectedMember.member.paymentSlipUrl.endsWith('.pdf') ? (
                                              <div className="text-center p-6 bg-white rounded-lg border w-full">
                                                  <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-sm">
                                                      <span className="text-red-500 font-bold text-xl">PDF</span>
                                                  </div>
                                                  <p className="text-sm font-bold mb-3">Document Attached</p>
                                                  <a href={`http://localhost:5000${selectedMember.member.paymentSlipUrl}`} target="_blank" rel="noreferrer">
                                                      <Button variant="outline" size="sm" className="w-full">
                                                          Open PDF Viewer
                                                      </Button>
                                                  </a>
                                              </div>
                                          ) : (
                                              <img 
                                                  src={`http://localhost:5000${selectedMember.member.paymentSlipUrl}`} 
                                                  alt="Payment Slip" 
                                                  className="max-w-full max-h-[300px] object-contain drop-shadow-sm rounded border bg-white p-2"
                                              />
                                          )}
                                      </div>
                                  ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center opacity-50">
                                          <XCircle className="w-12 h-12 text-muted-foreground mb-3" />
                                          <h5 className="text-sm font-bold text-foreground">No Slip Uploaded</h5>
                                          <p className="text-xs text-muted-foreground mt-1">Verify payment manually before approval.</p>
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                    </div>
                  )}
                </div>

                {selectedMember && (
                  <div className="p-6 border-t bg-[#1a2b3c] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="text-left">
                        <h5 className="text-[#fdf2d0] font-serif font-bold italic mb-1">Final Decision</h5>
                        <p className="text-[#fdf2d0]/60 text-[10px] uppercase font-bold tracking-widest italic">Process Application</p>
                      </div>
                      <div className="flex gap-4 w-full sm:w-auto">
                        <Button 
                          variant="outline" 
                          className="flex-1 sm:w-32 bg-transparent text-white border-white/20 hover:bg-white/10 hover:text-red-400 font-bold"
                          onClick={() => handleUpdateStatus(selectedMember.id, 'Cancelled')}
                        >
                          Reject
                        </Button>
                        <Button 
                          className="flex-1 sm:w-48 bg-secondary text-primary font-black shadow-lg hover:shadow-secondary/20 transition-all hover:-translate-y-0.5"
                          onClick={() => handleUpdateStatus(selectedMember.id, 'Active')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>


          </TabsContent>

          <TabsContent value="members">
            <MembershipManagement onBack={() => setActiveTab('overview')} />
          </TabsContent>

          <TabsContent value="orders">
            <OrderManagement onBack={() => setActiveTab('overview')} />
          </TabsContent>

          <TabsContent value="inventory">
            <InventoryManagement onBack={() => setActiveTab('overview')} />
          </TabsContent>

          <TabsContent value="menu">
            <MenuManagement onBack={() => setActiveTab('overview')} />
          </TabsContent>

          <TabsContent value="promotions">
            <PromotionsManager onBack={() => setActiveTab('overview')} />
          </TabsContent>

          <TabsContent value="bookings">
            <VenueBookingsManagement onBack={() => setActiveTab('overview')} />
          </TabsContent>

          <TabsContent value="staff">
            <StaffManagement onBack={() => setActiveTab('overview')} />
          </TabsContent>

          <TabsContent value="venue-staff">
            <VenueStaffing onBack={() => setActiveTab('overview')} />
          </TabsContent>

          <TabsContent value="events">
            <EventsManagement onBack={() => setActiveTab('overview')} />
          </TabsContent>

          <TabsContent value="reports">
            <Reports onBack={() => setActiveTab('overview')} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}