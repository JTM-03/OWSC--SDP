import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowLeft, Calendar, Clock, MapPin, Users } from "lucide-react";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { useEffect, useState } from "react";
import { venueAPI, Venue } from "../api/venue";
import { eventsAPI, Event as APIEvent } from "../api/events";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface ExploreFacilityProps {
  onBack: () => void;
  onViewMemberships: () => void;
}

interface SpecialEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  description: string;
  status: string;
  registrationOpen: boolean;
}



export function ExploreFacility({ onBack, onViewMemberships }: ExploreFacilityProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [specialEvents, setSpecialEvents] = useState<SpecialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const data = await venueAPI.getAllVenues();
        setVenues(data);
      } catch (error) {
        console.error("Failed to fetch venues", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchEvents = async () => {
      try {
        const data = await eventsAPI.getAllEvents();
        const mappedEvents: SpecialEvent[] = data.map((e: APIEvent) => ({
          id: e.id.toString(),
          title: e.title,
          date: new Date(e.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          time: e.time,
          venue: e.location,
          description: e.description,
          status: e.status || "Upcoming",
          registrationOpen: e.status !== "Completed" && e.status !== "Cancelled"
        })).slice(0, 5); // Show up to 5 events
        setSpecialEvents(mappedEvents);
      } catch (error) {
        console.error("Failed to fetch events", error);
      } finally {
        setEventsLoading(false);
      }
    };

    fetchVenues();
    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header */}
      <div className="bg-primary text-white shadow-lg">
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
            <div className="flex items-center gap-3">
              <img src={logo} alt="OWSC Logo" className="h-12 w-12 object-contain" />
              <div>
                <h2 className="text-white">Explore Our Facilities</h2>
                <p className="text-sm text-white/80">World-class venues and exciting events</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 space-y-16">
        {/* Venues Section */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-primary mb-4">Our Venues & Facilities</h2>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              Experience premium facilities designed for sports, leisure, and special events.
              Become a member to book these exclusive venues.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">Loading venues...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {venues.map((venue) => (
                <Card key={venue.id} className="border-none shadow-lg hover:shadow-xl transition-all overflow-hidden bg-card/50 backdrop-blur-sm">
                  <div className="aspect-video relative">
                    <ImageWithFallback
                      src={venue.imageUrl
                        ? (venue.imageUrl.startsWith('http') ? venue.imageUrl : `http://localhost:5000${venue.imageUrl}`)
                        : "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=1000&auto=format&fit=crop"}
                      alt={venue.name}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  </div>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-primary">{venue.name}</h3>
                    </div>
                    <p className="text-muted-foreground line-clamp-3 text-sm">
                      {venue.description || venue.atmosphere}
                    </p>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-primary">
                        <Users className="w-4 h-4" />
                        <span>Cap: {venue.capacity}</span>
                      </div>
                      <div className="flex items-center gap-2 text-primary">
                        <Badge variant="secondary" className="px-2 py-0 h-6">
                          Rs. {venue.charge.toLocaleString()} {venue.pricingUnit || 'per person'}
                        </Badge>
                      </div>
                    </div>

                    {venue.facilities && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Features:</p>
                        <div className="flex flex-wrap gap-2">
                          {venue.facilities.split(',').map((f, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-background/50">{f.trim()}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Special Events Section */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-primary mb-4">Special Events</h2>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              Join us for exciting events throughout the year. From tournaments to social gatherings,
              there's always something happening at OWSC.
            </p>
          </div>

          {eventsLoading ? (
            <div className="text-center py-12">Loading events...</div>
          ) : specialEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No upcoming events currently scheduled.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {specialEvents.map((event) => (
              <Card key={event.id} className="border-2 hover:border-secondary transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <CardTitle className="text-xl flex-1">{event.title}</CardTitle>
                    <Badge
                      variant={event.registrationOpen ? "default" : "secondary"}
                      className={event.registrationOpen ? "bg-secondary text-primary" : ""}
                    >
                      {event.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-base">{event.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="w-4 h-4 text-secondary" />
                      <span className="text-muted-foreground">{event.date}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="w-4 h-4 text-secondary" />
                      <span className="text-muted-foreground">{event.time}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-secondary" />
                      <span className="text-muted-foreground">{event.venue}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full bg-primary text-white hover:bg-primary/90"
                    disabled={!event.registrationOpen}
                  >
                    {/* Registration button removed as requested */}
                    <span className="text-muted-foreground">Contact for details</span>
                  </Button>
                </CardContent>
              </Card>
            ))}
            </div>
          )}
        </section>

        {/* Call to Action */}
        <section className="bg-muted/30 rounded-lg p-8 text-center">
          <h3 className="text-primary mb-4">Interested in Joining?</h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Become a member to enjoy full access to all our facilities and exclusive events.
            Choose from a variety of membership options tailored to your lifestyle.
          </p>
          <Button
            size="lg"
            className="bg-secondary text-primary hover:bg-secondary/90"
            onClick={onViewMemberships}
          >
            View Membership Options
          </Button>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-primary text-white/80 py-8 mt-12">
        <div className="container mx-auto px-6 text-center">
          <p>&copy; 2025 Old Wesleyites Sports Club. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
