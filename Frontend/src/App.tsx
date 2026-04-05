import { useState, useEffect } from "react";
import { getAuthToken, getStoredUser } from "./api/auth";
import { LandingPage } from "./components/LandingPage";
import { LoginPage } from "./components/LoginPage";
import { StaffLoginPage } from "./components/StaffLoginPage";
import { MemberRegistration } from "./components/MemberRegistration";
import { MemberDashboard } from "./components/MemberDashboard";
import { VenueBooking } from "./components/VenueBooking";
import { FoodOrdering } from "./components/FoodOrderingNew";
import { MyOrders } from "./components/MyOrders";
import { MyBookings } from "./components/MyBookings";
import { Payment } from "./components/Payment";
import { Settings } from "./components/Settings";
import { Notifications } from "./components/Notifications";
import { StaffDashboard } from "./components/StaffDashboard";
import { StaffInventory } from "./components/StaffInventory";
import { AdminDashboard } from "./components/AdminDashboard";
import { OrderManagement } from "./components/OrderManagement";
import { InventoryManagement } from "./components/InventoryManagement";
import { PromotionsManager } from "./components/PromotionsManager";
import { MembershipManagement } from "./components/MembershipManagement";
import { InPlaceOrders } from "./components/InPlaceOrders";
import { Reports } from "./components/Reports";
import { StaffManagement } from "./components/StaffManagement";
import { MenuManagement } from "./components/MenuManagement";
import { VenueStaffing } from "./components/VenueStaffing";
import { MemberProfile } from "./components/MemberProfile";
import { MembershipSelection } from "./components/MembershipSelection";
import { ExploreFacility } from "./components/ExploreFacility";
import { Events } from "./components/Events";
import { EventsManagement } from "./components/EventsManagement";
import { PaymentHistory } from "./components/PaymentHistory";
import { Toaster } from "./components/ui/sonner";

type UserType = 'guest' | 'member' | 'staff' | 'admin';
type Page = 'landing' | 'login' | 'staff-login' | 'register' | 'dashboard' | 'venues' | 'order' | 'myorders' | 'mybookings' | 'payment' | 'settings' | 'notifications' | 'profile' | 'staff-dashboard' | 'staff-inventory' | 'stock-deliveries' | 'adjustments' | 'admin' | 'orders' | 'inventory' | 'promotions' | 'members' | 'reports' | 'inplace-orders' | 'staff-management' | 'menu-management' | 'venue-staffing' | 'membership-selection' | 'explore-facility' | 'events' | 'events-management' | 'billing-history';

export default function App() {
  const [userType, setUserType] = useState<UserType>('guest');
  const [user, setUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [selectedMembership, setSelectedMembership] = useState<string | undefined>();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const storedUser = getStoredUser();
    const token = getAuthToken();
    if (storedUser && token) {
      setUser(storedUser);
      setUserType(storedUser.role);
      // Keep on landing page on refresh
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleLogin = (type: 'member' | 'staff' | 'admin', userData?: any) => {
    setUserType(type);
    setUser(userData);
    if (type === 'admin') {
      setCurrentPage('admin');
    } else if (type === 'staff') {
      setCurrentPage('staff-dashboard');
    } else {
      setCurrentPage('dashboard');
    }
  };

  const handleLogout = () => {
    setUserType('guest');
    setUser(null);
    setCurrentPage('landing');
  };

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return (
          <LandingPage
            onGetStarted={() => handleNavigate('membership-selection')}
            onLogin={() => handleNavigate('login')}
            onExploreFacility={() => handleNavigate('explore-facility')}
          />
        );

      case 'login':
        return (
          <LoginPage
            onLogin={handleLogin}
            onRegister={() => handleNavigate('register')}
            onStaffLogin={() => handleNavigate('staff-login')}
            onBack={() => handleNavigate('landing')}
          />
        );

      case 'staff-login':
        return (
          <StaffLoginPage
            onLogin={handleLogin}
            onBack={() => handleNavigate('landing')}
          />
        );

      case 'register':
        return (
          <MemberRegistration
            onBack={() => handleNavigate('membership-selection')}
            onRegistrationComplete={() => handleNavigate('login')}
            selectedMembership={selectedMembership}
          />
        );

      case 'dashboard':
        return (
          <MemberDashboard
            userName={user?.fullName || "Member"}
            onNavigate={handleNavigate as any}
            onLogout={handleLogout}
          />
        );

      case 'venues':
        return (
          <VenueBooking
            onBack={() => handleNavigate('dashboard')}
          />
        );

      case 'order':
        return (
          <FoodOrdering
            onBack={() => handleNavigate('dashboard')}
          />
        );

      case 'myorders':
        return (
          <MyOrders
            onBack={() => handleNavigate('dashboard')}
          />
        );
      case 'mybookings':
        return (
          <MyBookings
            onBack={() => handleNavigate('dashboard')}
          />
        );
      case 'payment':
        return (
          <Payment
            onBack={() => handleNavigate('dashboard')}
            amount={50000}
            description="Annual Membership Fee"
          />
        );

      case 'settings':
        return (
          <Settings
            onBack={() => handleNavigate('dashboard')}
            theme={theme}
            onThemeChange={setTheme}
          />
        );

      case 'notifications':
        return (
          <Notifications
            onBack={() => handleNavigate('dashboard')}
          />
        );

      case 'profile':
        return (
          <MemberProfile
            onBack={() => handleNavigate('dashboard')}
          />
        );

      case 'staff-dashboard':
        return (
          <StaffDashboard
            onNavigate={handleNavigate as any}
            onLogout={handleLogout}
          />
        );

      case 'staff-inventory':
      case 'stock-deliveries':
      case 'adjustments':
        return (
          <StaffInventory
            onBack={() => handleNavigate('staff-dashboard')}
          />
        );

      case 'admin':
        return (
          <AdminDashboard
            onNavigate={handleNavigate as any}
            onLogout={handleLogout}
          />
        );

      case 'orders':
        return (
          <OrderManagement
            onBack={() => handleNavigate(userType === 'staff' ? 'staff-dashboard' : 'admin')}
          />
        );

      case 'inplace-orders':
        return (
          <InPlaceOrders
            onBack={() => handleNavigate('staff-dashboard')}
          />
        );

      case 'inventory':
        return (
          <InventoryManagement
            onBack={() => handleNavigate('admin')}
          />
        );

      case 'promotions':
        return (
          <PromotionsManager
            onBack={() => handleNavigate('admin')}
          />
        );

      case 'members':
        return (
          <MembershipManagement
            onBack={() => handleNavigate('admin')}
          />
        );

      case 'reports':
        return (
          <Reports
            onBack={() => handleNavigate(userType === 'staff' ? 'staff-dashboard' : 'admin')}
          />
        );

      case 'staff-management':
        return (
          <StaffManagement
            onBack={() => handleNavigate('admin')}
          />
        );

      case 'menu-management':
        return (
          <MenuManagement
            onBack={() => handleNavigate('admin')}
          />
        );

      case 'venue-staffing':
        return (
          <VenueStaffing
            onBack={() => handleNavigate('admin')}
          />
        );

      case 'membership-selection':
        return (
          <MembershipSelection
            onBack={() => handleNavigate('landing')}
            onSelect={(planId) => {
              setSelectedMembership(planId);
              handleNavigate('register');
            }}
          />
        );

      case 'explore-facility':
        return (
          <ExploreFacility
            onBack={() => handleNavigate('landing')}
            onViewMemberships={() => handleNavigate('membership-selection')}
          />
        );

      case 'events':
        return (
          <Events
            onBack={() => handleNavigate('dashboard')}
          />
        );

      case 'events-management':
        return (
          <EventsManagement
            onBack={() => handleNavigate('admin')}
          />
        );

      case 'billing-history':
        return (
          <PaymentHistory
            onBack={() => handleNavigate('dashboard')}
          />
        );

      default:
        return (
          <LoginPage
            onLogin={handleLogin}
            onRegister={() => handleNavigate('register')}
            onStaffLogin={() => handleNavigate('staff-login')}
          />
        );
    }
  };

  return (
    <>
      <div className="size-full">
        {renderPage()}
      </div>
      <Toaster />
    </>
  );
}