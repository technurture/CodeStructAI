import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, apiUpload } from "@/lib/queryClient";
import { Search, Folder, FolderOpen, FileText, Upload, AlertCircle } from "lucide-react";

interface FileExplorerProps {
  project: any;
  selectedFile: string | null;
  onFileSelect: (fileId: string) => void;
  onProjectSelect: (projectId: string) => void;
  onProcessingStart: () => void;
}

export default function FileExplorer({
  project,
  selectedFile,
  onFileSelect,
  onProjectSelect,
  onProcessingStart,
}: FileExplorerProps) {
  const [projectName, setProjectName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: files = [] } = useQuery({
    queryKey: ["/api/projects", project?.id, "files"],
    enabled: !!project?.id,
  });

  const typedFiles = Array.isArray(files) ? files : [];

  const createProjectMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/projects", { name });
      return response.json();
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      onProjectSelect(newProject.id);
      setProjectName("");
      toast({
        title: "Success",
        description: "Project created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const uploadFilesMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append("files", file);
      });
      
      const response = await apiUpload("POST", `/api/projects/${project.id}/upload`, formData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success", 
        description: "Files uploaded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive",
      });
    },
  });

  const analyzeProjectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/projects/${project.id}/analyze`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "analysis"] });
      toast({
        title: "Success",
        description: "Project analysis completed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to analyze project",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0 && project) {
      uploadFilesMutation.mutate(files);
    }
  };

  const handleScanProject = () => {
    if (project && typedFiles.length > 0) {
      onProcessingStart();
      analyzeProjectMutation.mutate();
    } else {
      toast({
        title: "Error",
        description: "Please upload files before scanning",
        variant: "destructive",
      });
    }
  };

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  // Organize files into a tree structure
  const fileTree = typedFiles.reduce((tree: any, file: any) => {
    const parts = file.path.split('/');
    let current = tree;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      
      if (!current[part]) {
        current[part] = isFile ? { type: 'file', data: file } : { type: 'folder', children: {} };
      }
      
      if (!isFile) {
        current = current[part].children;
      }
    }
    
    return tree;
  }, {});

  const renderFileTree = (tree: any, path = "") => {
    return Object.entries(tree).map(([name, node]: [string, any]) => {
      const fullPath = path ? `${path}/${name}` : name;
      const isExpanded = expandedFolders.has(fullPath);
      
      if (node.type === 'file') {
        const isSelected = selectedFile === node.data.id;
        const hasIssues = Math.random() > 0.7; // Mock issues for demo
        
        return (
          <div
            key={node.data.id}
            className={`tree-item p-2 rounded cursor-pointer flex items-center text-sm transition-colors ${
              isSelected ? 'bg-muted/30' : 'hover:bg-muted/20'
            }`}
            onClick={() => onFileSelect(node.data.id)}
            data-testid={`file-${node.data.id}`}
          >
            <FileText className="w-4 h-4 mr-2 text-blue-400" />
            <span className="flex-1">{name}</span>
            {hasIssues && (
              <span className="ml-auto text-xs bg-destructive/20 text-destructive px-2 py-1 rounded">
                Issues
              </span>
            )}
          </div>
        );
      } else {
        return (
          <div key={fullPath}>
            <div
              className="tree-item p-2 rounded cursor-pointer flex items-center text-sm hover:bg-muted/20 transition-colors"
              onClick={() => toggleFolder(fullPath)}
              data-testid={`folder-${fullPath}`}
            >
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 mr-2 text-accent" />
              ) : (
                <Folder className="w-4 h-4 mr-2 text-accent" />
              )}
              <span>{name}/</span>
            </div>
            {isExpanded && (
              <div className="ml-4">
                {renderFileTree(node.children, fullPath)}
              </div>
            )}
          </div>
        );
      }
    });
  };

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center">
            <Folder className="w-4 h-4 mr-2 text-accent" />
            PROJECT EXPLORER
          </h2>
        </div>
        
        {!project ? (
          <div className="space-y-3">
            <Input
              placeholder="Project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              data-testid="input-project-name"
            />
            <Button
              onClick={() => createProjectMutation.mutate(projectName)}
              disabled={!projectName || createProjectMutation.isPending}
              className="w-full"
              data-testid="button-create-project"
            >
              Create Project
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                onClick={handleScanProject}
                disabled={analyzeProjectMutation.isPending || typedFiles.length === 0}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="button-scan-project"
              >
                <Search className="w-4 h-4 mr-2" />
                Scan Project
              </Button>
            </div>
            
            <div className="relative">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                data-testid="input-file-upload"
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={uploadFilesMutation.isPending}
                data-testid="button-upload-files"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
            </div>
            
            {/* Project Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/50 p-2 rounded">
                <div className="text-muted-foreground">Files</div>
                <div className="font-semibold text-foreground" data-testid="stat-file-count">
                  {project.fileCount || 0}
                </div>
              </div>
              <div className="bg-muted/50 p-2 rounded">
                <div className="text-muted-foreground">Languages</div>
                <div className="font-semibold text-foreground" data-testid="stat-language-count">
                  {project.languageCount || 0}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-2" data-testid="file-tree">
        {typedFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <FileText className="w-8 h-8 mb-2" />
            <p className="text-sm">No files uploaded</p>
            <p className="text-xs">Upload files to get started</p>
          </div>
        ) : (
          <div className="space-y-1">
            {renderFileTree(fileTree)}
          </div>
        )}
      </div>
    </div>
  );
}
