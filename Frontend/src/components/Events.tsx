import { useState } from "react";
import { ArrowLeft, Calendar, MapPin, Users, Clock, Ticket, CreditCard, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Separator } from "./ui/separator";
import { toast } from "sonner@2.0.3";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";

import { eventsAPI } from "../api/events";
import { useEffect } from "react";

interface EventsProps {
  onBack: () => void;
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  ticketPrice: number;
  availableTickets: number;
  totalTickets: number;
  category: "sports" | "social" | "cultural" | "dining";
  image?: string;
  status?: string;
}

interface Booking {
  id: string;
  eventId: string;
  eventTitle: string;
  date: string;
  time: string;
  venue: string;
  tickets: number;
  totalAmount: number;
  status: "confirmed" | "pending" | "cancelled";
}

export function Events({ onBack }: EventsProps) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [numberOfTickets, setNumberOfTickets] = useState(1);
  const [activeTab, setActiveTab] = useState<"upcoming" | "mybookings">("upcoming");

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const data = await eventsAPI.getAllEvents();
        // Map API data to UI Event interface
        const mappedEvents: Event[] = data.map((e: any) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          date: new Date(e.date).toISOString().split('T')[0],
          time: e.time,
          venue: e.location,
          ticketPrice: e.ticketPrice || 0,
          availableTickets: e.totalTickets, // Mock for now
          totalTickets: e.totalTickets,
          category: e.category,
          status: e.status
        }));
        setEvents(mappedEvents);
      } catch (error) {
        toast.error("Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const myBookings: Booking[] = [];

  const getCategoryColor = (category: Event["category"]) => {
    switch (category) {
      case "sports":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "social":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "cultural":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "dining":
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const getStatusColor = (status: Booking["status"]) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
    }
  };

  const handleBookTickets = (event: Event) => {
    setSelectedEvent(event);
    setNumberOfTickets(1);
    setBookingDialogOpen(true);
  };

  const handleConfirmBooking = () => {
    if (!selectedEvent) return;

    if (numberOfTickets > selectedEvent.availableTickets) {
      toast.error("Not enough tickets available");
      return;
    }

    if (numberOfTickets < 1) {
      toast.error("Please select at least 1 ticket");
      return;
    }

    setBookingDialogOpen(false);
    setConfirmationDialogOpen(true);
  };

  const handlePayment = () => {
    toast.success("Booking confirmed!", {
      description: `${numberOfTickets} ticket(s) booked successfully for ${selectedEvent?.title}`,
    });
    setConfirmationDialogOpen(false);
    setSelectedEvent(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
              <h1>Club Events</h1>
              <p className="text-white/80 mt-1">Book tickets for upcoming events</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "upcoming" ? "default" : "outline"}
            className={activeTab === "upcoming" ? "bg-primary text-white" : ""}
            onClick={() => setActiveTab("upcoming")}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Upcoming Events
          </Button>
          <Button
            variant={activeTab === "mybookings" ? "default" : "outline"}
            className={activeTab === "mybookings" ? "bg-primary text-white" : ""}
            onClick={() => setActiveTab("mybookings")}
          >
            <Ticket className="w-4 h-4 mr-2" />
            My Bookings ({myBookings.length})
          </Button>
        </div>

        {/* Upcoming Events Tab */}
        {activeTab === "upcoming" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((event) => (
              <Card key={event.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className={getCategoryColor(event.category)}>
                      {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                    </Badge>
                    {event.availableTickets < 20 && (
                      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                        Limited Tickets
                      </Badge>
                    )}
                  </div>
                  <CardTitle>{event.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{event.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{formatDate(event.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{event.venue}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">
                        {event.availableTickets} / {event.totalTickets} tickets available
                      </span>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Ticket Price</p>
                        <p className="text-xl text-secondary">
                          Rs. {event.ticketPrice.toLocaleString()}
                        </p>
                      </div>
                      <Button
                        className="bg-secondary text-primary hover:bg-secondary/90"
                        onClick={() => handleBookTickets(event)}
                        disabled={event.availableTickets === 0}
                      >
                        <Ticket className="w-4 h-4 mr-2" />
                        Book Tickets
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* My Bookings Tab */}
        {activeTab === "mybookings" && (
          <div className="space-y-4">
            {myBookings.length > 0 ? (
              myBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h4>{booking.eventTitle}</h4>
                          <Badge variant="outline" className={getStatusColor(booking.status)}>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-foreground">{formatDate(booking.date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-foreground">{booking.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="text-foreground">{booking.venue}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Ticket className="w-4 h-4 text-muted-foreground" />
                            <span className="text-foreground">{booking.tickets} ticket(s)</span>
                          </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Booking ID</p>
                            <p className="text-sm font-medium">{booking.id}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Total Amount</p>
                            <p className="text-xl text-secondary">
                              Rs. {booking.totalAmount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Ticket className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                  <p className="text-muted-foreground">No bookings yet</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setActiveTab("upcoming")}
                  >
                    Browse Events
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Booking Dialog */}
        <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Book Event Tickets</DialogTitle>
              <DialogDescription>
                Select the number of tickets you'd like to book
              </DialogDescription>
            </DialogHeader>

            {selectedEvent && (
              <div className="space-y-4 py-4">
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="mb-2">{selectedEvent.title}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{formatDate(selectedEvent.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedEvent.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedEvent.venue}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Label htmlFor="tickets">Number of Tickets</Label>
                  <Input
                    id="tickets"
                    type="number"
                    min="1"
                    max={selectedEvent.availableTickets}
                    value={numberOfTickets}
                    onChange={(e) => setNumberOfTickets(parseInt(e.target.value) || 1)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {selectedEvent.availableTickets} tickets available
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ticket Price</span>
                  <span className="text-foreground">Rs. {selectedEvent.ticketPrice.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Quantity</span>
                  <span className="text-foreground">× {numberOfTickets}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Amount</span>
                  <span className="text-xl text-secondary">
                    Rs. {(selectedEvent.ticketPrice * numberOfTickets).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setBookingDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-secondary text-primary hover:bg-secondary/90"
                onClick={handleConfirmBooking}
              >
                Continue to Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Confirmation Dialog */}
        <Dialog open={confirmationDialogOpen} onOpenChange={setConfirmationDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Booking</DialogTitle>
              <DialogDescription>
                Review your booking details and complete payment
              </DialogDescription>
            </DialogHeader>

            {selectedEvent && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="mb-3">{selectedEvent.title}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span className="text-foreground">{formatDate(selectedEvent.date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time</span>
                      <span className="text-foreground">{selectedEvent.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Venue</span>
                      <span className="text-foreground">{selectedEvent.venue}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tickets</span>
                      <span className="text-foreground">{numberOfTickets} × Rs. {selectedEvent.ticketPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-secondary/10 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total Amount</span>
                    <span className="text-2xl text-secondary">
                      Rs. {(selectedEvent.ticketPrice * numberOfTickets).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <CheckCircle2 className="w-4 h-4 inline mr-2" />
                    Your tickets will be confirmed instantly after payment
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmationDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-secondary text-primary hover:bg-secondary/90"
                onClick={handlePayment}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Pay Now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
