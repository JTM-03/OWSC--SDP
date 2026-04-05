import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ArrowLeft, Check, Loader2, Star } from "lucide-react";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { membershipAPI, MembershipPlan } from "../api/membership";
import { toast } from "sonner@2.0.3";

interface MembershipSelectionProps {
  onBack: () => void;
  onSelect: (planId: string) => void;
}

export function MembershipSelection({ onBack, onSelect }: MembershipSelectionProps) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Define static plans that match the user's requested list exactly
  const staticPlans = [
    { id: "full", name: "Full Member", price: 15000, description: "Full access to all club facilities, voting rights, priority event booking, clubhouse access" },
    { id: "associate", name: "Associate Member", price: 10000, description: "Clubhouse access, limited facility use, event participation, member discounts" },
    { id: "sport", name: "Sport Member", price: 5000, description: "Access to specific sports facilities, training sessions, basic clubhouse access" },
    { id: "social", name: "Social Member", price: 10000, description: "Clubhouse and dining access, social event invitations, relaxed member networking" },
    { id: "lifetime", name: "Lifetime Member", price: 25000, description: "Permanent membership, no recurring fees, all premium benefits, legacy status" },
  ];

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await membershipAPI.getPlans();
        if (data && data.length > 0) {
          setPlans(data);
        } else {
          setPlans(staticPlans as any);
        }
      } catch (error) {
        setPlans(staticPlans as any);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const getFeatures = (description: string) => {
    return description.split(',').map(f => f.trim());
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center" style={{ backgroundColor: '#0f172a' }}>
      {/* Background with overlay */}
      {/* Background with dark gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
        }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-[1400px] px-6 py-12 flex flex-col items-center">
        <header className="w-full mb-12">
          <div className="flex justify-start mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </div>
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <img src={logo} alt="OWSC Logo" className="h-24 w-24 object-contain" />
            </div>
            <h1 className="text-4xl font-serif text-white mb-2">Club Membership Plans</h1>
            <p className="text-white/80 text-lg">Choose the perfect package to start your journey with OWSC</p>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin mb-4" />
            <p className="text-white/60">Loading available plans...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 w-full mb-12">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`flex flex-col bg-white/95 backdrop-blur-md border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden relative ${plan.id === 'lifetime'
                  ? 'ring-2 ring-[#D4AF37] transform scale-105 z-10'
                  : 'hover:scale-[1.02]'
                  }`}
              >
                {/* Recommended Badge - Fixed Height */}
                <div className="h-6">
                  {plan.id === 'lifetime' && (
                    <div className="bg-[#D4AF37] text-white text-[10px] font-bold py-1 px-4 text-center uppercase tracking-widest flex items-center justify-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      Recommended
                    </div>
                  )}
                </div>

                <CardHeader className="text-center pt-8 pb-4">
                  {/* Fixed height title section */}
                  <div className="flex items-center justify-center h-20 mb-6">
                    <CardTitle className="text-3xl font-serif text-[#1a2b3c] leading-tight">
                      {plan.name}
                    </CardTitle>
                  </div>

                  {/* Fixed height price section */}
                  <div className="flex flex-col items-center justify-center h-24">
                    <span className="text-4xl font-bold text-[#1a2b3c]">
                      Rs. {plan.price.toLocaleString()}
                    </span>
                    <span className="text-xs text-[#1a2b3c]/60 mt-2 font-medium uppercase tracking-wider">
                      {plan.id === 'lifetime' ? 'One-time fee' : 'Annual fee'}
                    </span>
                  </div>
                </CardHeader>

                {/* Fixed height features section */}
                <CardContent className="flex-1 px-8 pt-6 pb-4">
                  <div className="h-px bg-[#1a2b3c]/10 w-full mb-6" />
                  <ul className="space-y-4 h-56">
                    {getFeatures(plan.description).map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-[#1a2b3c]/80 leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                {/* Button section */}
                <CardContent className="pb-8 pt-4 px-6">
                  <Button
                    className="w-full h-12 text-sm font-bold uppercase tracking-widest bg-primary text-white hover:bg-primary/90 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
                    onClick={() => onSelect(plan.id)}
                  >
                    Select
                  </Button>
                </CardContent>

              </Card>
            ))}
          </div>
        )}

        <div className="max-w-4xl w-full">
          <Card className="bg-white/95 backdrop-blur-md border-none shadow-xl text-primary">
            <CardContent className="p-8 text-center text-primary">
              <h3 className="text-xl font-serif mb-6 text-primary">The OWSC Membership Process</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-full border-2 border-primary text-primary flex items-center justify-center mx-auto font-bold">01</div>
                  <p className="text-xs uppercase tracking-widest font-bold">Pick Plan</p>
                </div>
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-full border-2 border-primary text-primary flex items-center justify-center mx-auto font-bold">02</div>
                  <p className="text-xs uppercase tracking-widest font-bold">Fill Form</p>
                </div>
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-full border-2 border-primary text-primary flex items-center justify-center mx-auto font-bold">03</div>
                  <p className="text-xs uppercase tracking-widest font-bold">Pay Slip</p>
                </div>
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-full border-2 border-primary text-primary flex items-center justify-center mx-auto font-bold">04</div>
                  <p className="text-xs uppercase tracking-widest font-bold">Approval</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}