import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { toast } from "sonner@2.0.3";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { ArrowLeft, Upload, Building2, Loader2, CheckCircle2, FileText, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { authAPI } from "../api/auth";
import { TermsAndConditionsModal } from "./TermsAndConditionsModal";

interface MemberRegistrationProps {
  onBack: () => void;
  onRegistrationComplete: () => void;
  selectedMembership?: string;
}

const membershipTypes = [
  { id: "full", label: "Full Member - Rs. 15,000/year" },
  { id: "associate", label: "Associate Member - Rs. 10,000/year" },
  { id: "sport", label: "Sport Member - Rs. 5,000/year" },
  { id: "social", label: "Social Member - Rs. 10,000/year" },
  { id: "lifetime", label: "Lifetime Member - Rs. 25,000 (one-time)" },
];

export function MemberRegistration({ onBack, onRegistrationComplete, selectedMembership }: MemberRegistrationProps) {
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [ageError, setAgeError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    phone: "",
    nic: "",
    dateOfBirth: "",
    address: "",
    membershipType: selectedMembership || "",
    emergencyContact: "",
    emergencyPhone: "",
    paymentSlip: null as File | null,
    nicImage: null as File | null,
    agreeTerms: false,
  });

  // Calculate age from DOB string and return null if valid, error string if not
  const calcAge = (dob: string): number | null => {
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agreeTerms) {
      toast.error("Please agree to the terms and conditions");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Password rules validation
    if (formData.password.length < 8 || !/[A-Z]/.test(formData.password) || !/[a-z]/.test(formData.password) || !/[0-9]/.test(formData.password) || !/[^A-Za-z0-9]/.test(formData.password)) {
      toast.error("Please ensure your password meets all requirements");
      return;
    }

    if (!formData.membershipType) {
      toast.error("Please select a membership type");
      return;
    }

    if (!formData.dateOfBirth) {
      toast.error("Please enter your date of birth");
      return;
    }

    const age = calcAge(formData.dateOfBirth);
    if (age === null || age < 21) {
      toast.error("You must be at least 21 years old to become a member of OWSC.");
      return;
    }

    if (!formData.nicImage) {
      toast.error("Please upload a photo of your NIC / Passport");
      return;
    }

    setLoading(true);
    try {
      // Frontend Validations
      const nameRegex = /^[a-zA-Z\s]+$/;
      if (!nameRegex.test(formData.fullName)) {
        toast.error("Full name can only contain letters");
        setLoading(false);
        return;
      }

      if (!formData.email.includes('@') || !formData.email.toLowerCase().endsWith('.com')) {
        toast.error('Email must contain "@" and end with ".com"');
        setLoading(false);
        return;
      }

      const phoneRegex = /^0\d{9}$/;
      if (!phoneRegex.test(formData.phone)) {
        toast.error("Phone number must be 10 digits starting with 0 (e.g. 07XXXXXXXX or 0112XXXXXX)");
        setLoading(false);
        return;
      }

      if (formData.emergencyPhone && !phoneRegex.test(formData.emergencyPhone)) {
        toast.error("Emergency contact number must be exactly 10 digits and start with 07");
        setLoading(false);
        return;
      }

      const submitData = new FormData();
      submitData.append('fullName', formData.fullName);
      submitData.append('email', formData.email);
      submitData.append('username', formData.username);
      submitData.append('password', formData.password);
      submitData.append('phone', formData.phone);
      if (formData.address) submitData.append('address', formData.address);
      if (formData.nic) submitData.append('nic', formData.nic);
      if (formData.dateOfBirth) submitData.append('dateOfBirth', formData.dateOfBirth);
      if (formData.emergencyContact) submitData.append('emergencyContact', formData.emergencyContact);
      if (formData.emergencyPhone) submitData.append('emergencyPhone', formData.emergencyPhone);
      submitData.append('membershipType', formData.membershipType);
      submitData.append('role', 'member');
      if (formData.paymentSlip instanceof File) {
        submitData.append('paymentSlip', formData.paymentSlip);
      }
      if (formData.nicImage instanceof File) {
        submitData.append('nicImage', formData.nicImage);
      }

      await authAPI.register(submitData);

      toast.success("Registration successful! You can now log in.");
      setIsSubmitted(true);
      setTimeout(() => {
        onRegistrationComplete();
      }, 3000);
    } catch (error: any) {
      if (error.response?.data?.details) {
        // Detailed validation errors from backend
        error.response.data.details.forEach((err: any) => {
          toast.error(err.message);
        });
      } else {
        const message = error.response?.data?.message || error.response?.data?.error || "Registration failed";
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | boolean | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center bg-background">
        <div className="relative z-10 w-full max-w-md mx-4">
          <Card className="bg-white/95 backdrop-blur-sm shadow-2xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-primary mb-4">Application Submitted</CardTitle>
            <CardDescription className="text-lg">
              Thank you for applying. Your membership is now awaiting admin approval. You will be redirected shortly.
            </CardDescription>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-background">
      {/* Background with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1759419038843-29749ac4cd2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwcmVzdGF1cmFudCUyMGludGVyaW9yfGVufDF8fHx8MTc2MDg3NzU0M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')`,
        }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      {/* Registration Form */}
      <div className="relative z-10 w-full max-w-2xl mx-4 my-8">
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
            <CardTitle className="text-primary">Member Registration</CardTitle>
            <CardDescription>Join the Old Wesleyites Sports Club</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-primary pb-2 border-b">Personal Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => handleChange("fullName", e.target.value)}
                      required
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nic">NIC Number *</Label>
                    <Input
                      id="nic"
                      value={formData.nic}
                      onChange={(e) => handleChange("nic", e.target.value)}
                      required
                      placeholder="e.g., 199012345678"
                    />
                  </div>
                </div>

                {/* Date of Birth + NIC Image */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        handleChange("dateOfBirth", e.target.value);
                        const age = calcAge(e.target.value);
                        if (age !== null && age < 21) {
                          setAgeError(`You are ${age} years old. Minimum age to join is 21.`);
                        } else {
                          setAgeError(null);
                        }
                      }}
                      required
                      className={ageError ? "border-destructive ring-1 ring-destructive/40" : ""}
                    />
                    {ageError && (
                      <div className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        {ageError}
                      </div>
                    )}
                    {formData.dateOfBirth && !ageError && calcAge(formData.dateOfBirth) !== null && (
                      <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-3 h-3" /> Age: {calcAge(formData.dateOfBirth)} years
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nicImage">NIC / Passport Photo *</Label>
                    <div className="relative">
                      <Input
                        id="nicImage"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleChange("nicImage", e.target.files ? e.target.files[0] : null)}
                        required
                        className="cursor-pointer"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Upload className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                    {formData.nicImage && (
                      <p className="text-xs text-secondary">Selected: {formData.nicImage.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Upload a clear photo of your NIC or Passport</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      required
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      required
                      placeholder="07X XXX XXXX"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Residential Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    required
                    placeholder="Enter your address"
                  />
                </div>
              </div>

              {/* Account Access */}
              <div className="space-y-4">
                <h3 className="text-primary pb-2 border-b">Account Access</h3>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleChange("username", e.target.value)}
                      required
                      placeholder="Choose a username for login"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      required
                      placeholder="••••••••"
                    />
                    <div className="text-xs space-y-1 mt-2">
                      <p className={`flex items-center gap-1 ${formData.password.length >= 8 ? 'text-green-500' : 'text-muted-foreground'}`}>
                        <CheckCircle2 className="w-3 h-3" /> At least 8 characters
                      </p>
                      <p className={`flex items-center gap-1 ${/[A-Z]/.test(formData.password) ? 'text-green-500' : 'text-muted-foreground'}`}>
                        <CheckCircle2 className="w-3 h-3" /> One uppercase letter
                      </p>
                      <p className={`flex items-center gap-1 ${/[a-z]/.test(formData.password) ? 'text-green-500' : 'text-muted-foreground'}`}>
                        <CheckCircle2 className="w-3 h-3" /> One lowercase letter
                      </p>
                      <p className={`flex items-center gap-1 ${/[0-9]/.test(formData.password) ? 'text-green-500' : 'text-muted-foreground'}`}>
                        <CheckCircle2 className="w-3 h-3" /> One number
                      </p>
                      <p className={`flex items-center gap-1 ${/[^A-Za-z0-9]/.test(formData.password) ? 'text-green-500' : 'text-muted-foreground'}`}>
                        <CheckCircle2 className="w-3 h-3" /> One special character
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange("confirmPassword", e.target.value)}
                      required
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              {/* Membership Details */}
              <div className="space-y-4">
                <h3 className="text-primary pb-2 border-b">Membership Details</h3>

                <div className="space-y-2">
                  <Label htmlFor="membershipType">Membership Type *</Label>
                  <Select value={formData.membershipType} onValueChange={(value) => handleChange("membershipType", value)}>
                    <SelectTrigger id="membershipType">
                      <SelectValue placeholder="Select membership type" />
                    </SelectTrigger>
                    <SelectContent>
                      {membershipTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="text-primary pb-2 border-b">Emergency Contact</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">Contact Name *</Label>
                    <Input
                      id="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={(e) => handleChange("emergencyContact", e.target.value)}
                      required
                      placeholder="Emergency contact name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergencyPhone">Contact Number *</Label>
                    <Input
                      id="emergencyPhone"
                      type="tel"
                      value={formData.emergencyPhone}
                      onChange={(e) => handleChange("emergencyPhone", e.target.value)}
                      required
                      placeholder="07X XXX XXXX"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="space-y-4">
                <h3 className="text-primary pb-2 border-b">Payment Information</h3>

                {/* Bank Details */}
                <Alert className="bg-muted/50">
                  <Building2 className="h-5 w-5 text-secondary" />
                  <AlertDescription className="ml-2">
                    <div className="space-y-3">
                      <p className="text-primary">Please transfer your membership fee to the following bank account:</p>
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Bank:</span>
                          <span>Commercial Bank of Ceylon</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Account Name:</span>
                          <span>Old Wesleyites Sports Club</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Account Number:</span>
                          <span className="text-primary">8001234567</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Branch:</span>
                          <span>Colombo 07</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Swift Code:</span>
                          <span>CCEYLKLX</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground pt-2">After making the payment, please upload a clear image of your payment slip or bank transfer receipt below.</p>
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="paymentSlip">Upload Payment Slip *</Label>
                  <div className="relative">
                    <Input
                      id="paymentSlip"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleChange("paymentSlip", e.target.files ? e.target.files[0] : null)}
                      required
                      className="cursor-pointer"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  {formData.paymentSlip && (
                    <p className="text-sm text-secondary">File selected: {formData.paymentSlip.name}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Accepted formats: JPG, PNG, PDF (Max 5MB)</p>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                {/* Header row */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">Terms &amp; Conditions</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                    onClick={() => setShowTermsModal(true)}
                  >
                    <FileText className="w-3 h-3" />
                    View Terms
                  </Button>
                </div>

                {/* Checkbox row — single inline sentence, large click target */}
                <label
                  htmlFor="terms"
                  className="flex items-start gap-3 px-4 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <Checkbox
                    id="terms"
                    checked={formData.agreeTerms}
                    onCheckedChange={(checked) => handleChange("agreeTerms", checked as boolean)}
                    className="mt-0.5 flex-shrink-0 w-5 h-5"
                  />
                  <span className="text-sm text-foreground leading-relaxed select-none">
                    I have read and agree to the{" "}
                    <button
                      type="button"
                      className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                      onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}
                    >
                      Terms &amp; Conditions
                    </button>
                    {" "}of OWSC membership. I understand my application will be reviewed by the club administration.
                  </span>
                </label>
              </div>

              <TermsAndConditionsModal
                open={showTermsModal}
                onClose={() => setShowTermsModal(false)}
                onAgree={() => handleChange("agreeTerms", true)}
              />

              {/* Submit / Cancel */}
              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                  onClick={onBack}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-2 bg-primary text-white hover:bg-primary/90 font-semibold px-8"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Submit Application
                </Button>
              </div>

              <p className="text-sm text-muted-foreground text-center pt-1">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={onBack}
                  className="text-secondary font-medium hover:underline"
                >
                  Sign in here
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}