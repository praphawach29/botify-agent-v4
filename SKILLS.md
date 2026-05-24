# Developer Skills & Workflows

This document outlines common workflows, testing procedures, and configurations for developing the Botify Dashboard.

## 1. Testing SaaS Feature Gating (Mock Mode)

The frontend contains a built-in debugging tool to test how the UI behaves under different subscription plans without needing a backend.

**How to use:**
1. Open `Botify_Dashboard.html` in a browser.
2. In the top right corner, locate the **"SaaS Mock:"** dropdown.
3. Select different plans (Free Trial, Starter, Pro, Agency, BYOK) to see UI elements dynamically lock and unlock.
4. **Behind the scenes**: This dropdown triggers the `setPlan('plan_name')` JavaScript function, which reads permissions from the `PLAN_CONFIG` object.

## 2. Modifying Subscription Plans

If you need to change pricing, limits, or feature access, you do not need to hunt through HTML. 

1. Open `Botify_Dashboard.html`.
2. Locate the `PLAN_CONFIG` and `BILLING_UI` objects in the `<script>` section.
3. Modify the quotas (e.g., `msgLimit`, `tokenLimit`), prices, or boolean feature flags (`features.marketplace`, `features.advancedAI`).
4. The UI (both the limits bars and the pricing cards) will automatically render the new values based on these configuration objects.

## 3. Adding New Quick Reply Prompts

1. Open `Botify_Dashboard.html`.
2. Locate the `PROMPT_TEMPLATES` object in the `<script>` section.
3. Add a new key-value pair for the template (e.g., `admin: "You are a strict system admin..."`).
4. Add a new button in the HTML under the "System Prompt" section calling `applyPromptTemplate('admin')`.

## 4. Adding New Capabilities to the Smart AI Agent

The AI operates on a **Native Function Calling** architecture. If you want the AI to perform a new task (e.g., checking shipping rates):

1. **Define the Tool**: Open `server.js` and locate the `agentTools` array. Add a new JSON object defining the tool's `name`, `description`, and `parameters` following JSON Schema standards.
2. **Implement Execution Logic**: Locate the `executeTool` function in `server.js`. Add an `if (name === "your_tool_name")` block.
3. **Execute Backend Code**: Inside the `if` block, execute the actual Node.js logic (e.g., querying the database or external API) and `return { success: true, data: result }`. The result will automatically loop back to the AI for formulating the final response.
4. **Update Instructions**: Ensure the System Prompt (in `buildPrompt`) explicitly tells the AI *when* and *why* it should use this new tool.
