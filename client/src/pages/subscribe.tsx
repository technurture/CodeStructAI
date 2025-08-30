import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Subscribe() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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
        amount: 29
      });

      const data = await response.json();
      
      if (data.authorizationUrl) {
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

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation('/')}
            className="absolute top-8 left-8"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="page-title">
            Upgrade to CodeStruct AI Pro
          </h1>
          <p className="text-lg text-muted-foreground">
            Unlock unlimited AI-powered code analysis and improvements
          </p>
        </div>

        {/* Pricing Card */}
        <div className="max-w-md mx-auto">
          <Card className="border-2 border-primary bg-primary/5 relative">
            <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
              RECOMMENDED
            </Badge>
            
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Pro Unlimited</CardTitle>
              <CardDescription>Everything you need for professional development</CardDescription>
              <div className="text-4xl font-bold text-foreground mt-4">$29</div>
              <div className="text-sm text-muted-foreground">per month</div>
            </CardHeader>
            
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-sm" data-testid="feature-unlimited">
                  <Check className="w-4 h-4 text-accent mr-3" />
                  <span>Unlimited project size</span>
                </li>
                <li className="flex items-center text-sm" data-testid="feature-advanced">
                  <Check className="w-4 h-4 text-accent mr-3" />
                  <span>Advanced AI analysis</span>
                </li>
                <li className="flex items-center text-sm" data-testid="feature-languages">
                  <Check className="w-4 h-4 text-accent mr-3" />
                  <span>All programming languages</span>
                </li>
                <li className="flex items-center text-sm" data-testid="feature-priority">
                  <Check className="w-4 h-4 text-accent mr-3" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center text-sm" data-testid="feature-updates">
                  <Check className="w-4 h-4 text-accent mr-3" />
                  <span>Latest AI model updates</span>
                </li>
                <li className="flex items-center text-sm" data-testid="feature-collaboration">
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
                  {isLoading ? "Processing..." : "Upgrade to Pro - $29/month"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Secure payment powered by Paystack</p>
          <p className="mt-2">Cancel anytime • No long-term commitments</p>
        </div>
      </div>
    </div>
  );
}