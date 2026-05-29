# Project Context & Architecture

This file provides architectural context and design guidelines for AI agents and developers working on the Botify project (V4).

## 📌 Technology Stack

*   **Frontend**: React (Vite) SPA located in `client/src/`. Built output is served from `client/dist/` by the Express backend.
*   **Styling**: Custom CSS with CSS variables for theming. Avoid TailwindCSS unless explicitly requested.
*   **Backend**: Node.js + Express, MVC architecture. Entry point: `server/server.js`. App setup: `server/app.js`.
*   **Database**: **Supabase** (PostgreSQL) as the primary Multi-Tenant database. **Google Sheets** supported as a fallback/sync target.
*   **State Management**: `ioredis` for distributed caching (chat history, message queue debouncing) with an in-memory `Map` fallback via `server/utils/redis.js`.
*   **AI Core**: Agentic Architecture via `callAIAgent` using Native Function Calling in `server/services/aiService.js`. Features an **AI Fallback Chain** (`claude` → `deepseek` → `openai` → `gemini` → `typhoon`) configurable via `AI_FALLBACK_CHAIN` env var.

## 🎨 Design System & Aesthetics

*   **Theme**: Dark Mode / Cyberpunk Aesthetic.
*   **Color Palette**:
    *   Background Deep: `#020617`
    *   Surface: `#0f172a`
    *   Primary (Blue): `#0ea5e9`
    *   Secondary (Purple): `#8b5cf6`
    *   Accent (Orange/Gold): `#f59e0b` / `#fbbf24`
*   **Typography**: 'Kanit' and 'Inter' fonts.
*   **Layout**: SPA — Desktop uses sidebar navigation with split-pane layouts. Mobile uses bottom navigation bar and slide-over chat views.

## 🏢 SaaS Multi-Tenant & Security Architecture

The system is designed for a Multi-Tenant SaaS environment with strict isolation:

*   **Row Level Security (RLS)**: Enforced via `req.auth.shopId` (from JWT) in all backend API routes via `authMW` middleware (`server/middleware/auth.js`). **NEVER** use `req.shopId` (deprecated, insecure).
*   **Workspace Switcher**: Users can have multiple workspaces (Stores). Each workspace operates independently.
*   **Client Loading**: `server/config/globals.js` loads shops dynamically from Supabase `shops` table, applying specific AI models and channel tokens (LINE/FB) per shop. Falls back to `.env` vars (`LINE_TOKEN_1..20`) if DB is unavailable.
*   **Feature Gating & Credits**: Controlled by the `PLAN_CONFIG` object in the React frontend and the database `shops` table. Features like AI Provider Selection are restricted to Super Admins. A **Token/Credit System (`ai_credits`)** governs usage — deducting credits per AI chat (1 token) and per external Slip Verification (5 tokens).
*   **Super Admin Tools**: Global AI model configuration, Prompt Generator (auto-generating System Prompts using high-tier AI), and AI Credit top-up logic are managed within the Super Admin Dashboard.

## 📂 Key Files & Directories

```
server/
├── server.js              # Entry point — starts Express on PORT
├── app.js                 # Express setup, middleware, route registration
├── config/
│   ├── db.js              # Supabase client init
│   └── globals.js         # Multi-tenant client loading & routing maps, AI Fallback Chain
├── middleware/
│   └── auth.js            # JWT auth middleware (authMW)
├── routes/
│   ├── auth.js            # Login, register, JWT
│   ├── api.js             # Dashboard, team, shop settings
│   ├── webhook.js         # LINE & Facebook webhooks
│   ├── payment.js         # Stripe & Omise payment routes
│   ├── admin.js           # Super Admin routes
│   ├── misc.js            # Miscellaneous endpoints
│   └── backup.js          # Backup/export
├── services/
│   ├── aiService.js       # AI Agent: callAIAgent, agentTools, executeTool
│   ├── sheetService.js    # Google Sheets read/write
│   ├── notificationService.js  # Order processing, LINE/FB push notifications
│   └── bookingService.js  # Booking system logic
└── utils/
    ├── helpers.js         # Shared utilities (sanitize, image helpers, etc.)
    └── redis.js           # Cache singleton (Redis + in-memory fallback)

client/
├── src/                   # React source (components, pages, hooks)
├── dist/                  # Production build (served by Express)
└── vite.config.js         # Vite build config

schema.sql                 # Supabase PostgreSQL table definitions
```

*   `schema.sql`: Contains all PostgreSQL table structures (`workspaces`, `products`, `orders`, `promotions`, `documents`, etc.) required for the SaaS platform.
*   `server/services/aiService.js`: Core AI Agent logic — `agentTools` JSON schema and `executeTool()` processor for 10+ native tools.
*   `FEATURES.md`: Full documentation of AI agent capabilities and chatbot operation.
