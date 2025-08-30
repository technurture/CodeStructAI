import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Crown, Mail } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SubscriptionModal({ open, onClose }: SubscriptionModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleUpgrade = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to proceed",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/create-payment", {
        email,
        amount: 29 // $29 USD
      });

      const data = await response.json();
      
      if (data.authorizationUrl) {
        // Open Paystack payment page in new window
        window.open(data.authorizationUrl, '_blank');
        
        toast({
          title: "Redirecting to Payment",
          description: "Complete your payment in the new window to upgrade to Pro",
        });
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactSales = () => {
    window.open("mailto:sales@codestruct.ai?subject=Enterprise Inquiry", '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="subscription-modal">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Choose Your Plan</DialogTitle>
          <p className="text-sm text-muted-foreground">Unlock the full power of CodeStruct AI</p>
        </DialogHeader>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* Free Trial */}
          <div className="border border-border rounded-lg p-6 bg-muted/20">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">Free Trial</h3>
              <div className="text-3xl font-bold text-foreground mt-2">$0</div>
              <div className="text-sm text-muted-foreground">for 30 days</div>
            </div>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-center text-sm" data-testid="trial-feature-files">
                <Check className="w-4 h-4 text-accent mr-3" />
                <span>Projects up to 100 files</span>
              </li>
              <li className="flex items-center text-sm" data-testid="trial-feature-analysis">
                <Check className="w-4 h-4 text-accent mr-3" />
                <span>Basic AI analysis</span>
              </li>
              <li className="flex items-center text-sm" data-testid="trial-feature-languages">
                <Check className="w-4 h-4 text-accent mr-3" />
                <span>3 languages supported</span>
              </li>
              <li className="flex items-center text-sm" data-testid="trial-feature-support">
                <Check className="w-4 h-4 text-accent mr-3" />
                <span>Community support</span>
              </li>
            </ul>
            
            <Button
              variant="secondary"
              className="w-full"
              disabled
              data-testid="button-current-plan"
            >
              Current Plan
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="border-2 border-primary rounded-lg p-6 bg-primary/5 relative">
            <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
              RECOMMENDED
            </Badge>
            
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">Pro Unlimited</h3>
              <div className="text-3xl font-bold text-foreground mt-2">$29</div>
              <div className="text-sm text-muted-foreground">per month</div>
            </div>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-center text-sm" data-testid="pro-feature-unlimited">
                <Check className="w-4 h-4 text-accent mr-3" />
                <span>Unlimited project size</span>
              </li>
              <li className="flex items-center text-sm" data-testid="pro-feature-advanced">
                <Check className="w-4 h-4 text-accent mr-3" />
                <span>Advanced AI analysis</span>
              </li>
              <li className="flex items-center text-sm" data-testid="pro-feature-all-languages">
                <Check className="w-4 h-4 text-accent mr-3" />
                <span>All programming languages</span>
              </li>
              <li className="flex items-center text-sm" data-testid="pro-feature-priority">
                <Check className="w-4 h-4 text-accent mr-3" />
                <span>Priority support</span>
              </li>
              <li className="flex items-center text-sm" data-testid="pro-feature-updates">
                <Check className="w-4 h-4 text-accent mr-3" />
                <span>Cloud AI model updates</span>
              </li>
              <li className="flex items-center text-sm" data-testid="pro-feature-collaboration">
                <Check className="w-4 h-4 text-accent mr-3" />
                <span>Team collaboration features</span>
              </li>
            </ul>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="email-input" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email-input"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                  data-testid="input-email"
                />
              </div>
              <Button
                onClick={handleUpgrade}
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="button-upgrade-pro"
              >
                <Crown className="w-4 h-4 mr-2" />
                {isLoading ? "Processing..." : "Upgrade to Pro - $29"}
              </Button>
            </div>
          </div>
        </div>

        {/* Enterprise Option */}
        <div className="mt-6 text-center p-4 bg-muted/20 rounded-lg">
          <h4 className="font-semibold text-foreground mb-2">Need Enterprise Features?</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Self-hosted deployment, custom AI models, and dedicated support
          </p>
          <Button
            variant="secondary"
            onClick={handleContactSales}
            data-testid="button-contact-sales"
          >
            <Mail className="w-4 h-4 mr-2" />
            Contact Sales
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
