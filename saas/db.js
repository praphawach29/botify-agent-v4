// ================================================================
//  saas/db.js — Supabase Database Client
//  ต้องตั้ง env: SUPABASE_URL, SUPABASE_SERVICE_KEY
// ================================================================
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

// ── Workspaces ────────────────────────────────────────────────

async function getWorkspaceById(id) {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function createWorkspace({ name, plan = "trial" }) {
  const { data, error } = await supabase
    .from("workspaces")
    .insert({ name, plan })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function updateWorkspace(id, updates) {
  const { data, error } = await supabase
    .from("workspaces")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// รีเซ็ต billing cycle ถ้าถึงรอบแล้ว
async function resetBillingIfDue(workspace) {
  if (workspace.billing_reset_at && new Date(workspace.billing_reset_at) <= new Date()) {
    return updateWorkspace(workspace.id, {
      msg_used:         0,
      token_used:       0,
      billing_reset_at: getNextBillingDate(),
    });
  }
  return workspace;
}

function getNextBillingDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ── Usage Tracking ────────────────────────────────────────────

async function incrementUsage(workspaceId, { messages = 0, tokens = 0 }) {
  const { error } = await supabase.rpc("increment_usage", {
    p_workspace_id: workspaceId,
    p_messages:     messages,
    p_tokens:       tokens,
  });
  if (error) throw new Error(error.message);
}

// ── Users ─────────────────────────────────────────────────────

async function getUserByEmail(email) {
  const { data, error } = await supabase
    .from("users")
    .select("*, workspaces(*)")
    .eq("email", email)
    .single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data || null;
}

async function getUsersByWorkspace(workspaceId) {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, role, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data;
}

async function createUser({ workspaceId, email, passwordHash, name, role = "owner" }) {
  const { data, error } = await supabase
    .from("users")
    .insert({
      workspace_id:  workspaceId,
      email,
      password_hash: passwordHash,
      name,
      role,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteUser(userId, workspaceId) {
  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", userId)
    .eq("workspace_id", workspaceId)
    .neq("role", "owner"); // ลบ owner ไม่ได้
  if (error) throw new Error(error.message);
}

// ── Payments ──────────────────────────────────────────────────

async function createPayment({ workspaceId, amount, plan, provider = "omise", providerChargeId = null, metadata = {} }) {
  const { data, error } = await supabase
    .from("payments")
    .insert({
      workspace_id:       workspaceId,
      amount,
      plan,
      provider,
      provider_charge_id: providerChargeId,
      metadata,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function confirmPayment(paymentId) {
  const { data, error } = await supabase
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", paymentId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function getPaymentHistory(workspaceId, limit = 10) {
  const { data, error } = await supabase
    .from("payments")
    .select("id, amount, plan, status, provider, paid_at, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}

module.exports = {
  supabase,
  getWorkspaceById,
  createWorkspace,
  updateWorkspace,
  resetBillingIfDue,
  incrementUsage,
  getUserByEmail,
  getUsersByWorkspace,
  createUser,
  deleteUser,
  createPayment,
  confirmPayment,
  getPaymentHistory,
};
