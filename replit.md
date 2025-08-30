# CodeStruct AI

## Overview

CodeStruct AI is an AI-powered code structuring and commenting extension designed to analyze, restructure, clean, and document codebases across multiple programming languages. The application provides automated documentation generation, codebase analysis, and intelligent code improvements through a modern web interface.

The system enables developers to maintain clean, understandable codebases by detecting architectural patterns, identifying code issues, and suggesting improvements. It supports multiple programming languages including JavaScript, TypeScript, Python, Java, C++, and more, with a focus on providing consistent architecture enforcement and best practice recommendations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side is built using **React 18** with **TypeScript** in a modern component-based architecture. The application uses **Vite** as the build tool and development server, providing fast hot module replacement and optimized builds.

**UI Framework**: The interface is built with **shadcn/ui** components using **Radix UI** primitives, providing accessible and customizable components styled with **Tailwind CSS**. The design system follows a "new-york" style configuration with CSS variables for theming support.

**State Management**: Uses **TanStack Query (React Query)** for server state management, providing efficient data fetching, caching, and synchronization. Local component state is managed with React hooks.

**Routing**: Implements client-side routing with **wouter**, a lightweight routing library suitable for the application's simple navigation needs.

**Styling**: Employs **Tailwind CSS** for utility-first styling with a custom design system that supports both light and dark themes through CSS variables.

### Backend Architecture
The server follows an **Express.js** RESTful API architecture with **TypeScript** for type safety. The application uses an **ESM** (ES Modules) setup for modern JavaScript module handling.

**API Design**: RESTful endpoints organized under `/api` routes with proper HTTP status codes and JSON responses. The API handles file uploads using **multer** for processing codebase files.

**Request Handling**: Implements middleware for request logging, error handling, and JSON parsing. Custom logging captures API response times and payloads for debugging.

**Development Integration**: Uses Vite's middleware mode in development for seamless full-stack development with hot reloading.

### Data Storage Solutions
The application uses **Drizzle ORM** with **PostgreSQL** as the primary database solution, specifically configured for **Neon Database** integration through the `@neondatabase/serverless` driver.

**Schema Design**: Implements a relational schema with tables for users, projects, project files, and analysis results. Uses UUID primary keys and proper foreign key relationships.

**Storage Abstraction**: Includes both database and in-memory storage implementations through an `IStorage` interface, allowing for flexible storage backends during development and testing.

**Migration Management**: Uses Drizzle Kit for database migrations and schema management with TypeScript-first approach.

### Authentication and Authorization
Currently implements a **demo user system** for development and testing purposes. The architecture is prepared for full authentication implementation with user management capabilities built into the schema.

**Session Handling**: Uses **connect-pg-simple** for PostgreSQL-based session storage, providing persistent session management.

**User Management**: Supports user creation, subscription tier management, and trial period tracking in the database schema.

### External Service Integrations

**OpenAI Integration**: Core AI functionality powered by **OpenAI's GPT models** for code analysis, documentation generation, and improvement suggestions. The service handles:
- Codebase analysis and language detection
- Architecture pattern recognition
- Issue identification and severity classification
- Code improvement suggestions and documentation generation

**File Processing**: Supports multiple file formats and programming languages through file extension detection and content analysis. The system can process various code files and extract meaningful insights.

**Development Tools**: Integrates with **Replit-specific tooling** including error overlays, cartographer for development, and deployment banners for the Replit environment.

The architecture follows modern full-stack practices with clear separation of concerns, type safety throughout the stack, and scalable patterns for future feature additions.