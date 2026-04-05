import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, Users, Calendar, Plus, X, Search, UserPlus, Loader2, Check } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Separator } from "./ui/separator";
import { toast } from "sonner@2.0.3";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { venueAPI, Venue as APIVenue } from "../api/venue";
import { staffAPI, StaffMember as APIStaffMember } from "../api/staff";
import { staffingAPI, VenueAssignment } from "../api/staffing";

interface VenueStaffingProps {
  onBack: () => void;
}

// Adapting to component needs while keeping API types in mind
interface Venue extends APIVenue {
  location: string; // derived or mapped
}

interface StaffMember extends APIStaffMember {
  department: string; // derived or mapped
  available: boolean; // derived or mapped
}

export function VenueStaffing({ onBack }: VenueStaffingProps) {
  const [selectedVenue, setSelectedVenue] = useState<string>(""); // Store ID as string for UI state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<VenueAssignment | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Multi-select state
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  // Form state for new assignment
  const [assignmentForm, setAssignmentForm] = useState({
    eventName: "",
    eventDate: "",
    startTime: "",
    endTime: "",
  });

  // State for data
  const [venues, setVenues] = useState<Venue[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [assignments, setAssignments] = useState<VenueAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial data (Venues and Staff)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [venuesData, staffData] = await Promise.all([
          venueAPI.getAllVenues(),
          staffAPI.getAll()
        ]);

        // Map API data to component state
        setVenues(venuesData.map(v => ({
          ...v,
          location: v.description || "Main Building" // Fallback
        })));

        setStaffList(staffData.map(s => ({
          ...s,
          department: s.role === 'admin' ? 'Management' : 'Service', // Simple mapping
          available: true
        })));

      } catch (error) {
        toast.error("Failed to load venue data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch assignments when a venue is selected
  useEffect(() => {
    const fetchAssignments = async () => {
      if (!selectedVenue) return;

      try {
        const data = await staffingAPI.getByVenue(parseInt(selectedVenue));
        setAssignments(data);
      } catch (error) {
        toast.error("Failed to load assignments");
      }
    };

    fetchAssignments();
  }, [selectedVenue]);

  const filteredStaff = staffList.filter((staff) => {
    const matchesSearch =
      staff.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.id.toString().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || staff.role === roleFilter;
    return matchesSearch && matchesRole && staff.available;
  });

  const selectedVenueData = venues.find(v => v.id.toString() === selectedVenue);

  const getStatusBadge = (status: VenueAssignment["status"]) => {
    const statusConfig = {
      scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-800 border-blue-200" },
      active: { label: "Active", className: "bg-green-100 text-green-800 border-green-200" },
      completed: { label: "Completed", className: "bg-gray-100 text-gray-800 border-gray-200" },
      cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800 border-red-200" },
    };
    return statusConfig[status] || statusConfig.scheduled;
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { className: string }> = {
      Manager: { className: "bg-purple-100 text-purple-800 border-purple-200" },
      Inventory: { className: "bg-blue-100 text-blue-800 border-blue-200" },
      Service: { className: "bg-green-100 text-green-800 border-green-200" },
      Kitchen: { className: "bg-orange-100 text-orange-800 border-orange-200" },
    };
    // Normalize role string for lookup if needed, or provide default
    return roleConfig[role] || { className: "bg-gray-100 text-gray-800 border-gray-200" };
  };

  const resetForm = () => {
    setAssignmentForm({
      eventName: "",
      eventDate: "",
      startTime: "",
      endTime: "",
    });
    setSelectedStaffIds([]);
  };

  const openAssignDialog = () => {
    if (!selectedVenue) {
      toast.error("Please select a venue first");
      return;
    }
    resetForm();
    setAssignDialogOpen(true);
  };

  const openRemoveDialog = (assignment: VenueAssignment) => {
    setSelectedAssignment(assignment);
    setRemoveDialogOpen(true);
  };

  const handleAssignStaff = async () => {
    if (selectedStaffIds.length === 0 || !assignmentForm.eventName || !assignmentForm.eventDate || !assignmentForm.startTime || !assignmentForm.endTime) {
      toast.error("Please fill all required fields and select at least one staff member");
      return;
    }

    try {
      const promises = selectedStaffIds.map(async (staffId) => {
        const staff = staffList.find(s => s.id.toString() === staffId);
        if (!staff) return null;

        return staffingAPI.create({
          venueId: parseInt(selectedVenue),
          staffId: staff.id,
          assignmentDate: assignmentForm.eventDate,
          startTime: assignmentForm.startTime,
          endTime: assignmentForm.endTime,
          eventName: assignmentForm.eventName,
          role: staff.role // Default role as staff member's role
        });
      });

      const results = await Promise.all(promises);
      const successfulAssignments = results.filter(r => r !== null);

      // Refresh assignments list
      const updatedAssignments = await staffingAPI.getByVenue(parseInt(selectedVenue));
      setAssignments(updatedAssignments);

      toast.success(`${successfulAssignments.length} staff members assigned successfully`, {
        description: `Assigned to ${selectedVenueData?.name} for ${assignmentForm.eventName}`,
      });
      setAssignDialogOpen(false);
      resetForm();

    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to assign staff");
    }
  };

  const handleRemoveAssignment = async () => {
    if (!selectedAssignment) return;

    try {
      await staffingAPI.delete(selectedAssignment.id);

      setAssignments(assignments.filter(a => a.id !== selectedAssignment.id));

      toast.success("Assignment removed", {
        description: `${selectedAssignment.staffName} has been unassigned from this event`,
      });
      setRemoveDialogOpen(false);
      setSelectedAssignment(null);
    } catch (error) {
      toast.error("Failed to remove assignment");
    }
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
              <h1>Venue Staffing</h1>
              <p className="text-white/80 mt-1">Assign staff to venues for special occasions</p>
            </div>
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
                  <p className="text-sm text-muted-foreground mb-1">Total Venues</p>
                  <h3 className="text-primary">{venues.length}</h3>
                </div>
                <MapPin className="w-8 h-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Assignments</p>
                  <h3 className="text-blue-600">{assignments.length}</h3>
                </div>
                <UserPlus className="w-8 h-8 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Active Events</p>
                  <h3 className="text-green-600">
                    {assignments.filter(a => a.status === "active").length}
                  </h3>
                </div>
                <Calendar className="w-8 h-8 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Available Staff</p>
                  <h3 className="text-secondary">
                    {staffList.filter(s => s.available).length}
                  </h3>
                </div>
                <Users className="w-8 h-8 text-secondary opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Venues List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Venues</CardTitle>
              <CardDescription>Select a venue to manage staffing</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {venues.map((venue) => {
                    // Note: We can only show assignment count if we fetched ALL assignments, 
                    // but we are fetching per venue. So for now we cannot show count per venue easily
                    // without fetching all. We'll skip assignment count on the list for now
                    // or implement a "getAllAssignments" endpoint if critical.
                    // For now, let's keep it simple.
                    return (
                      <div
                        key={venue.id}
                        onClick={() => setSelectedVenue(venue.id.toString())}
                        className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${selectedVenue === venue.id.toString()
                          ? "border-secondary bg-secondary/5 shadow-sm"
                          : "hover:border-secondary/50"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{venue.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              <MapPin className="w-3 h-3 inline mr-1" />
                              {venue.location}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Capacity: {venue.capacity} people
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Venue Assignments */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>
                    {selectedVenueData ? selectedVenueData.name : "Select a Venue"}
                  </CardTitle>
                  <CardDescription>
                    {selectedVenueData
                      ? `Manage staff assignments for this venue`
                      : "Choose a venue from the list to view and manage assignments"
                    }
                  </CardDescription>
                </div>
                {selectedVenue && (
                  <Button
                    className="bg-secondary text-primary hover:bg-secondary/90"
                    onClick={openAssignDialog}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Assign Staff
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedVenue ? (
                <div className="py-16 text-center">
                  <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                  <p className="text-muted-foreground">
                    Select a venue to view staff assignments
                  </p>
                </div>
              ) : assignments.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                  <p className="text-muted-foreground mb-4">
                    No staff assigned to this venue yet
                  </p>
                  <Button
                    variant="outline"
                    onClick={openAssignDialog}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Assign First Staff Member
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment) => {
                    const statusBadge = getStatusBadge(assignment.status);
                    const roleBadge = getRoleBadge(assignment.staffRole);
                    return (
                      <Card key={assignment.id} className="border-2">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{assignment.eventName}</h4>
                                <Badge variant="outline" className={statusBadge.className}>
                                  {statusBadge.label}
                                </Badge>
                              </div>

                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Users className="w-4 h-4" />
                                  <span className="font-medium text-foreground">{assignment.staffName}</span>
                                  <Badge variant="outline" className={roleBadge.className}>
                                    {assignment.staffRole}
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Calendar className="w-4 h-4" />
                                  <span>
                                    {new Date(assignment.eventDate).toLocaleDateString('en-US', {
                                      weekday: 'short',
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <span className="w-4 h-4 flex items-center justify-center">⏰</span>
                                  <span>{assignment.startTime} - {assignment.endTime}</span>
                                </div>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive flex-shrink-0"
                              onClick={() => openRemoveDialog(assignment)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Assign Staff Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 border-b">
              <DialogTitle>Assign Staff to {selectedVenueData?.name}</DialogTitle>
              <DialogDescription>
                Select a staff member and provide event details
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Event Details */}
              <div className="space-y-4">
                <h4 className="font-medium text-primary">Event Details</h4>
                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="event-name">Event Name *</Label>
                    <Input
                      id="event-name"
                      value={assignmentForm.eventName}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, eventName: e.target.value })}
                      placeholder="e.g., Annual Gala Dinner"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event-date">Event Date *</Label>
                    <Input
                      id="event-date"
                      type="date"
                      value={assignmentForm.eventDate}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, eventDate: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="start-time">Start Time *</Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={assignmentForm.startTime}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, startTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-time">End Time *</Label>
                      <Input
                        id="end-time"
                        type="time"
                        value={assignmentForm.endTime}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Staff Selection */}
              <div className="space-y-4">
                <h4 className="font-medium text-primary">Select Staff Member</h4>
                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search staff..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="inventory">Inventory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg max-h-80 overflow-y-auto">
                  {filteredStaff.length > 0 ? (
                    <div className="divide-y">
                      {filteredStaff.map((staff) => {
                        const roleLabels: Record<string, string> = {
                          manager: "Manager",
                          service: "Service",
                          kitchen: "Kitchen",
                          inventory: "Inventory",
                        };
                        const roleBadge = getRoleBadge(roleLabels[staff.role] || staff.role);
                        const isSelected = selectedStaffIds.includes(staff.id.toString());

                        return (
                          <div
                            key={staff.id}
                            onClick={() => {
                              setSelectedStaffIds(prev =>
                                isSelected
                                  ? prev.filter(id => id !== staff.id.toString())
                                  : [...prev, staff.id.toString()]
                              );
                            }}
                            className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${isSelected ? "bg-secondary/10" : ""
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? "bg-secondary border-secondary text-primary" : "border-muted-foreground/30"
                                  }`}>
                                  {isSelected && <Check className="w-3 h-3" />}
                                </div>
                                <div>
                                  <p className="font-medium">{staff.fullName}</p>
                                  <p className="text-sm text-muted-foreground">{staff.id} • {staff.department}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className={roleBadge.className}>
                                {roleLabels[staff.role] || staff.role}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      No available staff found
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 border-t bg-muted/20">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-secondary text-primary hover:bg-secondary/90 shadow-md transition-all active:scale-95"
                onClick={handleAssignStaff}
                disabled={selectedStaffIds.length === 0}
              >
                Assign Staff ({selectedStaffIds.length})
              </Button>
            </DialogFooter>
          </DialogContent>

        </Dialog>

        {/* Remove Assignment Dialog */}
        <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Staff Assignment</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove this staff assignment?
              </DialogDescription>
            </DialogHeader>
            {selectedAssignment && (
              <div className="py-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Staff Member</p>
                    <p className="font-medium">{selectedAssignment.staffName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Event</p>
                    <p className="font-medium">{selectedAssignment.eventName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date & Time</p>
                    <p className="font-medium">
                      {new Date(selectedAssignment.eventDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                      {" • "}
                      {selectedAssignment.startTime} - {selectedAssignment.endTime}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  The staff member will be notified about this change.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setRemoveDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveAssignment}
              >
                Remove Assignment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
