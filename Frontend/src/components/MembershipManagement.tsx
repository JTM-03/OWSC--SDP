import { useState } from "react";
import { ArrowLeft, Users, Search, CheckCircle, XCircle, Clock, Mail, Phone, Crown, ArrowUpCircle, UserPlus, Eye, CalendarDays, BadgeCheck, Wallet, Download, ExternalLink, FileText, ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { toast } from "sonner@2.0.3";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { useEffect } from "react";
import { membershipAPI, Member as APIMember, Membership as APIMembership, UpgradeRequest as APIUpgradeRequest } from "../api/membership";
import { authAPI } from "../api/auth";
import { getFileUrl, getImageUrl } from "../utils/image";

interface MembershipManagementProps {
  onBack: () => void;
}

// Using types from ../api/membership

export function MembershipManagement({ onBack }: MembershipManagementProps) {
  const [members, setMembers] = useState<APIMember[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Missing states to fix ReferenceError
  const [selectedMember, setSelectedMember] = useState<APIMember | null>(null);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [renewalType, setRenewalType] = useState("current");
  const [selectedUpgradeRequest, setSelectedUpgradeRequest] = useState<APIUpgradeRequest | null>(null);
  const [upgradeRejectDialogOpen, setUpgradeRejectDialogOpen] = useState(false);
  const [upgradeRejectionReason, setUpgradeRejectionReason] = useState("");
  const [upgradeRequests, setUpgradeRequests] = useState<APIUpgradeRequest[]>([]);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [viewMember, setViewMember] = useState<APIMember | null>(null);
  const [newMemberForm, setNewMemberForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    membershipType: "full",
    emergencyContact: "",
    emergencyPhone: "",
  });

  const fetchMembers = async () => {
    try {
      const data = await membershipAPI.getAdminMembers();
      setMembers(data);
    } catch (error) {
      toast.error("Failed to load members");
    }
  };

  const fetchUpgradeRequests = async () => {
    try {
      const data = await membershipAPI.getAllRequests();
      setUpgradeRequests(data);
    } catch (error) {
      // silent error for background fetch
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchUpgradeRequests();
  }, []);

  const filteredMembers = members.filter((member) => {
    const activeMembership = member.memberships?.[0];
    const status = activeMembership?.status || member.status || 'Pending';
    const matchesSearch =
      (member.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.id.toString().includes(searchTerm);
    const matchesStatus = statusFilter === "all" || (status.toLowerCase() === statusFilter.toLowerCase());

    // Check type
    const mType = (activeMembership?.type || "full").toLowerCase();
    const matchesType = typeFilter === "all" || mType === typeFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesType;
  });

  const activeMembers = members.filter(m => (m.memberships?.[0]?.status || m.status || "").toLowerCase() === "active");
  const pendingMembers = members.filter(m => (m.memberships?.[0]?.status || m.status || "").toLowerCase() === "pending");
  const expiredMembers = members.filter(m => (m.memberships?.[0]?.status || m.status || "").toLowerCase() === "expired");

  const pendingUpgrades = upgradeRequests.filter(r => r.status === "Pending");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "expired":
        return "bg-red-100 text-red-800 border-red-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "expired":
        return <XCircle className="w-4 h-4" />;
    }
  };

  const handleApprove = async (membershipId: number, memberName: string) => {
    try {
      await membershipAPI.updateStatus(membershipId, 'Active');
      toast.success(`Member approved`, {
        description: `${memberName} has been approved and activated`,
      });
      fetchMembers();
    } catch (error) {
      toast.error("Failed to approve member");
    }
  };

  const openRejectDialog = (member: APIMember) => {
    setSelectedMember(member);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = () => {
    if (!selectedMember) return;

    if (!rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }

    toast.error(`Member rejected`, {
      description: `${selectedMember.fullName}'s application has been rejected`,
    });

    setRejectDialogOpen(false);
    setSelectedMember(null);
    setRejectionReason("");
  };

  const openRenewDialog = (member: APIMember) => {
    setSelectedMember(member);
    setRenewalType("current");
    setRenewDialogOpen(true);
  };

  const handleRenew = () => {
    if (!selectedMember) return;

    let renewalDescription = "";
    if (renewalType === "current") {
      renewalDescription = (selectedMember.memberships?.[0]?.type || "annual") === "annual" ? "one year" : "lifetime";
    } else if (renewalType === "annual") {
      renewalDescription = "one year";
    } else {
      renewalDescription = "lifetime";
    }

    toast.success(`Membership renewed`, {
      description: `${selectedMember.fullName}'s membership has been renewed for ${renewalDescription}`,
    });

    setRenewDialogOpen(false);
    setSelectedMember(null);
  };

  const handleApproveUpgrade = async (request: any) => {
    try {
      await membershipAPI.updateRequestStatus(request.id, 'Approved');
      toast.success("Upgrade approved", {
        description: `${request.member?.fullName || 'Member'} has been upgraded successfully`,
      });
      fetchUpgradeRequests();
      fetchMembers();
    } catch (error) {
      toast.error("Failed to approve upgrade");
    }
  };

  const openUpgradeRejectDialog = (request: any) => {
    setSelectedUpgradeRequest(request);
    setUpgradeRejectionReason("");
    setUpgradeRejectDialogOpen(true);
  };

  const handleRejectUpgrade = async () => {
    if (!selectedUpgradeRequest) return;

    if (!upgradeRejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }

    try {
      await membershipAPI.updateRequestStatus(selectedUpgradeRequest.id, 'Rejected');
      toast.info("Upgrade request rejected");
      setUpgradeRejectDialogOpen(false);
      setSelectedUpgradeRequest(null);
      fetchUpgradeRequests();
    } catch (error) {
      toast.error("Failed to reject upgrade");
    }

    setUpgradeRejectDialogOpen(false);
    setSelectedUpgradeRequest(null);
    setUpgradeRejectionReason("");
  };

  const handleAddNewMember = async () => {
    if (!newMemberForm.name || !newMemberForm.email || !newMemberForm.phone) {
      toast.error("Please fill all required fields");
      return;
    }

    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(newMemberForm.phone)) {
      toast.error("Phone number must be 10 digits starting with 0 (e.g. 07XXXXXXXX or 0112XXXXXX)");
      return;
    }

    if (newMemberForm.emergencyPhone && !phoneRegex.test(newMemberForm.emergencyPhone)) {
      toast.error("Emergency phone must be 10 digits starting with 0 (e.g. 07XXXXXXXX or 0112XXXXXX)");
      return;
    }

    try {
      const username = newMemberForm.email.split('@')[0] + Math.floor(Math.random() * 1000);
      const password = "Password123!"; // Setup dummy password or implement emailing link
      const nic = `NIC-${Math.floor(Math.random() * 90000) + 10000}`; // Random nicely typed dummy

      await authAPI.register({
        fullName: newMemberForm.name,
        email: newMemberForm.email,
        phone: newMemberForm.phone,
        address: newMemberForm.city ? `${newMemberForm.address}, ${newMemberForm.city}` : newMemberForm.address,
        membershipType: newMemberForm.membershipType,
        emergencyContact: newMemberForm.emergencyContact,
        emergencyPhone: newMemberForm.emergencyPhone,
        username,
        password,
        nic,
        role: "member"
      });

      toast.success("New member added successfully", {
        description: `${newMemberForm.name} has been added to the system`,
      });

      setAddMemberDialogOpen(false);
      setNewMemberForm({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        membershipType: "full",
        emergencyContact: "",
        emergencyPhone: "",
      });

      fetchMembers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add new member");
    }
  };

  const MEMBERSHIP_TYPE_LABELS: Record<string, { label: string; color: string }> = {
    full: { label: "Full Member", color: "bg-blue-100 text-blue-800 border-blue-200" },
    associate: { label: "Associate Member", color: "bg-purple-100 text-purple-800 border-purple-200" },
    sport: { label: "Sport Member", color: "bg-orange-100 text-orange-800 border-orange-200" },
    social: { label: "Social Member", color: "bg-green-100 text-green-800 border-green-200" },
    lifetime: { label: "Lifetime Member", color: "bg-amber-100 text-amber-800 border-amber-200" },
  };

  const renderMemberTable = (list: APIMember[], emptyIcon: React.ReactNode, emptyMsg: string) => (
    <Card>
      <CardContent className="p-0">
        {list.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            {emptyIcon}
            <p>{emptyMsg}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-8">#</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((member, idx) => {
                const ms = member.memberships?.[0];
                const status = (ms?.status || member.status || "Pending").toLowerCase();
                const mType = (ms?.type || "").toLowerCase();
                const typeInfo = MEMBERSHIP_TYPE_LABELS[mType];
                const fee = ms?.membershipFee || 0;
                const joinDate = ms?.startDate || member.registrationDate || "";
                const expiryDate = ms?.endDate || "";
                return (
                  <TableRow
                    key={member.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setViewMember(member)}
                  >
                    <TableCell className="text-xs text-muted-foreground font-mono">{idx + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-sm text-primary">{member.fullName}</p>
                        <p className="text-xs text-muted-foreground font-mono">MEMBER-{member.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="text-xs flex items-center gap-1 text-muted-foreground"><Mail className="w-3 h-3" />{member.email}</p>
                        <p className="text-xs flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{member.phone || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {typeInfo ? (
                        <Badge variant="outline" className={`text-xs ${typeInfo.color}`}>{typeInfo.label}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground capitalize">{mType || "—"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${getStatusColor(status as any)} flex items-center gap-1 w-fit`}>
                        {getStatusIcon(status as any)}
                        <span className="capitalize">{status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {joinDate ? new Date(joinDate).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {expiryDate ? new Date(expiryDate).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-sm text-secondary">
                      {fee > 0 ? `Rs. ${fee.toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setViewMember(member); }}>
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

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
                <h1>Membership Management</h1>
                <p className="text-white/80 mt-1">Manage member applications and renewals</p>
              </div>
            </div>
            <Button
              className="bg-secondary text-primary hover:bg-secondary/90"
              onClick={() => setAddMemberDialogOpen(true)}
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Add New Member
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Active Members</p>
                  <h3 className="text-primary">{activeMembers.length}</h3>
                </div>
                <div className="p-3 rounded-lg bg-green-100">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pending Approval</p>
                  <h3 className="text-primary">{pendingMembers.length}</h3>
                </div>
                <div className="p-3 rounded-lg bg-yellow-100">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Upgrade Requests</p>
                  <h3 className="text-secondary">{pendingUpgrades.length}</h3>
                </div>
                <div className="p-3 rounded-lg bg-secondary/10">
                  <ArrowUpCircle className="w-6 h-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Expired</p>
                  <h3 className="text-primary">{expiredMembers.length}</h3>
                </div>
                <div className="p-3 rounded-lg bg-red-100">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Filter Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    placeholder="Search by name, email or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Membership Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="full">Full Member</SelectItem>
                    <SelectItem value="associate">Associate Member</SelectItem>
                    <SelectItem value="sport">Sport Member</SelectItem>
                    <SelectItem value="social">Social Member</SelectItem>
                    <SelectItem value="lifetime">Lifetime Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Membership Upgrade Requests */}
        {pendingUpgrades.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-secondary" />
                    Membership Upgrade Requests
                  </CardTitle>
                  <CardDescription>Review and approve member upgrade requests</CardDescription>
                </div>
                <Badge variant="secondary" className="bg-secondary/20 text-secondary">
                  {pendingUpgrades.length} pending
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingUpgrades.map((request) => {
                  const membershipLabels: Record<string, { label: string, color: string }> = {
                    full: { label: "Full Member", color: "bg-blue-100 text-blue-800 border-blue-200" },
                    associate: { label: "Associate Member", color: "bg-purple-100 text-purple-800 border-purple-200" },
                    sport: { label: "Sport Member", color: "bg-orange-100 text-orange-800 border-orange-200" },
                    social: { label: "Social Member", color: "bg-green-100 text-green-800 border-green-200" },
                    lifetime: { label: "Lifetime Member", color: "bg-secondary/20 text-secondary border-secondary" },
                  };

                  const currentBadge = membershipLabels[request.oldPlanId as string] || { label: request.oldPlanId, color: "bg-gray-100 text-gray-800 border-gray-200" };
                  const requestedBadge = membershipLabels[request.newPlanId as string] || { label: request.newPlanId, color: "bg-gray-100 text-gray-800 border-gray-200" };

                  return (
                    <Card key={request.id} className="border-2 border-secondary/20">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4>{request.member?.fullName || "Member"}</h4>
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                  Pending
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Member ID: {request.memberId} • Requested on {new Date(request.requestDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                            <Badge variant="outline" className={currentBadge.color}>
                              {currentBadge.label}
                            </Badge>
                            <ArrowUpCircle className="w-5 h-5 text-secondary" />
                            <Badge variant="outline" className={requestedBadge.color}>
                              {requestedBadge.label}
                            </Badge>
                          </div>

                          {request.reason && (
                            <div>
                              <p className="text-sm font-medium mb-2">Reason for Upgrade:</p>
                              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                                {request.reason}
                              </p>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button
                              className="flex-1 bg-secondary text-primary hover:bg-secondary/90"
                              onClick={() => handleApproveUpgrade(request)}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve Upgrade
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 text-destructive hover:text-destructive"
                              onClick={() => openUpgradeRejectDialog(request)}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Members List */}
        <Tabs defaultValue="all" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList className="grid max-w-lg grid-cols-4">
              <TabsTrigger value="all">All <span className="ml-1 text-xs opacity-60">({filteredMembers.length})</span></TabsTrigger>
              <TabsTrigger value="active">Active <span className="ml-1 text-xs opacity-60">({activeMembers.length})</span></TabsTrigger>
              <TabsTrigger value="pending">Pending <span className="ml-1 text-xs opacity-60">({pendingMembers.length})</span></TabsTrigger>
              <TabsTrigger value="expired">Expired <span className="ml-1 text-xs opacity-60">({expiredMembers.length})</span></TabsTrigger>
            </TabsList>
            <p className="text-sm text-muted-foreground">{filteredMembers.length} member{filteredMembers.length !== 1 ? "s" : ""} shown</p>
          </div>

          <TabsContent value="all">
            {renderMemberTable(filteredMembers, <Users className="w-12 h-12 opacity-20" />, "No members found")}
          </TabsContent>
          <TabsContent value="active">
            {renderMemberTable(activeMembers.filter(m => filteredMembers.includes(m)), <CheckCircle className="w-12 h-12 opacity-20 text-green-400" />, "No active members found")}
          </TabsContent>
          <TabsContent value="pending">
            {renderMemberTable(pendingMembers.filter(m => filteredMembers.includes(m)), <Clock className="w-12 h-12 opacity-20 text-yellow-400" />, "No pending applications")}
          </TabsContent>
          <TabsContent value="expired">
            {renderMemberTable(expiredMembers.filter(m => filteredMembers.includes(m)), <XCircle className="w-12 h-12 opacity-20 text-red-400" />, "No expired memberships")}
          </TabsContent>
        </Tabs>

        {/* Member Detail Dialog */}
        <Dialog open={!!viewMember} onOpenChange={(open) => !open && setViewMember(null)}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden flex flex-col max-h-[95vh] rounded-xl shadow-2xl border-0">
            <DialogHeader className="sr-only">
              <DialogTitle>{viewMember?.fullName ?? "Member Application"}</DialogTitle>
              <DialogDescription>Review membership application details and take action.</DialogDescription>
            </DialogHeader>
            {viewMember && (() => {
              const ms = viewMember.memberships?.[0];
              const status = (ms?.status || viewMember.status || "Pending").toLowerCase();
              const mType = (ms?.type || ms?.membershipType || "").toLowerCase();
              const typeInfo = MEMBERSHIP_TYPE_LABELS[mType];
              const fee = ms?.membershipFee || 0;
              const joinDate = ms?.startDate || viewMember.registrationDate || "";
              const expiryDate = ms?.endDate || "";
              const payment = ms?.payments?.[0];
              const receiptUrl = payment?.receiptUrl || viewMember.paymentSlipUrl || null;
              const resolvedReceiptUrl = receiptUrl ? getFileUrl(receiptUrl) : null;
              const resolvedImageUrl   = receiptUrl ? getImageUrl(receiptUrl) : null;
              const isPdf = receiptUrl && /\.pdf$/i.test(receiptUrl);
              const nicImageUrl = (viewMember as any).nicImageUrl || null;
              const resolvedNicUrl   = nicImageUrl ? getFileUrl(nicImageUrl) : null;
              const resolvedNicImage = nicImageUrl ? getImageUrl(nicImageUrl) : null;
              const isNicPdf = nicImageUrl && /\.pdf$/i.test(nicImageUrl);
              const statusConfig = {
                active:  { label: "Active",        cls: "bg-emerald-50  text-emerald-700  border-emerald-200"  },
                pending: { label: "Pending Review", cls: "bg-amber-50  text-amber-800  border-amber-300"  },
                expired: { label: "Expired",        cls: "bg-red-100    text-red-800    border-red-300"    },
              }[status] ?? { label: status, cls: "bg-gray-100 text-gray-700 border-gray-300" };

              // Neutral plan badge colours (not semantic green/red)
              const planBadgeColor = "bg-blue-50 text-blue-800 border-blue-200";

              const Field = ({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) => (
                <div className={className}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
                  <p className="text-sm font-semibold text-gray-900 leading-snug">{value || "—"}</p>
                </div>
              );

              return (
                <>
                  {/* ── Header with gradient background ── */}
                  <div className="flex-shrink-0 px-8 pt-8 pb-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Membership Application</p>
                        <h2 className="text-2xl font-bold leading-tight truncate">{viewMember.fullName}</h2>
                        <p className="text-sm text-slate-300 flex items-center gap-2 mt-2">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          Submitted {new Date(viewMember.registrationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <Badge className={`text-xs font-bold px-4 py-2 flex-shrink-0 rounded-full ${statusConfig.cls}`}>
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </div>

                  {/* ── Body with better spacing ── */}
                  <div className="overflow-y-scroll flex-1 min-h-0 bg-slate-50 scroll-smooth">

                    {/* Contact info section */}
                    <div className="px-8 py-6 bg-white border-b border-slate-200">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Contact Information</h3>
                      <div className="space-y-4">
                        <Field label="Email Address" value={<span className="break-all text-base">{viewMember.email}</span>} />
                        <div className="grid grid-cols-2 gap-6">
                          <Field label="Phone" value={viewMember.phone} />
                          <Field label="NIC / Passport" value={viewMember.nic} />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <Field label="Date of Birth" value={(viewMember as any).dateOfBirth ? new Date((viewMember as any).dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : undefined} />
                          {viewMember.address && (
                            <Field label="Address" value={viewMember.address} />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Membership details section */}
                    <div className="px-8 py-6 bg-white border-b border-slate-200">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Membership Details</h3>
                      <div className="grid grid-cols-3 gap-6">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Plan Type</p>
                          <Badge variant="outline" className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${planBadgeColor}`}>
                            {typeInfo ? typeInfo.label.replace(' Member', '') : (mType || "—")}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Fee Amount</p>
                          <span className="text-lg font-bold text-slate-900 tabular-nums">
                            {fee > 0 ? `Rs. ${fee.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : "—"}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Status</p>
                          <span className="text-sm font-semibold text-slate-700">{statusConfig.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Dates section */}
                    <div className="px-8 py-6 bg-white border-b border-slate-200">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Membership Period</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <Field label="Join Date" value={joinDate ? new Date(joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : undefined} />
                        <Field label="Expiry Date" value={expiryDate ? new Date(expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : undefined} />
                      </div>
                    </div>

                    {/* Documents section */}
                    <div className="px-8 py-6 bg-white border-b border-slate-200">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Supporting Documents</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* NIC / Passport Photo */}
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            NIC / Passport Photo
                          </p>
                          <div className="w-full h-48 rounded-xl border-2 border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center hover:border-slate-300 transition-colors">
                            {isNicPdf ? (
                              <div className="flex flex-col items-center gap-3 text-slate-500">
                                <FileText className="w-10 h-10 text-secondary" />
                                <span className="text-sm font-medium">PDF Document</span>
                              </div>
                            ) : resolvedNicImage ? (
                              <img src={resolvedNicImage} alt="NIC" className="w-full h-full object-contain" />
                            ) : (
                              <div className="flex flex-col items-center gap-2 text-slate-400">
                                <FileText className="w-8 h-8 opacity-50" />
                                <span className="text-xs">Not uploaded</span>
                              </div>
                            )}
                          </div>
                          {resolvedNicUrl && (
                            <a href={resolvedNicUrl} target="_blank" rel="noopener noreferrer" className="block">
                              <Button size="sm" variant="outline" className="w-full gap-2 rounded-lg text-sm font-medium hover:bg-slate-50">
                                <ExternalLink className="w-4 h-4" /> View Full Document
                              </Button>
                            </a>
                          )}
                        </div>

                        {/* Payment Receipt */}
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-secondary" />
                            Payment Receipt
                          </p>
                          <div className="w-full h-48 rounded-xl border-2 border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center hover:border-slate-300 transition-colors">
                            {isPdf ? (
                              <div className="flex flex-col items-center gap-3 text-slate-500">
                                <FileText className="w-10 h-10 text-secondary" />
                                <span className="text-sm font-medium">PDF Document</span>
                              </div>
                            ) : resolvedImageUrl ? (
                              <img src={resolvedImageUrl} alt="Payment receipt" className="w-full h-full object-contain" />
                            ) : (
                              <div className="flex flex-col items-center gap-2 text-slate-400">
                                <FileText className="w-8 h-8 opacity-50" />
                                <span className="text-xs">Not uploaded</span>
                              </div>
                            )}
                          </div>
                          {resolvedReceiptUrl && (
                            <div className="flex gap-2">
                              <a href={resolvedReceiptUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                                <Button size="sm" variant="outline" className="w-full gap-2 rounded-lg text-sm font-medium hover:bg-slate-50">
                                  <ExternalLink className="w-4 h-4" /> View
                                </Button>
                              </a>
                              <a href={resolvedReceiptUrl} download className="flex-1">
                                <Button size="sm" variant="outline" className="w-full gap-2 rounded-lg text-sm font-medium hover:bg-slate-50">
                                  <Download className="w-4 h-4" /> Download
                                </Button>
                              </a>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>

                    {/* Emergency contact */}
                    {(viewMember.emergencyContact || viewMember.emergencyPhone) && (
                      <div className="px-8 py-6 bg-white border-b border-slate-200">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Emergency Contact</h3>
                        <div className="grid grid-cols-2 gap-6">
                          {viewMember.emergencyContact && <Field label="Contact Name" value={viewMember.emergencyContact} />}
                          {viewMember.emergencyPhone && <Field label="Phone Number" value={viewMember.emergencyPhone} />}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Footer with action buttons ── */}
                  <div className="px-8 py-5 border-t border-slate-200 bg-slate-50 flex-shrink-0">
                    {ms ? (
                      <>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Actions</p>
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            className="flex-1 h-11 border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400 font-semibold rounded-lg transition-all"
                            onClick={() => { openRejectDialog(viewMember); setViewMember(null); }}
                          >
                            <XCircle className="w-5 h-5 mr-2" /> Reject
                          </Button>
                          <Button
                            className="flex-1 h-11 bg-gradient-to-r from-secondary to-secondary/90 text-primary hover:shadow-lg font-semibold rounded-lg transition-all"
                            onClick={() => { handleApprove(ms.id, viewMember.fullName); setViewMember(null); }}
                          >
                            <CheckCircle className="w-5 h-5 mr-2" /> Approve
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Button variant="outline" className="w-full h-11 rounded-lg font-semibold" onClick={() => setViewMember(null)}>
                        Close
                      </Button>
                    )}
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
        {/* Renewal Dialog */}
        <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
          <DialogContent className="max-w-md p-0 overflow-hidden flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 border-b">
              <DialogTitle>Renew Membership</DialogTitle>
              <DialogDescription>
                Select the membership type for renewal
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 overflow-y-auto flex-1">
              {selectedMember && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg border">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Member</p>
                    <p className="font-bold text-primary">{selectedMember.fullName}</p>
                    <p className="text-xs text-muted-foreground mt-3 uppercase font-bold tracking-wider mb-1">Current Membership</p>
                    <p className="font-bold capitalize text-secondary">{selectedMember.memberships?.[0]?.type || 'Standard'}</p>
                  </div>

                  <div className="space-y-3">
                    <Label className="font-bold text-sm">Select Renewal Type</Label>
                    <RadioGroup value={renewalType} onValueChange={setRenewalType} className="gap-3">
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                        <RadioGroupItem value="current" id="current" />
                        <Label htmlFor="current" className="cursor-pointer flex-1">
                          <div className="flex flex-col">
                            <p className="font-bold text-sm">Current Type ({selectedMember.memberships?.[0]?.type || 'Standard'})</p>
                            <p className="text-xs text-muted-foreground">
                              {(selectedMember.memberships?.[0]?.type || 'Standard') === "annual"
                                ? "Rs. 50,000/year"
                                : "Rs. 750,000 one-time"}
                            </p>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                        <RadioGroupItem value="annual" id="annual" />
                        <Label htmlFor="annual" className="cursor-pointer flex-1">
                          <div className="flex flex-col">
                            <p className="font-bold text-sm">Annual Membership</p>
                            <p className="text-xs text-muted-foreground">Rs. 50,000/year</p>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                        <RadioGroupItem value="lifetime" id="lifetime" />
                        <Label htmlFor="lifetime" className="cursor-pointer flex-1">
                          <div className="flex flex-col">
                            <p className="font-bold text-sm">Lifetime Membership</p>
                            <p className="text-xs text-muted-foreground">Rs. 750,000 one-time</p>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="p-6 border-t bg-muted/20">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRenewDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-secondary text-primary hover:bg-secondary/90 font-bold shadow-md"
                onClick={handleRenew}
              >
                Confirm Renewal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="max-w-md p-0 overflow-hidden flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 border-b">
              <DialogTitle>Reject Membership Application</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this application
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 overflow-y-auto flex-1">
              {selectedMember && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg border">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Member</p>
                    <p className="font-bold text-primary">{selectedMember.fullName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{selectedMember.email}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rejectionReason" className="font-bold text-sm">Rejection Reason *</Label>
                    <Textarea
                      id="rejectionReason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter detailed reason for rejection (e.g., Incomplete documentation, Failed eligibility criteria, etc.)"
                      rows={4}
                      className="resize-none"
                    />
                    <p className="text-[10px] text-muted-foreground italic">
                      This reason will be sent to the applicant via email
                    </p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="p-6 border-t bg-muted/20 gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectionReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 font-bold shadow-md"
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
              >
                Confirm Rejection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Upgrade Rejection Dialog */}
        <Dialog open={upgradeRejectDialogOpen} onOpenChange={setUpgradeRejectDialogOpen}>
          <DialogContent className="max-w-md p-0 overflow-hidden flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 border-b">
              <DialogTitle>Reject Membership Upgrade</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this upgrade request
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 overflow-y-auto flex-1">
              {selectedUpgradeRequest && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg border">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Member</p>
                    <p className="font-bold text-primary">{selectedUpgradeRequest.member?.fullName || "Member"}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Member ID: {selectedUpgradeRequest.memberId}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                        {selectedUpgradeRequest.oldPlanId.charAt(0).toUpperCase() + selectedUpgradeRequest.oldPlanId.slice(1)}
                      </Badge>
                      <ArrowUpCircle className="w-3 h-3 text-secondary" />
                      <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200 text-[10px]">
                        {selectedUpgradeRequest.newPlanId.charAt(0).toUpperCase() + selectedUpgradeRequest.newPlanId.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="upgradeRejectionReason" className="font-bold text-sm">Rejection Reason *</Label>
                    <Textarea
                      id="upgradeRejectionReason"
                      value={upgradeRejectionReason}
                      onChange={(e) => setUpgradeRejectionReason(e.target.value)}
                      placeholder="Enter detailed reason for rejection (e.g., Insufficient activity level, Payment history concerns, etc.)"
                      rows={4}
                      className="resize-none"
                    />
                    <p className="text-[10px] text-muted-foreground italic">
                      This reason will be sent to the member via email
                    </p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="p-6 border-t bg-muted/20 gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setUpgradeRejectDialogOpen(false);
                  setUpgradeRejectionReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 font-bold shadow-md"
                onClick={handleRejectUpgrade}
                disabled={!upgradeRejectionReason.trim()}
              >
                Confirm Rejection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add New Member Dialog */}
        <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
          <DialogContent className="max-w-xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 border-b">
              <DialogTitle>Add New Member</DialogTitle>
              <DialogDescription>
                Enter the details of the new member
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newMemberForm.name}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
                  placeholder="Enter member's name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  value={newMemberForm.email}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                  placeholder="Enter member's email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={newMemberForm.phone}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
                  placeholder="Enter member's phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newMemberForm.address}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, address: e.target.value })}
                  placeholder="Enter member's address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={newMemberForm.city}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, city: e.target.value })}
                  placeholder="Enter member's city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="membershipType">Membership Type</Label>
                <Select value={newMemberForm.membershipType} onValueChange={(value) => setNewMemberForm({ ...newMemberForm, membershipType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select membership type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Member</SelectItem>
                    <SelectItem value="associate">Associate Member</SelectItem>
                    <SelectItem value="sport">Sport Member</SelectItem>
                    <SelectItem value="social">Social Member</SelectItem>
                    <SelectItem value="lifetime">Lifetime Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input
                  id="emergencyContact"
                  value={newMemberForm.emergencyContact}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, emergencyContact: e.target.value })}
                  placeholder="Enter emergency contact name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                <Input
                  id="emergencyPhone"
                  value={newMemberForm.emergencyPhone}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, emergencyPhone: e.target.value })}
                  placeholder="Enter emergency contact phone number"
                />
              </div>
            </div>
            <DialogFooter className="p-6 border-t bg-muted/20 gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setAddMemberDialogOpen(false);
                  setNewMemberForm({
                    name: "",
                    email: "",
                    phone: "",
                    address: "",
                    city: "",
                    membershipType: "full",
                    emergencyContact: "",
                    emergencyPhone: "",
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                className="flex-1 font-bold shadow-md bg-primary text-white"
                onClick={handleAddNewMember}
              >
                Add Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}