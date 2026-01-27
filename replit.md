# Anglo Strata - Layers of Data

## Overview

Anglo Strata is a modern ChatGPT-style chat interface for connecting to Databricks serving endpoints and AI agents, branded for Anglo American mining operations. The application provides conversational AI with support for foundation models, custom models, and intelligent agents, featuring domain-specific contexts (Mining Operations, Geological Services, etc.) and site-specific configurations across 11 global mining locations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Dual Backend Architecture
The application uses a hybrid Node.js/Python architecture:
- **Node.js (Express)** serves as the primary entry point and handles static file serving, Vite dev server integration, and proxies API requests to the Python backend
- **FastAPI (Python)** handles all `/api/*` routes with business logic, database operations, and external integrations
- The Node.js server spawns the FastAPI process on startup and proxies requests to `localhost:8000`

### Frontend Architecture
- **React + TypeScript** single-page application using Vite as the build tool
- **Wouter** for client-side routing (lightweight alternative to React Router)
- **TanStack Query** for server state management and API data fetching
- **shadcn/ui** component library built on Radix UI primitives with Tailwind CSS
- Path aliases: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Data Layer
- **Drizzle ORM** with PostgreSQL for database operations (schema in `shared/schema.ts`)
- **Zod** schemas for runtime validation, shared between frontend and backend
- Storage abstraction layer (`IStorage` interface) supporting:
  - In-memory storage for development
  - PostgreSQL via Drizzle
  - Databricks LakeBase for enterprise deployments

### Key Domain Concepts
- **Conversations**: Chat sessions with message history, linked to endpoints, domains, and sites
- **Domains**: Business area specializations (7 total) with custom system prompts
- **Sites**: Physical mining locations (11 sites) providing context for AI responses
- **Endpoints**: AI model configurations (foundation, custom, agent types)

### Styling Approach
- Tailwind CSS with CSS custom properties for theming
- Light/dark mode support with Anglo American brand colors (Deep Blue #143482, Red #FF0000)
- Component-level styling using `class-variance-authority` for variants

## External Dependencies

### Databricks Integration
- **@databricks/sql**: SQL warehouse connectivity for LakeBase storage
- OAuth 2.0 authentication with service principal credentials (`DATABRICKS_CLIENT_ID`, `DATABRICKS_CLIENT_SECRET`)
- Environment variables: `DATABRICKS_HOST`, `DATABRICKS_HTTP_PATH`, `DATABRICKS_CATALOG`, `DATABRICKS_SCHEMA`

### Database
- PostgreSQL via `DATABASE_URL` environment variable
- Drizzle Kit for schema migrations (`npm run db:push`)
- Session storage with `connect-pg-simple`

### Build & Development
- Vite for frontend bundling with React plugin
- esbuild for server-side bundling (production builds)
- TSX for TypeScript execution in development
- Replit-specific plugins for dev environment integration