import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Brain, Check, Clock, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface ProcessingModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ProcessingModal({ open, onClose }: ProcessingModalProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { icon: Check, label: "Scanning project files", completed: true },
    { icon: Loader2, label: "Analyzing code structure", completed: false },
    { icon: Clock, label: "Generating documentation", completed: false },
    { icon: Clock, label: "Preparing suggestions", completed: false },
  ];

  useEffect(() => {
    if (!open) {
      setProgress(0);
      setCurrentStep(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 2;
        
        // Update current step based on progress
        if (newProgress >= 25 && currentStep < 1) setCurrentStep(1);
        if (newProgress >= 50 && currentStep < 2) setCurrentStep(2);
        if (newProgress >= 75 && currentStep < 3) setCurrentStep(3);
        
        // Complete processing
        if (newProgress >= 100) {
          setTimeout(() => {
            onClose();
          }, 1000);
          return 100;
        }
        
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [open, onClose, currentStep]);

  const getStepIcon = (index: number) => {
    if (index < currentStep) return Check;
    if (index === currentStep) return Loader2;
    return Clock;
  };

  const getStepIconClass = (index: number) => {
    if (index < currentStep) return "text-accent";
    if (index === currentStep) return "text-primary animate-spin";
    return "text-muted-foreground";
  };

  const getStepTextClass = (index: number) => {
    if (index <= currentStep) return "text-foreground";
    return "text-muted-foreground";
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" data-testid="processing-modal">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain className="text-primary text-2xl animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">AI Analysis in Progress</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Analyzing your codebase structure and generating intelligent suggestions...
          </p>
          
          {/* Progress Steps */}
          <div className="space-y-3 mb-6">
            {steps.map((step, index) => {
              const IconComponent = getStepIcon(index);
              return (
                <div key={index} className="flex items-center text-sm" data-testid={`step-${index}`}>
                  <IconComponent className={`w-4 h-4 mr-3 ${getStepIconClass(index)}`} />
                  <span className={getStepTextClass(index)}>{step.label}</span>
                </div>
              );
            })}
          </div>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <Progress value={progress} className="w-full" data-testid="progress-bar" />
            <div className="text-xs text-muted-foreground mt-2">
              {Math.round(progress)}% complete
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground">
            This may take a few moments for larger projects...
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
