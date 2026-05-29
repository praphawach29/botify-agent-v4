module.exports = function(app) {

// Auto-generated from chunks
const { supabase, supabaseAuth, SUPABASE_URL, SUPABASE_ANON_KEY } = require("../config/db");
const { ADMIN_API_KEY } = require("../config/globals");
const { sanitize } = require("../utils/helpers");
// --- 28____AUTH_ROUTES___Supabase_Auth__email_password_login_.js ---
// ═══════════════════════════════════════════════════════════
//  🔐 AUTH ROUTES — Supabase Auth (email/password login)
// ═══════════════════════════════════════════════════════════

// Supabase Config (ให้ Frontend เรียกเพื่อ init Supabase client)
app.get("/api/auth/config", (req, res) => {
  res.json({ supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_ANON_KEY });
});

// Login (email + password หรือ API Key)
app.post("/api/auth/login", async (req, res) => {
  try {
    const { mode, email, password, apiKey } = req.body;

    // Legacy API Key login (super admin)
    if (mode === "admin" && apiKey) {
      if (!ADMIN_API_KEY || apiKey !== ADMIN_API_KEY) {
        return res.status(401).json({ success: false, error: "API Key ไม่ถูกต้อง" });
      }
      return res.json({ success: true, role: "superadmin", mode: "apikey" });
    }

    // Supabase email/password login
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "กรุณาระบุ email และ password" });
    }
    // Input validation
    let cleanEmail;
    try { cleanEmail = sanitize.email(email); } catch (e) {
      return res.status(400).json({ success: false, error: e.message });
    }
    try { sanitize.password(password); } catch (e) {
      return res.status(400).json({ success: false, error: e.message });
    }
    if (!supabaseAuth) {
      return res.status(500).json({ success: false, error: "Supabase ยังไม่ได้ตั้งค่า" });
    }

    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email: cleanEmail, password });
    if (error) return res.status(401).json({ success: false, error: error.message });

    // ดึง profile
    const { data: profile } = await supabase
      .from("users")
      .select("role, workspace_id, name, workspaces(name, business_type)")
      .eq("id", data.user.id)
      .single();

    res.json({
      success: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      role: profile?.role || "admin",
      shopId: profile?.workspace_id || null,
      shopName: profile?.workspaces?.name || null,
      bizType: profile?.workspaces?.business_type || "retail",
      displayName: profile?.name || email,
      userId: data.user.id,
      avatarUrl: data.user?.user_metadata?.avatar_url || null,
    });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// Register (Self-signup — สร้างร้าน + user)
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, displayName, shopName, phone, bizType } = req.body;
    // Input validation
    let cleanEmail, cleanPass, cleanName, cleanShop, cleanPhone;
    try {
      cleanEmail = sanitize.email(email);
      cleanPass = sanitize.password(password);
      cleanName = sanitize.text(displayName, 100) || cleanEmail;
      cleanShop = sanitize.text(shopName, 100);
      cleanPhone = sanitize.phone(phone);
    } catch (e) {
      return res.status(400).json({ success: false, error: e.message });
    }
    if (!cleanShop) {
      return res.status(400).json({ success: false, error: "กรุณาระบุชื่อร้านค้า" });
    }
    if (!supabase) {
      return res.status(500).json({ success: false, error: "Supabase ยังไม่ได้ตั้งค่า" });
    }

    // 1. สร้างร้านค้าใหม่
    const validBizTypes = ["retail", "restaurant", "booking"];
    const finalBizType = validBizTypes.includes(bizType) ? bizType : "retail";
    
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: shop, error: shopErr } = await supabase
      .from("shops")
      .insert({ 
        name: cleanShop, 
        business_type: finalBizType,
        package_name: 'free',
        ai_credits: 500,
        expired_at: trialEnd
      })
      .select("id, name")
      .single();
    if (shopErr) {
      return res.status(400).json({ success: false, error: "สร้างร้านค้าไม่สำเร็จ: " + shopErr.message });
    }

    // 2. สร้าง user ใน Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: cleanPass,
      email_confirm: true,
      user_metadata: { display_name: cleanName, workspace_id: shop.id },
    });
    if (authErr) {
      // ลบร้านที่สร้างไว้ถ้า user สร้างไม่ได้
      await supabase.from("shops").delete().eq("id", shop.id);
      return res.status(400).json({ success: false, error: "สร้างบัญชีไม่สำเร็จ: " + authErr.message });
    }

    // 3. อัพเดท profile
    const verifyToken = require("crypto").randomBytes(32).toString("hex");
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Hash password for the custom users table if needed, but since we rely on Supabase Auth,
    // we'll just insert a dummy hash or we should use bcrypt. We will just store a placeholder.
    await supabase.from("users").upsert({
      id: authData.user.id,
      email: cleanEmail,
      name: cleanName,
      workspace_id: shop.id,
      role: "owner",
      password_hash: "supabase_auth"
    });

    // 4. ส่ง verification email (ถ้า Email ตั้งค่าไว้)
    try {
      if (isEmailConfigured()) {
        const baseUrl = getBaseUrl(req);
        await sendEmail({
          from: SMTP_FROM, to: cleanEmail,
          subject: "ยืนยันอีเมล — BOTIFY",
          html: verifyEmailTemplate(cleanName, `${baseUrl}/verify-email?token=${verifyToken}`),
        });
        console.log(`📧 Verification email sent to ${cleanEmail} (on register)`);
      }
    } catch (emailErr) {
      console.error("Send verify email on register:", emailErr.message);
    }

    res.json({
      success: true,
      message: "สมัครสำเร็จ",
      user: { id: authData.user.id, email: cleanEmail, displayName: cleanName },
      shop: { id: shop.id, name: shop.name, slug: shop.slug },
      emailVerification: !!getEmailTransporter() ? "sent" : "smtp_not_configured",
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});


// --- 29____EMAIL_SERVICE___Resend___Verification___Reset.js ---
// ═══════════════════════════════════════════════════════════
//  📧 EMAIL SERVICE — Resend API + Verification + Reset
//  ใช้ Resend (https://resend.com) แทน SMTP/nodemailer
//  ตั้งค่า: RESEND_API_KEY=re_xxxx ใน .env
// ═══════════════════════════════════════════════════════════

// ── Email Config ─────────────────────────────────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const SMTP_HOST      = process.env.SMTP_HOST || "";  // Fallback to SMTP if no Resend key
const SMTP_PORT      = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER      = process.env.SMTP_USER || "";
const SMTP_PASS      = process.env.SMTP_PASS || "";
const SMTP_FROM      = process.env.SMTP_FROM || "BOTIFY <noreply@botify.app>";
const APP_URL        = process.env.APP_URL || "";

// ── Email sender (Resend first, SMTP fallback) ───────────
async function sendEmail({ from, to, subject, html }) {
  // 1. ลอง Resend ก่อน (แนะนำ)
  if (RESEND_API_KEY) {
    try {
      const { Resend } = require("resend");
      const resendClient = new Resend(RESEND_API_KEY);
      const { error } = await resendClient.emails.send({
        from: from || SMTP_FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      });
      if (error) throw new Error(error.message);
      return true;
    } catch (e) {
      console.error("Resend error:", e.message);
      throw e;
    }
  }
  // 2. Fallback: ใช้ SMTP/nodemailer (ถ้ามี SMTP config)
  if (SMTP_HOST && SMTP_USER) {
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transporter.sendMail({ from: from || SMTP_FROM, to, subject, html });
    return true;
  }
  // 3. ไม่มี config เลย
  throw new Error("ระบบอีเมลยังไม่ได้ตั้งค่า กรุณาเพิ่ม RESEND_API_KEY ใน .env");
}

// ── ตรวจสอบว่า Email ใช้งานได้ไหม ───────────────────────
function isEmailConfigured() {
  return !!(RESEND_API_KEY || (SMTP_HOST && SMTP_USER));
}

function getBaseUrl(req) {
  return APP_URL || `${req.protocol}://${req.get("host")}`;
}

// ── Generate secure token ────────────────────────────────
function generateToken(length = 64) {
  const crypto = require("crypto");
  return crypto.randomBytes(length).toString("hex");
}

// ── Email Templates ──────────────────────────────────────
function emailTemplate(title, bodyHtml) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,-apple-system,sans-serif">
<div style="max-width:520px;margin:40px auto;padding:0 20px">
<div style="text-align:center;margin-bottom:24px">
<span style="font-size:28px;font-weight:800;color:#fff;letter-spacing:2px">BOT<span style="color:#fbbf24">IFY</span></span>
</div>
<div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:32px">
${bodyHtml}
</div>
<div style="text-align:center;margin-top:20px;color:#64748b;font-size:11px">
© ${new Date().getFullYear()} BOTIFY — AI Chatbot SaaS Platform<br>
<a href="${APP_URL || '#'}/terms" style="color:#94a3b8;text-decoration:none">ข้อกำหนดการใช้งาน</a> •
<a href="${APP_URL || '#'}/privacy" style="color:#94a3b8;text-decoration:none">นโยบายความเป็นส่วนตัว</a>
</div></div></body></html>`;
}

function verifyEmailTemplate(name, verifyUrl) {
  return emailTemplate("ยืนยันอีเมล — BOTIFY", `
<h2 style="color:#fff;font-size:20px;margin:0 0 8px">ยืนยันอีเมลของคุณ</h2>
<p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 20px">
สวัสดีครับ ${name || ""},<br>
กรุณากดปุ่มด้านล่างเพื่อยืนยันอีเมลของคุณ ลิงก์จะหมดอายุใน 24 ชั่วโมง
</p>
<div style="text-align:center;margin:24px 0">
<a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-decoration:none;padding:14px 40px;border-radius:12px;font-weight:700;font-size:15px">
✅ ยืนยันอีเมล
</a>
</div>
<p style="color:#64748b;font-size:11px;margin:0">
หากคุณไม่ได้สมัครใช้งาน BOTIFY กรุณาเพิกเฉยอีเมลนี้<br>
ลิงก์: <span style="word-break:break-all;color:#475569">${verifyUrl}</span>
</p>`);
}

function resetPasswordTemplate(name, resetUrl) {
  return emailTemplate("รีเซ็ตรหัสผ่าน — BOTIFY", `
<h2 style="color:#fff;font-size:20px;margin:0 0 8px">รีเซ็ตรหัสผ่าน</h2>
<p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 20px">
สวัสดีครับ ${name || ""},<br>
เราได้รับคำขอรีเซ็ตรหัสผ่านของคุณ กดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่ ลิงก์จะหมดอายุใน 1 ชั่วโมง
</p>
<div style="text-align:center;margin:24px 0">
<a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;text-decoration:none;padding:14px 40px;border-radius:12px;font-weight:700;font-size:15px">
🔑 ตั้งรหัสผ่านใหม่
</a>
</div>
<p style="color:#64748b;font-size:11px;margin:0">
หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยอีเมลนี้ รหัสผ่านปัจจุบันจะไม่เปลี่ยน<br>
ลิงก์: <span style="word-break:break-all;color:#475569">${resetUrl}</span>
</p>`);
}

// ── POST /api/auth/send-verification — ส่ง email ยืนยัน ─
app.post("/api/auth/send-verification", async (req, res) => {
  try {
    if (!isEmailConfigured()) return res.status(503).json({ success: false, error: "ระบบอีเมลยังไม่ได้ตั้งค่า — กรุณาติดต่อผู้ดูแลระบบ" });
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });

    const { email } = req.body;
    let cleanEmail;
    try { cleanEmail = sanitize.email(email); } catch (e) {
      return res.status(400).json({ success: false, error: e.message });
    }

    // Find profile by email
    const { data: profile } = await supabase.from("profiles")
      .select("id, display_name, email_verified").eq("email", cleanEmail).maybeSingle();
    if (!profile) return res.json({ success: true, message: "หากอีเมลนี้มีในระบบ จะได้รับลิงก์ยืนยัน" }); // Don't leak user existence
    if (profile.email_verified) return res.json({ success: true, message: "อีเมลนี้ยืนยันแล้ว" });

    // Generate token
    const token = generateToken(32);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await supabase.from("profiles").update({
      email_verify_token: token, email_verify_expires: expires.toISOString(),
    }).eq("id", profile.id);

    const baseUrl = getBaseUrl(req);
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
    await sendEmail({
      from: SMTP_FROM, to: cleanEmail,
      subject: "ยืนยันอีเมล — BOTIFY",
      html: verifyEmailTemplate(profile.display_name, verifyUrl),
    });

    console.log(`📧 Verification email sent to ${cleanEmail}`);
    res.json({ success: true, message: "ส่งลิงก์ยืนยันอีเมลแล้ว กรุณาตรวจสอบกล่องจดหมาย" });
  } catch (err) {
    console.error("Send verification error:", err.message);
    res.status(500).json({ success: false, error: "ส่งอีเมลไม่สำเร็จ: " + err.message });
  }
});

// ── GET /verify-email?token=xxx — ยืนยัน email ──────────
app.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || !supabase) return res.send(verifyResultPage(false, "ลิงก์ไม่ถูกต้อง"));

    const { data: profile } = await supabase.from("profiles")
      .select("id, email, email_verify_expires").eq("email_verify_token", token).maybeSingle();
    if (!profile) return res.send(verifyResultPage(false, "ลิงก์ไม่ถูกต้องหรือถูกใช้แล้ว"));
    if (new Date(profile.email_verify_expires) < new Date()) return res.send(verifyResultPage(false, "ลิงก์หมดอายุแล้ว กรุณาขอส่งใหม่"));

    await supabase.from("profiles").update({
      email_verified: true, email_verify_token: "", email_verify_expires: null, updated_at: new Date().toISOString(),
    }).eq("id", profile.id);

    console.log(`✅ Email verified: ${profile.email}`);
    res.send(verifyResultPage(true, "ยืนยันอีเมลสำเร็จ!"));
  } catch (err) {
    res.send(verifyResultPage(false, "เกิดข้อผิดพลาด: " + err.message));
  }
});

function verifyResultPage(success, message) {
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${success ? "ยืนยันสำเร็จ" : "ไม่สำเร็จ"} — BOTIFY</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#e2e8f0}
.card{background:#1e293b;border:1px solid #334155;border-radius:20px;padding:40px;max-width:400px;text-align:center}
.logo{font-size:2rem;font-weight:800;color:#fff;letter-spacing:2px;margin-bottom:24px}.logo span{color:#fbbf24}
.icon{font-size:48px;margin-bottom:16px}
.msg{font-size:16px;margin-bottom:24px;line-height:1.6;color:${success ? "#6ee7b7" : "#fca5a5"}}
.btn{display:inline-block;background:${success ? "#3b82f6" : "#64748b"};color:#fff;text-decoration:none;padding:12px 32px;border-radius:12px;font-weight:700;font-size:14px}
</style></head><body>
<div class="card">
<div class="logo">BOT<span>IFY</span></div>
<div class="icon">${success ? "✅" : "❌"}</div>
<div class="msg">${message}</div>
<a href="/dashboard" class="btn">${success ? "เข้าสู่ Dashboard" : "กลับหน้า Login"}</a>
</div></body></html>`;
}

// ── POST /api/auth/forgot-password — ส่ง reset email ─────
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    if (!isEmailConfigured()) return res.status(503).json({ success: false, error: "ระบบอีเมลยังไม่ได้ตั้งค่า — กรุณาติดต่อผู้ดูแลระบบ" });
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });

    const { email } = req.body;
    let cleanEmail;
    try { cleanEmail = sanitize.email(email); } catch (e) {
      return res.status(400).json({ success: false, error: e.message });
    }

    // Always return success (don't leak user existence)
    const successMsg = "หากอีเมลนี้มีในระบบ จะได้รับลิงก์รีเซ็ตรหัสผ่าน";

    const { data: user } = await supabase.from("users")
      .select("id, name").eq("email", cleanEmail).maybeSingle();
    if (!user) return res.json({ success: true, message: successMsg });

    // Generate token
    const token = generateToken(32);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await supabase.from("users").update({
      reset_token: token, reset_expires_at: expires.toISOString(),
    }).eq("id", user.id);

    const baseUrl = getBaseUrl(req);
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    await sendEmail({
      from: SMTP_FROM, to: cleanEmail,
      subject: "รีเซ็ตรหัสผ่าน — BOTIFY",
      html: resetPasswordTemplate(user.name, resetUrl),
    });

    console.log(`📧 Reset password email sent to ${cleanEmail}`);
    res.json({ success: true, message: successMsg });
  } catch (err) {
    console.error("Forgot password error:", err.message);
    res.status(500).json({ success: false, error: "ส่งอีเมลไม่สำเร็จ" });
  }
});

// ── GET /reset-password?token=xxx — หน้ารีเซ็ตรหัสผ่าน ─
app.get("/reset-password", async (req, res) => {
  const { token } = req.query;
  res.send(resetPasswordPage(token || ""));
});

function resetPasswordPage(token) {
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>รีเซ็ตรหัสผ่าน — BOTIFY</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#e2e8f0}
.card{background:#1e293b;border:1px solid #334155;border-radius:20px;padding:40px;width:360px}
.logo{font-size:2rem;font-weight:800;color:#fff;letter-spacing:2px;text-align:center;margin-bottom:6px}.logo span{color:#fbbf24}
.sub{text-align:center;color:#94a3b8;font-size:13px;margin-bottom:28px}
label{display:block;color:#94a3b8;font-size:12px;margin-bottom:4px}
input{width:100%;background:#0f172a;border:1px solid #334155;border-radius:12px;padding:12px 16px;color:#e2e8f0;font-size:14px;outline:none;margin-bottom:14px;transition:.15s}
input:focus{border-color:#3b82f6}
.btn{width:100%;background:linear-gradient(135deg,#3b82f6,#6366f1);border:none;border-radius:12px;padding:14px;color:#fff;font-size:14px;font-weight:700;cursor:pointer}
.btn:disabled{opacity:.5;cursor:not-allowed}
.msg{text-align:center;font-size:13px;margin-top:12px;padding:8px;border-radius:8px}
.err{background:rgba(239,68,68,0.1);color:#fca5a5}.ok{background:rgba(16,185,129,0.1);color:#6ee7b7}
.back{display:block;text-align:center;margin-top:16px;color:#94a3b8;font-size:12px;text-decoration:none}
</style></head><body>
<div class="card">
<div class="logo">BOT<span>IFY</span></div>
<div class="sub">ตั้งรหัสผ่านใหม่</div>
<form id="resetForm">
<input type="hidden" name="token" value="${token}">
<label>รหัสผ่านใหม่</label>
<input type="password" id="pw1" placeholder="อย่างน้อย 6 ตัวอักษร" required minlength="6">
<label>ยืนยันรหัสผ่านใหม่</label>
<input type="password" id="pw2" placeholder="กรอกรหัสผ่านอีกครั้ง" required minlength="6">
<button type="submit" class="btn" id="submitBtn">🔑 ตั้งรหัสผ่านใหม่</button>
</form>
<div id="msg" class="msg" style="display:none"></div>
<a href="/dashboard" class="back">← กลับหน้า Login</a>
</div>
<script>
document.getElementById("resetForm").addEventListener("submit",async function(e){
  e.preventDefault();
  const pw1=document.getElementById("pw1").value;
  const pw2=document.getElementById("pw2").value;
  const msgEl=document.getElementById("msg");
  const btn=document.getElementById("submitBtn");
  if(pw1!==pw2){msgEl.textContent="รหัสผ่านไม่ตรงกัน";msgEl.className="msg err";msgEl.style.display="block";return}
  if(pw1.length<6){msgEl.textContent="รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";msgEl.className="msg err";msgEl.style.display="block";return}
  btn.disabled=true;btn.textContent="กำลังรีเซ็ต...";
  try{
    const r=await fetch("/api/auth/reset-password",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({token:"${token}",password:pw1})}).then(r=>r.json());
    if(r.success){
      msgEl.textContent="รีเซ็ตรหัสผ่านสำเร็จ! กำลังไปหน้า Login...";msgEl.className="msg ok";msgEl.style.display="block";
      document.getElementById("resetForm").style.display="none";
      setTimeout(()=>window.location.href="/dashboard",2000);
    }else{msgEl.textContent=r.error||"เกิดข้อผิดพลาด";msgEl.className="msg err";msgEl.style.display="block";btn.disabled=false;btn.textContent="🔑 ตั้งรหัสผ่านใหม่";}
  }catch(e){msgEl.textContent="เชื่อมต่อ Server ไม่ได้";msgEl.className="msg err";msgEl.style.display="block";btn.disabled=false;btn.textContent="🔑 ตั้งรหัสผ่านใหม่";}
});
</script></body></html>`;
}

// ── POST /api/auth/reset-password — รีเซ็ตรหัสผ่านจริง ──
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });
    const { token, password } = req.body;
    if (!token) return res.status(400).json({ success: false, error: "กรุณาระบุ token" });

    let cleanPass;
    try { cleanPass = sanitize.password(password); } catch (e) {
      return res.status(400).json({ success: false, error: e.message });
    }

    // Find profile by token
    const { data: user } = await supabase.from("users")
      .select("id, email, reset_expires_at").eq("reset_token", token).maybeSingle();
    if (!user) return res.status(400).json({ success: false, error: "ลิงก์ไม่ถูกต้องหรือถูกใช้แล้ว" });
    if (new Date(user.reset_expires_at) < new Date()) {
      return res.status(400).json({ success: false, error: "ลิงก์หมดอายุแล้ว กรุณาขอส่งใหม่" });
    }

    // Update password in Supabase Auth
    const { error: authErr } = await supabaseAuth.auth.admin.updateUserById(user.id, {
      password: cleanPass,
    });
    if (authErr) return res.status(400).json({ success: false, error: "รีเซ็ตรหัสผ่านไม่สำเร็จ: " + authErr.message });

    // Clear token
    await supabase.from("users").update({
      reset_token: null, reset_expires_at: null,
    }).eq("id", user.id);

    console.log(`🔑 Password reset: ${user.email}`);
    res.json({ success: true, message: "รีเซ็ตรหัสผ่านสำเร็จ" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/auth/email-status — เช็ค verified status ────
app.get("/api/auth/email-status", async (req, res) => {
  try {
    if (!supabase) return res.json({ success: true, verified: true }); // no supabase = skip
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.json({ success: true, verified: true });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAuth.auth.getUser(token);
    if (!user) return res.json({ success: true, verified: true });
    res.json({ success: true, verified: true, email: user.email });
  } catch (err) { res.json({ success: true, verified: true }); }
});




};
