import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ClipboardList, LogOut, UtensilsCrossed } from "lucide-react";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";

interface StaffDashboardProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function StaffDashboard({ onNavigate, onLogout }: StaffDashboardProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logo} alt="OWSC Logo" className="h-10 w-10 object-contain" />
              <div>
                <h1>Staff Portal</h1>
                <p className="text-white/80 mt-1">Operations Management</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/10"
              onClick={onLogout}
            >
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-primary mb-2">Welcome, Staff Member</h2>
          <p className="text-muted-foreground">
            Manage daily operations and customer orders
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="w-5 h-5 text-purple-500" />
                Today's Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl text-primary mb-3">24</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dine-In:</span>
                  <span className="text-foreground">16</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Take-Away:</span>
                  <span className="text-foreground">8</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => onNavigate('inplace-orders')}>
            <CardHeader>
              <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <UtensilsCrossed className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle>In-Place Orders</CardTitle>
              <CardDescription>
                Record dine-in orders for customers at tables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Record Order
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => onNavigate('orders')}>
            <CardHeader>
              <div className="w-14 h-14 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                <ClipboardList className="w-8 h-8 text-teal-600" />
              </div>
              <CardTitle>Order Management</CardTitle>
              <CardDescription>
                View and manage customer orders for food and beverages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Orders
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}