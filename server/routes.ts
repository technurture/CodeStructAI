import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeCodebase, generateDocumentation, suggestCodeImprovements } from "./services/openai";
import { insertUserSchema, insertProjectSchema } from "@shared/schema";
import multer from "multer";
import path from "path";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Helper function to detect language from file extension
  function detectLanguage(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.go': 'go',
      '.php': 'php',
      '.rb': 'ruby',
      '.rs': 'rust',
      '.kt': 'kotlin',
      '.swift': 'swift',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.json': 'json',
      '.xml': 'xml',
      '.yml': 'yaml',
      '.yaml': 'yaml',
    };
    return languageMap[ext] || 'text';
  }

  // Create demo user if not exists
  let demoUser = await storage.getUserByEmail("demo@codestruct.ai");
  if (!demoUser) {
    demoUser = await storage.createUser({
      username: "demo",
      email: "demo@codestruct.ai"
    });
  }

  // User routes
  app.get("/api/user", async (req, res) => {
    try {
      res.json(demoUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Project routes
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjectsByUser(demoUser!.id);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to get projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(demoUser!.id, projectData);
      res.json(project);
    } catch (error) {
      res.status(400).json({ message: "Invalid project data" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to get project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProject(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json({ message: "Project deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // File upload route
  app.post("/api/projects/:id/upload", upload.array("files"), async (req, res) => {
    try {
      const projectId = req.params.id;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Clear existing files
      await storage.deleteProjectFiles(projectId);

      const uploadedFiles = [];
      let totalLines = 0;

      for (const file of files) {
        const content = file.buffer.toString('utf-8');
        const language = detectLanguage(file.originalname);
        const lines = content.split('\n').length;
        totalLines += lines;

        const projectFile = await storage.createProjectFile(projectId, {
          path: file.originalname,
          content,
          language,
          size: file.size,
        });

        uploadedFiles.push(projectFile);
      }

      // Update project stats
      const languageSet = new Set(uploadedFiles.map(f => f.language).filter(Boolean));
      await storage.updateProject(projectId, {
        fileCount: uploadedFiles.length,
        languageCount: languageSet.size,
        linesProcessed: totalLines,
        lastScanAt: new Date(),
      });

      res.json({
        message: "Files uploaded successfully",
        fileCount: uploadedFiles.length,
        languageCount: languageSet.size,
        linesProcessed: totalLines,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload files" });
    }
  });

  // Get project files
  app.get("/api/projects/:id/files", async (req, res) => {
    try {
      const files = await storage.getProjectFiles(req.params.id);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to get project files" });
    }
  });

  // Get specific file
  app.get("/api/files/:id", async (req, res) => {
    try {
      const file = await storage.getProjectFile(req.params.id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ message: "Failed to get file" });
    }
  });

  // Analyze project
  app.post("/api/projects/:id/analyze", async (req, res) => {
    try {
      const projectId = req.params.id;
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const files = await storage.getProjectFiles(projectId);
      
      if (files.length === 0) {
        return res.status(400).json({ message: "No files to analyze" });
      }

      // Prepare files for analysis
      const fileData = files.map(file => ({
        path: file.path,
        content: file.content,
        language: file.language || undefined,
      }));

      // Run AI analysis
      const analysisResult = await analyzeCodebase(fileData);

      // Store analysis results
      const analysis = await storage.createAnalysis(projectId, analysisResult);

      res.json(analysis);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ message: "Failed to analyze project: " + (error as Error).message });
    }
  });

  // Get latest analysis
  app.get("/api/projects/:id/analysis", async (req, res) => {
    try {
      const analysis = await storage.getLatestAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ message: "No analysis found" });
      }
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: "Failed to get analysis" });
    }
  });

  // Generate documentation for a file
  app.post("/api/files/:id/document", async (req, res) => {
    try {
      const file = await storage.getProjectFile(req.params.id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const documented = await generateDocumentation(file.content, file.path);
      
      res.json({
        original: file.content,
        documented,
        changes: [
          {
            type: "addition",
            description: "Added comprehensive documentation and comments",
          }
        ]
      });
    } catch (error) {
      console.error("Documentation error:", error);
      res.status(500).json({ message: "Failed to generate documentation: " + (error as Error).message });
    }
  });

  // Suggest improvements for a file
  app.post("/api/files/:id/improve", async (req, res) => {
    try {
      const file = await storage.getProjectFile(req.params.id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const improvements = await suggestCodeImprovements(file.content, file.path);
      
      res.json({
        original: file.content,
        improved: improvements.improved,
        changes: improvements.changes,
      });
    } catch (error) {
      console.error("Improvement error:", error);
      res.status(500).json({ message: "Failed to suggest improvements: " + (error as Error).message });
    }
  });

  // Apply changes to a file
  app.patch("/api/files/:id", async (req, res) => {
    try {
      const { content } = req.body;
      const file = await storage.updateProjectFile(req.params.id, { content });
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      res.json(file);
    } catch (error) {
      res.status(500).json({ message: "Failed to update file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
