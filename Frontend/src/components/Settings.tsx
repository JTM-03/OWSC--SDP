import { useState } from "react";
import { ArrowLeft, Bell, Mail, Smartphone, Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { toast } from "sonner@2.0.3";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";

interface SettingsProps {
  onBack: () => void;
  theme?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
}

export function Settings({ onBack, theme = 'light', onThemeChange }: SettingsProps) {
  const [notifications, setNotifications] = useState({
    emailOrders: true,
    emailPromotions: true,
    emailBookings: true,
    smsOrders: false,
    smsPromotions: false,
    smsBookings: true,
    pushOrders: true,
    pushPromotions: false,
    pushBookings: true,
  });

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    toast.success("Notification preferences saved successfully");
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    onThemeChange?.(newTheme);
    toast.success(`Switched to ${newTheme} mode`);
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
              <h1>Settings</h1>
              <p className="text-white/80 mt-1">Manage your preferences</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the look and feel of your member portal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="theme-toggle" className="cursor-pointer">
                    Dark Mode
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Switch between light and dark theme
                  </p>
                </div>
                <Switch 
                  id="theme-toggle" 
                  checked={theme === 'dark'}
                  onCheckedChange={handleThemeToggle}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to receive notifications from OWSC
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <h3 className="text-primary">Email Notifications</h3>
                </div>
                
                <div className="space-y-3 pl-7">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="emailOrders" className="cursor-pointer">
                      Order updates
                    </Label>
                    <Switch 
                      id="emailOrders" 
                      checked={notifications.emailOrders}
                      onCheckedChange={() => handleToggle("emailOrders")}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications when your order status changes
                  </p>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="emailBookings" className="cursor-pointer">
                      Booking confirmations
                    </Label>
                    <Switch 
                      id="emailBookings" 
                      checked={notifications.emailBookings}
                      onCheckedChange={() => handleToggle("emailBookings")}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Get email confirmations for venue bookings
                  </p>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="emailPromotions" className="cursor-pointer">
                      Promotions & offers
                    </Label>
                    <Switch 
                      id="emailPromotions" 
                      checked={notifications.emailPromotions}
                      onCheckedChange={() => handleToggle("emailPromotions")}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive promotional offers and club events via email
                  </p>
                </div>
              </div>

              <Separator className="my-6" />

              {/* SMS Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-muted-foreground" />
                  <h3 className="text-primary">SMS Notifications</h3>
                </div>
                
                <div className="space-y-3 pl-7">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="smsOrders" className="cursor-pointer">
                      Order updates
                    </Label>
                    <Switch 
                      id="smsOrders" 
                      checked={notifications.smsOrders}
                      onCheckedChange={() => handleToggle("smsOrders")}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive SMS when your order is ready
                  </p>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="smsBookings" className="cursor-pointer">
                      Booking confirmations
                    </Label>
                    <Switch 
                      id="smsBookings" 
                      checked={notifications.smsBookings}
                      onCheckedChange={() => handleToggle("smsBookings")}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Get SMS confirmations for venue bookings
                  </p>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="smsPromotions" className="cursor-pointer">
                      Promotions & offers
                    </Label>
                    <Switch 
                      id="smsPromotions" 
                      checked={notifications.smsPromotions}
                      onCheckedChange={() => handleToggle("smsPromotions")}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive promotional offers via SMS
                  </p>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Push Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <h3 className="text-primary">Push Notifications</h3>
                </div>
                
                <div className="space-y-3 pl-7">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pushOrders" className="cursor-pointer">
                      Order updates
                    </Label>
                    <Switch 
                      id="pushOrders" 
                      checked={notifications.pushOrders}
                      onCheckedChange={() => handleToggle("pushOrders")}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Real-time push notifications for order status
                  </p>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="pushBookings" className="cursor-pointer">
                      Booking confirmations
                    </Label>
                    <Switch 
                      id="pushBookings" 
                      checked={notifications.pushBookings}
                      onCheckedChange={() => handleToggle("pushBookings")}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Instant push notifications for booking updates
                  </p>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="pushPromotions" className="cursor-pointer">
                      Promotions & offers
                    </Label>
                    <Switch 
                      id="pushPromotions" 
                      checked={notifications.pushPromotions}
                      onCheckedChange={() => handleToggle("pushPromotions")}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive promotional alerts as push notifications
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onBack}>
              Cancel
            </Button>
            <Button className="bg-primary text-white" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}