import { useEffect, useState } from "react";
import { ArrowLeft, Users, DollarSign, MapPin, Upload, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Separator } from "./ui/separator";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { toast } from "sonner@2.0.3";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { venueAPI, Venue } from "../api/venue";

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

  const handleSearch = async () => {
    if (!selectedDate || !startTime || !endTime) {
      toast.error("Please select date and time range");
      return;
    }

    setLoading(true);
    try {
      const results = await venueAPI.searchVenues({
        date: selectedDate,
        startTime,
        endTime,
        capacity: guestCount,
        occasion: occasion !== 'all' ? occasion : undefined,
      });

      if (selectedVenueFilter !== 'all') {
        const specificVenue = results.find(v => v.id.toString() === selectedVenueFilter);
        if (specificVenue) {
          setVenues([specificVenue]);
        } else {
          setVenues([]);
          toast.error("Selected facility is unavailable for this time slot");
          return;
        }
      } else {
        setVenues(results);
      }

      if (results.length === 0 && selectedVenueFilter === 'all') {
        toast.info("No venues available for this time slot");
      }
    } catch (error) {
      toast.error("Failed to search venues");
    } finally {
      setLoading(false);
    }
  };

  const filteredVenues = venues.filter(venue => {
    // Client side filter for branch if needed
    return true; // We rely on backend search now mainly
  });

  const handleBookNow = (venue: Venue) => {
    setBookingForm({
      venue: {
        id: venue.id,
        name: venue.name,
        price: venue.charge
      },
      numberOfPeople: guestCount,
      eventDate: selectedDate || '',
      timeSlot: `${startTime} - ${endTime}`, // Display only
      eventType: ''
    });
    setBookingStep('form');
    setShowBookingDialog(true);
    setReceiptFile(null);
  };

  const handleNext = () => {
    // Validate form
    if (!bookingForm.numberOfPeople || !bookingForm.eventDate || !bookingForm.eventType || !startTime || !endTime) {
      toast.error("Please fill in all fields including time range");
      return;
    }

    // Simulate availability check - randomly decide if venue is available (80% chance)
    const isAvailable = Math.random() > 0.2;

    if (isAvailable) {
      setBookingStep('payment');
    } else {
      setBookingStep('unavailable');
    }
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
      const formData = new FormData();
      formData.append('venueId', bookingForm.venue.id.toString());
      formData.append('bookingDate', new Date(bookingForm.eventDate).toISOString());
      formData.append('startTime', startTime);
      formData.append('endTime', endTime);
      formData.append('amount', bookingForm.venue.price.toString()); // Assuming price is total amount
      formData.append('paymentMethod', 'Bank Transfer');
      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      await venueAPI.createBooking(formData);

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
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Filter Panel */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle>Filter Facilities</CardTitle>
              <CardDescription>Find the perfect space</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="branch">Branch Location</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger id="branch">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guests">Number of People</Label>
                <Input
                  id="guests"
                  type="number"
                  placeholder="e.g., 50"
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Time Range</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="flex-1"
                  />
                  <span>-</span>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="occasion">Occasion Type</Label>
                <Select value={occasion} onValueChange={setOccasion}>
                  <SelectTrigger id="occasion">
                    <SelectValue placeholder="Select occasion" />
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

              <div className="space-y-2">
                <Label htmlFor="venueSelect">Select Facility</Label>
                <Select value={selectedVenueFilter} onValueChange={setSelectedVenueFilter}>
                  <SelectTrigger id="venueSelect">
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

              <Button className="w-full bg-secondary text-primary hover:bg-secondary/90" onClick={handleSearch}>
                Check Availability
              </Button>
            </CardContent>
          </Card>

          {/* Venue Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Loading facilities...</p>
              </div>
            ) : filteredVenues.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MapPin className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                  <p className="text-muted-foreground">No facilities found matching your criteria</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {filteredVenues.map((venue) => (
                  <Card key={venue.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-[4/3] relative">
                      <ImageWithFallback
                        src={venue.imageUrl
                          ? (venue.imageUrl.startsWith('http') ? venue.imageUrl : `http://localhost:5000${venue.imageUrl}`)
                          : "https://images.unsplash.com/photo-1759519238029-689e99c6d19e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwZXZlbnQlMjB2ZW51ZXxlbnwxfHx8fDE3NjA4Nzc1NDV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"}
                        alt={venue.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardHeader>
                      <CardTitle>{venue.name}</CardTitle>
                      <CardDescription>{venue.description || venue.atmosphere || "Reserve this facility for your event"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>Up to {venue.capacity} people</span>
                        </div>
                        <div className="flex items-center gap-1">

                          <span>Rs. {venue.charge.toLocaleString()} {venue.pricingUnit || 'per person'}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        className="w-full bg-secondary hover:bg-secondary/90 text-primary"
                        onClick={() => handleBookNow(venue)}
                      >
                        Book Now
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
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
                  onChange={(e) => setBookingForm({ ...bookingForm, eventDate: e.target.value })}
                />
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
    </div>
  );
}