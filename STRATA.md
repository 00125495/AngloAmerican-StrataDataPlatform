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

### Admin Configuration
The Settings dialog includes admin tabs for managing domains and endpoints:
- **Domains Tab**: Add, edit, or delete business domains with custom system prompts
- **Endpoints Tab**: Add, edit, or delete custom AI endpoints (agents, foundation models, custom models)
- Custom endpoints can be linked to specific domains for specialized functionality
- Storage-based endpoints are merged with Databricks endpoints when both are available

## User Preferences

Preferred communication style: Simple, everyday language.

## Branding

- **App Name**: Anglo Strata
- **Tagline**: Layers of Data
- **Primary Color**: Anglo American Deep Blue (#143482)
- **Theme**: Professional deep blue color scheme with light/dark mode support

## Databricks Deployment Notes

When deployed as a Databricks App:
- **Authentication**: Handled automatically by Databricks environment using OAuth 2.0 (dual-identity model)
  - App Authorization: Each app gets a dedicated service principal with credentials auto-injected as `DATABRICKS_CLIENT_ID` and `DATABRICKS_CLIENT_SECRET`
  - User Authorization (Preview): Apps can act on behalf of users with their Unity Catalog permissions
- **Endpoints**: Dynamically fetched from `/api/2.0/serving-endpoints` based on user permissions
- **Environment Variables**: 
  - `DATABRICKS_HOST` - Set automatically by Databricks Apps runtime
  - `DATABRICKS_TOKEN` - Set automatically via OAuth/PAT (or use client_id/secret)

### User Authorization Pattern
The app uses Databricks' user authorization pattern to respect individual user permissions:

**Headers from Databricks Proxy**:
- `X-Forwarded-Email`: User's email address
- `X-Forwarded-Access-Token`: User's OAuth access token

**Implementation**:
1. `backend/user_context.py` extracts user context from request headers
2. User's token is used for listing/calling serving endpoints (respects Unity Catalog permissions)
3. Service principal credentials are used for backend storage operations
4. `/api/user` endpoint returns current user information for the UI

**Token Priority**:
- User token (from headers) is preferred for API calls when available
- Falls back to service principal token when user token is not available
- In development (Replit), mock endpoints are shown since no headers are provided

## LakeBase Integration

The app supports persistent storage via Databricks LakeBase (Unity Catalog tables).

### Environment Variables for LakeBase
Configure these to enable LakeBase storage:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABRICKS_SERVER_HOSTNAME` | Yes | - | Databricks workspace hostname (e.g., `adb-xxxx.azuredatabricks.net`) |
| `DATABRICKS_HTTP_PATH` | Yes | - | SQL warehouse HTTP path (e.g., `/sql/1.0/warehouses/xxxx`) |
| `DATABRICKS_CATALOG` | No | `main` | Unity Catalog name |
| `DATABRICKS_SCHEMA` | No | `anglo_strata` | Schema name for tables |
| `DATABRICKS_TOKEN` | * | - | Personal Access Token (alternative to OAuth) |
| `DATABRICKS_CLIENT_ID` | * | - | OAuth client ID (auto-set in Databricks Apps) |
| `DATABRICKS_CLIENT_SECRET` | * | - | OAuth client secret (auto-set in Databricks Apps) |

*Either TOKEN or CLIENT_ID+CLIENT_SECRET required for authentication

### LakeBase Tables
When connected, these tables are automatically created:
- `conversations` - Chat conversation metadata
- `messages` - Individual messages within conversations
- `domains` - Business domain configurations
- `sites` - Mining site definitions
- `endpoints` - Custom AI endpoint definitions
- `user_config` - User preferences

### Fallback Behavior
If LakeBase credentials are not configured or connection fails, the app automatically falls back to in-memory storage. This allows local development without a Databricks connection.

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
- **Runtime**: Python 3.11 with FastAPI (production-ready for Databricks deployment)
- **Development Server**: Node.js with Express 5 proxies API requests to FastAPI on port 8000
- **API Design**: RESTful endpoints under `/api/` prefix
- **Storage**: Dual-mode storage with automatic fallback
  - LakeBase (Unity Catalog tables) when Databricks credentials available
  - In-memory storage (MemStorage class) for local development

Key backend files:
- `backend/main.py` - FastAPI application with all API routes
- `backend/models.py` - Pydantic models matching TypeScript types
- `backend/storage.py` - In-memory storage implementation
- `backend/lakebase_storage.py` - Databricks LakeBase storage implementation

Key API endpoints:
- `GET /api/endpoints` - List available AI endpoints (fetches from Databricks if credentials available)
- `GET /api/domains` - List business domains
- `GET /api/sites` - List mining sites
- `GET/POST /api/conversations` - Manage conversations
- `POST /api/chat` - Send messages and receive AI responses (with conversation context)
- `GET/POST /api/config` - Application configuration
- `POST /api/domains`, `POST /api/endpoints` - Admin CRUD operations

### Development vs Production Architecture
- **Development**: Node.js (port 5000) spawns FastAPI (port 8000), serves Vite HMR, proxies /api/* requests
- **Production**: FastAPI serves everything directly (static files + API), optimized for Databricks Apps runtime

### Data Storage
- **Current**: Dual-mode storage with automatic detection
- **LakeBase**: Unity Catalog tables with databricks-sql-connector when credentials available
- **Fallback**: In-memory storage using Python dicts for local development
- **Validation**: Pydantic models in `backend/models.py` for type-safe data handling

The storage interface abstracts data operations, automatically using LakeBase when Databricks credentials are detected.

### Shared Code
- `shared/schema.ts` - TypeScript Zod schemas (frontend validation)
- `backend/models.py` - Python Pydantic models (backend validation)
Both define matching structures for:
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

### UI Framework (Frontend)
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **shadcn/ui**: Pre-styled component collection using Radix + Tailwind
- **Lucide React**: Icon library

### Data & State (Frontend)
- **TanStack Query**: Server state management with caching
- **Zod**: Runtime type validation

### Backend (Python)
- **FastAPI**: Modern, fast web framework for building APIs
- **uvicorn**: ASGI server for production deployment
- **Pydantic**: Data validation using Python type annotations
- **databricks-sql-connector**: Connect to Databricks SQL warehouses and LakeBase
- **httpx**: Async HTTP client for Databricks API calls

### Build & Development
- **Vite**: Frontend build tool with HMR
- **tsx**: TypeScript execution for Node.js development server
- **TypeScript**: Type checking for frontend and development server
