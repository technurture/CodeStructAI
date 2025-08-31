import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Lightbulb, TriangleAlert, GitBranch } from "lucide-react";

interface AIAnalysisPanelProps {
  project: any;
  onSuggestionApply: (suggestion: any) => void;
}

export default function AIAnalysisPanel({ project, onSuggestionApply }: AIAnalysisPanelProps) {
  const { data: analysis, isLoading } = useQuery({
    queryKey: ["/api/projects", project?.id, "analysis"],
    enabled: !!project?.id,
  });

  const detectedLanguages = (analysis as any)?.detectedLanguages || {};
  const issues = (analysis as any)?.issues || [];
  const suggestions = (analysis as any)?.suggestions || [];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center">
            <Brain className="w-4 h-4 mr-2 text-primary" />
            AI ANALYSIS
          </h2>
          {isLoading && (
            <Badge className="bg-accent text-accent-foreground animate-pulse">
              Processing
            </Badge>
          )}
        </div>
        
        {/* Language Detection */}
        {Object.keys(detectedLanguages).length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-muted-foreground mb-2">DETECTED LANGUAGES</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(detectedLanguages).map(([language, percentage]) => (
                <Badge
                  key={language}
                  variant="secondary"
                  className="text-xs"
                  data-testid={`language-${language}`}
                >
                  {language} {Math.round((percentage as number) * 100)}%
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Analysis Results */}
      <div className="flex-1 overflow-y-auto">
        {!analysis ? (
          <div className="p-4 text-center text-muted-foreground">
            <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No analysis available</p>
            <p className="text-xs">Scan your project to get AI insights</p>
          </div>
        ) : (
          <>
            {/* Architecture Analysis */}
            {(analysis as any)?.architecture && (
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold mb-3 flex items-center">
                  <GitBranch className="w-4 h-4 mr-2 text-accent" />
                  Architecture Analysis
                </h3>
                <div className="bg-muted/30 p-3 rounded-md text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span>Current Pattern:</span>
                    <span className="text-accent font-medium" data-testid="architecture-pattern">
                      {(analysis as any).architecture}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Detected project structure and patterns
                  </div>
                </div>
              </div>
            )}

            {/* Issues Found */}
            {issues.length > 0 && (
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold mb-3 flex items-center">
                  <TriangleAlert className="w-4 h-4 mr-2 text-amber-500" />
                  Issues Found
                  <Badge className="ml-auto bg-destructive/20 text-destructive" data-testid="issues-count">
                    {issues.length}
                  </Badge>
                </h3>
                
                <div className="space-y-3">
                  {issues.slice(0, 5).map((issue: any, index: number) => (
                    <div
                      key={index}
                      className={`border rounded-md p-3 ${
                        issue.severity === "high"
                          ? "bg-destructive/10 border-destructive/20"
                          : issue.severity === "medium"
                          ? "bg-amber-500/10 border-amber-500/20"
                          : "bg-primary/10 border-primary/20"
                      }`}
                      data-testid={`issue-${index}`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-medium">{issue.type}</span>
                        <Badge variant={getSeverityColor(issue.severity) as any} className="text-xs">
                          {issue.severity}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">{issue.file}</div>
                      <div className="text-xs">{issue.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Suggestions */}
            {suggestions.length > 0 && (
              <div className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center">
                  <Lightbulb className="w-4 h-4 mr-2 text-primary" />
                  AI Suggestions
                </h3>
                
                <div className="space-y-3">
                  {suggestions.slice(0, 3).map((suggestion: any, index: number) => (
                    <div
                      key={index}
                      className="bg-accent/10 border border-accent/20 p-3 rounded-md"
                      data-testid={`suggestion-${index}`}
                    >
                      <div className="text-sm font-medium mb-2">{suggestion.title}</div>
                      <div className="text-xs text-muted-foreground mb-3">
                        {suggestion.description}
                      </div>
                      <div className="bg-muted/30 p-2 rounded text-xs text-center text-muted-foreground">
                        💡 Analysis suggestion - Use "Generate Documentation" or "Suggest Improvements" for actionable changes
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
