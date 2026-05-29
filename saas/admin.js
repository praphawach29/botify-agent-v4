// ================================================================
//  saas/admin.js — Super Admin API Routes
//  Protected by SUPER_ADMIN_KEY (ตั้งใน Railway Variables)
//  Mount ที่: app.use('/admin', require('./saas/admin'))
// ================================================================
const router   = require("express").Router();
const db       = require("./db");
const { PLAN_LIMITS } = require("./plans");

// ── Super Admin Auth Middleware ───────────────────────────────
function adminAuth(req, res, next) {
  const key = req.headers["x-admin-key"] || req.query.key;
  if (!process.env.SUPER_ADMIN_KEY) {
    return res.status(500).json({ error: "SUPER_ADMIN_KEY ยังไม่ได้ตั้งค่าใน Environment" });
  }
  if (key !== process.env.SUPER_ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized — Admin Key ไม่ถูกต้อง" });
  }
  next();
}

router.use(adminAuth);

// ================================================================
//  DASHBOARD STATS
// ================================================================

// GET /admin/stats — ภาพรวมระบบทั้งหมด
router.get("/stats", async (req, res) => {
  try {
    const { data: workspaces } = await db.supabase
      .from("workspaces")
      .select("id, plan, msg_used, token_used, created_at");

    const { data: payments } = await db.supabase
      .from("payments")
      .select("amount, plan, status, paid_at, created_at")
      .eq("status", "paid");

    const planCount = { trial: 0, starter: 0, pro: 0, agency: 0 };
    let totalMsgUsed   = 0;
    let totalTokenUsed = 0;

    workspaces.forEach(w => {
      planCount[w.plan] = (planCount[w.plan] || 0) + 1;
      totalMsgUsed   += w.msg_used   || 0;
      totalTokenUsed += w.token_used || 0;
    });

    // MRR (Monthly Recurring Revenue)
    const now      = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
    const mrr = payments
      .filter(p => new Date(p.paid_at) >= monthAgo)
      .reduce((sum, p) => sum + (p.amount / 100), 0);

    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount / 100), 0);

    res.json({
      workspaces: {
        total:   workspaces.length,
        byPlan:  planCount,
        paying:  (planCount.starter || 0) + (planCount.pro || 0) + (planCount.agency || 0),
      },
      usage: { totalMsgUsed, totalTokenUsed },
      revenue: {
        mrr:          Math.round(mrr),
        total:        Math.round(totalRevenue),
        transactions: payments.length,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================================================================
//  WORKSPACE MANAGEMENT
// ================================================================

// GET /admin/workspaces — รายการทุก workspace
router.get("/workspaces", async (req, res) => {
  try {
    const { search, plan, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = db.supabase
      .from("workspaces")
      .select(`
        id, name, plan, msg_used, token_used,
        trial_expires_at, plan_expires_at, billing_reset_at,
        created_at, updated_at,
        users!inner(id, email, name, role)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (plan)   query = query.eq("plan", plan);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, count, error } = await query;
    if (error) throw error;

    // คำนวณ usage % และ plan limits
    const enriched = data.map(ws => {
      const limits  = PLAN_LIMITS[ws.plan] || PLAN_LIMITS.trial;
      const msgPct  = Math.round((ws.msg_used  / limits.msgLimit)   * 100);
      const tokPct  = Math.round((ws.token_used / limits.tokenLimit) * 100);
      const owner   = ws.users?.find(u => u.role === "owner") || ws.users?.[0];
      return {
        ...ws,
        ownerEmail:  owner?.email || "-",
        ownerName:   owner?.name  || "-",
        msgLimit:    limits.msgLimit,
        tokenLimit:  limits.tokenLimit,
        msgPct:      Math.min(msgPct, 100),
        tokPct:      Math.min(tokPct, 100),
        isOverQuota: msgPct >= 100,
        isTrial:     ws.plan === "trial",
        trialExpired: ws.plan === "trial" && ws.trial_expires_at && new Date(ws.trial_expires_at) < new Date(),
      };
    });

    res.json({ workspaces: enriched, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /admin/workspaces/:id — รายละเอียด workspace
router.get("/workspaces/:id", async (req, res) => {
  try {
    const { data: ws, error } = await db.supabase
      .from("workspaces")
      .select("*, users(id, email, name, role, created_at)")
      .eq("id", req.params.id)
      .single();
    if (error) throw error;

    const { data: payments } = await db.supabase
      .from("payments")
      .select("*")
      .eq("workspace_id", req.params.id)
      .order("created_at", { ascending: false })
      .limit(10);

    const limits = PLAN_LIMITS[ws.plan] || PLAN_LIMITS.trial;
    res.json({
      workspace: {
        ...ws,
        msgLimit:   limits.msgLimit,
        tokenLimit: limits.tokenLimit,
        msgPct:     Math.round((ws.msg_used  / limits.msgLimit)   * 100),
        tokPct:     Math.round((ws.token_used / limits.tokenLimit) * 100),
      },
      payments: payments || [],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /admin/workspaces/:id/plan — เปลี่ยน plan
router.put("/workspaces/:id/plan", async (req, res) => {
  try {
    const { plan, note } = req.body;
    if (!PLAN_LIMITS[plan]) return res.status(400).json({ error: "Plan ไม่ถูกต้อง" });

    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);

    const ws = await db.updateWorkspace(req.params.id, {
      plan,
      plan_expires_at: ["starter","pro","agency"].includes(plan) ? expiry.toISOString() : null,
    });

    // บันทึก admin action ใน payments (ไม่มี charge)
    if (note) {
      await db.createPayment({
        workspaceId: req.params.id,
        amount:      0,
        plan,
        provider:    "admin",
        metadata:    { note, changedBy: "super_admin" },
      });
    }

    res.json({ success: true, workspace: ws });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /admin/workspaces/:id/reset-usage — รีเซ็ต quota
router.put("/workspaces/:id/reset-usage", async (req, res) => {
  try {
    const ws = await db.updateWorkspace(req.params.id, {
      msg_used:         0,
      token_used:       0,
      billing_reset_at: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
    });
    res.json({ success: true, workspace: ws });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /admin/workspaces/:id/suspend — ระงับ / คืนสิทธิ์
router.put("/workspaces/:id/suspend", async (req, res) => {
  try {
    const { suspend } = req.body; // true = ระงับ, false = คืนสิทธิ์
    const ws = await db.updateWorkspace(req.params.id, {
      plan: suspend ? "suspended" : "starter",
    });
    res.json({ success: true, suspended: suspend, workspace: ws });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /admin/workspaces/:id/extend-trial — ขยาย trial
router.put("/workspaces/:id/extend-trial", async (req, res) => {
  try {
    const { days = 14 } = req.body;
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + parseInt(days));
    const ws = await db.updateWorkspace(req.params.id, {
      plan:             "trial",
      trial_expires_at: newExpiry.toISOString(),
    });
    res.json({ success: true, trialExpiresAt: newExpiry, workspace: ws });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /admin/workspaces/:id — ลบ workspace (อันตราย)
router.delete("/workspaces/:id", async (req, res) => {
  try {
    const { confirm } = req.body;
    if (confirm !== "DELETE") {
      return res.status(400).json({ error: 'ต้องส่ง confirm: "DELETE" เพื่อยืนยัน' });
    }
    await db.supabase.from("workspaces").delete().eq("id", req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================================================================
//  REVENUE
// ================================================================

// GET /admin/revenue — ภาพรวมรายได้ตาม timeline
router.get("/revenue", async (req, res) => {
  try {
    const { data: payments } = await db.supabase
      .from("payments")
      .select("amount, plan, status, paid_at, created_at, workspaces(name)")
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(100);

    // รวมรายได้รายเดือน (6 เดือนย้อนหลัง)
    const monthly = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthly[key] = 0;
    }

    payments.forEach(p => {
      if (!p.paid_at) return;
      const d   = new Date(p.paid_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthly[key] !== undefined) monthly[key] += p.amount / 100;
    });

    res.json({
      monthly,
      recentPayments: payments.slice(0, 20).map(p => ({
        shopName:  p.workspaces?.name || "-",
        plan:      p.plan,
        amount:    p.amount / 100,
        paidAt:    p.paid_at,
      })),
      totalRevenue: payments.reduce((s, p) => s + p.amount / 100, 0),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
