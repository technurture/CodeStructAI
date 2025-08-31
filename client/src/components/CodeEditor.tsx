import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileText, GitBranch, Lightbulb } from "lucide-react";

interface CodeEditorProps {
  selectedFile: string | null;
  onDiffGenerated: (diff: any) => void;
}

export default function CodeEditor({ selectedFile, onDiffGenerated }: CodeEditorProps) {
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const { toast } = useToast();

  const { data: file } = useQuery({
    queryKey: ["/api/files", selectedFile],
    enabled: !!selectedFile,
  });

  const typedFile = file as any;

  const documentMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await apiRequest("POST", `/api/files/${fileId}/document`);
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Documentation mutation success, data received:', data);
      console.log('File data:', data.file);
      console.log('File ID:', data.file?.id);
      
      onDiffGenerated({
        type: "documentation",
        original: data.original,
        improved: data.documented,
        changes: data.changes,
        file: data.file,
      });
      toast({
        title: "Success",
        description: "Documentation generated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate documentation",
        variant: "destructive",
      });
    },
  });

  const improveMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await apiRequest("POST", `/api/files/${fileId}/improve`);
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Improvement mutation success, data received:', data);
      console.log('File data:', data.file);
      console.log('File ID:', data.file?.id);
      
      onDiffGenerated({
        type: "improvement",
        original: data.original,
        improved: data.improved,
        changes: data.changes,
        file: data.file,
      });
      toast({
        title: "Success",
        description: "Improvements suggested successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to suggest improvements",
        variant: "destructive",
      });
    },
  });

  // Add file to open tabs when selected
  if (selectedFile && typedFile && !openTabs.includes(selectedFile)) {
    setOpenTabs([...openTabs, selectedFile]);
    setActiveTab(selectedFile);
  }

  const closeTab = (tabId: string) => {
    const newTabs = openTabs.filter(id => id !== tabId);
    setOpenTabs(newTabs);
    if (activeTab === tabId) {
      setActiveTab(newTabs[newTabs.length - 1] || "");
    }
  };

  const renderSyntaxHighlighted = (content: string, language: string = "") => {
    // Simple syntax highlighting for demo
    const lines = content.split('\n');
    return (
      <div className="syntax-highlight">
        {lines.map((line, index) => (
          <div key={index} className="flex">
            <span className="text-muted-foreground mr-4 text-xs select-none w-8 text-right">
              {index + 1}
            </span>
            <span className="text-sm font-mono">{line || '\u00A0'}</span>
          </div>
        ))}
      </div>
    );
  };

  const getLanguageIcon = (language: string) => {
    const icons: Record<string, string> = {
      javascript: "fab fa-js-square text-yellow-400",
      typescript: "fab fa-js-square text-blue-400",
      python: "fab fa-python text-blue-400",
      java: "fab fa-java text-red-500",
      html: "fab fa-html5 text-orange-500",
      css: "fab fa-css3-alt text-blue-500",
    };
    return icons[language] || "fas fa-file-code text-muted-foreground";
  };

  if (!selectedFile || !file) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="bg-card border-b border-border px-4 py-2">
          <div className="text-sm text-muted-foreground">No file selected</div>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Select a file to edit</p>
            <p className="text-sm">Choose a file from the explorer to view and edit its contents</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Editor Tabs */}
      <div className="bg-card border-b border-border">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto p-0 bg-transparent">
            {openTabs.map((tabId) => {
              const tabFile = tabId === selectedFile ? typedFile : null;
              if (!tabFile) return null;
              
              return (
                <TabsTrigger
                  key={tabId}
                  value={tabId}
                  className="flex items-center space-x-2 px-4 py-3 bg-transparent data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
                  data-testid={`tab-${tabId}`}
                >
                  <i className={getLanguageIcon(tabFile?.language || "")}></i>
                  <span className="text-sm">{tabFile?.path?.split('/').pop()}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tabId);
                    }}
                    className="ml-2 hover:bg-muted rounded p-1"
                    data-testid={`button-close-tab-${tabId}`}
                  >
                    <i className="fas fa-times text-xs"></i>
                  </button>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Code Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-4 overflow-auto bg-muted/5" data-testid="code-content">
          {renderSyntaxHighlighted(typedFile?.content || '', typedFile?.language)}
        </div>

        {/* AI Suggestions for Current File */}
        <div className="border-t border-border p-4 bg-card">
          <h4 className="text-sm font-semibold mb-3 flex items-center">
            <Lightbulb className="w-4 h-4 mr-2 text-primary" />
            Quick Actions
          </h4>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => documentMutation.mutate(selectedFile)}
              disabled={documentMutation.isPending}
              data-testid="button-generate-docs"
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate Documentation
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => improveMutation.mutate(selectedFile)}
              disabled={improveMutation.isPending}
              data-testid="button-suggest-improvements"
            >
              <GitBranch className="w-4 h-4 mr-2" />
              Suggest Improvements
            </Button>
          </div>

          {/* Mock suggestions for demo */}
          <div className="mt-4 space-y-2">
            <div className="bg-primary/10 border border-primary/20 p-3 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-primary">Add Error Handling</span>
                <Button
                  size="sm"
                  className="text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                  data-testid="button-apply-error-handling"
                >
                  Apply
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Wrap API calls in try-catch blocks and add user-friendly error messages
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
