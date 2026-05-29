// ================================================================
//  saas/routes.js — SaaS API Router
//  Mount ที่: app.use('/saas', require('./saas/routes'))
// ================================================================
const router = require("express").Router();
const db     = require("./db");
const { signToken, hashPassword, comparePassword, jwtMiddleware, requireRole } = require("./auth");
const { PLAN_LIMITS, getPlanLimits, isTrialExpired }                           = require("./plans");

// ── Middleware: โหลด workspace จาก DB และตรวจ trial ─────────
async function loadWorkspace(req, res, next) {
  try {
    let ws = await db.getWorkspaceById(req.auth.workspaceId);

    // Auto-downgrade เมื่อ trial หมดอายุ
    if (isTrialExpired(ws)) {
      ws = await db.updateWorkspace(ws.id, { plan: "starter" });
    }

    // Reset billing cycle ถ้าครบรอบ
    ws = await db.resetBillingIfDue(ws);

    req.workspace = ws;
    next();
  } catch (e) {
    res.status(500).json({ error: "ไม่สามารถโหลดข้อมูล Workspace ได้" });
  }
}

// ================================================================
//  AUTH ENDPOINTS
// ================================================================

// POST /saas/auth/register — สมัครสมาชิก
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, workspaceName } = req.body;

    if (!name || !email || !password || !workspaceName) {
      return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "รูปแบบอีเมลไม่ถูกต้อง" });
    }

    const existing = await db.getUserByEmail(email.toLowerCase());
    if (existing) return res.status(409).json({ error: "อีเมลนี้มีผู้ใช้งานแล้ว" });

    const workspace    = await db.createWorkspace({ name: workspaceName });
    const passwordHash = await hashPassword(password);
    const user         = await db.createUser({
      workspaceId: workspace.id,
      email:       email.toLowerCase(),
      passwordHash,
      name,
      role:        "owner",
    });

    const token = signToken({ userId: user.id, workspaceId: workspace.id, role: user.role });

    res.status(201).json({
      token,
      user:      { id: user.id, email: user.email, name: user.name, role: user.role },
      workspace: { id: workspace.id, name: workspace.name, plan: workspace.plan },
    });
  } catch (e) {
    console.error("[saas/register]", e.message);
    res.status(500).json({ error: "ไม่สามารถสร้างบัญชีได้ กรุณาลองใหม่" });
  }
});

// POST /saas/auth/login — เข้าสู่ระบบ
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "กรุณากรอกอีเมลและรหัสผ่าน" });
    }

    const user = await db.getUserByEmail(email.toLowerCase());
    if (!user) return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });

    const ok = await comparePassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });

    const token = signToken({ userId: user.id, workspaceId: user.workspace_id, role: user.role });

    res.json({
      token,
      user:      { id: user.id, email: user.email, name: user.name, role: user.role },
      workspace: {
        id:   user.workspaces.id,
        name: user.workspaces.name,
        plan: user.workspaces.plan,
      },
    });
  } catch (e) {
    console.error("[saas/login]", e.message);
    res.status(500).json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่" });
  }
});

// GET /saas/auth/me — ตรวจสอบ token ปัจจุบัน
router.get("/auth/me", jwtMiddleware, async (req, res) => {
  try {
    const user = await db.getUserByEmail(req.auth.userId); // fallback: get by userId
    res.json({ valid: true, auth: req.auth });
  } catch {
    res.json({ valid: true, auth: req.auth });
  }
});

// ================================================================
//  WORKSPACE ENDPOINTS
// ================================================================

// GET /saas/workspace/me — ข้อมูล workspace + plan + usage
router.get("/workspace/me", jwtMiddleware, loadWorkspace, async (req, res) => {
  const ws     = req.workspace;
  const limits = getPlanLimits(ws.plan);

  // คำนวณ trial ที่เหลือ
  let trialDaysLeft = 0;
  if (ws.plan === "trial" && ws.trial_expires_at) {
    trialDaysLeft = Math.max(0, Math.ceil(
      (new Date(ws.trial_expires_at) - new Date()) / (1000 * 60 * 60 * 24)
    ));
  }

  res.json({
    workspace: {
      id:             ws.id,
      name:           ws.name,
      plan:           ws.plan,
      planLabel:      limits.label,
      trialExpiresAt: ws.trial_expires_at,
      trialDaysLeft,
      planExpiresAt:  ws.plan_expires_at,
      billingResetAt: ws.billing_reset_at,
    },
    usage: {
      msgUsed:    ws.msg_used,
      msgLimit:   limits.msgLimit,
      tokenUsed:  ws.token_used,
      tokenLimit: limits.tokenLimit,
    },
    features: limits.features,
  });
});

// PUT /saas/workspace/settings — อัพเดท bot config
router.put("/workspace/settings", jwtMiddleware, loadWorkspace, async (req, res) => {
  try {
    const allowed = ["name", "line_token", "line_bot_user_id", "fb_token", "fb_page_id",
                     "sheet_id", "owner_line_id", "ai_provider", "system_prompt", "personality",
                     "custom_ai_key", "custom_ai_provider", "custom_ai_model"];
    // BYOK: ถ้า plan ไม่ใช่ byok ไม่อนุญาตบันทึก custom_ai_key
    if (req.workspace.plan !== "byok" && req.body.custom_ai_key !== undefined) {
      return res.status(403).json({ error: "custom_ai_key ใช้ได้เฉพาะ BYOK Plan เท่านั้น" });
    }
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const ws = await db.updateWorkspace(req.auth.workspaceId, updates);
    res.json({ success: true, workspace: ws });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================================================================
//  TEAM MEMBERS
// ================================================================

// GET /saas/workspace/members
router.get("/workspace/members", jwtMiddleware, loadWorkspace, async (req, res) => {
  try {
    const members = await db.getUsersByWorkspace(req.auth.workspaceId);
    res.json({ members });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /saas/workspace/members — เชิญสมาชิก (Pro+)
router.post("/workspace/members", jwtMiddleware, loadWorkspace, requireRole("owner"), async (req, res) => {
  try {
    const { name, email, password, role = "admin" } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบ" });
    }

    const limits = getPlanLimits(req.workspace.plan);
    if (!limits.features.teamMembers) {
      return res.status(403).json({ error: "แพ็กเกจปัจจุบันไม่รองรับการเพิ่มทีมงาน" });
    }

    const members = await db.getUsersByWorkspace(req.auth.workspaceId);
    if (limits.maxAdmins !== Infinity && members.length >= limits.maxAdmins) {
      return res.status(403).json({
        error: `แพ็กเกจนี้รองรับแอดมินได้สูงสุด ${limits.maxAdmins} คน`
      });
    }

    const existing = await db.getUserByEmail(email.toLowerCase());
    if (existing) return res.status(409).json({ error: "อีเมลนี้มีผู้ใช้งานแล้ว" });

    const passwordHash = await hashPassword(password);
    const user = await db.createUser({
      workspaceId: req.auth.workspaceId,
      email:       email.toLowerCase(),
      passwordHash, name, role,
    });

    res.status(201).json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /saas/workspace/members/:userId
router.delete("/workspace/members/:userId", jwtMiddleware, requireRole("owner"), async (req, res) => {
  try {
    await db.deleteUser(req.params.userId, req.auth.workspaceId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================================================================
//  BILLING & PLANS
// ================================================================

// GET /saas/plans — รายการแพ็กเกจทั้งหมด (Public)
router.get("/plans", (req, res) => {
  const plans = Object.entries(PLAN_LIMITS).map(([key, val]) => ({
    key,
    label:       val.label,
    price:       val.price,
    msgLimit:    val.msgLimit,
    tokenLimit:  val.tokenLimit,
    maxAdmins:   val.maxAdmins,
    maxProducts: val.maxProducts,
    features:    val.features,
  }));
  res.json({ plans });
});

// POST /saas/billing/upgrade — อัพเกรดแพ็กเกจ
// Phase 1: Mock payment  |  Phase 2: เชื่อม Omise
router.post("/billing/upgrade", jwtMiddleware, loadWorkspace, async (req, res) => {
  try {
    const { plan, omiseToken } = req.body;

    if (!["starter", "pro", "agency"].includes(plan)) {
      return res.status(400).json({ error: "แพ็กเกจไม่ถูกต้อง" });
    }

    const limits     = PLAN_LIMITS[plan];
    const amount     = limits.price * 100; // satang

    // ── Phase 2: Omise Payment (เปิดเมื่อมี OMISE_SECRET_KEY) ──
    if (process.env.OMISE_SECRET_KEY && omiseToken) {
      const Omise  = require("omise")({ secretKey: process.env.OMISE_SECRET_KEY });
      const charge = await Omise.charges.create({
        amount,
        currency:    "thb",
        card:        omiseToken,
        description: `Botify ${limits.label} — ${req.workspace.name}`,
      });

      if (charge.status !== "successful") {
        return res.status(402).json({ error: "การชำระเงินไม่สำเร็จ", charge });
      }

      await db.createPayment({
        workspaceId:       req.auth.workspaceId,
        amount,
        plan,
        provider:          "omise",
        providerChargeId:  charge.id,
        metadata:          { charge },
      });
    } else {
      // ── Phase 1: Mock payment ──
      await db.createPayment({
        workspaceId: req.auth.workspaceId,
        amount,
        plan,
        provider:    "mock",
        metadata:    { note: "Mock — Omise not yet configured" },
      });
    }

    // อัพเดท plan ใน workspace
    const nextExpiry = new Date();
    nextExpiry.setMonth(nextExpiry.getMonth() + 1);

    await db.updateWorkspace(req.auth.workspaceId, {
      plan,
      plan_expires_at: nextExpiry.toISOString(),
    });

    res.json({ success: true, plan, message: `อัพเกรดเป็น ${limits.label} สำเร็จ` });
  } catch (e) {
    console.error("[billing/upgrade]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /saas/billing/history — ประวัติการชำระเงิน
router.get("/billing/history", jwtMiddleware, async (req, res) => {
  try {
    const payments = await db.getPaymentHistory(req.auth.workspaceId);
    res.json({ payments });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================================================================
//  OMISE WEBHOOK — รับ event จาก Omise (Phase 2)
// ================================================================
router.post("/billing/webhook/omise", async (req, res) => {
  // ตรวจ signature จาก Omise header (production)
  const event = req.body;
  if (event?.key === "charge.complete" && event?.data?.status === "successful") {
    const chargeId = event.data.id;
    // หาและยืนยัน payment ที่ pending
    const { data: payment } = await db.supabase
      .from("payments")
      .select("*")
      .eq("provider_charge_id", chargeId)
      .eq("status", "pending")
      .single();

    if (payment) {
      await db.confirmPayment(payment.id);
      await db.updateWorkspace(payment.workspace_id, { plan: payment.plan });
    }
  }
  res.json({ received: true });
});

module.exports = router;
