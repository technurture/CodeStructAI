import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GitBranch, Check, X, ExternalLink } from "lucide-react";

interface DiffPreviewProps {
  data: any;
  onApplyChanges: (changes: any) => void;
  onRejectChanges: () => void;
}

export default function DiffPreview({ data, onApplyChanges, onRejectChanges }: DiffPreviewProps) {
  const [viewMode, setViewMode] = useState<"proposed" | "original">("proposed");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const applyChangesMutation = useMutation({
    mutationFn: async (content: string) => {
      console.log('Apply changes mutation called');
      console.log('Data received:', data);
      console.log('File ID:', data.file?.id);
      console.log('Full file object:', data.file);
      
      if (!data.file?.id) {
        alert('❌ Invalid suggestion data. Please use the "Generate Documentation" or "Suggest Improvements" buttons in the center panel instead of clicking analysis suggestions.');
        throw new Error('No file ID available for applying changes');
      }
      
      const response = await apiRequest("PATCH", `/api/files/${data.file.id}`, { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", data.file.id] });
      onApplyChanges(data);
      toast({
        title: "Success",
        description: "Changes applied successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to apply changes",
        variant: "destructive",
      });
    },
  });

  if (!data) {
    return (
      <div className="w-96 bg-card border-l border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground flex items-center">
            <GitBranch className="w-4 h-4 mr-2 text-accent" />
            DIFF PREVIEW
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <GitBranch className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No changes to preview</p>
            <p className="text-sm">Generate suggestions to see diffs here</p>
          </div>
        </div>
      </div>
    );
  }

  const renderDiffLine = (line: string, type: "addition" | "deletion" | "unchanged") => {
    const colors = {
      addition: "bg-accent/10 text-accent border-l-4 border-accent",
      deletion: "bg-destructive/10 text-destructive border-l-4 border-destructive line-through",
      unchanged: "text-muted-foreground",
    };

    const prefixes = {
      addition: "+ ",
      deletion: "- ",
      unchanged: "  ",
    };

    return (
      <div className={`p-1 text-xs font-mono ${colors[type]}`}>
        {prefixes[type]}{line}
      </div>
    );
  };

  const renderChanges = () => {
    if (!data.changes) return null;

    return data.changes.map((change: any, index: number) => {
      const typeColors = {
        addition: "border-accent/30 bg-accent/5",
        modification: "border-primary/30 bg-primary/5",
        removal: "border-destructive/30 bg-destructive/5",
      };

      const typeLabels = {
        addition: "+ Added",
        modification: "~ Modified",
        removal: "- Removed",
      };

      const headerColors = {
        addition: "bg-accent/10 text-accent border-accent/30",
        modification: "bg-primary/10 text-primary border-primary/30",
        removal: "bg-destructive/10 text-destructive border-destructive/30",
      };

      return (
        <div
          key={index}
          className={`border rounded-md overflow-hidden mb-4 ${typeColors[change.type as keyof typeof typeColors]}`}
          data-testid={`change-${index}`}
        >
          <div className={`px-3 py-2 text-xs font-medium border-b ${headerColors[change.type as keyof typeof headerColors]}`}>
            {typeLabels[change.type as keyof typeof typeLabels]} {change.description}
          </div>
          <div className="p-3">
            <div className="text-xs font-mono bg-muted/30 p-2 rounded">
              {change.content || "No preview available"}
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="w-96 bg-card border-l border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center">
            <GitBranch className="w-4 h-4 mr-2 text-accent" />
            DIFF PREVIEW
          </h2>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              onClick={() => applyChangesMutation.mutate(data.improved)}
              disabled={applyChangesMutation.isPending}
              className="text-xs bg-accent text-accent-foreground hover:bg-accent/90"
              data-testid="button-accept-changes"
            >
              <Check className="w-3 h-3 mr-1" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={onRejectChanges}
              className="text-xs"
              data-testid="button-reject-changes"
            >
              <X className="w-3 h-3 mr-1" />
              Reject
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          Showing changes for: <span className="text-foreground font-medium">{data.file?.path}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {/* View Toggle */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="proposed" data-testid="tab-proposed">
                Proposed Changes
              </TabsTrigger>
              <TabsTrigger value="original" data-testid="tab-original">
                Original
              </TabsTrigger>
            </TabsList>

            <TabsContent value="proposed" className="space-y-4">
              {data.type === "documentation" && (
                <div className="text-xs text-muted-foreground mb-4">
                  AI-generated documentation and comments have been added to improve code readability.
                </div>
              )}
              
              {data.type === "improvement" && (
                <div className="text-xs text-muted-foreground mb-4">
                  Code improvements including error handling, type safety, and best practices.
                </div>
              )}

              {renderChanges()}

              {/* Code Preview */}
              <div className="bg-muted/30 p-3 rounded-md">
                <div className="text-xs font-medium mb-2">Preview:</div>
                <div className="bg-background p-2 rounded text-xs font-mono max-h-64 overflow-y-auto">
                  {data.improved?.split('\n').slice(0, 20).map((line: string, index: number) => (
                    <div key={index}>{line}</div>
                  ))}
                  {data.improved?.split('\n').length > 20 && (
                    <div className="text-muted-foreground">... and {data.improved.split('\n').length - 20} more lines</div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="original">
              <div className="bg-muted/30 p-3 rounded-md">
                <div className="text-xs font-medium mb-2">Original Code:</div>
                <div className="bg-background p-2 rounded text-xs font-mono max-h-64 overflow-y-auto">
                  {data.original?.split('\n').slice(0, 20).map((line: string, index: number) => (
                    <div key={index}>{line}</div>
                  ))}
                  {data.original?.split('\n').length > 20 && (
                    <div className="text-muted-foreground">... and {data.original.split('\n').length - 20} more lines</div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="mt-6 space-y-2">
            <Button
              onClick={() => applyChangesMutation.mutate(data.improved)}
              disabled={applyChangesMutation.isPending}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              data-testid="button-apply-changes"
            >
              <Check className="w-4 h-4 mr-2" />
              Apply Changes to {data.file?.path?.split('/').pop()}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              data-testid="button-preview-new-tab"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Preview in New Tab
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
