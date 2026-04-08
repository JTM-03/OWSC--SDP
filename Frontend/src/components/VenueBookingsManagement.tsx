import { useEffect, useState } from "react";
import { ArrowLeft, Search, CheckCircle, XCircle, Clock, Calendar, Edit, RotateCw, MapPin, User, FileText, Download } from "lucide-react";
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
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner@2.0.3";
import { adminAPI } from "../api/admin";

interface VenueBookingsManagementProps {
    onBack: () => void;
}

export function VenueBookingsManagement({ onBack }: VenueBookingsManagementProps) {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        status: "",
        date: "",
        startTime: "",
        endTime: ""
    });

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

    useEffect(() => {
        fetchBookings();
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
            await adminAPI.updateBooking(selectedBooking.id, {
                bookingStatus: editForm.status,
                bookingDate: editForm.date,
                startTime: editForm.startTime,
                endTime: editForm.endTime
            });
            toast.success("Booking updated successfully");
            setIsEditOpen(false);
            fetchBookings();
        } catch (error) {
            toast.error("Failed to update booking details");
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
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                placeholder="Search bookings..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
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
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Booking ID</TableHead>
                                    <TableHead>Member</TableHead>
                                    <TableHead>Venue</TableHead>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                                    </TableRow>
                                ) : filteredBookings.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No bookings found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBookings.map((booking) => (
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
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" size="icon" onClick={() => openEditDialog(booking)}>
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="outline" size="icon" onClick={() => { setSelectedBooking(booking); setIsViewOpen(true); }}>
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    {booking.bookingStatus === 'Pending' && (
                                                        <>
                                                            <Button
                                                                size="icon"
                                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                                onClick={() => handleUpdateStatus(booking.id, 'Confirmed')}
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="destructive"
                                                                onClick={() => { setSelectedBooking(booking); setCancelReason(''); setIsCancelOpen(true); }}
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    {booking.bookingStatus === 'Confirmed' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-red-600 border-red-200 hover:bg-red-50"
                                                            onClick={() => { setSelectedBooking(booking); setCancelReason(''); setIsCancelOpen(true); }}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
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
        </div>
    );
}
