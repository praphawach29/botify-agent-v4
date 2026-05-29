# AI Agent Guidelines

This file outlines strict guidelines for any AI agent interacting with or modifying the Botify (V4) codebase.

## 1. Modifying the Frontend (`client/src/`)

*   **React Components**: The frontend is a React + Vite SPA in `client/src/`. Do not revert to or create standalone HTML files.
*   **CSS Variables**: Always use existing CSS variables (e.g., `var(--bg-surface)`, `var(--primary)`) when adding new UI elements to maintain the dark cyberpunk theme.
*   **Mobile-First**: Always ensure new UI elements are fully responsive. Use `@media (max-width: 900px)` for mobile adjustments.
*   **Notifications**: Avoid native `alert`/`prompt` dialogs. Use the custom `showToast(msg, type)` function for notifications.
*   **Build**: After modifying `client/src/`, run `npm run build:client` to update `client/dist/`.

## 2. SaaS Feature Gating Logic

*   When adding new features, consider whether they belong in all plans or only premium plans.
*   If a feature is premium, wrap its UI container with the `.pro-feature-lock` class and add the `.lock-overlay` HTML inside it.
*   Update the `PLAN_CONFIG` object in the React frontend to declare feature availability across plans.
*   Update the `setPlan(planName)` function to toggle the lock state of the new feature based on the active plan.

## 3. Backend & Supabase Integration

*   All cross-tenant tables (`orders`, `products`, `customers`, `promotions`, `shipping_rates`, `documents`) must have a foreign key linking to the `workspaces` table (`workspace_id` or `shop_id`).
*   **Security Priority**: Enforce Row Level Security (RLS) in all API routes using `req.auth.shopId` (validated JWT via `authMW` in `server/middleware/auth.js`). **NEVER** use the legacy `req.shopId` variable — it is undefined and bypasses tenant isolation.
*   Never expose Supabase service keys in the frontend. Use the Node.js backend API.
*   Any schema updates must be reflected in `schema.sql`.

## 4. Distributed State & Caching

*   **Redis First**: Use `ioredis` for all state management (caching chat history, queuing webhook messages). Avoid using local `Map` or `Set` objects (`global.cache = {}`) — they break horizontal scaling.
*   **Fallback**: The `Cache` utility in `server/utils/redis.js` provides an automatic in-memory fallback if Redis is unavailable.

## 5. Native AI Agent & Function Calling

*   **Agentic Architecture**: The AI is an agent capable of calling multiple tools per interaction — not a text-parsing bot.
*   **Tool Modifications**: When adding new AI capabilities, update the `agentTools` JSON schema array in `server/services/aiService.js`.
*   **Tool Execution**: Any new tool added to `agentTools` must have its backend logic implemented inside `executeTool()` in `server/services/aiService.js`.
*   **Tool Priorities**: Design tool names to be descriptive and parameters to be strictly typed.

## 6. AI Credits & Token Economy

*   **Credit Checks**: Before any AI generation (`callAI`, `callAIWithImage`) or external API calls (e.g., Slip Verification), verify the shop has sufficient `ai_credits` in the `shops` table.
*   **Credit Deductions**: Deduct credits accordingly (1 credit per AI message, 5 credits per slip verification) and log transactions in `credit_transactions`.
*   **Super Admin Management**: AI Providers, API Keys, and Prompt Generation using high-tier models must be restricted to the Super Admin Dashboard. Normal shop owners should only view remaining credits.

## 7. Backend File Structure

The backend follows an MVC pattern. When modifying backend logic, locate the correct file:

| Concern | File |
|---|---|
| AI Agent, Tool Calling, Fallback Chain | `server/services/aiService.js` |
| Outbound notifications (LINE/FB push) | `server/services/notificationService.js` |
| LINE & Facebook webhook receivers | `server/routes/webhook.js` |
| JWT auth middleware | `server/middleware/auth.js` |
| Multi-tenant shop loading, routing maps | `server/config/globals.js` |
| Dashboard, team, settings API | `server/routes/api.js` |
| Payment (Stripe, Omise) | `server/routes/payment.js` |
| Super Admin routes | `server/routes/admin.js` |
| Google Sheets integration | `server/services/sheetService.js` |
| Booking system | `server/services/bookingService.js` |
| Redis Cache singleton | `server/utils/redis.js` |
| Shared utilities | `server/utils/helpers.js` |
