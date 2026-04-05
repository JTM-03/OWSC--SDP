import { Button } from "./ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Calendar, UtensilsCrossed, Users, Award, MapPin, Phone, Mail, Clock } from "lucide-react";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onExploreFacility: () => void;
}

export function LandingPage({ onGetStarted, onLogin, onExploreFacility }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-sm text-white shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="OWSC Logo" className="h-10 w-10 object-contain" />
              <div>
                <h2 className="text-white">OWSC</h2>
                <p className="text-xs text-white/80">Old Wesleyites Sports Club</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" className="text-white hover:bg-white/10" onClick={onLogin}>
                Member Login
              </Button>
              <Button className="bg-secondary text-primary hover:bg-secondary/90" onClick={onGetStarted}>
                Join Now
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1759419038843-29749ac4cd2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwcmVzdGF1cmFudCUyMGludGVyaW9yfGVufDF8fHx8MTc2MDg3NzU0M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/70 to-primary/90"></div>
        </div>

        <div className="relative z-10 container mx-auto px-6 text-center text-white">
          <img src={logo} alt="OWSC Logo" className="h-32 w-32 mx-auto mb-8 object-contain" />
          <h1 className="text-5xl md:text-6xl mb-6 text-white font-[Playfair_Display]">
            Old Wesleyites Sports Club
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto">
            A Legacy of Excellence Since 1938 - Experience Premium Sports, Dining & Social Excellence
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-secondary text-primary hover:bg-secondary/90 text-lg px-8"
              onClick={onGetStarted}
            >
              Become a Member
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-primary mb-4">Member Benefits</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Experience world-class facilities and exclusive privileges designed for our distinguished members
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-2 hover:border-secondary transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-14 h-14 bg-secondary/20 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="w-8 h-8 text-secondary" />
                </div>
                <CardTitle className="text-left">Sports Facilities</CardTitle>
                <CardDescription className="text-left">
                  Cricket grounds, tennis courts, swimming pools, and more
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-secondary transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-14 h-14 bg-secondary/20 rounded-lg flex items-center justify-center mb-4">
                  <UtensilsCrossed className="w-8 h-8 text-secondary" />
                </div>
                <CardTitle>Fine Dining</CardTitle>
                <CardDescription>
                  Authentic Sri Lankan cuisine and international favorites
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-secondary transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-14 h-14 bg-secondary/20 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-secondary" />
                </div>
                <CardTitle>Event Venues</CardTitle>
                <CardDescription>
                  Function halls for weddings, corporate events, and celebrations
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-secondary transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-14 h-14 bg-secondary/20 rounded-lg flex items-center justify-center mb-4">
                  <Award className="w-8 h-8 text-secondary" />
                </div>
                <CardTitle>Exclusive Access</CardTitle>
                <CardDescription>
                  Members-only events, tournaments, and social gatherings
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-primary mb-6">A Rich Heritage</h2>
              <p className="text-lg text-muted-foreground mb-4">
                Founded in 1938, the Old Wesleyites Sports Club has been a cornerstone of Sri Lankan sporting and social excellence for over eight decades.
              </p>
              <p className="text-lg text-muted-foreground mb-4">
                Our club provides a unique blend of traditional values and modern amenities, offering our members access to state-of-the-art sports facilities, fine dining experiences, and exclusive event venues.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                Join a community of distinguished members who share a passion for sports, culture, and camaraderie.
              </p>
              <Button className="bg-primary text-white hover:bg-primary/90" onClick={onExploreFacility}>
                Explore the Facility
              </Button>
            </div>
            <div className="relative h-96 lg:h-full min-h-[400px] rounded-lg overflow-hidden shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1759419038843-29749ac4cd2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwcmVzdGF1cmFudCUyMGludGVyaW9yfGVufDF8fHx8MTc2MDg3NzU0M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Sports Club"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-white mb-6">Visit Us</h2>
              <p className="text-white/90 text-lg mb-8">
                Experience the OWSC difference. Visit our club or contact us to learn more about membership.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <MapPin className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="text-white mb-1">Address</h4>
                    <p className="text-white/80">
                      32 Guildford Crescent<br />
                      Colombo 7, Sri Lanka
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Phone className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="text-white mb-1">Phone</h4>
                    <p className="text-white/80">+94 11 269 5301</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Mail className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="text-white mb-1">Email</h4>
                    <p className="text-white/80">info@owsc.lk</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Clock className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="text-white mb-1">Opening Hours</h4>
                    <p className="text-white/80">
                      Monday - Saturday: 6:00 AM - 11:00 PM
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8">
              <h3 className="text-white mb-6">Get in Touch</h3>
              <form className="space-y-4">
                <div>
                  <input 
                    type="text" 
                    placeholder="Your Name"
                    className="w-full px-4 py-3 rounded bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <input 
                    type="email" 
                    placeholder="Your Email"
                    className="w-full px-4 py-3 rounded bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <textarea 
                    rows={4}
                    placeholder="Your Message"
                    className="w-full px-4 py-3 rounded bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:border-secondary resize-none"
                  />
                </div>
                <Button className="w-full bg-secondary text-primary hover:bg-secondary/90">
                  Send Message
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-charcoal-gray text-white/80 py-8">
        <div className="container mx-auto px-6 text-center">
          <p>&copy; 2025 Old Wesleyites Sports Club. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
