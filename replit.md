# Anglo Strata - Layers of Data

## Overview

A modern ChatGPT-style chat interface for connecting to Databricks serving endpoints and AI agents. Branded for Anglo American, the application provides conversational AI with support for foundation models, custom models, and agents. Users can manage multiple conversations, select different AI endpoints based on their access permissions, and configure system prompts.

## Domain & Site Configuration

The app features domain-based specialization and site-specific context:

### Business Domains (7 total)
- Mining Operations, Geological Services, Mineral Processing
- Sustainability & ESG, Supply Chain, Finance & Analytics, General Assistant

### Mining Sites (11 sites across global locations)
- **South Africa**: Kumba, Sishen, Mogalakwena, Unki, Amandelbult
- **South America**: Quellaveco (Peru), Minas-Rio (Brazil), Los Bronces (Chile)
- **Australia**: Moranbah (Queensland)
- **Europe**: Sakatti (Finland), Woodsmith (UK)

### How It Works
- Domain and Site selectors appear in the header for quick switching
- Settings dialog allows configuring defaults for domain, site, and model
- Site context is automatically appended to system prompts when a specific site is selected
- Conversations store the domainId and siteId for context preservation

## User Preferences

Preferred communication style: Simple, everyday language.

## Branding

- **App Name**: Anglo Strata
- **Tagline**: Layers of Data
- **Primary Color**: Anglo American Deep Blue (#143482)
- **Theme**: Professional deep blue color scheme with light/dark mode support

## Databricks Deployment Notes

When deployed as a Databricks App:
- **Authentication**: Handled automatically by Databricks environment (no workspace URL configuration needed)
- **Endpoints**: Dynamically fetched from `/api/2.0/serving-endpoints` based on user permissions
- **Environment Variables**: 
  - `DATABRICKS_HOST` - Set automatically by Databricks Apps runtime
  - `DATABRICKS_TOKEN` - Set automatically via OAuth/PAT
- **LakeBase Integration**: Storage schema designed for easy migration to LakeBase tables

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite for development and production builds

The frontend follows a component-based architecture with:
- Pages in `client/src/pages/` (chat interface, 404)
- Reusable components in `client/src/components/`
- UI primitives in `client/src/components/ui/`
- Custom hooks in `client/src/hooks/`

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript compiled with tsx
- **API Design**: RESTful endpoints under `/api/` prefix
- **Storage**: In-memory storage (MemStorage class) with interface for LakeBase migration

Key API endpoints:
- `GET /api/endpoints` - List available AI endpoints (fetches from Databricks if credentials available)
- `GET /api/domains` - List business domains
- `GET /api/sites` - List mining sites
- `GET/POST /api/conversations` - Manage conversations
- `POST /api/chat` - Send messages and receive AI responses (with conversation context)
- `GET/POST /api/config` - Application configuration

### Data Storage
- **Current**: In-memory storage using Map collections
- **Future**: LakeBase tables for persistent storage
- **Validation**: Zod schemas in `shared/schema.ts` for type-safe data handling

The storage interface (`IStorage`) abstracts data operations, allowing easy migration from memory to LakeBase when deployed.

### Shared Code
- `shared/schema.ts` contains Zod schemas defining:
  - Message structure (id, role, content, timestamp)
  - Conversation structure with message history
  - Endpoint definitions (foundation, custom, agent types)
  - Chat request/response formats
  - Configuration options (defaultEndpointId, systemPrompt)

## LakeBase Migration Schema

For production deployment, create these tables in LakeBase:

```sql
-- Conversations table
CREATE TABLE conversations (
  id STRING PRIMARY KEY,
  title STRING,
  endpoint_id STRING,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Messages table
CREATE TABLE messages (
  id STRING PRIMARY KEY,
  conversation_id STRING REFERENCES conversations(id),
  role STRING, -- 'user', 'assistant', 'system'
  content STRING,
  timestamp TIMESTAMP
);

-- User config table
CREATE TABLE user_config (
  user_id STRING PRIMARY KEY,
  default_endpoint_id STRING,
  system_prompt STRING
);
```

## External Dependencies

### UI Framework
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **shadcn/ui**: Pre-styled component collection using Radix + Tailwind
- **Lucide React**: Icon library

### Data & State
- **TanStack Query**: Server state management with caching
- **Zod**: Runtime type validation

### Build & Development
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server bundling for production
- **TypeScript**: Type checking across the stack
