import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeCodebase, generateDocumentation, suggestCodeImprovements } from "./services/openai";
import { insertUserSchema, insertProjectSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import paystack from "paystack";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 50 // max 50 files
  }
});

// Initialize Paystack when needed
function getPaystackClient() {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    throw new Error('Missing required Paystack secret: PAYSTACK_SECRET_KEY');
  }
  return paystack(process.env.PAYSTACK_SECRET_KEY);
}

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
      
      console.log("Upload request - Project ID:", projectId);
      console.log("Upload request - Files received:", files?.length || 0);
      console.log("Upload request - Body:", req.body);
      console.log("Upload request - Files details:", files?.map(f => ({ name: f.originalname, size: f.size })));
      console.log("Upload request - Headers:", req.headers);
      
      if (!files || files.length === 0) {
        console.log("Upload error: No files received");
        console.log("Request content type:", req.headers['content-type']);
        return res.status(400).json({ message: "No files uploaded - check if files are being sent correctly" });
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
        language: file.language || 'text',
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

      const documented = await generateDocumentation([{
        path: file.path,
        content: file.content,
        language: file.language || 'text'
      }]);
      
      res.json({
        original: file.content,
        documented,
        changes: [
          {
            type: "addition",
            description: "Added comprehensive documentation and comments",
          }
        ],
        file: {
          id: file.id,
          path: file.path,
          language: file.language
        }
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

      const improvements = await suggestCodeImprovements([{
        path: file.path,
        content: file.content,
        language: file.language || 'text'
      }]);
      
      res.json({
        original: file.content,
        improved: improvements,
        changes: [
          {
            type: "improvement",
            description: "Applied AI-suggested code improvements",
          }
        ],
        file: {
          id: file.id,
          path: file.path,
          language: file.language
        }
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

  // Paystack payment routes
  app.post("/api/create-payment", async (req, res) => {
    try {
      const { email, amount } = req.body;
      const paystack = getPaystackClient();
      
      const params = {
        email,
        amount: amount * 100, // Convert to kobo (Paystack's smallest unit)
        currency: 'NGN',
        reference: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: email.split('@')[0]
      };
      
      const response = await paystack.transaction.initialize(params);
      res.json({ 
        authorizationUrl: response.data.authorization_url,
        reference: response.data.reference 
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment: " + error.message });
    }
  });

  app.post("/api/verify-payment", async (req, res) => {
    try {
      const { reference } = req.body;
      const paystack = getPaystackClient();
      
      const response = await paystack.transaction.verify(reference);
      
      if (response.data.status === 'success') {
        res.json({ status: 'success', data: response.data });
      } else {
        res.json({ status: 'failed', message: 'Payment verification failed' });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Error verifying payment: " + error.message });
    }
  });

  // Extension authentication endpoints
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // For demo purposes - simplified authentication
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // In production, properly hash and verify passwords
      if (password !== 'demo123') {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          subscriptionTier: user.subscriptionTier,
          trialEndsAt: user.trialEndsAt 
        } 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email } = insertUserSchema.parse(req.body);
      
      const user = await storage.createUser({ 
        username, 
        email
      });
      
      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          subscriptionTier: user.subscriptionTier,
          trialEndsAt: user.trialEndsAt 
        } 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/user/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          subscriptionTier: user.subscriptionTier,
          trialEndsAt: user.trialEndsAt 
        } 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Extension-specific endpoints
  app.post("/api/extension/register", async (req, res) => {
    try {
      // Create anonymous trial user for extension
      const user = await storage.createUser({ 
        username: `ext_user_${Date.now()}`,
        email: `ext_${Date.now()}@codestruct.ai`
      });
      
      // Return user ID as token for simplicity
      res.json({ token: user.id });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/extension/subscription", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }
      
      const user = await storage.getUser(token);
      if (!user) {
        return res.status(401).json({ message: "Invalid token" });
      }
      
      const now = new Date();
      const trialExpired = user.trialEndsAt ? now > user.trialEndsAt : true;
      
      res.json({
        status: user.subscriptionTier,
        trialExpired: trialExpired && user.subscriptionTier === 'trial',
        trialEndsAt: user.trialEndsAt
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/extension/analyze", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }
      
      const user = await storage.getUser(token);
      if (!user) {
        return res.status(401).json({ message: "Invalid token" });
      }
      
      // Check subscription status
      const now = new Date();
      const trialExpired = user.trialEndsAt ? now > user.trialEndsAt : true;
      if (trialExpired && user.subscriptionTier === 'trial') {
        return res.status(403).json({ message: "Trial expired. Please upgrade to Pro." });
      }
      
      const { files } = req.body;
      const analysis = await analyzeCodebase(files);
      
      res.json(analysis);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/extension/analyze-file", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }
      
      const user = await storage.getUser(token);
      if (!user) {
        return res.status(401).json({ message: "Invalid token" });
      }
      
      const { content, fileName } = req.body;
      const analysis = await analyzeCodebase([{ path: fileName, content, language: detectLanguage(fileName) || 'text' }]);
      
      res.json(analysis);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/extension/generate-docs", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }
      
      const { content, fileName } = req.body;
      const documented = await generateDocumentation([{
        path: fileName,
        content,
        language: detectLanguage(fileName) || 'text'
      }]);
      
      res.json({ documented });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/extension/improve", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }
      
      const { content, fileName } = req.body;
      const improvements = await suggestCodeImprovements([{
        path: fileName,
        content,
        language: detectLanguage(fileName) || 'text'
      }]);
      
      res.json(improvements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
