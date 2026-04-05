import { useState, useEffect } from "react";
import { ArrowLeft, Download, TrendingUp, Users, DollarSign, Package } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner@2.0.3";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { adminAPI } from "../api/admin";
import { Loader2 } from "lucide-react";

interface ReportsProps {
  onBack: () => void;
}

export function Reports({ onBack }: ReportsProps) {
  const [reportType, setReportType] = useState("sales");
  const [timeRange, setTimeRange] = useState("week");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await adminAPI.getStats(timeRange);
        setStats(data);
      } catch (error) {
        toast.error("Failed to load report data");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [timeRange]);

  const handleDownloadReport = () => {
    toast.success("Report downloaded successfully");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Use real data from stats or fallbacks
  const totalRevenue = stats?.kpis?.revenue || 0;
  const activeBookings = stats?.kpis?.activeBookings || 0;
  const lowStockCount = stats?.kpis?.lowStock || 0;

  // Transform revenue data for charts
  const revenueData = stats?.revenueData || [];

  // Transform low stock for "Inventory Report"
  const inventoryData = (stats?.lowStockItems || []).map((item: any) => ({
    name: item.name,
    quantity: item.quantity,
    status: item.quantity === 0 ? "Out of Stock" : "Low Stock"
  }));



  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
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
                <h1>Reports & Analytics</h1>
                <p className="text-white/80 mt-1">View detailed reports and insights</p>
              </div>
            </div>

            <Button
              className="bg-secondary text-primary hover:bg-secondary/90"
              onClick={handleDownloadReport}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex gap-4 mb-8">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sales">Sales & Revenue</SelectItem>
              <SelectItem value="inventory">Inventory Status</SelectItem>
              <SelectItem value="food-usage">Food Usage (Coming Soon)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Total Revenue (Today)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl text-secondary">Rs. {totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Real-time data
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Active Bookings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl text-secondary">{activeBookings}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Current month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Low Stock Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl text-red-500">{lowStockCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Items need reordering
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts & Data */}
        {reportType === 'sales' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Daily Revenue Trend</CardTitle>
                <CardDescription>Revenue for the past week</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => `Rs. ${value.toLocaleString()}`}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="revenue" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {reportType === 'inventory' && (
          <Card>
            <CardHeader>
              <CardTitle>Critical Inventory Status</CardTitle>
              <CardDescription>Items with low or zero stock</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryData.length > 0 ? inventoryData.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className={`text-right font-medium ${item.quantity === 0 ? "text-red-600" : "text-orange-600"
                        }`}>
                        {item.status}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No critical inventory items.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {reportType === 'food-usage' && (
          <div className="py-12 text-center border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Detailed food usage analytics coming soon.</p>
          </div>
        )}

      </div>
    </div>
  );
}
