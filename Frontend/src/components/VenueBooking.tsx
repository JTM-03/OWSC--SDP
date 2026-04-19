import { useEffect, useState } from "react";
import { ArrowLeft, Users, MapPin, Upload, Calendar as CalendarIcon, Loader2, SlidersHorizontal, CheckCircle2, Tag, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Separator } from "./ui/separator";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { getImageUrl } from "../utils/image";
import { toast } from "sonner@2.0.3";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { venueAPI, Venue } from "../api/venue";
import { isRestrictedDate, getRestrictionReason, isPastDate } from "../utils/dateRestriction";
import api from '../api/axios';
import { VenueBookingCalendar } from "./VenueBookingCalendar";
import { Calendar } from "lucide-react";

interface VenueBookingProps {
  onBack: () => void;
}

interface BookingFormData {
  venue: {
    id: number;
    name: string;
    price: number;
  } | null;
  numberOfPeople: string;
  eventDate: string;
  timeSlot: string;
  eventType: string;
}

export function VenueBooking({ onBack }: VenueBookingProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [allVenues, setAllVenues] = useState<Venue[]>([]); // Store all for dropdown
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [bookingMode, setBookingMode] = useState<'venue' | 'table'>('venue');
  const [tableLocation, setTableLocation] = useState<'Indoor Non-AC (TV Area)' | 'Indoor AC (Presidential Lounge)' | 'Outdoor (Lawn Area)'>('Indoor AC (Presidential Lounge)');
  const [tableCount, setTableCount] = useState("1");
  const [selectedVenueFilter, setSelectedVenueFilter] = useState("all");
  const [occasion, setOccasion] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [bookingStep, setBookingStep] = useState<'form' | 'payment' | 'unavailable'>('form');
  const [bookingForm, setBookingForm] = useState<BookingFormData>({
    venue: null,
    numberOfPeople: '',
    eventDate: '',
    timeSlot: 'Evening',
    eventType: ''
  });
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [showCalendarDialog, setShowCalendarDialog] = useState(false);
  const [dateWarning, setDateWarning] = useState<string | null>(null);

  // Today's date string (YYYY-MM-DD) used as min for date inputs
  const today = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  useEffect(() => {
    // Initial fetch optional now that we search, but good to show something
    const fetchVenues = async () => {
      try {
        const data = await venueAPI.getAllVenues();
        setVenues(data);
        setAllVenues(data);
      } catch (error) {
        // Silent
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, []);

  const branches = [
    { id: "main", name: "Main Branch - Colombo 7", location: "Guildford Crescent" },
  ];

  // Auto-search venues when date/time changes
  useEffect(() => {
    if (selectedDate && startTime && endTime) {
      if (!isRestrictedDate(selectedDate)) {
        setLoading(true);
        venueAPI.searchVenues({
          date: selectedDate,
          startTime,
          endTime,
          capacity: guestCount,
          occasion: occasion !== 'all' ? occasion : undefined,
        }).then(results => {
          if (selectedVenueFilter !== 'all') {
            setVenues(results.filter((v: Venue) => v.id.toString() === selectedVenueFilter));
          } else {
            setVenues(results);
          }
        }).catch(() => {
          toast.error("Failed to search venues");
        }).finally(() => {
          setLoading(false);
        });
      }
    }
  }, [selectedDate, startTime, endTime, selectedVenueFilter, occasion, guestCount]);


  const handleBookNow = (venue: Venue) => {
    if (selectedDate && isRestrictedDate(selectedDate)) {
      const reason = getRestrictionReason(selectedDate);
      toast.error("Booking not available", { description: reason ?? "The club is closed on this date." });
      return;
    }
    setBookingForm({
      venue: {
        id: venue.id,
        name: venue.name,
        price: venue.charge
      },
      numberOfPeople: guestCount,
      eventDate: selectedDate || '',
      timeSlot: `${startTime} – ${endTime}`, // Display only
      eventType: ''
    });
    setBookingStep('form');
    setShowBookingDialog(true);
    setReceiptFile(null);
  };

  const handleNext = () => {
    if (!bookingForm.numberOfPeople || !bookingForm.eventDate || !bookingForm.eventType || !startTime || !endTime) {
      toast.error("Please fill in all fields including time range");
      return;
    }
    
    const reason = getRestrictionReason(bookingForm.eventDate);
    if (reason) {
      toast.error("Booking not available on this date", { description: reason });
      return;
    }

    setBookingStep('payment');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
      toast.success("Receipt uploaded successfully");
    }
  };

  const handleSubmitBooking = async () => {
    if (!receiptFile) {
      toast.error("Please upload your payment receipt");
      return;
    }

    if (!bookingForm.venue) return;

    try {
      if (bookingMode === 'table') {
        const formData = new FormData();
        formData.append('location', tableLocation);
        formData.append('tableCount', tableCount);
        formData.append('reservationDate', new Date(bookingForm.eventDate).toISOString());
        formData.append('reservationTime', `${startTime} - ${endTime}`);
        if (receiptFile) formData.append('receipt', receiptFile);
        
        await api.post('/tables/book', formData);
      } else {
        const formData = new FormData();
        formData.append('venueId', bookingForm.venue!.id.toString());
        formData.append('bookingDate', new Date(bookingForm.eventDate).toISOString());
        formData.append('startTime', startTime);
        formData.append('endTime', endTime);
        formData.append('amount', bookingForm.venue!.price.toString());
        formData.append('paymentMethod', 'Bank Transfer');
        if (receiptFile) formData.append('receipt', receiptFile);
  
        await venueAPI.createBooking(formData);
      }

      toast.success("Booking submitted successfully!", {
        description: "Our team will verify your payment and confirm your booking shortly."
      });
      setShowBookingDialog(false);
      setBookingForm({
        venue: null,
        numberOfPeople: '',
        eventDate: '',
        timeSlot: 'Evening',
        eventType: ''
      });
      setReceiptFile(null);
    } catch (error: any) {
      const message = error.response?.data?.error || "Failed to submit booking";
      toast.error(message);
    }
  };

  const handleBooking = (venueName: string) => {
    toast.success(`Booking request sent for ${venueName}!`, {
      description: "Our team will confirm your reservation shortly.",
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
              <h1>Book Facilities</h1>
              <p className="text-white/80 mt-1">Reserve club facilities and event spaces</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        
        {/* Toggle Mode */}
        <div className="flex justify-center mb-8">
          <div className="bg-muted p-1 rounded-lg inline-flex">
            <Button 
                variant={bookingMode === 'venue' ? 'default' : 'ghost'} 
                className={bookingMode === 'venue' ? 'bg-primary text-white shadow-sm' : ''}
                onClick={() => setBookingMode('venue')}
            >Book Facility</Button>
            <Button 
                variant={bookingMode === 'table' ? 'default' : 'ghost'} 
                className={bookingMode === 'table' ? 'bg-primary text-white shadow-sm' : ''}
                onClick={() => setBookingMode('table')}
            >Book Tables</Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* ── Filter Panel ── */}
          <aside className="lg:col-span-1 space-y-4">
            {/* Filter card */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              {/* Panel header */}
              <div className="bg-primary/5 border-b px-4 py-3 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm text-primary">Filter Facilities</span>
              </div>

              <div className="p-4 space-y-5">
                {/* Branch */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Branch</p>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Event Date</p>
                  <Input
                    type="date"
                    value={selectedDate}
                    min={today}
                    className={`h-9 text-sm ${dateWarning ? 'border-destructive ring-1 ring-destructive/40' : ''}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedDate(val);
                      const reason = getRestrictionReason(val);
                      setDateWarning(reason);
                    }}
                  />
                  {dateWarning && (
                    <div className="flex items-start gap-2 rounded-lg bg-destructive/8 border border-destructive/25 px-3 py-2 mt-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-destructive">Club Closed</p>
                        <p className="text-xs text-destructive/80 mt-0.5">{dateWarning} Please choose a different date.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Guests */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guests</p>
                  <Input
                    type="number"
                    placeholder="e.g. 50"
                    value={guestCount}
                    className="h-9 text-sm"
                    onChange={(e) => setGuestCount(e.target.value)}
                  />
                </div>

                {/* Time Range */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Time Range</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={startTime}
                      className="h-9 text-sm flex-1"
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                    <span className="text-muted-foreground text-sm">–</span>
                    <Input
                      type="time"
                      value={endTime}
                      className="h-9 text-sm flex-1"
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                {bookingMode === 'venue' && (
                  <>
                    {/* Occasion */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Occasion</p>
                      <Select value={occasion} onValueChange={setOccasion}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Any Occasion" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Occasion</SelectItem>
                          <SelectItem value="Wedding">Wedding</SelectItem>
                          <SelectItem value="Birthday">Birthday Party</SelectItem>
                          <SelectItem value="Corporate">Corporate Event</SelectItem>
                          <SelectItem value="Meeting">Meeting</SelectItem>
                          <SelectItem value="GetTogether">Get Together</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Facility */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Facility</p>
                      <Select value={selectedVenueFilter} onValueChange={setSelectedVenueFilter}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="All Facilities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Facilities</SelectItem>
                          {allVenues.map(venue => (
                            <SelectItem key={venue.id} value={venue.id.toString()}>{venue.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <Separator />

                {/* Active filter chips */}
                {(selectedDate || guestCount || startTime || occasion !== 'all' || selectedVenueFilter !== 'all') && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDate && (
                      <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                        <CheckCircle2 className="w-3 h-3" />{selectedDate}
                      </span>
                    )}
                    {guestCount && (
                      <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                        <Users className="w-3 h-3" />{guestCount} guests
                      </span>
                    )}
                    {occasion !== 'all' && (
                      <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                        <Tag className="w-3 h-3" />{occasion}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Calendar CTA */}
            <Button
              className="w-full bg-primary text-white hover:bg-primary/90 flex items-center justify-center gap-2 h-10"
              onClick={() => setShowCalendarDialog(true)}
            >
              <Calendar className="w-4 h-4" />
              View Availability Calendar
            </Button>
          </aside>

          {/* ── Venue / Table Grid ── */}
          <div className="lg:col-span-3">
            {bookingMode === 'table' ? (
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="bg-primary/5 border-b px-5 py-4">
                  <h3 className="font-semibold text-primary">Table Bookings</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Reserve tables for your visit</p>
                </div>
                <div className="p-5 space-y-6">
                  <div className="bg-muted/40 rounded-lg p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Each table seats up to 5 people</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Rs. 200 per table</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location</Label>
                      <Select value={tableLocation} onValueChange={(v: "Indoor Non-AC (TV Area)" | "Indoor AC (Presidential Lounge)" | "Outdoor (Lawn Area)") => setTableLocation(v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Indoor Non-AC (TV Area)">Indoor Non-AC (TV Area)</SelectItem>
                          <SelectItem value="Indoor AC (Presidential Lounge)">Indoor AC (Presidential Lounge)</SelectItem>
                          <SelectItem value="Outdoor (Lawn Area)">Outdoor (Lawn Area)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tables</Label>
                      <Input type="number" min="1" max={tableLocation.includes('Outdoor') ? 20 : 15} value={tableCount} className="h-9 text-sm" onChange={(e) => setTableCount(e.target.value)} />
                    </div>
                  </div>

                  <Button
                    className="w-full bg-secondary hover:bg-secondary/90 text-primary font-semibold"
                    onClick={() => {
                      if (!selectedDate || !startTime || !endTime) {
                        toast.error("Please select a date and time range on the left panel");
                        return;
                      }
                      const reason = getRestrictionReason(selectedDate);
                      if (reason) {
                        toast.error("Booking not available on this date", { description: reason });
                        return;
                      }
                      setBookingForm({
                        venue: { id: 0, name: `${tableCount} ${tableLocation} Table(s)`, price: parseInt(tableCount) * 200 },
                        numberOfPeople: (parseInt(tableCount) * 5).toString(),
                        eventDate: selectedDate,
                        timeSlot: `${startTime} – ${endTime}`,
                        eventType: 'Dining'
                      });
                      setBookingStep('payment');
                      setShowBookingDialog(true);
                      setReceiptFile(null);
                    }}
                  >
                    Proceed to Payment
                  </Button>
                </div>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Loading facilities...</p>
              </div>
            ) : venues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 rounded-xl border bg-card">
                <MapPin className="w-12 h-12 text-muted-foreground/30" />
                <p className="font-medium text-muted-foreground">No facilities match your criteria</p>
                <p className="text-sm text-muted-foreground">Try adjusting your filters or selecting a different date</p>
              </div>
            ) : (
              <>
                {/* Result count */}
                <p className="text-sm text-muted-foreground mb-4">
                  Showing <span className="font-semibold text-foreground">{venues.length}</span> {venues.length === 1 ? 'facility' : 'facilities'}
                  {selectedDate && <> available on <span className="font-semibold text-foreground">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span></>}
                </p>

                <div className="grid md:grid-cols-2 gap-5">
                  {venues.map((venue) => (
                    <div
                      key={venue.id}
                      className="rounded-xl border bg-card shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
                    >
                      {/* Image */}
                      <div className="aspect-[16/9] relative overflow-hidden">
                        <ImageWithFallback
                          src={getImageUrl(venue.imageUrl) ?? "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=1000&auto=format&fit=crop"}
                          alt={venue.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Body */}
                      <div className="p-4 flex flex-col flex-1 gap-3">
                        {/* Title + price */}
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-base text-primary leading-tight">{venue.name}</h3>
                          <span className="text-sm font-semibold text-secondary whitespace-nowrap">
                            Rs. {Number(venue.charge).toLocaleString()}
                          </span>
                        </div>

                        {/* Description — capped at 2 lines */}
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {venue.description || venue.atmosphere || "Reserve this facility for your event."}
                        </p>

                        {/* Meta row */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            Up to {venue.capacity} guests
                          </span>
                        </div>

                        {/* Feature badges */}
                        {venue.facilities && (
                          <div className="flex flex-wrap gap-1.5">
                            {venue.facilities.split(',').slice(0, 3).map((f, i) => (
                              <Badge key={i} variant="outline" className="text-xs px-2 py-0 h-5 bg-muted/50">
                                {f.trim()}
                              </Badge>
                            ))}
                            {venue.facilities.split(',').length > 3 && (
                              <Badge variant="outline" className="text-xs px-2 py-0 h-5 bg-muted/50">
                                +{venue.facilities.split(',').length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* CTA — always at bottom */}
                        <div className="mt-auto pt-2">
                          <Button
                            className="w-full bg-secondary hover:bg-secondary/90 text-primary font-semibold h-9 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!!dateWarning}
                            title={dateWarning ?? undefined}
                            onClick={() => handleBookNow(venue)}
                          >
                            {dateWarning ? "Unavailable on Selected Date" : "Book Now"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {bookingStep === 'form' && `Book ${bookingForm.venue?.name}`}
              {bookingStep === 'payment' && 'Complete Your Booking'}
              {bookingStep === 'unavailable' && 'Venue Unavailable'}
            </DialogTitle>
            <DialogDescription>
              {bookingStep === 'form' && 'Please provide details about your event'}
              {bookingStep === 'payment' && 'Make payment and upload receipt to confirm'}
              {bookingStep === 'unavailable' && 'The selected date is fully booked.'}
            </DialogDescription>
          </DialogHeader>

          {bookingStep === 'form' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="numberOfPeople">Number of People</Label>
                <Input
                  id="numberOfPeople"
                  type="number"
                  placeholder="e.g., 50"
                  value={bookingForm.numberOfPeople}
                  onChange={(e) => setBookingForm({ ...bookingForm, numberOfPeople: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventDate">Date of Event</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={bookingForm.eventDate}
                  min={today}
                  className={getRestrictionReason(bookingForm.eventDate) ? 'border-destructive ring-1 ring-destructive/40' : ''}
                  onChange={(e) => setBookingForm({ ...bookingForm, eventDate: e.target.value })}
                />
                {getRestrictionReason(bookingForm.eventDate) && (
                  <div className="flex items-start gap-2 rounded-lg bg-destructive/8 border border-destructive/25 px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-destructive">
                        {isPastDate(bookingForm.eventDate) ? "Past Date" : "Club Closed on This Date"}
                      </p>
                      <p className="text-xs text-destructive/80 mt-0.5">
                        {getRestrictionReason(bookingForm.eventDate)} Please select a different date.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Time Slot</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="flex-1"
                    required
                  />
                  <span>-</span>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="flex-1"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventType">Event Type</Label>
                <Select value={bookingForm.eventType} onValueChange={(value) => setBookingForm({ ...bookingForm, eventType: value })}>
                  <SelectTrigger id="eventType">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wedding">Wedding</SelectItem>
                    <SelectItem value="birthday">Birthday Party</SelectItem>
                    <SelectItem value="corporate">Corporate Event</SelectItem>
                    <SelectItem value="sports">Sports Event</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
                  Cancel
                </Button>
                <Button className="bg-primary text-white" onClick={handleNext}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {bookingStep === 'payment' && (
            <div className="space-y-6 py-4">
              {/* Booking Summary */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h4 className="text-foreground">Booking Summary</h4>
                <Separator className="my-2" />
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Venue:</span>
                    <span className="text-foreground">{bookingForm.venue?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="text-foreground">{bookingForm.eventDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Event Type:</span>
                    <span className="text-foreground">{bookingForm.eventType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Number of People:</span>
                    <span className="text-foreground">{bookingForm.numberOfPeople}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Venue Price:</span>
                    <span className="text-secondary text-lg">Rs. {bookingForm.venue?.price.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Bank Details for Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank Name:</span>
                    <span className="text-foreground">Commercial Bank of Ceylon</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Name:</span>
                    <span className="text-foreground">Old Wesleyites Sports Club</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Number:</span>
                    <span className="text-foreground font-mono">1234567890</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Branch:</span>
                    <span className="text-foreground">Colombo 07</span>
                  </div>
                </CardContent>
              </Card>

              {/* Receipt Upload */}
              <div className="space-y-2">
                <Label htmlFor="receipt">Upload Bank Receipt</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="receipt"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                  {receiptFile && (
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      {receiptFile.name}
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload a photo or PDF of your bank transfer receipt
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setBookingStep('form')}>
                  Back
                </Button>
                <Button className="bg-primary text-white" onClick={handleSubmitBooking}>
                  Submit Booking
                </Button>
              </div>
            </div>
          )}

          {bookingStep === 'unavailable' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <CalendarIcon className="w-8 h-8 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="text-foreground">Sorry, venue is already booked on that date</h3>
                <p className="text-muted-foreground">
                  The {bookingForm.venue?.name} is not available on {bookingForm.eventDate}.
                  Please try a different date or contact us for alternative options.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
                  Close
                </Button>
                <Button className="bg-primary text-white" onClick={() => setBookingStep('form')}>
                  Try Different Date
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Calendar Dialog */}
      <Dialog open={showCalendarDialog} onOpenChange={setShowCalendarDialog}>
        <DialogContent className="max-w-6xl w-[95vw] h-[92vh] overflow-hidden p-0 flex flex-col">
          <DialogDescription className="sr-only">
            View venue availability across dates before making a booking.
          </DialogDescription>
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-primary">
              <Calendar className="w-5 h-5" /> Venue Availability Calendar
            </DialogTitle>
          </div>
          <div className="flex-1 overflow-y-auto">
            <VenueBookingCalendar onBack={() => setShowCalendarDialog(false)} hideHeader={true} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}