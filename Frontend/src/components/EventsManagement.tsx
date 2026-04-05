import { useState, useEffect } from "react";
import { ArrowLeft, Calendar, Plus, Edit, Trash2, MapPin, Users, Clock, Ticket, Search } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { toast } from "sonner@2.0.3";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";

import { eventsAPI, Event as APIEvent } from "../api/events";

interface EventsManagementProps {
  onBack: () => void;
}

// Extend APIEvent or map it to local needs if necessary.
// For simplicity, we'll try to use the API type directly where possible, 
// but the UI has some specific fields like availableTickets.
interface Event extends Omit<APIEvent, 'id'> {
  id: string;
  category: "sports" | "social" | "cultural" | "dining";
  totalTickets: number; // Override optional to required if needed, or keep optional
  availableTickets: number; // This will likely be totalTickets for now as we don't track bookings yet
  venue: string; // Map location to venue
}

export function EventsManagement({ onBack }: EventsManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [addEventDialogOpen, setAddEventDialogOpen] = useState(false);
  const [editEventDialogOpen, setEditEventDialogOpen] = useState(false);
  const [deleteEventDialogOpen, setDeleteEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventForm, setEventForm] = useState<Partial<Event>>({
    title: "",
    description: "",
    date: "",
    time: "",
    venue: "",
    ticketPrice: 0,
    totalTickets: 0,
    category: "sports",
  });

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await eventsAPI.getAllEvents();
      // Map API data to UI Event interface
      const mappedEvents: Event[] = data.map((e: any) => ({
        ...e,
        id: e.id.toString(), // Ensure ID is string for UI consistency if needed
        venue: e.location,
        availableTickets: e.totalTickets, // Placeholder since we don't calculate bookings yet
        date: new Date(e.date).toISOString().split('T')[0], // Ensure YYYY-MM-DD
      }));
      setEvents(mappedEvents);
    } catch (error) {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || event.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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

  const handleAddEvent = async () => {
    if (!eventForm.title || !eventForm.date || !eventForm.time || !eventForm.venue) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      await eventsAPI.createEvent({
        title: eventForm.title,
        description: eventForm.description || "",
        date: new Date(eventForm.date).toISOString(),
        time: eventForm.time,
        location: eventForm.venue,
        ticketPrice: eventForm.ticketPrice || 0,
        totalTickets: eventForm.totalTickets || 100,
        category: eventForm.category || "social",
        status: "Upcoming"
      });

      toast.success("Event created successfully");
      setAddEventDialogOpen(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      toast.error("Failed to create event");
    }
  };

  const handleEditEvent = async () => {
    if (!selectedEvent) return;

    try {
      await eventsAPI.updateEvent(parseInt(selectedEvent.id), {
        title: eventForm.title!,
        description: eventForm.description || "",
        date: new Date(eventForm.date!).toISOString(),
        time: eventForm.time!,
        location: eventForm.venue!,
        ticketPrice: eventForm.ticketPrice || 0,
        totalTickets: eventForm.totalTickets || 100,
        category: eventForm.category || "social",
        status: "Upcoming"
      });

      toast.success("Event updated successfully");
      setEditEventDialogOpen(false);
      setSelectedEvent(null);
      resetForm();
      fetchEvents();
    } catch (error) {
      toast.error("Failed to update event");
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    try {
      await eventsAPI.deleteEvent(parseInt(selectedEvent.id));
      toast.success("Event deleted successfully");
      setDeleteEventDialogOpen(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (error) {
      toast.error("Failed to delete event");
    }
  };

  const openEditDialog = (event: Event) => {
    setSelectedEvent(event);
    setEventForm({
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      venue: event.venue,
      ticketPrice: event.ticketPrice,
      totalTickets: event.totalTickets,
      category: event.category,
    });
    setEditEventDialogOpen(true);
  };

  const openDeleteDialog = (event: Event) => {
    setSelectedEvent(event);
    setDeleteEventDialogOpen(true);
  };

  const resetForm = () => {
    setEventForm({
      title: "",
      description: "",
      date: "",
      time: "",
      venue: "",
      ticketPrice: 0,
      totalTickets: 0,
      category: "sports",
    });
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
                <h1>Events Management</h1>
                <p className="text-white/80 mt-1">Create and manage club events</p>
              </div>
            </div>
            <Button
              className="bg-secondary text-primary hover:bg-secondary/90"
              onClick={() => {
                resetForm();
                setAddEventDialogOpen(true);
              }}
            >
              <Plus className="w-5 h-5 mr-2" />
              Add New Event
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
                  <p className="text-sm text-muted-foreground mb-1">Total Events</p>
                  <h3 className="text-primary">{events.length}</h3>
                </div>
                <div className="p-3 rounded-lg bg-blue-100">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Sports Events</p>
                  <h3 className="text-primary">{events.filter(e => e.category === "sports").length}</h3>
                </div>
                <div className="p-3 rounded-lg bg-blue-100">
                  <Ticket className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Cultural Events</p>
                  <h3 className="text-primary">{events.filter(e => e.category === "cultural").length}</h3>
                </div>
                <div className="p-3 rounded-lg bg-orange-100">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Social Events</p>
                  <h3 className="text-primary">{events.filter(e => e.category === "social").length}</h3>
                </div>
                <div className="p-3 rounded-lg bg-purple-100">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    placeholder="Search by title, venue or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="cultural">Cultural</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="dining">Dining</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        <div className="grid grid-cols-1 gap-6">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <Card key={event.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3>{event.title}</h3>
                        <Badge variant="outline" className={getCategoryColor(event.category)}>
                          {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                        </Badge>
                        {event.availableTickets < 20 && (
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                            Limited Tickets
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-4">{event.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Date</p>
                            <p className="text-foreground">{formatDate(event.date)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Time</p>
                            <p className="text-foreground">{event.time}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Venue</p>
                            <p className="text-foreground">{event.venue}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Ticket className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Tickets</p>
                            <p className="text-foreground">{event.availableTickets} / {event.totalTickets}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">Ticket Price</p>
                          <p className="text-lg text-secondary">Rs. {(event.ticketPrice || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditDialog(event)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openDeleteDialog(event)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                <p className="text-muted-foreground">No events found</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add Event Dialog */}
        <Dialog open={addEventDialogOpen} onOpenChange={setAddEventDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
              <DialogDescription>
                Create a new event for club members
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Annual Cricket Tournament"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Event description..."
                    rows={3}
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={eventForm.category}
                    onValueChange={(value) => setEventForm({ ...eventForm, category: value as Event["category"] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="cultural">Cultural</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="dining">Dining</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue">Venue *</Label>
                  <Input
                    id="venue"
                    placeholder="e.g., Main Cricket Ground"
                    value={eventForm.venue}
                    onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    placeholder="e.g., 7:00 PM"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ticketPrice">Ticket Price (Rs.) *</Label>
                  <Input
                    id="ticketPrice"
                    type="number"
                    placeholder="0"
                    value={eventForm.ticketPrice}
                    onChange={(e) => setEventForm({ ...eventForm, ticketPrice: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalTickets">Total Tickets *</Label>
                  <Input
                    id="totalTickets"
                    type="number"
                    placeholder="0"
                    value={eventForm.totalTickets}
                    onChange={(e) => setEventForm({ ...eventForm, totalTickets: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddEventDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-secondary text-primary hover:bg-secondary/90"
                onClick={handleAddEvent}
              >
                Add Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Event Dialog */}
        <Dialog open={editEventDialogOpen} onOpenChange={setEditEventDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
              <DialogDescription>
                Update event details
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-title">Event Title *</Label>
                  <Input
                    id="edit-title"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    rows={3}
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category *</Label>
                  <Select
                    value={eventForm.category}
                    onValueChange={(value) => setEventForm({ ...eventForm, category: value as Event["category"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="cultural">Cultural</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="dining">Dining</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-venue">Venue *</Label>
                  <Input
                    id="edit-venue"
                    value={eventForm.venue}
                    onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-date">Date *</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-time">Time *</Label>
                  <Input
                    id="edit-time"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-ticketPrice">Ticket Price (Rs.) *</Label>
                  <Input
                    id="edit-ticketPrice"
                    type="number"
                    value={eventForm.ticketPrice}
                    onChange={(e) => setEventForm({ ...eventForm, ticketPrice: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-totalTickets">Total Tickets *</Label>
                  <Input
                    id="edit-totalTickets"
                    type="number"
                    value={eventForm.totalTickets}
                    onChange={(e) => setEventForm({ ...eventForm, totalTickets: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditEventDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-secondary text-primary hover:bg-secondary/90"
                onClick={handleEditEvent}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteEventDialogOpen} onOpenChange={setDeleteEventDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Event</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this event? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            {selectedEvent && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedEvent.title}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(selectedEvent.date)} at {selectedEvent.time}
                </p>
                <p className="text-sm text-muted-foreground">{selectedEvent.venue}</p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteEventDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteEvent}
              >
                Delete Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
