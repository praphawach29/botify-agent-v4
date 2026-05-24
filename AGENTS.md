# AI Agent Guidelines

This file outlines strict guidelines for any AI agent interacting with or modifying the Botify codebase.

## 1. Modifying the Frontend (`Botify_Dashboard.html`)
*   **Maintain the SPA Structure**: Do not split the HTML into multiple files unless specifically requested. The current architecture relies on a single file with Javascript tab-switching (`switchView`).
*   **CSS Variables**: Always use existing CSS variables (e.g., `var(--bg-surface)`, `var(--primary)`) when adding new UI elements to maintain the dark cyberpunk theme.
*   **Mobile-First**: Always ensure new UI elements are fully responsive. Use `@media (max-width: 900px)` for mobile adjustments.
*   **Interactive Elements**: Avoid native alert/prompt dialogs. Use the custom `showToast(msg, type)` function for notifications.

## 2. SaaS Feature Gating Logic
*   When adding new features, you **MUST** consider if they belong in all plans or only premium plans.
*   If a feature is premium, wrap its UI container in the `.pro-feature-lock` class and add the `.lock-overlay` HTML inside it.
*   Update the `PLAN_CONFIG` object in the Javascript section of `Botify_Dashboard.html` to declare the feature's availability across different plans.
*   Update the `setPlan(planName)` function to toggle the lock state of your new feature based on the active plan.

## 3. Backend & Supabase Integration (Future)
*   When integrating Supabase, ensure Row Level Security (RLS) is strictly enforced using `tenant_id` or `workspace_id`.
*   Never expose direct Supabase API keys in the frontend that allow bypass of RLS.

## 4. Native AI Agent & Function Calling
*   **Tool Modifications**: When adding new capabilities to the AI, you MUST update the `agentTools` JSON schema array in `server.js`.
*   **Tool Execution**: Any new tool added to `agentTools` must have its corresponding backend logic implemented inside the `executeTool()` function in `server.js`.
*   **Prompt Updates**: Do not use legacy string-based parsing tags (e.g., `---สรุปออเดอร์---`). Instruct the AI to use its native functions instead.

## 5. Preservation of Comments
*   Preserve all existing comment blocks (e.g., `/* =========== VIEW: INBOX =========== */`) as they are crucial for navigating the large HTML file.
