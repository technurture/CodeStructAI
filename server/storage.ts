import { type User, type InsertUser, type Project, type InsertProject, type ProjectFile, type InsertProjectFile, type AnalysisResult } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  // Project operations
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByUser(userId: string): Promise<Project[]>;
  createProject(userId: string, project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  
  // Project file operations
  getProjectFiles(projectId: string): Promise<ProjectFile[]>;
  getProjectFile(id: string): Promise<ProjectFile | undefined>;
  createProjectFile(projectId: string, file: InsertProjectFile): Promise<ProjectFile>;
  updateProjectFile(id: string, updates: Partial<ProjectFile>): Promise<ProjectFile | undefined>;
  deleteProjectFile(id: string): Promise<boolean>;
  deleteProjectFiles(projectId: string): Promise<boolean>;
  
  // Analysis operations
  getLatestAnalysis(projectId: string): Promise<AnalysisResult | undefined>;
  createAnalysis(projectId: string, analysis: Omit<AnalysisResult, 'id' | 'projectId' | 'createdAt'>): Promise<AnalysisResult>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private projects: Map<string, Project> = new Map();
  private projectFiles: Map<string, ProjectFile> = new Map();
  private analysisResults: Map<string, AnalysisResult> = new Map();

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    
    const user: User = {
      ...insertUser,
      id,
      subscriptionTier: "trial",
      trialEndsAt,
      createdAt: now,
    };
    
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Project operations
  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(project => project.userId === userId);
  }

  async createProject(userId: string, insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const project: Project = {
      ...insertProject,
      id,
      userId,
      fileCount: 0,
      languageCount: 0,
      lastScanAt: null,
      linesProcessed: 0,
      createdAt: new Date(),
    };
    
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject = { ...project, ...updates };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    // Also delete associated files and analysis
    await this.deleteProjectFiles(id);
    Array.from(this.analysisResults.keys())
      .filter(key => this.analysisResults.get(key)?.projectId === id)
      .forEach(key => this.analysisResults.delete(key));
    
    return this.projects.delete(id);
  }

  // Project file operations
  async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    return Array.from(this.projectFiles.values()).filter(file => file.projectId === projectId);
  }

  async getProjectFile(id: string): Promise<ProjectFile | undefined> {
    return this.projectFiles.get(id);
  }

  async createProjectFile(projectId: string, insertFile: InsertProjectFile): Promise<ProjectFile> {
    const id = randomUUID();
    const file: ProjectFile = {
      ...insertFile,
      id,
      projectId,
      size: insertFile.size ?? null,
      language: insertFile.language ?? null,
      createdAt: new Date(),
    };
    
    this.projectFiles.set(id, file);
    return file;
  }

  async updateProjectFile(id: string, updates: Partial<ProjectFile>): Promise<ProjectFile | undefined> {
    const file = this.projectFiles.get(id);
    if (!file) return undefined;
    
    const updatedFile = { ...file, ...updates };
    this.projectFiles.set(id, updatedFile);
    return updatedFile;
  }

  async deleteProjectFile(id: string): Promise<boolean> {
    return this.projectFiles.delete(id);
  }

  async deleteProjectFiles(projectId: string): Promise<boolean> {
    const filesToDelete = Array.from(this.projectFiles.keys())
      .filter(key => this.projectFiles.get(key)?.projectId === projectId);
    
    filesToDelete.forEach(key => this.projectFiles.delete(key));
    return true;
  }

  // Analysis operations
  async getLatestAnalysis(projectId: string): Promise<AnalysisResult | undefined> {
    const analyses = Array.from(this.analysisResults.values())
      .filter(analysis => analysis.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    
    return analyses[0];
  }

  async createAnalysis(projectId: string, analysisData: Omit<AnalysisResult, 'id' | 'projectId' | 'createdAt'>): Promise<AnalysisResult> {
    const id = randomUUID();
    const analysis: AnalysisResult = {
      ...analysisData,
      id,
      projectId,
      createdAt: new Date(),
    };
    
    this.analysisResults.set(id, analysis);
    return analysis;
  }
}

export const storage = new MemStorage();
