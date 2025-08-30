import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  subscriptionTier: text("subscription_tier").notNull().default("trial"),
  trialEndsAt: timestamp("trial_ends_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  fileCount: integer("file_count").default(0),
  languageCount: integer("language_count").default(0),
  lastScanAt: timestamp("last_scan_at"),
  linesProcessed: integer("lines_processed").default(0),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const projectFiles = pgTable("project_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  path: text("path").notNull(),
  content: text("content").notNull(),
  language: text("language"),
  size: integer("size"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const analysisResults = pgTable("analysis_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  detectedLanguages: json("detected_languages").$type<Record<string, number>>(),
  architecture: text("architecture"),
  issues: json("issues").$type<Array<{
    type: string;
    severity: "high" | "medium" | "low";
    file: string;
    description: string;
    line?: number;
  }>>(),
  suggestions: json("suggestions").$type<Array<{
    type: string;
    title: string;
    description: string;
    file?: string;
    changes?: string;
  }>>(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
});

export const insertProjectFileSchema = createInsertSchema(projectFiles).pick({
  path: true,
  content: true,
  language: true,
  size: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;
export type ProjectFile = typeof projectFiles.$inferSelect;
export type AnalysisResult = typeof analysisResults.$inferSelect;
