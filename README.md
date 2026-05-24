# Botify SaaS Dashboard

Botify is an all-in-one AI chatbot management and unified inbox platform for e-commerce sellers. It consolidates conversations from LINE, Facebook Messenger, Shopee, and Lazada into a single dashboard powered by intelligent AI models (Claude, GPT-4, Gemini) to automate customer support and sales.

## 🚀 Key Features

*   **Unified Inbox**: Manage chats across 4 platforms (LINE, FB, Shopee, Lazada) in one place.
*   **Smart AI Sales Assistant (Native Agent)**: Powered by Native Function Calling (Tool Calling) using official SDKs (`@google/genai`, `openai`, `@anthropic-ai/sdk`). The AI autonomously decides when to check stock, take orders, or book appointments.
*   **Inventory Sync**: View and manage product stock directly synced from Google Sheets.
*   **SaaS Feature Gating**: Built-in tiered access (Free Trial, Starter, Pro, Agency, BYOK) with automatic UI locks for premium features.
*   **Marketplace Status**: Monitor API connection health and token expiration for Shopee and Lazada.

## 🛠 Project Structure

Currently, the frontend is built as a highly interactive Prototype/Mockup using HTML, CSS, and Vanilla JavaScript.

*   `Botify_Dashboard.html`: The main Single Page Application (SPA) dashboard containing all tabs, SaaS logic, and UI components.
*   `server.js`: The backend Node.js server handling Marketplace API connections, Native AI Agent Loops (`callAIAgent`), tool execution (`executeTool`), and data synchronization.

## 💻 How to Run

1.  **Frontend**: Open `Botify_Dashboard.html` directly in any modern web browser to view the prototype. You can use the "SaaS Mock" dropdown in the top right to test different subscription plans and UI states.
2.  **Backend**: Run `node server.js` to start the backend server for handling API requests (requires appropriate `.env` configuration).

## 🔮 Roadmap

*   **Authentication & Database**: Migrate mockup logic to Supabase for multi-tenant (SaaS) architecture, handling `tenant_id`, user logins, and RBAC.
*   **Payment Gateway**: Integrate Omise or Stripe for real-world automated subscription billing.
*   **React Migration**: Transition the Vanilla JS prototype into a modern React (Next.js/Vite) application for better component reusability.
