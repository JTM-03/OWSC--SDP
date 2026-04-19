import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Calendar, ChevronLeft, ChevronRight,
  XCircle, Loader2, AlertCircle, Search, CalendarDays,
  Clock, User, CreditCard, CheckCircle2
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Separator } from "./ui/separator";
import { toast } from "sonner@2.0.3";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { bookingCalendarAPI, CalendarEvent } from "../api/bookingCalendar";
import { venueAPI, Venue } from "../api/venue";
import { getFileUrl, getImageUrl } from "../utils/image";

interface VenueBookingCalendarProps {
  onBack: () => void;
  hideHeader?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  Confirmed: "bg-emerald-500",
  Pending:   "bg-amber-400",
  Cancelled: "bg-red-400",
  Completed: "bg-blue-400",
};

const STATUS_BADGE: Record<string, string> = {
  Confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Pending:   "bg-amber-50 text-amber-700 border-amber-200",
  Cancelled: "bg-red-50 text-red-700 border-red-200",
  Completed: "bg-blue-50 text-blue-700 border-blue-200",
};

export function VenueBookingCalendar({ onBack, hideHeader = false }: VenueBookingCalendarProps) {
  const [currentDate, setCurrentDate]       = useState(new Date());
  const [events, setEvents]                 = useState<CalendarEvent[]>([]);
  const [venues, setVenues]                 = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");
  const [loading, setLoading]               = useState(true);
  const [searching, setSearching]           = useState(false);
  const [selectedEvent, setSelectedEvent]   = useState<CalendarEvent | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelling, setCancelling]         = useState(false);
  const [selectedDay, setSelectedDay]       = useState<number | null>(null);

  // Load venues once
  useEffect(() => {
    venueAPI.getAllVenues()
      .then(setVenues)
      .catch(() => toast.error("Failed to load venues"))
      .finally(() => setLoading(false));
  }, []);

  const loadCalendarEvents = useCallback(async () => {
    try {
      setSearching(true);
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate   = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const calendarEvents = await bookingCalendarAPI.getCalendarEvents(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        selectedVenueId !== "all" ? parseInt(selectedVenueId) : undefined
      );
      setEvents(calendarEvents);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load bookings");
    } finally {
      setSearching(false);
    }
  }, [currentDate, selectedVenueId]);

  useEffect(() => { loadCalendarEvents(); }, [loadCalendarEvents]);

  // When date filter changes, jump to that month
  useEffect(() => {
    if (selectedDateFilter) {
      const d = new Date(selectedDateFilter + "T00:00:00");
      setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
      setSelectedDay(d.getDate());
    } else {
      setSelectedDay(null);
    }
  }, [selectedDateFilter]);

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    setSelectedDay(null);
    setSelectedDateFilter("");
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    setSelectedDay(null);
    setSelectedDateFilter("");
  };

  const handleCancelBooking = async () => {
    if (!selectedEvent || !cancellationReason.trim()) {
      toast.error("Please provide a cancellation reason");
      return;
    }
    try {
      setCancelling(true);
      await bookingCalendarAPI.cancelBooking(selectedEvent.id, cancellationReason);
      toast.success("Booking cancelled successfully");
      setShowCancelDialog(false);
      setCancellationReason("");
      setSelectedEvent(null);
      await loadCalendarEvents();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to cancel booking");
    } finally {
      setCancelling(false);
    }
  };

  const getDaysInMonth  = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();

  const getEventsForDay = (day: number) =>
    events.filter(e => {
      const ed = new Date(e.start);
      return ed.getDate() === day &&
             ed.getMonth() === currentDate.getMonth() &&
             ed.getFullYear() === currentDate.getFullYear();
    });

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay    = getFirstDayOfMonth(currentDate);
  const days        = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays   = Array.from({ length: firstDay });

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today     = new Date();
  const isToday   = (day: number) =>
    day === today.getDate() &&
    currentDate.getMonth() === today.getMonth() &&
    currentDate.getFullYear() === today.getFullYear();

  // Events for the selected day panel
  const dayPanelEvents = selectedDay ? getEventsForDay(selectedDay) : [];
  const selectedDayLabel = selectedDay
    ? new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay)
        .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={hideHeader ? "bg-background" : "min-h-screen bg-background"}>
      {!hideHeader && (
        <header className="bg-primary text-white shadow-lg sticky top-0 z-10">
          <div className="container mx-auto px-6 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={logo} alt="Logo" className="h-8 w-8 object-contain" />
            <div>
              <h1 className="text-lg font-bold leading-tight">Venue Availability Calendar</h1>
              <p className="text-white/70 text-xs">Search by venue and date to view bookings</p>
            </div>
          </div>
        </header>
      )}

      <main className="container mx-auto px-6 py-8 space-y-6">

        {/* ── Search / Filter Bar ── */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="bg-primary/5 border-b px-5 py-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-primary">Search Bookings</span>
          </div>
          <div className="p-5">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Venue selector */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Venue</p>
                <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="All Venues" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Venues</SelectItem>
                    {venues.map(v => (
                      <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date picker */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jump to Date</p>
                <Input
                  type="date"
                  value={selectedDateFilter}
                  className="h-10 text-sm"
                  onChange={(e) => setSelectedDateFilter(e.target.value)}
                />
              </div>
            </div>

            {/* Active filter chips */}
            {(selectedVenueId !== "all" || selectedDateFilter) && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                {selectedVenueId !== "all" && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary rounded-full px-3 py-1">
                    <CalendarDays className="w-3 h-3" />
                    {venues.find(v => v.id.toString() === selectedVenueId)?.name ?? "Venue"}
                    <button onClick={() => setSelectedVenueId("all")} className="ml-1 hover:text-primary/60">×</button>
                  </span>
                )}
                {selectedDateFilter && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary rounded-full px-3 py-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(selectedDateFilter + "T00:00:00").toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    <button onClick={() => setSelectedDateFilter("")} className="ml-1 hover:text-primary/60">×</button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Calendar + Day Panel ── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Calendar */}
          <div className="lg:col-span-2 rounded-xl border bg-card shadow-sm overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-bold text-base text-primary">{monthYear}</span>
                {searching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-1" />}
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePreviousMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Day-of-week headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }} className="border-b bg-muted/30">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="py-2.5 text-center text-xs font-semibold text-muted-foreground tracking-wide">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid — all cells (empty + days) in one flat grid */}
            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}
              className="border-b"
            >
              {/* Empty offset cells */}
              {emptyDays.map((_, i) => (
                <div
                  key={`e-${i}`}
                  style={{ minHeight: 88 }}
                  className="bg-muted/10 border-r border-b border-border/50"
                />
              ))}

              {/* Day cells */}
              {days.map(day => {
                const dayEvents = getEventsForDay(day);
                const isSelected = selectedDay === day;
                const isTodayDay = isToday(day);

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    style={{ minHeight: 88 }}
                    className={[
                      'border-r border-b border-border/50 p-1.5 cursor-pointer transition-colors select-none',
                      isSelected ? 'bg-primary/10 outline outline-1 outline-primary/40 outline-offset-[-1px]' : 'hover:bg-muted/40',
                    ].join(' ')}
                  >
                    {/* Day number badge */}
                    <div className={[
                      'w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1 mx-auto',
                      isTodayDay
                        ? 'bg-primary text-white'
                        : isSelected
                          ? 'bg-primary/20 text-primary'
                          : 'text-foreground',
                    ].join(' ')}>
                      {day}
                    </div>

                    {/* Booking pills */}
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map(ev => (
                        <div
                          key={ev.bookingId}
                          className={`text-white text-[10px] px-1.5 py-0.5 rounded truncate leading-tight font-medium
                            ${STATUS_COLORS[ev.bookingStatus] ?? 'bg-gray-400'}
                          `}
                        >
                          {ev.venueName?.split(' ')[0]}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] text-muted-foreground pl-1 font-medium">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="px-5 py-3 flex flex-wrap gap-4">
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <span key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  {status}
                </span>
              ))}
            </div>
          </div>

          {/* Day Detail Panel */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col">
            <div className="bg-primary/5 border-b px-4 py-3">
              <p className="font-semibold text-sm text-primary">
                {selectedDayLabel ?? "Select a day to view bookings"}
              </p>
              {selectedDay && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {dayPanelEvents.length === 0
                    ? "No bookings on this day"
                    : `${dayPanelEvents.length} booking${dayPanelEvents.length > 1 ? 's' : ''}`}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!selectedDay ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center gap-3">
                  <CalendarDays className="w-10 h-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Click any date on the calendar to see bookings for that day</p>
                </div>
              ) : dayPanelEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center gap-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  <p className="font-medium text-sm">No bookings on this day</p>
                  <p className="text-xs text-muted-foreground">This date is fully available for booking</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dayPanelEvents.map(ev => (
                    <button
                      key={ev.bookingId}
                      onClick={() => setSelectedEvent(ev)}
                      className="w-full text-left rounded-lg border bg-background hover:bg-muted/30 hover:border-primary/30 transition-all p-3 space-y-2"
                    >
                      {/* Venue + status */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-sm text-primary leading-tight">{ev.venueName}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_BADGE[ev.bookingStatus] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          {ev.bookingStatus}
                        </span>
                      </div>

                      {/* Member */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        {ev.memberName}
                      </div>

                      {/* Time */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {ev.timeSlot}
                      </div>

                      {/* Amount */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CreditCard className="w-3 h-3" />
                        Rs. {Number(ev.paymentAmount).toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── Booking Detail Dialog ── */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-primary">{selectedEvent.venueName}</DialogTitle>
              <DialogDescription>
                {new Date(selectedEvent.start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Status badges */}
              <div className="flex gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_BADGE[selectedEvent.bookingStatus] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                  {selectedEvent.bookingStatus}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${selectedEvent.paymentStatus === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  Payment: {selectedEvent.paymentStatus}
                </span>
              </div>

              <Separator />

              {/* Member info */}
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Member</p>
                <p className="font-semibold text-sm">{selectedEvent.memberName}</p>
                <p className="text-xs text-muted-foreground">{selectedEvent.memberEmail}</p>
                <p className="text-xs text-muted-foreground">{selectedEvent.memberPhone}</p>
              </div>

              {/* Booking info */}
              <div className="bg-muted/40 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Time Slot</span>
                  <span className="font-medium">{selectedEvent.timeSlot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" />Amount</span>
                  <span className="font-semibold text-primary">Rs. {Number(selectedEvent.paymentAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="font-medium">{selectedEvent.paymentMethod}</span>
                </div>
              </div>

              {/* Receipt */}
              {selectedEvent.receiptUrl && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment Receipt</p>
                  <a
                    href={getFileUrl(selectedEvent.receiptUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline text-sm hover:no-underline"
                  >
                    View Receipt
                  </a>
                  <img
                    src={getImageUrl(selectedEvent.receiptUrl) || undefined}
                    alt="Payment Receipt"
                    className="max-h-36 rounded-lg border object-contain bg-muted/30 w-full"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedEvent(null)}>
                  Close
                </Button>
                {selectedEvent.bookingStatus !== 'Cancelled' && (
                  <Button variant="destructive" className="flex-1" onClick={() => setShowCancelDialog(true)}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Booking
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Cancellation Dialog ── */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Cancel Booking
            </DialogTitle>
            <DialogDescription>
              {selectedEvent?.memberName} · {selectedEvent?.venueName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reason" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Reason *
              </Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for cancellation..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="min-h-24 text-sm"
              />
            </div>

            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              ⚠️ This will notify the member and cancel their booking. This action cannot be undone.
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowCancelDialog(false); setCancellationReason(""); }} disabled={cancelling}>
                Keep Booking
              </Button>
              <Button variant="destructive" onClick={handleCancelBooking} disabled={cancelling || !cancellationReason.trim()}>
                {cancelling ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cancelling...</> : <><XCircle className="w-4 h-4 mr-2" />Confirm Cancel</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
