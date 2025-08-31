import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FileExplorer from "@/components/FileExplorer";
import AIAnalysisPanel from "@/components/AIAnalysisPanel";
import CodeEditor from "@/components/CodeEditor";
import DiffPreview from "@/components/DiffPreview";
import SubscriptionModal from "@/components/SubscriptionModal";
import ProcessingModal from "@/components/ProcessingModal";
import StatusBar from "@/components/StatusBar";
import { Button } from "@/components/ui/button";
import { Settings, Crown } from "lucide-react";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showSubscription, setShowSubscription] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [diffData, setDiffData] = useState<any>(null);

  const { data: user } = useQuery({
    queryKey: ["/api/user"],
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const typedProjects = Array.isArray(projects) ? projects : [];
  const currentProject = typedProjects?.find((p: any) => p.id === selectedProject) || typedProjects?.[0];

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Main Layout */}
      <div className="flex flex-1">
        {/* File Explorer */}
        <FileExplorer
          project={currentProject}
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
          onProjectSelect={setSelectedProject}
          onProcessingStart={() => setIsProcessing(true)}
          data-testid="file-explorer"
        />

        {/* Resizer */}
        <div className="w-1 bg-border hover:bg-primary cursor-col-resize transition-colors" />

        {/* AI Analysis Panel */}
        <AIAnalysisPanel
          project={currentProject}
          onSuggestionApply={(suggestion) => {
            // Analysis suggestions are informational only
            console.log('Analysis suggestion clicked (informational only):', suggestion);
          }}
          data-testid="ai-analysis-panel"
        />

        {/* Resizer */}
        <div className="w-1 bg-border hover:bg-primary cursor-col-resize transition-colors" />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-card border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <i className="fas fa-code text-primary-foreground text-sm"></i>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground" data-testid="app-title">
                    CodeStruct AI
                  </h1>
                  <div className="text-xs text-muted-foreground">
                    Intelligent Code Analysis & Structuring
                  </div>
                </div>
              </div>
              
              <div className="h-6 w-px bg-border"></div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Project:</span>
                <span className="text-sm font-medium" data-testid="current-project-name">
                  {currentProject?.name || "No project selected"}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setShowSubscription(true)}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                data-testid="button-upgrade"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Pro
              </Button>
              <Button
                variant="secondary"
                data-testid="button-settings"
              >
                <Settings className="w-4 h-4 mr-1" />
                Settings
              </Button>
            </div>
          </header>

          {/* Code Editor */}
          <CodeEditor
            selectedFile={selectedFile}
            onDiffGenerated={setDiffData}
            data-testid="code-editor"
          />
        </div>

        {/* Diff Preview */}
        <DiffPreview
          data={diffData}
          onApplyChanges={(changes) => {
            // Handle applying changes
            setDiffData(null);
          }}
          onRejectChanges={() => setDiffData(null)}
          data-testid="diff-preview"
        />
      </div>

      {/* Status Bar */}
      <StatusBar user={user} project={currentProject} data-testid="status-bar" />

      {/* Modals */}
      <SubscriptionModal
        open={showSubscription}
        onClose={() => setShowSubscription(false)}
        data-testid="subscription-modal"
      />
      
      <ProcessingModal
        open={isProcessing}
        onClose={() => setIsProcessing(false)}
        data-testid="processing-modal"
      />
    </div>
  );
}
