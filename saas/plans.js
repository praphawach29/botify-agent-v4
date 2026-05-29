// ================================================================
//  saas/plans.js — Plan Definitions & Enforcement (Server-side)
//  ไฟล์นี้เป็น Source of Truth ฝั่ง Server
//  ฝั่ง Client (Dashboard) ต้องดึงจาก /saas/plans เสมอ
// ================================================================

const PLAN_LIMITS = {
  trial: {
    label:       "Free Trial (14 วัน)",
    price:       0,
    msgLimit:    5000,
    tokenLimit:  200000,
    maxAdmins:   3,
    maxProducts: 500,
    features: {
      marketplace:       true,
      allPlatforms:      true,
      advancedAI:        true,
      teamMembers:       true,
      apiKeys:           true,
      advancedAnalytics: true,
      rag:               false,
      multiWorkspace:    false,
    },
  },
  starter: {
    label:       "Starter Plan",
    price:       790,
    msgLimit:    1500,
    tokenLimit:  50000,
    maxAdmins:   1,
    maxProducts: 50,
    features: {
      marketplace:       false,
      allPlatforms:      false,
      advancedAI:        false,
      teamMembers:       false,
      apiKeys:           false,
      advancedAnalytics: false,
      rag:               false,
      multiWorkspace:    false,
    },
  },
  pro: {
    label:       "Pro Plan",
    price:       1590,
    msgLimit:    5000,
    tokenLimit:  200000,
    maxAdmins:   3,
    maxProducts: 500,
    features: {
      marketplace:       true,
      allPlatforms:      true,
      advancedAI:        true,
      teamMembers:       true,
      apiKeys:           true,
      advancedAnalytics: true,
      rag:               false,
      multiWorkspace:    false,
    },
  },
  agency: {
    label:       "Agency Plan",
    price:       3990,
    msgLimit:    50000,
    tokenLimit:  999999,
    maxAdmins:   Infinity,
    maxProducts: Infinity,
    features: {
      marketplace:       true,
      allPlatforms:      true,
      advancedAI:        true,
      teamMembers:       true,
      apiKeys:           true,
      advancedAnalytics: true,
      rag:               true,
      multiWorkspace:    true,
      byok:              false,
    },
  },

  // ── BYOK: Bring Your Own Key ──────────────────────────────────
  // ผู้ใช้มี API Key ของ AI อยู่แล้ว ใช้ Platform ของเราในราคาถูกกว่า
  // เราไม่เสียค่า AI Token → ราคาถูกลง
  byok: {
    label:       "BYOK Plan (ใช้ API Key ของตัวเอง)",
    price:       490,
    msgLimit:    999999,   // ไม่จำกัด — ผู้ใช้รับผิดชอบค่า AI เอง
    tokenLimit:  999999,
    maxAdmins:   3,
    maxProducts: 500,
    features: {
      marketplace:       true,
      allPlatforms:      true,
      advancedAI:        true,
      teamMembers:       true,
      apiKeys:           true,   // ต้องใส่ key ของตัวเอง (บังคับ)
      advancedAnalytics: true,
      rag:               false,
      multiWorkspace:    false,
      byok:              true,   // flag: ใช้ custom_ai_key จาก workspace
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────

function getPlanLimits(planName) {
  return PLAN_LIMITS[planName] || PLAN_LIMITS.trial;
}

function isFeatureAllowed(planName, featureKey) {
  return getPlanLimits(planName).features[featureKey] ?? false;
}

function isQuotaExceeded(workspace, type = "msg") {
  // BYOK plan: ผู้ใช้ใช้ key ของตัวเอง ไม่จำกัด quota จากฝั่งเรา
  if (workspace.plan === "byok") return false;
  const limits = getPlanLimits(workspace.plan);
  if (type === "msg")   return workspace.msg_used   >= limits.msgLimit;
  if (type === "token") return workspace.token_used >= limits.tokenLimit;
  return false;
}

function isTrialExpired(workspace) {
  return workspace.plan === "trial"
    && workspace.trial_expires_at
    && new Date(workspace.trial_expires_at) < new Date();
}

// ── Express Middleware Factory ────────────────────────────────

/**
 * requireFeature(featureKey)
 * ใช้หลัง jwtMiddleware + loadWorkspace
 * ตัวอย่าง: router.get('/shopee', jwtMiddleware, loadWorkspace, requireFeature('marketplace'), handler)
 */
function requireFeature(featureKey) {
  return (req, res, next) => {
    const plan = req.workspace?.plan || "starter";
    if (!isFeatureAllowed(plan, featureKey)) {
      const requiredPlan = Object.entries(PLAN_LIMITS)
        .find(([, v]) => v.features[featureKey])?.[0] || "pro";
      return res.status(403).json({
        error:        "PLAN_LIMIT",
        feature:      featureKey,
        requiredPlan,
        message:      `ฟีเจอร์นี้ต้องการแพ็กเกจ ${getPlanLimits(requiredPlan).label}`,
        currentPlan:  plan,
      });
    }
    next();
  };
}

/**
 * checkQuota(type)
 * ตรวจว่ายังมีโควต้าเหลือหรือเปล่า ก่อนส่งข้อความ/เรียก AI
 */
function checkQuota(type = "msg") {
  return (req, res, next) => {
    if (req.workspace && isQuotaExceeded(req.workspace, type)) {
      return res.status(429).json({
        error:   "QUOTA_EXCEEDED",
        type,
        message: `โควต้า${type === "msg" ? "ข้อความ" : "AI Token"}หมดแล้ว กรุณาอัพเกรดแพ็กเกจ`,
      });
    }
    next();
  };
}

module.exports = {
  PLAN_LIMITS,
  getPlanLimits,
  isFeatureAllowed,
  isQuotaExceeded,
  isTrialExpired,
  requireFeature,
  checkQuota,
};
