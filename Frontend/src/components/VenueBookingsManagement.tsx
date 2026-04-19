import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Search, CheckCircle, XCircle, Clock, Calendar, Edit, RotateCw, MapPin, User, FileText, Download, Eye, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner@2.0.3";
import { adminAPI } from "../api/admin";
import { bookingCalendarAPI, CalendarEvent } from "../api/bookingCalendar";
import { venueAPI, Venue } from "../api/venue";
import api from "../api/axios";
import { getFileUrl, getImageUrl } from "../utils/image";

interface VenueBookingsManagementProps {
    onBack: () => void;
}

export function VenueBookingsManagement({ onBack }: VenueBookingsManagementProps) {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("Confirmed");
    const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isCancelOpen, setIsCancelOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [venues, setVenues] = useState<Venue[]>([]);
    const [conflictingBookings, setConflictingBookings] = useState<any[]>([]);
    const [editForm, setEditForm] = useState({
        status: "",
        date: "",
        startTime: "",
        endTime: ""
    });

    // Day-based search state
    const [searchDate, setSearchDate] = useState("");
    const [searchStartTime, setSearchStartTime] = useState("");
    const [searchEndTime, setSearchEndTime] = useState("");
    const [searchVenueId, setSearchVenueId] = useState("all");
    const [filteredDayBookings, setFilteredDayBookings] = useState<any[] | null>(null);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

    const handleDaySearch = useCallback(() => {
        if (!searchDate || !searchStartTime || !searchEndTime) {
            toast.error("Please select date and time range");
            return;
        }
        let filtered = bookings.filter(b => {
            const bookingDate = new Date(b.bookingDate).toISOString().split('T')[0];
            if (bookingDate !== searchDate) return false;
            if (searchVenueId !== "all" && b.venueId.toString() !== searchVenueId) return false;
            // Time overlap logic
            const [bStart, bEnd] = (b.timeSlot || "").split(" - ");
            if (!bStart || !bEnd) return false;
            return (searchStartTime < bEnd) && (searchEndTime > bStart);
        });
        setFilteredDayBookings(filtered);
    }, [searchDate, searchStartTime, searchEndTime, searchVenueId, bookings]);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const data = await adminAPI.getAllBookings();
            setBookings(data);
        } catch (error) {
            toast.error("Failed to load bookings");
        } finally {
            setLoading(false);
        }
    };

    const fetchVenues = async () => {
        try {
            const data = await venueAPI.getAllVenues();
            setVenues(data);
        } catch (error: any) {
            toast.error("Failed to fetch venues");
        }
    };


    const checkConflictingBookings = (venueId: string, bookingDate: string, startTime: string, endTime: string) => {
        const conflicts = bookings.filter(booking => {
            if (booking.id === selectedBooking?.id) return false;
            if (booking.venueId !== venueId) return false;
            if (booking.bookingStatus === "Cancelled") return false;
            
            const bookingDate2 = new Date(booking.bookingDate).toISOString().split('T')[0];
            if (bookingDate2 !== bookingDate) return false;

            const bookingStart = booking.startTime;
            const bookingEnd = booking.endTime;
            
            // Check for time overlap
            return !(endTime <= bookingStart || startTime >= bookingEnd);
        });
        setConflictingBookings(conflicts);
        return conflicts.length === 0;
    };

    useEffect(() => {
        fetchBookings();
        fetchVenues();
    }, []);

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            await adminAPI.updateBooking(id, { bookingStatus: status });
            toast.success(`Booking marked as ${status}`);
            fetchBookings();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleVerifyPayment = async (id: number) => {
        try {
            await adminAPI.verifyBookingPayment(id);
            toast.success("Payment verified and booking confirmed!");
            fetchBookings();
            setIsConfirmOpen(false);
        } catch (error) {
            toast.error("Failed to verify payment");
        }
    };

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    // Map calendar event to booking object for dialog
    const getEventsForDate = (day: number) => {
        const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateStr = targetDate.toISOString().split('T')[0];
        // Find bookings for this date
        return calendarEvents.filter(event => new Date(event.start).toISOString().split('T')[0] === dateStr).map(event => {
            // Find the full booking object for this event
            const booking = bookings.find(b => b.id === event.bookingId);
            // Fallback to event if not found
            return booking || event;
        });
    };

    const openEditDialog = (booking: any) => {
        setSelectedBooking(booking);
        setEditForm({
            status: booking.bookingStatus,
            date: new Date(booking.bookingDate).toISOString().split('T')[0],
            startTime: booking.startTime,
            endTime: booking.endTime
        });
        setIsEditOpen(true);
    };

    const handleSaveChanges = async () => {
        if (!selectedBooking) return;
        try {
            // Update booking in database
            await adminAPI.updateBooking(selectedBooking.id, {
                bookingStatus: editForm.status,
                bookingDate: editForm.date,
                startTime: editForm.startTime,
                endTime: editForm.endTime
            });
            
            // Notify member of changes
            if (selectedBooking.member?.email && editForm.status !== selectedBooking.bookingStatus) {
                try {
                    await api.post('notifications/send', {
                        memberId: selectedBooking.memberId,
                        type: 'booking_updated',
                        title: 'Booking Updated',
                        message: `Your booking for ${selectedBooking.venue?.name} has been updated.\nNew Status: ${editForm.status}`,
                        data: { bookingId: selectedBooking.id, newStatus: editForm.status }
                    });
                } catch (notificationError) {
                    console.warn('Notification send failed:', notificationError);
                }
            }
            
            toast.success("Booking updated successfully and member notified");
            setIsEditOpen(false);
            fetchBookings();
        } catch (error) {
            toast.error("Failed to update booking details");
        }
    };

    const handleCancelBooking = async () => {
        if (!selectedBooking) return;
        if (!cancelReason.trim()) {
            toast.error("Please provide a reason for cancellation");
            return;
        }
        try {
            // Update booking status and reason in database
            await adminAPI.updateBooking(selectedBooking.id, {
                bookingStatus: "Cancelled",
                cancellationReason: cancelReason
            });
            
            // Send notification to member
            if (selectedBooking.member?.email) {
                try {
                    await api.post('notifications/send', {
                        memberId: selectedBooking.memberId,
                        type: 'booking_cancelled',
                        title: 'Booking Cancelled',
                        message: `Your booking for ${selectedBooking.venue?.name} on ${new Date(selectedBooking.bookingDate).toLocaleDateString()} has been cancelled.\nReason: ${cancelReason}`,
                        data: { bookingId: selectedBooking.id, reason: cancelReason }
                    });
                } catch (notificationError) {
                    console.warn('Notification send failed:', notificationError);
                }
            }
            
            toast.success("Booking cancelled and member notified");
            setIsCancelOpen(false);
            setCancelReason('');
            fetchBookings();
        } catch (error) {
            toast.error("Failed to cancel booking");
        }
    };

    const filteredBookings = bookings.filter(booking => {
        const matchesSearch =
            booking.member?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.venue?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.id.toString().includes(searchTerm);

        const matchesStatus = statusFilter === 'all' || booking.bookingStatus === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // In the table, show filteredDayBookings if present, else filteredBookings
    const bookingsToShow = filteredDayBookings !== null ? filteredDayBookings : filteredBookings;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Confirmed': return 'bg-green-100 text-green-800 border-green-200';
            case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Venue Bookings</h2>
                    <p className="text-muted-foreground">Manage facility reservations and schedules</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchBookings}>
                        <RotateCw className="w-4 h-4 mr-2" /> Refresh
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <Button onClick={() => setIsSearchModalOpen(true)} className="w-full md:w-auto">
                        <Search className="w-4 h-4 mr-2" /> Search by Date & Venue
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* List View Only */}
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row gap-4 justify-between">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    placeholder="Search bookings..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <div>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Filter Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="Confirmed">Confirmed</SelectItem>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-16">Booking ID</TableHead>
                                            <TableHead className="w-32">Member</TableHead>
                                            <TableHead className="w-32">Venue</TableHead>
                                            <TableHead className="w-48">Date & Time</TableHead>
                                            <TableHead className="w-24">Status</TableHead>
                                            <TableHead className="text-right w-40">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                                            </TableRow>
                                        ) : bookingsToShow.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    No bookings found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            bookingsToShow.map((booking) => (
                                                <TableRow key={booking.id}>
                                                    <TableCell className="font-medium">#{booking.id}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{booking.member?.fullName || 'Unknown'}</span>
                                                            <span className="text-xs text-muted-foreground">{booking.member?.email}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{booking.venue?.name}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span>{new Date(booking.bookingDate).toLocaleDateString()}</span>
                                                            <span className="text-xs text-muted-foreground">{booking.startTime} - {booking.endTime}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={getStatusColor(booking.bookingStatus)}>
                                                            {booking.bookingStatus}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right w-40">
                                                        <div className="flex flex-col gap-2 items-end">
                                                            <div className="flex gap-2">
                                                                <Button variant="outline" size="icon" onClick={() => openEditDialog(booking)} title="Edit Booking">
                                                                    <Edit className="w-4 h-4" />
                                                                </Button>
                                                                <Button variant="outline" size="icon" onClick={() => { setSelectedBooking(booking); setIsViewOpen(true); }} title="View Details">
                                                                    <Eye className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {booking.bookingStatus === 'Pending' && (
                                                                    <Button
                                                                        size="icon"
                                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                                        onClick={() => { setSelectedBooking(booking); setIsConfirmOpen(true); }}
                                                                        title="Confirm Booking"
                                                                    >
                                                                        <CheckCircle className="w-4 h-4" />
                                                                    </Button>
                                                                )}
                                                                {(booking.bookingStatus === 'Pending' || booking.bookingStatus === 'Confirmed') && (
                                                                    <Button
                                                                        size="icon"
                                                                        variant="destructive"
                                                                        className="bg-red-600 hover:bg-red-700 text-white"
                                                                        onClick={() => { setSelectedBooking(booking); setCancelReason(''); setIsCancelOpen(true); }}
                                                                        title="Cancel Booking"
                                                                    >
                                                                        <XCircle className="w-4 h-4" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                </CardContent>
            </Card>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Booking #{selectedBooking?.id}</DialogTitle>
                        <DialogDescription>Update booking details</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={editForm.status} onValueChange={(val) => setEditForm({ ...editForm, status: val })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Confirmed">Confirmed</SelectItem>
                                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Time</Label>
                                <Input type="time" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>End Time</Label>
                                <Input type="time" value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveChanges}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Search Modal Dialog */}
            <Dialog open={isSearchModalOpen} onOpenChange={setIsSearchModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Search Bookings by Date & Venue</DialogTitle>
                        <DialogDescription>Select date, time range, and venue to find bookings</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input type="date" value={searchDate} onChange={e => setSearchDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Start Time</Label>
                            <Input type="time" value={searchStartTime} onChange={e => setSearchStartTime(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>End Time</Label>
                            <Input type="time" value={searchEndTime} onChange={e => setSearchEndTime(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Venue</Label>
                            <Select value={searchVenueId} onValueChange={setSearchVenueId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Venue" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Venues</SelectItem>
                                    {venues.map(venue => (
                                        <SelectItem key={venue.id} value={venue.id.toString()}>{venue.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsSearchModalOpen(false)}>Close</Button>
                        <Button onClick={() => {
                            handleDaySearch();
                            setIsSearchModalOpen(false);
                        }}>Search</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
                    <DialogHeader>
                        <DialogTitle>Booking Details #{selectedBooking?.id}</DialogTitle>
                        <DialogDescription>Complete booking and payment information</DialogDescription>
                    </DialogHeader>
                    {selectedBooking && (
                        <div className="space-y-6 py-4">
                            {/* BOOKING DETAILS SECTION */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-base border-b pb-2">Booking Information</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Member Name</span>
                                        <div className="font-medium">{selectedBooking.member?.fullName}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Email</span>
                                        <div className="font-medium text-blue-600">{selectedBooking.member?.email}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Phone</span>
                                        <div className="font-medium">{selectedBooking.member?.phone || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Venue</span>
                                        <div className="font-medium">{selectedBooking.venue?.name}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Date</span>
                                        <div className="font-medium">{new Date(selectedBooking.bookingDate).toLocaleDateString()}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Time Slot</span>
                                        <div className="font-medium">{selectedBooking.timeSlot || `${selectedBooking.startTime} - ${selectedBooking.endTime}`}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Status</span>
                                        <Badge variant="outline" className={getStatusColor(selectedBooking.bookingStatus)}>
                                            {selectedBooking.bookingStatus}
                                        </Badge>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Purpose</span>
                                        <div className="font-medium">{selectedBooking.purpose || 'Not specified'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* PAYMENT DETAILS SECTION */}
                            {selectedBooking.payments?.[0] && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-base border-b pb-2">Payment Information</h3>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-muted-foreground">Amount</span>
                                                <div className="font-semibold text-lg">Rs. {selectedBooking.payments[0].amount}</div>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Payment Method</span>
                                                <div className="font-medium">{selectedBooking.payments[0].paymentMethod}</div>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Payment Status</span>
                                                <Badge className={selectedBooking.payments[0].paymentStatus === 'Completed' ? 'bg-green-600' : selectedBooking.payments[0].paymentStatus === 'Pending' ? 'bg-yellow-600' : 'bg-red-600'}>
                                                    {selectedBooking.payments[0].paymentStatus}
                                                </Badge>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Payment Date</span>
                                                <div className="font-medium">{selectedBooking.payments[0].paymentDate ? new Date(selectedBooking.payments[0].paymentDate).toLocaleDateString() : 'Pending'}</div>
                                            </div>
                                        </div>

                                        {/* PAYMENT RECEIPT/PROOF */}
                                        {selectedBooking.payments[0].receiptUrl && (
                                            <div className="mt-4 pt-4 border-t border-blue-200 space-y-3">
                                                <div className="font-semibold text-blue-900">💾 Payment Receipt/Proof</div>
                                                <div className="flex gap-2">
                                                    <a
                                                        href={getFileUrl(selectedBooking.payments[0].receiptUrl)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded text-sm text-blue-600 hover:bg-blue-100 transition-colors flex items-center gap-2 justify-center"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        View Receipt
                                                    </a>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-blue-300 text-blue-600 hover:bg-blue-100"
                                                        onClick={() => {
                                                            const url = getFileUrl(selectedBooking.payments[0].receiptUrl);
                                                            if (!url) return;
                                                            const link = document.createElement('a');
                                                            link.href = url;
                                                            link.setAttribute('download', `receipt-${selectedBooking.id}`);
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                        }}
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                                <div className="mt-2">
                                                    <img
                                                        src={getImageUrl(selectedBooking.payments[0].receiptUrl) || undefined}
                                                        alt="Payment Receipt"
                                                        className="max-h-64 w-full rounded border border-blue-300"
                                                        style={{objectFit: 'contain', background: '#fff', padding: '8px'}}
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* CANCELLATION REASON SECTION */}
                            {selectedBooking.cancellationReason && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-base border-b pb-2 text-red-600">Cancellation Information</h3>
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <div className="text-sm">
                                            <span className="text-muted-foreground">Reason</span>
                                            <div className="font-medium text-red-700">{selectedBooking.cancellationReason}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setIsViewOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel Booking #{selectedBooking?.id}</DialogTitle>
                        <DialogDescription>Please provide a reason for cancelling this booking. The member will be notified.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Cancellation Reason</Label>
                            <Input 
                                placeholder="E.g., Venue unavailable due to maintenance"
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCancelOpen(false)}>Back</Button>
                        <Button variant="destructive" onClick={handleCancelBooking}>Confirm Cancellation</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CONFIRMATION DIALOG - Check Availability & Payment Before Confirming */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Confirm Booking #{selectedBooking?.id}</DialogTitle>
                        <DialogDescription>Review availability and payment details before confirming this booking</DialogDescription>
                    </DialogHeader>
                    
                    {selectedBooking && (
                        <div className="space-y-6 py-4">
                            {/* BOOKING DETAILS */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-base">Booking Details</h3>
                                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Member</span>
                                        <div className="font-medium">{selectedBooking.member?.fullName}</div>
                                        <div className="text-xs text-muted-foreground">{selectedBooking.member?.email}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Venue</span>
                                        <div className="font-medium">{selectedBooking.venue?.name}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Date</span>
                                        <div className="font-medium">{new Date(selectedBooking.bookingDate).toLocaleDateString()}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Time</span>
                                        <div className="font-medium">{selectedBooking.startTime} - {selectedBooking.endTime}</div>
                                    </div>
                                </div>
                            </div>

                            {/* AVAILABILITY CHECK */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-base">Venue Availability</h3>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => {
                                            const hasConflicts = !checkConflictingBookings(
                                                selectedBooking.venueId?.toString() || '',
                                                new Date(selectedBooking.bookingDate).toISOString().split('T')[0],
                                                selectedBooking.startTime,
                                                selectedBooking.endTime
                                            );
                                            if (hasConflicts) {
                                                toast.error("Venue has conflicting bookings at this time");
                                            } else {
                                                toast.success("Venue is available at this time");
                                            }
                                        }}
                                    >
                                        Check Availability
                                    </Button>
                                </div>

                                {conflictingBookings.length > 0 ? (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <div className="flex gap-2 items-start">
                                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                            <div className="space-y-2 flex-1">
                                                <p className="font-medium text-red-900">⚠️ Conflicting Bookings Found</p>
                                                <div className="text-sm text-red-800 space-y-1">
                                                    {conflictingBookings.map((booking, idx) => (
                                                        <div key={idx}>
                                                            • <span className="font-medium">{booking.member?.fullName}</span> - {booking.startTime} to {booking.endTime}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex gap-2 items-center">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                            <p className="font-medium text-green-900">✓ Venue is available at this time</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* PAYMENT DETAILS */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-base">Payment Details</h3>
                                {selectedBooking.payments && selectedBooking.payments.length > 0 ? (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Amount Due</span>
                                            <span className="font-semibold text-lg">Rs. {selectedBooking.payments[0]?.amount || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Method</span>
                                            <span>{selectedBooking.payments[0]?.paymentMethod}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Status</span>
                                            <Badge className={selectedBooking.payments[0]?.paymentStatus === 'Completed' ? 'bg-green-600' : 'bg-yellow-600'}>
                                                {selectedBooking.payments[0]?.paymentStatus}
                                            </Badge>
                                        </div>

                                        {/* PAYMENT RECEIPT/PROOF */}
                                        {selectedBooking.payments[0]?.receiptUrl && (
                                            <div className="mt-4 pt-4 border-t border-blue-200 space-y-2">
                                                <div>
                                                    <span className="text-sm font-semibold text-blue-900 block mb-2">💾 Payment Receipt/Proof</span>
                                                    <div className="flex items-center gap-2">
                                                        <a
                                                            href={getFileUrl(selectedBooking.payments[0].receiptUrl)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded text-sm text-blue-600 hover:bg-blue-100 transition-colors flex items-center gap-2"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            View Receipt
                                                        </a>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-blue-300 text-blue-600 hover:bg-blue-100"
                                                            onClick={() => {
                                                                const url = getFileUrl(selectedBooking.payments[0].receiptUrl);
                                                                if (!url) return;
                                                                const link = document.createElement('a');
                                                                link.href = url;
                                                                link.setAttribute('download', 'receipt');
                                                                document.body.appendChild(link);
                                                                link.click();
                                                                document.body.removeChild(link);
                                                            }}
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <div className="flex gap-2 items-start">
                                            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-medium text-yellow-900">⚠️ No payment recorded</p>
                                                <p className="text-sm text-yellow-800">Payment must be verified before confirming</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
                        
                        {selectedBooking?.payments?.[0]?.paymentStatus !== 'Completed' && selectedBooking?.payments?.[0]?.receiptUrl ? (
                            <Button 
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => handleVerifyPayment(selectedBooking.id)}
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Verify Payment & Approve
                            </Button>
                        ) : (
                            <Button 
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={conflictingBookings.length > 0 || !selectedBooking?.payments?.length}
                                onClick={async () => {
                                    await handleUpdateStatus(selectedBooking.id, 'Confirmed');
                                    setIsConfirmOpen(false);
                                }}
                            >
                                {conflictingBookings.length > 0 ? 'Conflict Detected' : !selectedBooking?.payments?.length ? 'Payment Required' : 'Confirm Booking'}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
