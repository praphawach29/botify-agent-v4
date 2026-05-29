const { supabase } = require('../config/db');
const { ADMIN_API_KEY, getClientByShopId, getFirstClient } = require('../config/globals');

const authMW = async (req, res, next) => {
  // Method 1: API Key (super admin / legacy)
  const apiKey = req.headers["x-api-key"] || req.body?.apiKey;
  if (apiKey && apiKey === ADMIN_API_KEY) {
    req.auth = { role: "superadmin", mode: "apikey" };
    return next();
  }

  // Method 2: Supabase Bearer Token
  const authHeader = req.headers.authorization || (req.query.token ? `Bearer ${req.query.token}` : null);
  if (authHeader?.startsWith("Bearer ") && supabase) {
    const token = authHeader.replace("Bearer ", "");
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return res.status(401).json({ error: "Token ไม่ถูกต้องหรือหมดอายุ" });

      // ดึง profile จาก users table
      const { data: profile } = await supabase
        .from("users")
        .select("role, workspace_id, name, workspaces(name)")
        .eq("id", user.id)
        .single();

      req.auth = {
        userId: user.id,
        email: user.email,
        role: profile?.role || "owner",
        shopId: profile?.workspace_id || null,
        shopName: profile?.workspaces?.name || null,
        displayName: profile?.name || user.email,
        mode: "supabase",
      };
      return next();
    } catch (err) {
      return res.status(401).json({ error: "Auth error: " + err.message });
    }
  }

  return res.status(401).json({ error: "Unauthorized — ต้องใช้ API Key หรือ Login ก่อน" });
};

// fSid(req) — ดึง Sheet ID ตาม shop ของ user ที่ login อยู่ (multi-tenant)
const fSid = (req) => {
  // ถ้ามี req.auth.shopId → หา client ของร้านนั้น
  if (req?.auth?.shopId) {
    const c = getClientByShopId(req.auth.shopId);
    if (c?.sheetId) return c.sheetId;
  }
  // Fallback: ใช้ client แรก (backward compatible)
  const c = getFirstClient();
  if (!c) throw new Error("No client configured");
  return c.sheetId;
};

module.exports = { authMW, fSid };
