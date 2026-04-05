import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner@2.0.3";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { authAPI, setAuthToken, setUser } from "../api/auth";
import { Loader2, ArrowLeft, ShieldCheck, Eye, EyeOff, AlertTriangle, X } from "lucide-react";

interface StaffLoginPageProps {
  onLogin: (type: any, userData: any) => void;
  onBack: () => void;
}

export function StaffLoginPage({ onLogin, onBack }: StaffLoginPageProps) {
  const [staffCredentials, setStaffCredentials] = useState({
    username: "",
    password: "",
  });

  const [adminCredentials, setAdminCredentials] = useState({
    username: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      const { user, token } = await authAPI.login({
        email: staffCredentials.username, // Assuming username is email or handled by backend
        password: staffCredentials.password
      });
      setAuthToken(token);
      setUser(user);
      onLogin(user.role as any, user);
    } catch (error: any) {
      if (error.response?.status === 401) {
        setErrorMessage("The password or email you entered is incorrect. Please check your credentials and try again.");
        setTimeout(() => setErrorMessage(null), 8000);
      } else {
        setErrorMessage(error.response?.data?.error || "Staff login failed");
        setTimeout(() => setErrorMessage(null), 8000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      const { user, token } = await authAPI.login({
        email: adminCredentials.username,
        password: adminCredentials.password
      });
      setAuthToken(token);
      setUser(user);
      onLogin(user.role as any, user);
    } catch (error: any) {
      if (error.response?.status === 401) {
        setErrorMessage("The password or email you entered is incorrect. Please check your credentials and try again.");
        setTimeout(() => setErrorMessage(null), 8000);
      } else {
        setErrorMessage(error.response?.data?.error || "Admin login failed");
        setTimeout(() => setErrorMessage(null), 8000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-background overflow-hidden">
      {/* Background with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1759419038843-29749ac4cd2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwcmVzdGF1cmFudCUyMGludGVyaW9yfGVufDF8fHx8MTc2MDg3NzU0M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')`,
        }}
      >
        <div className="absolute inset-0 bg-primary/90"></div>
      </div>

      {/* Error Message Popup */}
      {errorMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-white/95 border-l-4 border-destructive text-foreground px-6 py-4 rounded-xl shadow-2xl flex items-start gap-4 max-w-md w-[calc(100vw-2rem)] backdrop-blur-md">
            <div className="mt-0.5 text-destructive bg-destructive/10 p-1.5 rounded-full">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-destructive uppercase tracking-wider mb-1">Authentication Failed</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Login Form */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <Card className="bg-white/95 backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="absolute left-4 top-4"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex justify-center mb-4">
              <img src={logo} alt="OWSC Logo" className="h-24 w-24 object-contain" />
            </div>
            <CardTitle className="flex items-center justify-center gap-2 text-primary">
              <ShieldCheck className="w-6 h-6" />
              Staff & Admin Portal
            </CardTitle>
            <CardDescription>Secure access for authorized personnel only</CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="staff" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="staff">Staff Login</TabsTrigger>
                <TabsTrigger value="admin">Admin Login</TabsTrigger>
              </TabsList>

              {/* Staff Login Tab */}
              <TabsContent value="staff">
                <form onSubmit={handleStaffLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="staff-username">Staff Email or Username</Label>
                    <Input
                      id="staff-username"
                      type="text"
                      placeholder="Enter your email or username"
                      value={staffCredentials.username}
                      onChange={(e) => {
                        setStaffCredentials({ ...staffCredentials, username: e.target.value });
                        if (errorMessage) setErrorMessage(null);
                      }}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="staff-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="staff-password"
                        type={showStaffPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={staffCredentials.password}
                        onChange={(e) => {
                          setStaffCredentials({ ...staffCredentials, password: e.target.value });
                          if (errorMessage) setErrorMessage(null);
                        }}
                        required
                        disabled={loading}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStaffPassword(!showStaffPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                        disabled={loading}
                      >
                        {showStaffPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-primary text-white">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Login as Staff
                  </Button>
                </form>
              </TabsContent>

              {/* Admin Login Tab */}
              <TabsContent value="admin">
                <form onSubmit={handleAdminLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-username">Admin Email or Username</Label>
                    <Input
                      id="admin-username"
                      type="text"
                      placeholder="Enter admin email or username"
                      value={adminCredentials.username}
                      onChange={(e) => {
                        setAdminCredentials({ ...adminCredentials, username: e.target.value });
                        if (errorMessage) setErrorMessage(null);
                      }}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Admin Password</Label>
                    <div className="relative">
                      <Input
                        id="admin-password"
                        type={showAdminPassword ? "text" : "password"}
                        placeholder="Enter admin password"
                        value={adminCredentials.password}
                        onChange={(e) => {
                          setAdminCredentials({ ...adminCredentials, password: e.target.value });
                          if (errorMessage) setErrorMessage(null);
                        }}
                        required
                        disabled={loading}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                        disabled={loading}
                      >
                        {showAdminPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-primary text-white">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Login as Admin
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
