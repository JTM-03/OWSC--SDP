import { useEffect, useState } from "react";
import { Calendar, UtensilsCrossed, Ticket, TrendingUp, Package, Bell, Settings as SettingsIcon, LogOut, User, Loader2, CreditCard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { venueAPI, Booking } from "../api/venue";
import { promotionsAPI, Promotion } from "../api/promotions";
import { toast } from "sonner@2.0.3";

interface MemberDashboardProps {
  userName: string;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
}

export function MemberDashboard({ userName, onNavigate, onLogout }: MemberDashboardProps) {
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [recentPromotions, setRecentPromotions] = useState<Promotion[]>([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [bookings, profileResponse, promos] = await Promise.all([
          venueAPI.getMyBookings(),
          import('../api/axios').then(m => m.default.get('/auth/me')),
          promotionsAPI.getAll().catch(() => [])
        ]);
        setUpcomingBookings(bookings.slice(0, 5));
        setLoyaltyPoints(profileResponse.data.user.loyaltyPoints || 0);
        setRecentPromotions(promos.slice(0, 3));
      } catch (error) {
        // Silent failure on poll
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);



  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="container mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img src={logo} alt="OWSC Logo" className="h-12 w-12 object-contain" />
              <div>
                <h1>OWSC</h1>
                <p className="text-white/80 mt-1">Members Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 relative"
                onClick={() => onNavigate('notifications')}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-secondary rounded-full"></span>
              </Button>
              <Button
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => onNavigate('profile')}
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
              <Button
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => onNavigate('settings')}
              >
                <SettingsIcon className="w-4 h-4 mr-2" />
                Settings
              </Button>
              {onLogout && (
                <Button
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={onLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-primary mb-2">Welcome back, {userName}!</h2>
            <p className="text-muted-foreground">What would you like to do today?</p>
          </div>
          <Card className="bg-secondary/10 border-secondary px-6 py-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-secondary" />
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Loyalty Points</p>
                <h3 className="text-primary">{loyaltyPoints.toLocaleString()} PTS</h3>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Book a Facility - Navy Blue */}
          <Card
            className="text-white cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] h-[240px] flex flex-col border-none overflow-hidden"
            style={{ background: 'linear-gradient(to bottom right, #1e3a5f, #152d4a)' }}
            onClick={() => onNavigate('venues')}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <Calendar className="w-8 h-8" />
                </div>
                <div>
                  <CardTitle className="text-white text-xl">Book a Facility</CardTitle>
                  <CardDescription className="text-white/70">Reserve club facilities</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex items-center">
              <p className="text-white/90">Book sports facilities, function halls, and event spaces for your activities</p>
            </CardContent>
          </Card>

          {/* Order Food & Beverages - Yellow/Gold */}
          <Card
            className="text-[#1a2b3c] cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] h-[240px] flex flex-col border-none overflow-hidden"
            style={{ background: 'linear-gradient(to bottom right, #D4AF37, #C5A028)' }}
            onClick={() => onNavigate('order')}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black/5 rounded-lg backdrop-blur-sm">
                  <UtensilsCrossed className="w-8 h-8" />
                </div>
                <div>
                  <CardTitle className="text-[#1a2b3c] text-xl font-bold">Order Food & Beverages</CardTitle>
                  <CardDescription className="text-[#1a2b3c]/70">Club restaurant & bar</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex items-center">
              <p className="text-[#1a2b3c]/80 text-sm md:text-base font-medium">Order from our club restaurant and bar menu for dine-in or takeaway</p>
            </CardContent>
          </Card>

          {/* Club Events - Yellow/Gold */}
          <Card
            className="text-[#1a2b3c] cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] h-[240px] flex flex-col border-none overflow-hidden"
            style={{ background: 'linear-gradient(to bottom right, #D4AF37, #C5A028)' }}
            onClick={() => onNavigate('events')}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black/5 rounded-lg backdrop-blur-sm">
                  <Ticket className="w-8 h-8" />
                </div>
                <div>
                  <CardTitle className="text-[#1a2b3c] text-xl font-bold">Club Events</CardTitle>
                  <CardDescription className="text-[#1a2b3c]/70">Book event tickets</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex items-center">
              <p className="text-[#1a2b3c]/80 text-sm md:text-base font-medium">View upcoming events and book tickets for tournaments and socials</p>
            </CardContent>
          </Card>

          {/* My Orders - Navy Blue */}
          <Card
            className="text-white cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] h-[240px] flex flex-col border-none overflow-hidden"
            style={{ background: 'linear-gradient(to bottom right, #1e3a5f, #152d4a)' }}
            onClick={() => onNavigate('myorders')}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <Package className="w-8 h-8" />
                </div>
                <div>
                  <CardTitle className="text-white text-xl">My Orders</CardTitle>
                  <CardDescription className="text-white/70">Track food orders</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex items-center">
              <p className="text-white/90">View history and real-time status of your restaurant orders</p>
            </CardContent>
          </Card>

          {/* Payment History - Gold */}
          <Card
            className="text-[#1a2b3c] cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] h-[240px] flex flex-col border-none overflow-hidden"
            style={{ background: 'linear-gradient(to bottom right, #D4AF37, #C5A028)' }}
            onClick={() => onNavigate('billing-history')}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black/5 rounded-lg backdrop-blur-sm">
                  <CreditCard className="w-8 h-8" />
                </div>
                <div>
                  <CardTitle className="text-[#1a2b3c] text-xl font-bold">Payment History</CardTitle>
                  <CardDescription className="text-[#1a2b3c]/70">Receipts & Billing</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex items-center">
              <p className="text-[#1a2b3c]/80 text-sm md:text-base font-medium">View transaction history and download official payment receipts</p>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upcoming Bookings */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Upcoming Bookings</CardTitle>
                  <CardDescription>Your reserved venues</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                ) : upcomingBookings.length > 0 ? (
                  upcomingBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-secondary/20 rounded">
                          <Calendar className="w-5 h-5 text-secondary" />
                        </div>
                        <div>
                          <h4 className="text-foreground">{booking.venue?.name || "Venue"}</h4>
                          <p className="text-muted-foreground">
                            {new Date(booking.bookingDate).toLocaleDateString()} at {booking.timeSlot}
                          </p>
                        </div>
                      </div>
                      <Badge variant={booking.bookingStatus === 'Confirmed' ? 'default' : 'outline'}>
                        {booking.bookingStatus}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No upcoming bookings</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Promotions */}
          <Card>
            <CardHeader>
              <CardTitle>Member Offers</CardTitle>
              <CardDescription>Exclusive promotions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentPromotions.length > 0 ? (
                  recentPromotions.map((promo) => (
                    <div key={promo.id} className="p-4 border border-secondary/20 rounded-lg bg-secondary/5">
                      <div className="flex items-start gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-secondary mt-1 flex-shrink-0" />
                        <h4 className="text-foreground">{promo.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{promo.description}</p>
                      <p className="text-xs text-secondary">Valid until {new Date(promo.validUntil).toLocaleDateString()}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">No active promotions currently.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}