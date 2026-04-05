import { useState, useRef } from "react";
import { ArrowLeft, Loader2, Eye, EyeOff, AlertTriangle, X, Mail, ShieldCheck, Lock, UserCircle, CreditCard } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { authAPI, setAuthToken, setUser } from "../api/auth";
import { toast } from "sonner@2.0.3";

interface LoginPageProps {
  onLogin: (userType: any, userData: any) => void;
  onRegister: () => void;
  onStaffLogin?: () => void;
  onBack?: () => void;
}

export function LoginPage({ onLogin, onRegister, onStaffLogin, onBack }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password — 3-step flow
  // step 0 = login, step 1 = enter email, step 2 = enter OTP, step 3 = set new password
  const [fpStep, setFpStep] = useState(0);
  const [fpUsername, setFpUsername] = useState("");
  const [fpNic, setFpNic] = useState("");
  const [fpOtp, setFpOtp] = useState(["", "", "", "", "", ""]);
  const [fpResetToken, setFpResetToken] = useState("");
  const [fpNewPassword, setFpNewPassword] = useState("");
  const [fpConfirm, setFpConfirm] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    console.log('🔐 Login attempt with:', { email, password: '***' });

    try {
      const response = await authAPI.login({ email, password });
      console.log('✅ Login successful:', response);

      const { user, token } = response;
      setAuthToken(token);
      setUser(user);
      toast.success("Welcome back!", {
        description: `Logged in as ${user.fullName}`
      });
      onLogin(user.role as any, user);
    } catch (error: any) {
      console.error('❌ Login error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);

      if (error.response?.status === 401) {
        const errorData = error.response.data;
        if (errorData.error === 'Account is not active') {
          setErrorMessage("Your membership application is currently being reviewed by the administration. You will be able to log in once your payment slip is verified.");
        } else {
          setErrorMessage("The password or email you entered is incorrect. Please check your credentials and try again.");
          setTimeout(() => setErrorMessage(null), 8000);
        }
      } else if (error.code === 'ERR_NETWORK') {
        toast.error("Network Error", {
          description: "Cannot connect to the server. Please make sure the backend is running on port 5000."
        });
      } else {
        setErrorMessage(error.response?.data?.error || error.message || "An unexpected error occurred. Please try again later.");
        setTimeout(() => setErrorMessage(null), 8000);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password handlers ──

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpUsername.trim() || !fpNic.trim()) {
      toast.error("Please enter your username and NIC number.");
      return;
    }
    setLoading(true);
    try {
      await authAPI.forgotPassword(fpUsername.trim(), fpNic.trim());
      toast.success("OTP sent!", { description: "An OTP has been sent to your registered email address." });
      setFpStep(2);
      setFpOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...fpOtp];
    next[index] = value.slice(-1);
    setFpOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !fpOtp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = fpOtp.join("");
    if (otp.length !== 6) { toast.error("Please enter the full 6-digit OTP."); return; }
    setLoading(true);
    try {
      const res = await authAPI.verifyOtp(fpUsername.trim(), fpNic.trim(), otp);
      setFpResetToken(res.resetToken);
      setFpStep(3);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Invalid OTP. Please try again.");
      setFpOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fpNewPassword.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (fpNewPassword !== fpConfirm) { toast.error("Passwords do not match."); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword(fpResetToken, fpNewPassword);
      toast.success("Password reset successfully!", { description: "You can now log in with your new password." });
      setFpStep(0);
      setFpUsername(""); setFpNic(""); setFpOtp(["", "", "", "", "", ""]); setFpResetToken(""); setFpNewPassword(""); setFpConfirm("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1759419038843-29749ac4cd2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwcmVzdGF1cmFudCUyMGludGVyaW9yfGVufDF8fHx8MTc2MDg3NzU0M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')`,
        }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
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

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl p-8 border border-white/20">
          {/* Back Button */}
          {fpStep === 0 && onBack && (
            <div className="mb-4">
              <Button variant="ghost" size="sm" onClick={onBack} disabled={loading} className="text-muted-foreground hover:text-primary">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
              </Button>
            </div>
          )}
          {fpStep > 0 && (
            <div className="mb-4">
              <Button variant="ghost" size="sm" onClick={() => { setFpStep(fpStep === 2 ? 1 : fpStep - 1); }} disabled={loading} className="text-muted-foreground hover:text-primary">
                <ArrowLeft className="w-4 h-4 mr-2" /> {fpStep === 1 ? "Back to Login" : "Back"}
              </Button>
            </div>
          )}

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img src={logo} alt="OWSC Logo" className="h-32 w-32 object-contain" />
            </div>
            <h1 className="text-primary mb-1">
              {fpStep === 1 && "Forgot Password"}
              {fpStep === 2 && "Enter OTP"}
              {fpStep === 3 && "New Password"}
              {fpStep === 0 && "Portal Sign In"}
            </h1>
            <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
              Old Wesleyites Sports Club
            </p>
          </div>

          {/* Step 1: Verify identity */}
          {fpStep === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
              <div className="text-center mb-2">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg text-secondary mb-5 ring-8 ring-primary/5 transition-all hover:scale-105 duration-300">
                  <ShieldCheck className="w-10 h-10" strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-bold text-primary mb-2">Account Recovery</h2>
                <p className="text-sm text-muted-foreground leading-relaxed px-2">
                  To securely reset your password, please verify your identity using your <span className="font-medium text-foreground">Username</span> and <span className="font-medium text-foreground">NIC Number</span>.
                </p>
              </div>
              <div className="space-y-4 bg-muted/30 p-5 rounded-xl border border-muted/50">
                <div className="space-y-2">
                  <Label htmlFor="fpUsername" className="font-semibold text-xs uppercase text-muted-foreground flex items-center gap-2">
                    <UserCircle className="w-3.5 h-3.5" /> Username
                  </Label>
                  <div className="relative group">
                    <Input
                      id="fpUsername"
                      type="text"
                      placeholder="Enter your account username"
                      value={fpUsername}
                      onChange={(e) => setFpUsername(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="off"
                      className="bg-white/80 border-muted h-12 pl-4 focus:bg-white transition-colors group-hover:border-primary/50 shadow-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fpNic" className="font-semibold text-xs uppercase text-muted-foreground flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5" /> NIC Number
                  </Label>
                  <div className="relative group">
                    <Input
                      id="fpNic"
                      type="text"
                      placeholder="Enter your ID number"
                      value={fpNic}
                      onChange={(e) => setFpNic(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="off"
                      className="bg-white/80 border-muted h-12 pl-4 focus:bg-white transition-colors group-hover:border-primary/50 shadow-sm"
                    />
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-12 font-bold uppercase tracking-wider shadow-lg hover:shadow-xl transition-all" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Verify & Send OTP"}
              </Button>
            </form>
          )}

          {/* Step 2: Enter OTP */}
          {fpStep === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-secondary" />
                </div>
                <p className="text-sm text-muted-foreground">A 6-digit OTP has been sent to your registered email address. Enter it below to continue.</p>
              </div>
              <div className="flex gap-2 justify-center">
                {fpOtp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    disabled={loading}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-muted rounded-lg focus:border-primary focus:outline-none transition-colors bg-white"
                  />
                ))}
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-12 font-bold uppercase tracking-wider" disabled={loading || fpOtp.join("").length !== 6}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Verify OTP
              </Button>
              <button type="button" onClick={() => { setFpOtp(["","","","","",""]); handleSendOtp({ preventDefault: () => {} } as any); }} className="w-full text-xs text-muted-foreground hover:text-primary text-center" disabled={loading}>
                Didn't receive it? Resend OTP
              </button>
            </form>
          )}

          {/* Step 3: New password */}
          {fpStep === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-sm text-muted-foreground">OTP verified! Create your new password below.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPwd" className="font-bold text-xs uppercase text-muted-foreground">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPwd"
                    type={showNewPwd ? "text" : "password"}
                    placeholder="Minimum 8 characters"
                    value={fpNewPassword}
                    onChange={(e) => setFpNewPassword(e.target.value)}
                    required disabled={loading}
                    className="bg-white border-muted h-12 pr-10"
                  />
                  <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                    {showNewPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPwd" className="font-bold text-xs uppercase text-muted-foreground">Confirm Password</Label>
                <Input
                  id="confirmPwd"
                  type="password"
                  placeholder="Re-enter new password"
                  value={fpConfirm}
                  onChange={(e) => setFpConfirm(e.target.value)}
                  required disabled={loading}
                  className="bg-white border-muted h-12"
                />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-12 font-bold uppercase tracking-wider" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Reset Password
              </Button>
            </form>
          )}
          {/* Login form — only shown when not in forgot-pwd flow */}
          {fpStep === 0 && (
            <>
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-bold text-xs uppercase text-muted-foreground">Email or Username</Label>
                  <Input
                    id="email"
                    type="text"
                    placeholder="your.email@example.com or username"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    required
                    disabled={loading}
                    className="bg-white border-muted h-12"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="font-bold text-xs uppercase text-muted-foreground">Security Password</Label>
                    <button
                      type="button"
                      onClick={() => setFpStep(1)}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      required
                      disabled={loading}
                      className="bg-white border-muted h-12 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-12 font-bold uppercase tracking-wider" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Sign In
                </Button>
              </form>

              {/* Register Link */}
              <div className="mt-6 text-center">
                <p className="text-muted-foreground">
                  Not a member?{" "}
                  <button
                    type="button"
                    onClick={onRegister}
                    className="text-secondary hover:underline"
                  >
                    Register Here
                  </button>
                </p>
              </div>

              {/* Staff/Admin Login Link */}
              {onStaffLogin && (
                <div className="mt-6 text-center">
                  <button
                    onClick={onStaffLogin}
                    className="text-sm text-primary hover:underline flex items-center justify-center gap-2"
                  >
                    <span>Staff or Admin?</span>
                    <span className="text-secondary">Login Here →</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
