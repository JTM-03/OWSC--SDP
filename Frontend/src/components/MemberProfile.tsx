import { useState } from "react";
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, CreditCard, Crown, Shield, Edit, Save, X, Camera, Upload, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Separator } from "./ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { toast } from "sonner@2.0.3";
import { useEffect } from "react";
import { authAPI, User as AuthUser } from "../api/auth";
import { membershipAPI, MembershipPlan } from "../api/membership"; // Import membershipAPI
import { Loader2 } from "lucide-react";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";

interface MemberProfileProps {
  onBack: () => void;
}

interface MemberData {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  membershipType: "regular" | "premium" | "vip";
  membershipStatus: "active" | "pending" | "expired";
  joinDate: string;
  expiryDate: string;
  emergencyContact: string;
  emergencyPhone: string;
  nic: string;
  username: string;
  password?: string;
  profileImage?: string;
}

interface MembershipUpgradeRequest {
  currentType: string;
  requestedType: string;
  reason: string;
}

type UpgradeStatus = 'none' | 'pending' | 'approved' | 'payment-pending' | 'completed';
type PaymentStep = 'method' | 'details' | 'confirmed';

export function MemberProfile({ onBack }: MemberProfileProps) {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [upgradeStatus, setUpgradeStatus] = useState<UpgradeStatus>('none');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('method');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [approvedUpgradeType, setApprovedUpgradeType] = useState<string>("");
  const [paymentDetails, setPaymentDetails] = useState({
    accountNumber: '',
    transactionId: '',
    receiptFile: null as File | null,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [memberData, setMemberData] = useState<MemberData>({
    id: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    membershipType: "regular",
    membershipStatus: "active",
    joinDate: new Date().toISOString(),
    expiryDate: new Date().toISOString(),
    emergencyContact: "",
    emergencyPhone: "",
    nic: "",
    username: "",
    profileImage: "",
  });

  const [editForm, setEditForm] = useState<MemberData>(memberData);
  const [upgradeRequest, setUpgradeRequest] = useState<MembershipUpgradeRequest>({
    currentType: memberData.membershipType,
    requestedType: "",
    reason: "",
  });

  const [availablePlans, setAvailablePlans] = useState<MembershipPlan[]>([]);
  const [userMembership, setUserMembership] = useState<any>(null);

  useEffect(() => {
    const fetchMemberProfile = async () => {
      try {
        const [profileResponse, membershipResponse, plansResponse] = await Promise.all([
          authAPI.getProfile(),
          membershipAPI.getMy(),
          membershipAPI.getPlans()
        ]);

        const user = profileResponse.user;
        const membership = membershipResponse;
        setUserMembership(membership);
        setAvailablePlans(plansResponse || []);

        const mappedData: MemberData = {
          id: `MEMBER-${user.id}`,
          name: user.fullName,
          email: user.email,
          phone: user.phone || "",
          address: user.address || "",
          city: "",
          membershipType: (membership?.type as any) || "regular",
          membershipStatus: (membership?.status?.toLowerCase() as any) || "active",
          joinDate: membership?.startDate || new Date().toISOString(),
          expiryDate: membership?.endDate || new Date().toISOString(),
          emergencyContact: user.emergencyContact || "",
          emergencyPhone: user.emergencyPhone || "",
          nic: user.nic || "",
          username: user.username,
          profileImage: (user as any).profileImageUrl ? `http://localhost:5000${(user as any).profileImageUrl}` : "",
        };

        setMemberData(mappedData);
        setEditForm(mappedData);
        setUpgradeRequest(prev => ({ ...prev, currentType: mappedData.membershipType }));

      } catch (error) {
        console.error("Profile load error", error);
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    fetchMemberProfile();
  }, []);

  const membershipTypes = {
    regular: {
      label: "Regular Member",
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: User,
      price: "Rs. 50,000/year",
      benefits: [
        "Access to all club facilities",
        "Venue booking privileges",
        "Food ordering services",
        "Member events access",
      ],
    },
    premium: {
      label: "Premium Member",
      color: "bg-purple-100 text-purple-800 border-purple-200",
      icon: Crown,
      price: "Rs. 100,000/year",
      benefits: [
        "All Regular benefits",
        "Priority venue booking",
        "10% discount on food orders",
        "Exclusive premium events",
        "Guest privileges (2 guests)",
      ],
    },
    vip: {
      label: "VIP Member",
      color: "bg-secondary/20 text-secondary border-secondary",
      icon: Shield,
      price: "Rs. 200,000/year",
      benefits: [
        "All Premium benefits",
        "VIP lounge access",
        "20% discount on all services",
        "Complimentary guest passes (5 guests)",
        "Personal concierge service",
        "Priority event invitations",
      ],
    },
    // Backend Types Compatibility
    full: {
      label: "Full Member",
      color: "bg-purple-100 text-purple-800 border-purple-200",
      icon: Crown,
      price: "Rs. 15,000/year",
      benefits: ["Access to all facilities", "Voting rights", "Event bookings", "Priority support"]
    },
    associate: {
      label: "Associate Member",
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: User,
      price: "Rs. 10,000/year",
      benefits: ["Sports facilities", "Dining access", "Event discounts"]
    },
    sport: {
      label: "Sport Member",
      color: "bg-green-100 text-green-800 border-green-200",
      icon: User,
      price: "Rs. 5,000/year",
      benefits: ["All sports facilities", "Coaching programs", "Tournament entry"]
    },
    social: {
      label: "Social Member",
      color: "bg-orange-100 text-orange-800 border-orange-200",
      icon: User,
      price: "Rs. 10,000/year",
      benefits: ["Restaurant & bar", "Social events", "Lounge access"]
    },
    lifetime: {
      label: "Lifetime Member",
      color: "bg-secondary/20 text-secondary border-secondary",
      icon: Shield,
      price: "Rs. 25,000 (One-time)",
      benefits: ["All privileges forever", "VIP events", "Unlimited guests"]
    }
  };

  const statusBadge = {
    active: { label: "Active", className: "bg-green-100 text-green-800 border-green-200" },
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    expired: { label: "Expired", className: "bg-red-100 text-red-800 border-red-200" },
  };

  const activeMembershipConfig = membershipTypes[memberData.membershipType] || membershipTypes.regular;
  const MembershipIcon = activeMembershipConfig?.icon || User; // Default to User icon if undefined

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const response = await authAPI.updateProfile({
        fullName: editForm.name,
        phone: editForm.phone,
        address: editForm.address,
        nic: editForm.nic,
        emergencyContact: editForm.emergencyContact,
        emergencyPhone: editForm.emergencyPhone,
        username: editForm.username,
        password: editForm.password || undefined,
      });

      setMemberData({ ...editForm, password: "" });

      // Update local storage session
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const newUser = {
        ...storedUser,
        fullName: editForm.name,
        phone: editForm.phone,
        address: editForm.address,
        username: editForm.username
      };
      localStorage.setItem('user', JSON.stringify(newUser));

      setIsEditing(false);
      toast.success("Profile updated successfully", {
        description: "Your profile information has been saved to the database",
      });
    } catch (error) {
      toast.error("Failed to save changes");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditForm(memberData);
    setIsEditing(false);
  };

  const handleUpgradeRequest = async () => {
    if (!upgradeRequest.requestedType) {
      toast.error("Please select a new membership plan");
      return;
    }

    try {
      setLoading(true);
      await membershipAPI.requestUpgrade(
        upgradeRequest.requestedType,
        ""
      );

      setUpgradeDialogOpen(false);
      toast.success("Upgrade request submitted", {
        description: "An administrator will review your request shortly.",
      });

      // Reset selection
      setUpgradeRequest(prev => ({ ...prev, requestedType: "" }));

    } catch (error: any) {
      console.error("Upgrade request error:", error);
      toast.error(error.response?.data?.error || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestUpgrade = async () => {
    if (!upgradeRequest.requestedType || !upgradeRequest.reason.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/membership/upgrade-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newPlanId: upgradeRequest.requestedType,
          reason: upgradeRequest.reason
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit upgrade request');
      }

      setUpgradeStatus('pending');
      setUpgradeDialogOpen(false);
      toast.success("Upgrade request submitted", {
        description: "Your membership upgrade request has been sent to admin for approval",
      });
      setUpgradeRequest({
        currentType: memberData.membershipType,
        requestedType: "",
        reason: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to submit request");
    }
  };

  // Simulate clicking on notification payment link
  const handlePaymentLinkClick = () => {
    setShowPaymentDialog(true);
    setPaymentStep('method');
    setUpgradeStatus('payment-pending');
  };

  const handlePaymentMethodContinue = () => {
    if (!selectedPaymentMethod) {
      toast.error("Please select a payment method");
      return;
    }
    setPaymentStep('details');
  };

  const handlePaymentSubmit = () => {
    if (selectedPaymentMethod === 'bank' && !paymentDetails.receiptFile) {
      toast.error("Please upload payment receipt");
      return;
    }

    if (selectedPaymentMethod !== 'bank' && (!paymentDetails.accountNumber || !paymentDetails.transactionId)) {
      toast.error("Please fill in all payment details");
      return;
    }

    setPaymentStep('confirmed');
    setUpgradeStatus('completed');

    // Update membership type after successful payment
    setTimeout(() => {
      setMemberData({ ...memberData, membershipType: approvedUpgradeType as any });
      toast.success("Membership upgraded successfully!", {
        description: `Welcome to ${membershipTypes[approvedUpgradeType as keyof typeof membershipTypes].label}`,
      });
    }, 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentDetails({ ...paymentDetails, receiptFile: e.target.files[0] });
    }
  };

  const handleClosePaymentDialog = () => {
    setShowPaymentDialog(false);
    setPaymentStep('method');
    setSelectedPaymentMethod("");
    setPaymentDetails({
      accountNumber: '',
      transactionId: '',
      receiptFile: null,
    });
  };

  const handleImageUpload = async () => {
    if (!selectedImage) {
      toast.error("Please select an image first");
      return;
    }
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('image', selectedImage);
      
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/me/picture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      
      setMemberData(prev => ({
        ...prev,
        profileImage: `http://localhost:5000${data.profileImageUrl}`
      }));
      
      toast.success("Profile image updated", {
        description: "Your profile picture has been updated successfully",
      });
      setImageDialogOpen(false);
      setSelectedImage(null);
    } catch (error) {
      toast.error("Failed to upload profile picture");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getDaysUntilExpiry = () => {
    const today = new Date();
    const expiry = new Date(memberData.expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilExpiry = getDaysUntilExpiry();

  const getFilteredPlans = () => {
    if (!availablePlans) return [];
    return availablePlans.filter(plan => plan.id !== memberData.membershipType);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin mx-auto" />
          <p className="text-muted-foreground animate-pulse font-medium">Loading your profile details...</p>
        </div>
      </div>
    );
  }

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
              <h1>My Profile</h1>
              <p className="text-white/80 mt-1">Manage your profile and membership</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <Avatar className="w-32 h-32">
                      <AvatarImage src={memberData.profileImage} />
                      <AvatarFallback className="bg-secondary text-primary text-3xl">
                        {getInitials(memberData.name)}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="icon"
                      className="absolute bottom-0 right-0 rounded-full h-10 w-10 bg-secondary text-primary hover:bg-secondary/90"
                      onClick={() => setImageDialogOpen(true)}
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  </div>

                  <h3 className="mt-4">{memberData.name}</h3>
                  <p className="text-sm text-muted-foreground">{memberData.id}</p>

                  <Badge variant="outline" className={`mt-3 ${statusBadge[memberData.membershipStatus].className}`}>
                    {statusBadge[memberData.membershipStatus].label}
                  </Badge>

                  <Separator className="my-6" />

                  <div className="w-full space-y-3 text-left">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground break-all">{memberData.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{memberData.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{memberData.city}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Member since {new Date(memberData.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Membership Card */}
            <Card className="border-2 border-secondary/20">
              <CardHeader className="bg-gradient-to-br from-primary to-primary/80 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <MembershipIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-white">{activeMembershipConfig.label}</CardTitle>
                    <CardDescription className="text-white/80">
                      {activeMembershipConfig.price}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Valid Until</p>
                    <p className="font-medium">
                      {new Date(memberData.expiryDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    {daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
                      <Badge variant="outline" className="mt-2 bg-yellow-100 text-yellow-800 border-yellow-200">
                        Expires in {daysUntilExpiry} days
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-medium mb-2">Membership Benefits</p>
                    <ul className="space-y-2">
                      {activeMembershipConfig.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="text-secondary mt-0.5">✓</span>
                          <span className="text-muted-foreground">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {upgradeStatus !== 'none' && upgradeStatus !== 'completed' && memberData.membershipType !== "vip" && (
                    <Button
                      className="w-full bg-secondary text-primary hover:bg-secondary/90"
                      onClick={() => setUpgradeDialogOpen(true)}
                      disabled={upgradeStatus === 'pending'}
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Request Upgrade
                    </Button>
                  )}

                  {upgradeStatus === 'none' && memberData.membershipType !== "vip" && (
                    <Button
                      className="w-full bg-secondary text-primary hover:bg-secondary/90"
                      onClick={() => setUpgradeDialogOpen(true)}
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Request Upgrade
                    </Button>
                  )}

                  {upgradeStatus === 'pending' && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800">Upgrade Request Pending</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Your upgrade request is awaiting admin approval
                      </p>
                    </div>
                  )}

                  {upgradeStatus === 'approved' && (
                    <div className="space-y-2">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-medium text-green-800">Upgrade Request Approved!</p>
                        <p className="text-xs text-green-700 mt-1">
                          Your upgrade to {membershipTypes[approvedUpgradeType as keyof typeof membershipTypes]?.label} has been approved
                        </p>
                      </div>
                      <Button
                        className="w-full bg-secondary text-primary hover:bg-secondary/90"
                        onClick={handlePaymentLinkClick}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Proceed to Payment
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Profile Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your personal details</CardDescription>
                  </div>
                  {!isEditing ? (
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        className="bg-secondary text-primary hover:bg-secondary/90"
                        onClick={handleSaveProfile}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h4 className="mb-4">Personal Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          value={isEditing ? editForm.name : memberData.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={isEditing ? editForm.email : memberData.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          value={isEditing ? editForm.phone : memberData.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={isEditing ? editForm.city : memberData.city}
                          onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="nic">NIC Number *</Label>
                        <Input
                          id="nic"
                          value={isEditing ? editForm.nic : memberData.nic}
                          onChange={(e) => setEditForm({ ...editForm, nic: e.target.value })}
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="col-span-1 md:col-span-2 space-y-2">
                        <Label htmlFor="address">Address *</Label>
                        <Input
                          id="address"
                          value={isEditing ? editForm.address : memberData.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Emergency Contact */}
                  <div>
                    <h4 className="mb-4">Emergency Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="emergency-contact">Contact Name *</Label>
                        <Input
                          id="emergency-contact"
                          value={isEditing ? editForm.emergencyContact : memberData.emergencyContact}
                          onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })}
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="emergency-phone">Contact Phone *</Label>
                        <Input
                          id="emergency-phone"
                          value={isEditing ? editForm.emergencyPhone : memberData.emergencyPhone}
                          onChange={(e) => setEditForm({ ...editForm, emergencyPhone: e.target.value })}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Account Security */}
                  <div>
                    <h4 className="mb-4">Account Security</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username *</Label>
                        <Input
                          id="username"
                          value={isEditing ? editForm.username : memberData.username}
                          onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">New Password (leave blank to keep current)</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={editForm.password || ""}
                          onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Membership Details (Read Only) */}
                  <div>
                    <h4 className="mb-4">Membership Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Member ID</Label>
                        <Input value={memberData.id} disabled />
                      </div>

                      <div className="space-y-2">
                        <Label>Membership Type</Label>
                        <Input value={activeMembershipConfig.label} disabled />
                      </div>

                      <div className="space-y-2">
                        <Label>Join Date</Label>
                        <Input
                          value={new Date(memberData.joinDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                          disabled
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Expiry Date</Label>
                        <Input
                          value={new Date(memberData.expiryDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Membership Upgrade Dialog */}
        <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upgrade Membership</DialogTitle>
              <DialogDescription>
                Choose a new membership plan. Your request will be sent for admin approval.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              {getFilteredPlans().map(plan => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all ${upgradeRequest.requestedType === plan.id ? 'border-secondary ring-2 ring-secondary' : 'hover:border-secondary/50'}`}
                  onClick={() => setUpgradeRequest({ ...upgradeRequest, requestedType: plan.id })}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex justify-between">
                      {plan.name}
                      <span className="text-secondary text-base">Rs.{plan.price.toLocaleString()}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">{plan.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Reason Input (Optional) */}
            <div className="space-y-2">
              <Label>Reason for Upgrade (Optional)</Label>
              <Textarea
                placeholder="Tell us why you want to upgrade..."
                value={upgradeRequest.reason}
                onChange={(e) => setUpgradeRequest({ ...upgradeRequest, reason: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)}>Cancel</Button>
              <Button
                className="bg-secondary text-primary hover:bg-secondary/90"
                onClick={handleUpgradeRequest}
                disabled={!upgradeRequest.requestedType || loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Profile Image Upload Dialog */}
        <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Profile Picture</DialogTitle>
              <DialogDescription>
                Upload a new profile picture
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="flex flex-col items-center gap-6">
                <div className="relative group cursor-pointer outline-none">
                  <Avatar className="w-32 h-32 border-4 border-muted shadow-md">
                    <AvatarImage src={selectedImage ? URL.createObjectURL(selectedImage) : (memberData.profileImage || '')} />
                    <AvatarFallback className="bg-secondary text-primary text-3xl font-serif">
                      {getInitials(memberData.name)}
                    </AvatarFallback>
                  </Avatar>
                  <label htmlFor="profile-upload" className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                    <Upload className="w-6 h-6 mb-1" />
                    <span className="text-xs font-semibold">Change</span>
                  </label>
                </div>
                <div className="text-center w-full max-w-xs">
                  <Input 
                     id="profile-upload"
                     type="file" 
                     className="hidden"
                     accept="image/jpeg, image/png, image/gif" 
                     onChange={(e) => {
                       if (e.target.files && e.target.files[0]) {
                         setSelectedImage(e.target.files[0]);
                       }
                     }} 
                  />
                  {!selectedImage ? (
                    <label htmlFor="profile-upload">
                        <Button variant="outline" className="w-full gap-2" asChild>
                            <span>
                                <Upload className="w-4 h-4" />
                                Browse from Computer
                            </span>
                        </Button>
                    </label>
                  ) : (
                    <div className="bg-[#fdf2d0]/20 p-3 rounded-lg border border-[#fdf2d0] flex items-center justify-between">
                        <span className="text-xs truncate max-w-[150px] font-medium text-[#1a2b3c]">{selectedImage.name}</span>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setSelectedImage(null)}>
                            Clear
                        </Button>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-3 uppercase tracking-wider font-semibold">
                    Supported: JPG, PNG, GIF (max 5MB)
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImageDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-secondary text-primary hover:bg-secondary/90"
                onClick={handleImageUpload}
              >
                Upload Image
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Complete Membership Upgrade</DialogTitle>
              <DialogDescription>
                Please complete the payment to upgrade your membership
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <Label>Selected Membership</Label>
                <Card className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <MembershipIcon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        {approvedUpgradeType && (
                          <>
                            <p className="font-medium">{membershipTypes[approvedUpgradeType as keyof typeof membershipTypes]?.label}</p>
                            <p className="text-sm text-muted-foreground">{membershipTypes[approvedUpgradeType as keyof typeof membershipTypes]?.price}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {paymentStep === 'method' && (
                <div className="space-y-4">
                  <Label htmlFor="payment-method">Select Payment Method *</Label>
                  <div className="grid gap-4">
                    <Card
                      className={`cursor-pointer transition-all border-2 ${selectedPaymentMethod === 'bank' ? "border-secondary bg-secondary/5" : "hover:border-secondary/50"
                        }`}
                      onClick={() => setSelectedPaymentMethod('bank')}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg mt-1">
                              <CreditCard className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h4>Bank Transfer</h4>
                              <p className="text-sm text-secondary mb-2">Transfer to our bank account</p>
                              <ul className="space-y-1">
                                <li className="flex items-start gap-2 text-sm">
                                  <span className="text-secondary mt-0.5">✓</span>
                                  <span className="text-muted-foreground">Account Number: 1234567890</span>
                                </li>
                                <li className="flex items-start gap-2 text-sm">
                                  <span className="text-secondary mt-0.5">✓</span>
                                  <span className="text-muted-foreground">Bank Name: Commercial Bank</span>
                                </li>
                              </ul>
                            </div>
                          </div>
                          {selectedPaymentMethod === 'bank' && (
                            <Badge className="bg-secondary text-primary">Selected</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    <Card
                      className={`cursor-pointer transition-all border-2 ${selectedPaymentMethod === 'credit-card' ? "border-secondary bg-secondary/5" : "hover:border-secondary/50"
                        }`}
                      onClick={() => setSelectedPaymentMethod('credit-card')}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg mt-1">
                              <CreditCard className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h4>Credit Card</h4>
                              <p className="text-sm text-secondary mb-2">Pay with credit card</p>
                              <ul className="space-y-1">
                                <li className="flex items-start gap-2 text-sm">
                                  <span className="text-secondary mt-0.5">✓</span>
                                  <span className="text-muted-foreground">Secure payment gateway</span>
                                </li>
                              </ul>
                            </div>
                          </div>
                          {selectedPaymentMethod === 'credit-card' && (
                            <Badge className="bg-secondary text-primary">Selected</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {paymentStep === 'details' && (
                <div className="space-y-4">
                  <Label>Payment Details</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedPaymentMethod === 'bank' && (
                      <div className="space-y-2">
                        <Label htmlFor="receipt-file">Upload Payment Receipt *</Label>
                        <Input
                          id="receipt-file"
                          type="file"
                          accept="image/jpeg, image/png, image/gif"
                          onChange={handleFileChange}
                        />
                        {paymentDetails.receiptFile && (
                          <p className="text-sm text-muted-foreground mt-1">
                            File selected: {paymentDetails.receiptFile.name}
                          </p>
                        )}
                      </div>
                    )}
                    {selectedPaymentMethod !== 'bank' && (
                      <div className="space-y-2">
                        <Label htmlFor="account-number">Account Number *</Label>
                        <Input
                          id="account-number"
                          value={paymentDetails.accountNumber}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, accountNumber: e.target.value })}
                        />
                      </div>
                    )}
                    {selectedPaymentMethod !== 'bank' && (
                      <div className="space-y-2">
                        <Label htmlFor="transaction-id">Transaction ID *</Label>
                        <Input
                          id="transaction-id"
                          value={paymentDetails.transactionId}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, transactionId: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {paymentStep === 'confirmed' && (
                <div className="space-y-4">
                  <Label>Payment Confirmation</Label>
                  <div className="flex items-center gap-4">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    <p className="text-sm text-muted-foreground">Payment received and verified</p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClosePaymentDialog}>
                Cancel
              </Button>
              {paymentStep === 'method' && (
                <Button
                  className="bg-secondary text-primary hover:bg-secondary/90"
                  onClick={handlePaymentMethodContinue}
                >
                  Continue
                </Button>
              )}
              {paymentStep === 'details' && (
                <Button
                  className="bg-secondary text-primary hover:bg-secondary/90"
                  onClick={handlePaymentSubmit}
                >
                  Submit Payment
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}