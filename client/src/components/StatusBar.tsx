import { Badge } from "@/components/ui/badge";
import { Circle } from "lucide-react";

interface StatusBarProps {
  user: any;
  project: any;
}

export default function StatusBar({ user, project }: StatusBarProps) {
  const getTrialDaysLeft = () => {
    if (!user?.trialEndsAt) return 0;
    const now = new Date();
    const trialEnd = new Date(user.trialEndsAt);
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const formatLastScan = () => {
    if (!project?.lastScanAt) return "Never";
    const now = new Date();
    const lastScan = new Date(project.lastScanAt);
    const diffMinutes = Math.floor((now.getTime() - lastScan.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return `${Math.floor(diffMinutes / 1440)} days ago`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-primary/10 border-t border-border px-4 py-2 flex items-center justify-between text-xs">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2" data-testid="ai-status">
          <Circle className="w-2 h-2 fill-accent text-accent" />
          <span>AI Ready</span>
        </div>
        <div className="text-muted-foreground">
          Last scan: <span data-testid="last-scan">{formatLastScan()}</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        {user?.subscriptionTier === "trial" && (
          <div className="text-muted-foreground">
            Trial: <span className="text-accent font-medium" data-testid="trial-days">
              {getTrialDaysLeft()} days left
            </span>
          </div>
        )}
        {project && (
          <div className="text-muted-foreground">
            Lines processed: <span className="text-foreground font-medium" data-testid="lines-processed">
              {project.linesProcessed?.toLocaleString() || 0}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
