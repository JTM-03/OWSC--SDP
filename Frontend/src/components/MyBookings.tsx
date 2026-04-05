import { useEffect, useState } from "react";
import { ArrowLeft, Clock, CheckCircle, Package, ChevronRight, XCircle, MapPin, Calendar, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { venueAPI, Booking } from "../api/venue";
import { toast } from "sonner@2.0.3";

interface MyBookingsProps {
    onBack: () => void;
}

export function MyBookings({ onBack }: MyBookingsProps) {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const data = await venueAPI.getMyBookings();
                setBookings(data);
            } catch (error) {
                toast.error("Failed to load bookings");
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, []);

    const getStatusIcon = (status: string) => {
        const s = status.toLowerCase();
        switch (s) {
            case "pending":
                return <Clock className="w-4 h-4" />;
            case "confirmed":
                return <CheckCircle className="w-4 h-4" />;
            case "cancelled":
                return <XCircle className="w-4 h-4" />;
            case "completed":
                return <Package className="w-4 h-4" />;
            default:
                return <Clock className="w-4 h-4" />;
        }
    };

    const getStatusColor = (status: string) => {
        const s = status.toLowerCase();
        switch (s) {
            case "pending":
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "confirmed":
                return "bg-green-100 text-green-800 border-green-200";
            case "cancelled":
                return "bg-red-100 text-red-800 border-red-200";
            case "completed":
                return "bg-blue-100 text-blue-800 border-blue-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const activeBookings = bookings.filter(b => b.bookingStatus !== "Completed" && b.bookingStatus !== "Cancelled");
    const pastBookings = bookings.filter(b => b.bookingStatus === "Completed" || b.bookingStatus === "Cancelled");

    const BookingListItem = ({ booking }: { booking: Booking }) => (
        <Card
            className="cursor-pointer hover:shadow-md transition-all hover:border-secondary"
            onClick={() => setSelectedBooking(booking)}
        >
            <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h4>{booking.venue?.name || "Venue Reservation"}</h4>
                            <Badge className={`${getStatusColor(booking.bookingStatus)} border`}>
                                <span className="flex items-center gap-1">
                                    {getStatusIcon(booking.bookingStatus)}
                                    {booking.bookingStatus}
                                </span>
                            </Badge>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(booking.bookingDate).toLocaleDateString()} at {booking.timeSlot}
                            </p>
                            {booking.venue?.charge && (
                                <p className="text-sm font-medium text-secondary">
                                    Rs. {booking.venue.charge.toLocaleString()}
                                </p>
                            )}
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
            </CardContent>
        </Card>
    );

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
                            <h1>My Bookings</h1>
                            <p className="text-white/80 mt-1">Manage your venue reservations</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="container mx-auto px-6 py-8 max-w-4xl">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                        <p className="text-muted-foreground">Loading your bookings...</p>
                    </div>
                ) : (
                    <Tabs defaultValue="upcoming" className="w-full">
                        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
                            <TabsTrigger value="upcoming">Upcoming ({activeBookings.length})</TabsTrigger>
                            <TabsTrigger value="past">Past Bookings</TabsTrigger>
                        </TabsList>

                        <TabsContent value="upcoming" className="space-y-3">
                            {activeBookings.length === 0 ? (
                                <Card>
                                    <CardContent className="py-12 text-center">
                                        <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                                        <h3 className="text-muted-foreground mb-2">No Upcoming Bookings</h3>
                                        <p className="text-sm text-muted-foreground">You don't have any pending reservations</p>
                                        <Button
                                            className="mt-6 bg-secondary text-primary"
                                            onClick={onBack}
                                        >
                                            Book a Facility
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                activeBookings.map((booking) => <BookingListItem key={booking.id} booking={booking} />)
                            )}
                        </TabsContent>

                        <TabsContent value="past" className="space-y-3">
                            {pastBookings.length === 0 ? (
                                <Card>
                                    <CardContent className="py-12 text-center text-muted-foreground">
                                        No past bookings found
                                    </CardContent>
                                </Card>
                            ) : (
                                pastBookings.map((booking) => <BookingListItem key={booking.id} booking={booking} />)
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </div>

            {/* Booking Details Dialog */}
            <Dialog open={selectedBooking !== null} onOpenChange={(open) => !open && setSelectedBooking(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    {selectedBooking && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-3">
                                    {selectedBooking.venue?.name || "Booking Details"}
                                    <Badge className={getStatusColor(selectedBooking.bookingStatus)}>
                                        {selectedBooking.bookingStatus}
                                    </Badge>
                                </DialogTitle>
                                <DialogDescription>
                                    Booking ID: BK-{selectedBooking.id}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-muted/30 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Date</p>
                                        <p className="font-medium flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-primary" />
                                            {new Date(selectedBooking.bookingDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-muted/30 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Time Slot</p>
                                        <p className="font-medium flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-primary" />
                                            {selectedBooking.timeSlot}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-bold border-b pb-2">Facility Details</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Location</span>
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                Main Branch
                                            </span>
                                        </div>
                                        {selectedBooking.venue?.charge && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">Facility Charge</span>
                                                <span className="font-bold text-secondary">Rs. {selectedBooking.venue.charge.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {selectedBooking.bookingStatus === 'Pending' && (
                                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-sm text-yellow-800">
                                            Our team is currently reviewing your booking and payment receipt. You'll receive a notification once it's confirmed.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setSelectedBooking(null)}>Close</Button>
                                {(selectedBooking.bookingStatus === 'Confirmed' || selectedBooking.bookingStatus === 'Pending') && (
                                    <Button
                                        variant="destructive"
                                        onClick={async () => {
                                            if (confirm("Are you sure you want to cancel this booking?")) {
                                                try {
                                                    await venueAPI.cancelBooking(selectedBooking.id);
                                                    toast.success("Booking cancelled successfully");
                                                    setSelectedBooking(null);
                                                    // Refetch
                                                    const data = await venueAPI.getMyBookings();
                                                    setBookings(data);
                                                } catch (e) {
                                                    toast.error("Failed to cancel booking");
                                                }
                                            }
                                        }}
                                    >
                                        Cancel Booking
                                    </Button>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
