import { useState } from "react";
import { ArrowLeft, Plus, Send, Edit, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Checkbox } from "./ui/checkbox";
import { toast } from "sonner@2.0.3";
import logo from "figma:asset/7e8ee45ea4f6bbc4778bb2c0c1ed5bfb1ed79130.png";
import { useEffect } from "react";
import { promotionsAPI, Promotion as APIPromotion } from "../api/promotions";
import { Loader2 } from "lucide-react";

interface PromotionsManagerProps {
  onBack: () => void;
}

interface Promotion {
  id: number;
  title: string;
  description: string;
  validUntil: string;
  active: boolean;
}

export function PromotionsManager({ onBack }: PromotionsManagerProps) {
  const [promotions, setPromotions] = useState<APIPromotion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPromotions = async () => {
    try {
      const data = await promotionsAPI.getAll();
      setPromotions(data);
    } catch (error) {
      toast.error("Failed to load promotions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPromotion, setNewPromotion] = useState({
    title: "",
    description: "",
    validUntil: "",
    sendEmail: true,
    sendSMS: false,
    sendPush: true,
  });

  const handleCreatePromotion = async () => {
    if (!newPromotion.title || !newPromotion.description || !newPromotion.validUntil) {
      toast.error("Please fill in all required fields including valid until date");
      return;
    }

    try {
      await promotionsAPI.create({
        title: newPromotion.title,
        description: newPromotion.description,
        validUntil: new Date(newPromotion.validUntil).toISOString(),
        isActive: true
      });

      const channels = [];
      if (newPromotion.sendEmail) channels.push("email");
      if (newPromotion.sendSMS) channels.push("SMS");
      if (newPromotion.sendPush) channels.push("push notification");

      toast.success(`Promotion created and sent via ${channels.join(", ")} to all members!`);

      setIsDialogOpen(false);
      setNewPromotion({
        title: "",
        description: "",
        validUntil: "",
        sendEmail: true,
        sendSMS: false,
        sendPush: true,
      });
      fetchPromotions();
    } catch (error) {
      toast.error("Failed to create promotion");
    }
  };

  const handleDeletePromotion = async (id: number) => {
    try {
      await promotionsAPI.delete(id);
      toast.success("Promotion deleted successfully");
      fetchPromotions();
    } catch (error) {
      toast.error("Failed to delete promotion");
    }
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
                <h1>Promotions Manager</h1>
                <p className="text-white/80 mt-1">Create and manage member promotions</p>
              </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-secondary text-primary hover:bg-secondary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  New Promotion
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Promotion</DialogTitle>
                  <DialogDescription>
                    Send promotional offers to all members
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Promotion Title *</Label>
                    <Input
                      id="title"
                      value={newPromotion.title}
                      onChange={(e) => setNewPromotion({ ...newPromotion, title: e.target.value })}
                      placeholder="e.g., Weekend Special Discount"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={newPromotion.description}
                      onChange={(e) => setNewPromotion({ ...newPromotion, description: e.target.value })}
                      placeholder="Describe the promotion details..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="validUntil">Valid Until</Label>
                    <Input
                      id="validUntil"
                      type="date"
                      value={newPromotion.validUntil}
                      onChange={(e) => setNewPromotion({ ...newPromotion, validUntil: e.target.value })}
                    />
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <Label>Notification Channels</Label>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sendEmail"
                        checked={newPromotion.sendEmail}
                        onCheckedChange={(checked) => setNewPromotion({ ...newPromotion, sendEmail: checked as boolean })}
                      />
                      <Label htmlFor="sendEmail" className="cursor-pointer">
                        Send via Email
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sendSMS"
                        checked={newPromotion.sendSMS}
                        onCheckedChange={(checked) => setNewPromotion({ ...newPromotion, sendSMS: checked as boolean })}
                      />
                      <Label htmlFor="sendSMS" className="cursor-pointer">
                        Send via SMS
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sendPush"
                        checked={newPromotion.sendPush}
                        onCheckedChange={(checked) => setNewPromotion({ ...newPromotion, sendPush: checked as boolean })}
                      />
                      <Label htmlFor="sendPush" className="cursor-pointer">
                        Send Push Notification
                      </Label>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button className="flex-1 bg-primary text-white" onClick={handleCreatePromotion}>
                      <Send className="w-4 h-4 mr-2" />
                      Create & Send
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading promotions...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {promotions.map((promotion) => (
              <Card key={promotion.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle>{promotion.title}</CardTitle>
                      <CardDescription className="mt-2">
                        {promotion.description}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePromotion(promotion.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Valid until: {new Date(promotion.validUntil).toLocaleDateString()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${promotion.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}>
                      {promotion.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && promotions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Send className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-muted-foreground mb-2">No Promotions Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first promotion to engage with members
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="bg-primary text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Promotion
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
