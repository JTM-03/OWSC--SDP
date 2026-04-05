import { useState } from "react";
import { ArrowLeft, CreditCard, Smartphone, Building2, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner@2.0.3";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";

interface PaymentProps {
  onBack: () => void;
  amount?: number;
  description?: string;
}

export function Payment({ onBack, amount = 0, description = "Membership Fee" }: PaymentProps) {
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank" | "mobile">("card");
  const [processing, setProcessing] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(amount.toString());
  const [paymentDescription, setPaymentDescription] = useState(description);
  const [descriptionType, setDescriptionType] = useState<"select" | "custom">("select");
  
  const predefinedDescriptions = [
    "Annual Membership Fee",
    "Lifetime Membership Fee",
    "Venue Booking Payment",
    "Food Order Payment",
    "Event Ticket Payment",
    "Sports Coaching Fee",
    "Custom"
  ];

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      toast.success("Payment successful! Receipt sent to your email.");
      setTimeout(() => onBack(), 2000);
    }, 2000);
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
              <h1>Make Payment</h1>
              <p className="text-white/80 mt-1">Secure payment portal</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Details */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Payment Details</CardTitle>
                  <CardDescription>Enter payment information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="paymentDescription">Description</Label>
                      <Select 
                        value={descriptionType === "select" ? paymentDescription : "Custom"}
                        onValueChange={(value) => {
                          if (value === "Custom") {
                            setDescriptionType("custom");
                            setPaymentDescription("");
                          } else {
                            setDescriptionType("select");
                            setPaymentDescription(value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {predefinedDescriptions.map((desc) => (
                            <SelectItem key={desc} value={desc}>
                              {desc}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {descriptionType === "custom" && (
                        <Input
                          id="paymentDescription"
                          value={paymentDescription}
                          onChange={(e) => setPaymentDescription(e.target.value)}
                          placeholder="Enter custom description"
                          className="mt-2"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentAmount">Amount (Rs.)</Label>
                      <Input
                        id="paymentAmount"
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="Enter amount"
                        min="1"
                      />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between text-lg">
                        <span>Total Amount:</span>
                        <span className="text-secondary">
                          Rs. {Number(paymentAmount || 0).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {paymentDescription || description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Form */}
            <div className="lg:col-span-2 lg:order-first">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                  <CardDescription>Choose your preferred payment method</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                      <TabsTrigger value="card" className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Card
                      </TabsTrigger>
                      <TabsTrigger value="bank" className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Bank
                      </TabsTrigger>
                      <TabsTrigger value="mobile" className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        Mobile
                      </TabsTrigger>
                    </TabsList>

                    {/* Credit/Debit Card */}
                    <TabsContent value="card">
                      <form onSubmit={handlePayment} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="cardNumber">Card Number</Label>
                          <Input
                            id="cardNumber"
                            placeholder="1234 5678 9012 3456"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cardName">Cardholder Name</Label>
                          <Input
                            id="cardName"
                            placeholder="Name on card"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="expiry">Expiry Date</Label>
                            <Input
                              id="expiry"
                              placeholder="MM/YY"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cvv">CVV</Label>
                            <Input
                              id="cvv"
                              placeholder="123"
                              maxLength={3}
                              required
                            />
                          </div>
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full bg-primary text-white"
                          disabled={processing}
                        >
                          {processing ? "Processing..." : `Pay Rs. ${Number(paymentAmount || 0).toLocaleString()}`}
                        </Button>
                      </form>
                    </TabsContent>

                    {/* Bank Transfer */}
                    <TabsContent value="bank">
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg space-y-2">
                          <h4 className="text-sm">Bank Details</h4>
                          <div className="text-sm space-y-1">
                            <p><strong>Bank:</strong> Commercial Bank of Ceylon</p>
                            <p><strong>Branch:</strong> Colombo Main Branch</p>
                            <p><strong>Account Name:</strong> Old Wesleyites Sports Club</p>
                            <p><strong>Account Number:</strong> 1234567890</p>
                            <p><strong>Swift Code:</strong> CCEYLKLX</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="referenceNumber">Transfer Reference Number</Label>
                          <Input
                            id="referenceNumber"
                            placeholder="Enter bank transfer reference"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="transferDate">Transfer Date</Label>
                          <Input
                            id="transferDate"
                            type="date"
                            required
                          />
                        </div>

                        <Button 
                          onClick={handlePayment}
                          className="w-full bg-primary text-white"
                          disabled={processing}
                        >
                          {processing ? "Submitting..." : "Submit Transfer Details"}
                        </Button>

                        <p className="text-xs text-muted-foreground text-center">
                          Payment will be verified within 1-2 business days
                        </p>
                      </div>
                    </TabsContent>

                    {/* Mobile Payment */}
                    <TabsContent value="mobile">
                      <form onSubmit={handlePayment} className="space-y-4">
                        <RadioGroup defaultValue="dialog">
                          <div className="flex items-center space-x-2 p-3 border rounded-lg">
                            <RadioGroupItem value="dialog" id="dialog" />
                            <Label htmlFor="dialog" className="flex items-center gap-2 cursor-pointer flex-1">
                              <span className="text-lg">📱</span>
                              <span>Dialog eZ Cash</span>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2 p-3 border rounded-lg">
                            <RadioGroupItem value="mobitel" id="mobitel" />
                            <Label htmlFor="mobitel" className="flex items-center gap-2 cursor-pointer flex-1">
                              <span className="text-lg">📱</span>
                              <span>Mobitel mCash</span>
                            </Label>
                          </div>
                        </RadioGroup>

                        <div className="space-y-2">
                          <Label htmlFor="mobileNumber">Mobile Number</Label>
                          <Input
                            id="mobileNumber"
                            placeholder="07X XXX XXXX"
                            required
                          />
                        </div>

                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            You will receive a USSD push notification to approve this payment
                          </p>
                        </div>

                        <Button 
                          type="submit"
                          className="w-full bg-primary text-white"
                          disabled={processing}
                        >
                          {processing ? "Processing..." : `Pay Rs. ${Number(paymentAmount || 0).toLocaleString()}`}
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
