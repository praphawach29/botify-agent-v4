# Botify SaaS Dashboard (V4)

Botify is an all-in-one AI chatbot management and unified inbox platform for e-commerce sellers. It consolidates conversations from LINE, Facebook Messenger, Shopee, and Lazada into a single dashboard powered by intelligent Agentic AI models (Claude, GPT-4o, Gemini, DeepSeek, Typhoon) to automate customer support and sales.

## 🚀 Key Features (For full details, see `FEATURES.md`)

*   **Omni-Channel Inbox**: Manage chats across 4 platforms (LINE, FB, Shopee, Lazada) in one place.
*   **Smart AI Sales Assistant (Agentic AI)**: Native Function Calling with 10+ tools. **AI Fallback Chain** (`claude` → `deepseek` → `openai` → `gemini` → `typhoon`) for high availability.
*   **SaaS Multi-Tenant Architecture**: Multiple shops on a single server with strict **Row Level Security (RLS)** enforced via JWT (`req.auth.shopId`).
*   **Payment Gateway**: Stripe and Omise integrated for automated subscription billing and manual bank transfer.
*   **Distributed State**: Redis (`ioredis`) for session caching and webhook message debouncing, ensuring horizontal scalability.
*   **SaaS Feature Gating**: Tiered access (Free Trial, Starter, Standard, Elite) with automatic UI locks for premium features.
*   **Marketplace Sync**: Automated sync jobs for Shopee and Lazada orders.

## 🏗 Project Structure

```
botify-merged/
├── server/                # Node.js + Express backend (MVC)
│   ├── server.js          # Entry point
│   ├── app.js             # Express setup + middleware
│   ├── config/            # Supabase, globals, multi-tenant client loading
│   ├── middleware/        # JWT auth (authMW)
│   ├── routes/            # auth, api, webhook, payment, admin, misc, backup
│   ├── services/          # aiService, sheetService, notificationService, bookingService
│   └── utils/             # helpers, redis (Cache singleton)
├── client/                # React + Vite frontend
│   ├── src/               # React source
│   └── dist/              # Production build (served by Express)
├── schema.sql             # Supabase PostgreSQL schema
├── CONTEXT.md             # Architecture & design guidelines
├── AGENTS.md              # AI agent contribution guidelines
├── SKILLS.md              # Developer workflows & how-tos
└── FEATURES.md            # Full feature documentation
```

## 💻 How to Run

### Prerequisites

Ensure `.env` contains valid keys (see `.env.example`):

```env
SUPABASE_URL=...
SUPABASE_KEY=...
LINE_TOKEN_1=...
FB_VERIFY_TOKEN=...
CLAUDE_KEY=sk-ant-...   # or OPENAI_KEY / GEMINI_KEY / etc.
AI_PROVIDER=claude
REDIS_URL=redis://...   # optional, falls back to in-memory
```

### Development

```bash
# Install dependencies
npm install

# Start backend (port 3000)
npm run dev

# Build frontend (run once or after frontend changes)
npm run build:client
```

Navigate to `http://localhost:3000` for the full app.

### Production (Docker / Railway)

```bash
docker-compose up --build
# or deploy via Railway — see railway.json and Procfile
```

## 🔮 Roadmap

*   **Instagram Channel**: Add Instagram Messenger as a 4th channel alongside LINE and Facebook.
*   **AI Tool Expansion**: Increase AI Agent tool count beyond 10 for richer automation.
*   **Usage Analytics Dashboard**: Per-shop analytics for AI credit consumption and message volume.
