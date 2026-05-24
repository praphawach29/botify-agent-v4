# Project Context & Architecture

This file provides architectural context and design guidelines for AI agents and developers working on the Botify project.

## 📌 Technology Stack

*   **Frontend**: Vanilla HTML5, CSS3, JavaScript. (Planned migration to React/Next.js).
*   **Styling**: Custom CSS (Vanilla). Avoid TailwindCSS unless explicitly requested. We rely on CSS variables for theming.
*   **Backend / Database**: Node.js (`server.js`) currently handling external APIs. Planned migration to **Supabase** (PostgreSQL + Edge Functions) for full multi-tenant SaaS capabilities.
*   **AI Core**: Implements an Agent Loop architecture via `callAIAgent` using Native Function Calling (Tool Calling). It integrates official SDKs for OpenAI, Claude, and Gemini, enabling the AI to act as a fully autonomous Sales Assistant instead of relying on legacy text-tag parsing.
*   **Data Sources**: Google Sheets is used as the primary CMS for product inventory and bot context.

## 🎨 Design System & Aesthetics

*   **Theme**: Dark Mode / Cyberpunk Aesthetic. 
*   **Color Palette**:
    *   Background Deep: `#020617`
    *   Surface: `#0f172a`
    *   Primary (Blue): `#0ea5e9`
    *   Secondary (Purple): `#8b5cf6`
    *   Accent (Orange/Gold): `#f59e0b` / `#fbbf24`
*   **Typography**: 'Kanit' and 'Inter' fonts.
*   **Layout**: Single Page Application (SPA) style. 
    *   *Desktop*: Sidebar navigation with resizable split-pane layouts.
    *   *Mobile*: Mobile-first responsiveness. Navigation converts to a bottom bar. Chat areas slide over the inbox list.

## 🏢 SaaS Multi-Tenant Architecture

The system is designed for SaaS. Key implementations:
*   **Workspace Switcher**: Users can have multiple workspaces (Stores). Each workspace operates independently.
*   **Feature Gating**: Controlled by the `PLAN_CONFIG` object in `Botify_Dashboard.html`. Features like Shopee/Lazada integrations, advanced AI models, and Team Member invitations are dynamically disabled based on the active plan (Starter, Pro, Agency, BYOK).

## 📂 Key Files
*   `Botify_Dashboard.html`: The core frontend file. Contains layout, styling, tab-switching logic, charting (`Chart.js`), inbox logic, and SaaS trial/upgrade state management.
*   `Botify_Unified_Inbox.html`: The original inbox prototype (mostly superseded by the dashboard, kept for reference).
*   `server.js`: Contains Node.js backend logic for Marketplace status, Google Sheets fetching, and the core **Native AI Agent (`callAIAgent`)** loop and tool execution functions.
