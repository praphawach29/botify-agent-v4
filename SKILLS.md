# Developer Skills & Workflows

This document outlines common workflows, testing procedures, and configurations for developing Botify (V4).

## 1. Testing SaaS Feature Gating (Mock Mode)

The frontend contains a built-in debugging tool to test how the UI behaves under different subscription plans without needing a backend.

**How to use:**
1. Open the app at `http://localhost:3000` (after running `npm run dev` + `npm run build:client`).
2. In the top right corner, locate the **"SaaS Mock:"** dropdown.
3. Select different plans (Free Trial, Starter, Standard, Elite) to see UI elements dynamically lock and unlock.
4. **Behind the scenes**: This triggers the `setPlan('plan_name')` function, which reads permissions from the `PLAN_CONFIG` object in the React frontend.

## 2. Modifying Subscription Plans

If you need to change pricing, limits, or feature access:

1. Open the relevant component in `client/src/` containing `PLAN_CONFIG` and `BILLING_UI`.
2. Modify the quotas (e.g., `msgLimit`, `tokenLimit`), prices, or boolean feature flags (`features.marketplace`, `features.advancedAI`).
3. The UI (limits bars and pricing cards) will automatically render the new values.
4. Run `npm run build:client` to rebuild.

## 3. Adding New Capabilities to the Agentic AI

The AI operates on a **Native Function Calling** architecture. To add a new tool:

1. **Define the Tool**: Open `server/services/aiService.js` and locate the `agentTools` array. Add a new JSON object with `name`, `description`, and `parameters` following JSON Schema standards.
2. **Implement Execution Logic**: In the same file, locate `executeTool()`. Add an `if (name === "your_tool_name")` block with the backend logic.
3. **Handle AI Credits**: If the tool incurs external API costs, deduct `ai_credits` from the shop's balance and log the transaction in `credit_transactions`.
4. **Return Results**: Inside the `if` block, `return { success: true, ...data }` — the result loops back to the AI to formulate the final response.
5. **Test the Flow**: Verify the route: `server/routes/webhook.js` → `server/services/aiService.js` → `executeTool()`.

## 4. Modifying the Schema (Supabase)

To add new database tables:

1. Open `schema.sql`.
2. Add the new table definition (`CREATE TABLE IF NOT EXISTS ...`). Ensure it references `workspaces(id)` for Multi-Tenant isolation.
3. Enable Row Level Security: `ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;`.
4. Apply the schema via the Supabase dashboard SQL editor or CLI.
5. In all Node.js routes, enforce queries using `req.auth.shopId`. **Never use `req.shopId`**.

## 5. Distributed Caching (Redis)

When adding features that require caching or debouncing:

1. Import the `Cache` singleton: `const { Cache } = require('../utils/redis');`
2. **Do NOT** use `global.myCache = new Map()` — this breaks in multi-server deployments.
3. Use `Cache.set(key, value, ttl)` and `Cache.get(key)`. The singleton handles Redis failures by falling back to local memory automatically.

## 6. Adding New Channels

Currently, LINE and Facebook Messenger are supported. To add a new channel (e.g., Instagram):

1. Create a new webhook route in `server/routes/webhook.js`.
2. Update `server/config/globals.js` — add the new channel's token fields to `loadClientsFromDB()` and `loadClientsFromEnv()`, then update `rebuildRoutingMaps()` to register routing maps for the new channel.
3. Update `server/services/notificationService.js` to handle outbound messages for the new channel.
4. Add the new token columns to the `shops` table in `schema.sql`.

## 7. AI Provider Configuration

AI provider is set via environment variables. No code changes needed to switch providers:

```env
AI_PROVIDER=claude          # claude | openai | gemini | typhoon | deepseek
AI_FALLBACK_CHAIN=claude,deepseek,openai,gemini,typhoon

CLAUDE_KEY=sk-ant-...
OPENAI_KEY=sk-...
GEMINI_KEY=AIza...
TYPHOON_KEY=...
DEEPSEEK_KEY=...

# Optional: override default models
CLAUDE_MODEL=claude-3-5-sonnet-latest
OPENAI_MODEL=gpt-4o
GEMINI_MODEL=gemini-3.5-flash
TYPHOON_MODEL=typhoon-v2-70b-instruct
DEEPSEEK_MODEL=deepseek-chat
```

API keys can also be stored per-shop in the Supabase `settings` table (managed via Super Admin Dashboard) — these take priority over `.env` values.

## 8. Running Locally

```bash
# 1. Install backend dependencies
npm install

# 2. Install and build frontend
cd client && npm install && npm run build && cd ..

# 3. Start backend (serves frontend from client/dist/)
npm run dev
```

The app is available at `http://localhost:3000`.
