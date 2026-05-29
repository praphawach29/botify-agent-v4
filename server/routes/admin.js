module.exports = function(app) {

// Auto-generated from chunks
const axios = require("axios");
const { supabase } = require("../config/db");
const { refreshClients } = require("../config/globals");
const { authMW } = require("../middleware/auth");
const { sanitize } = require("../utils/helpers");
const { notifySettingsCache, linePush } = require("../services/notificationService");
// --- 31_Packages_CRUD__Super_Admin_.js ---
// ═══════════════════════════════════════════════════════════
//  Packages CRUD (Super Admin)
// ═══════════════════════════════════════════════════════════
app.get("/api/packages", authMW, async (req, res) => {
  try {
    if (!supabase) return res.json({ success: true, packages: [] });
    const { data, error } = await supabase.from("packages").select("*").order("sort_order");
    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, packages: data || [] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post("/api/packages", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "ต้องเป็น Super Admin" });
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });
    const { name, price, msg_limit, product_limit, description, features } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "ต้องการชื่อแพ็กเกจ" });
    const { data, error } = await supabase.from("packages").insert({
      name, price: price || 0, msg_limit: msg_limit || 100, product_limit: product_limit || 20,
      description: description || "", features: features || [],
    }).select().single();
    if (error) return res.status(400).json({ success: false, error: error.message });
    res.json({ success: true, package: data });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

app.put("/api/packages/:id", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "ต้องเป็น Super Admin" });
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });
    const { name, price, msg_limit, product_limit, description, features } = req.body;
    const { data, error } = await supabase.from("packages").update({
      name, price, msg_limit, product_limit, description, features, updated_at: new Date().toISOString(),
    }).eq("id", req.params.id).select().single();
    if (error) return res.status(400).json({ success: false, error: error.message });
    res.json({ success: true, package: data });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

app.delete("/api/packages/:id", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "ต้องเป็น Super Admin" });
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });
    const { error } = await supabase.from("packages").delete().eq("id", req.params.id);
    if (error) return res.status(400).json({ success: false, error: error.message });
    res.json({ success: true, message: "ลบแพ็กเกจเรียบร้อยแล้ว" });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});


app.post("/api/broadcast", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "ต้องเป็น Super Admin" });
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });
    const { target, shopIds, message } = req.body;
    if (!message) return res.status(400).json({ success: false, error: "Message is required" });

    let query = supabase.from("shops").select("id, name, line_token, owner_line_id").eq("is_active", true);
    if (target === "selected" && Array.isArray(shopIds) && shopIds.length > 0) {
      query = query.in("id", shopIds);
    }
    const { data: shops, error } = await query;
    if (error) throw error;

    let successCount = 0;
    for (const shop of shops) {
      if (shop.line_token && shop.owner_line_id) {
        const sent = await linePush(shop.line_token, shop.owner_line_id, message);
        if (sent) successCount++;
      }
    }
    res.json({ success: true, count: successCount, total: shops.length });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get("/api/admin/chat-logs", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "ต้องเป็น Super Admin" });
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });
    
    // Fetch logs joined with shop name
    const { data, error } = await supabase
      .from("chat_logs")
      .select("*, shops (name)")
      .order("created_at", { ascending: false })
      .limit(100);
      
    if (error) throw error;
    
    const formattedLogs = data.map(log => ({
      time: new Date(log.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", hour12: false }),
      shop: log.shops ? log.shops.name : "Unknown Shop",
      platform: log.platform || "LINE",
      direction: log.direction || "in",
      user_name: log.user_name || log.user_id || "Unknown",
      message: log.message || ""
    }));

    res.json({ success: true, logs: formattedLogs });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});


// --- 32_AI_Config_per_Shop__Super_Admin_.js ---
// ═══════════════════════════════════════════════════════════
//  AI Config per Shop (Super Admin)
// ═══════════════════════════════════════════════════════════
app.put("/api/shops/:id/ai", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "ต้องเป็น Super Admin" });
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });
    const { ai_provider, ai_model, ai_key } = req.body;
    const update = { ai_provider, ai_model, updated_at: new Date().toISOString() };
    if (ai_key !== undefined) update.ai_key = ai_key;
    const { data, error } = await supabase.from("shops").update(update)
      .eq("id", req.params.id).select("id, name, ai_provider, ai_model, ai_key").single();
    if (error) return res.status(400).json({ success: false, error: error.message });
    // Mask key in response
    if (data.ai_key) data.ai_key = "•".repeat(Math.max(0, data.ai_key.length - 4)) + data.ai_key.slice(-4);
    res.json({ success: true, shop: data });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});


// --- 33_Global_Settings__Super_Admin_.js ---
// ═══════════════════════════════════════════════════════════
//  Global Settings (Super Admin)
// ═══════════════════════════════════════════════════════════
app.get("/api/settings", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "ต้องเป็น Super Admin" });
    if (!supabase) return res.json({ success: true, settings: {} });
    const { data } = await supabase.from("settings").select("key, value");
    const settings = {};
    (data || []).forEach(r => {
      // Mask API keys — show only last 4 chars
      if (r.key.endsWith("_key") && r.value) {
        settings[r.key] = r.value.length > 4 ? ("•".repeat(r.value.length - 4) + r.value.slice(-4)) : r.value;
        settings[r.key + "_set"] = true;
      } else {
        settings[r.key] = r.value;
      }
    });
    res.json({ success: true, settings });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.put("/api/settings", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "ต้องเป็น Super Admin" });
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ success: false, error: "key is required" });
    const { error } = await supabase.from("settings").upsert({
      key, value: value || "", updated_at: new Date().toISOString(),
    });
    if (error) return res.status(400).json({ success: false, error: error.message });
    res.json({ success: true });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});


// --- 34_Billing_CRUD__Super_Admin_.js ---
// ═══════════════════════════════════════════════════════════
//  Billing CRUD (Super Admin)
// ═══════════════════════════════════════════════════════════
app.get("/api/billing", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "ต้องเป็น Super Admin" });
    if (!supabase) return res.json({ success: true, bills: [] });
    const { data } = await supabase.from("billing").select("*, shops(name)").order("created_at", { ascending: false });
    res.json({ success: true, bills: data || [] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post("/api/billing", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "ต้องเป็น Super Admin" });
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });
    const { shop_id, package_name, amount, period_start, period_end, note } = req.body;
    // Input validation
    let cleanShopId;
    try { cleanShopId = sanitize.uuid(shop_id); } catch (e) {
      return res.status(400).json({ success: false, error: "shop_id ไม่ถูกต้อง" });
    }
    const cleanAmount = Math.max(0, Number(amount) || 0);
    const { data, error } = await supabase.from("billing").insert({
      shop_id: cleanShopId,
      package_name: sanitize.text(package_name, 100) || "Pro",
      amount: cleanAmount,
      period_start: period_start || new Date().toISOString().slice(0,10),
      period_end: period_end || new Date(Date.now() + 30*86400000).toISOString().slice(0,10),
      status: "pending",
      note: sanitize.text(note, 500),
    }).select("*, shops(name)").single();
    if (error) return res.status(400).json({ success: false, error: error.message });
    res.json({ success: true, bill: data });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

app.put("/api/billing/:id", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "ต้องเป็น Super Admin" });
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });
    const { status, payment_method, payment_ref, note } = req.body;
    const update = { status, updated_at: new Date().toISOString() };
    if (payment_method !== undefined) update.payment_method = payment_method;
    if (payment_ref !== undefined) update.payment_ref = payment_ref;
    if (note !== undefined) update.note = note;
    if (status === "paid") {
      update.paid_at = new Date().toISOString();
      update.confirmed_by = "superadmin";
      // Auto-extend shop expiry
      const { data: bill } = await supabase.from("billing").select("shop_id, period_end").eq("id", req.params.id).single();
      if (bill) {
        await supabase.from("shops").update({
          status: "active", expired_at: bill.period_end + "T23:59:59Z", updated_at: new Date().toISOString(),
        }).eq("id", bill.shop_id);
      }
    }
    if (status === "overdue") {
      const { data: bill } = await supabase.from("billing").select("shop_id").eq("id", req.params.id).single();
      if (bill) {
        await supabase.from("shops").update({ status: "suspended", updated_at: new Date().toISOString() }).eq("id", bill.shop_id);
      }
    }
    const { data, error } = await supabase.from("billing").update(update)
      .eq("id", req.params.id).select("*, shops(name)").single();
    if (error) return res.status(400).json({ success: false, error: error.message });
    res.json({ success: true, bill: data });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});


// --- 39____NOTIFICATION_SETTINGS_API.js ---
// ═══════════════════════════════════════════════════════════
//  🔔 NOTIFICATION SETTINGS API
// ═══════════════════════════════════════════════════════════
app.get("/api/notifications/settings", authMW, async (req, res) => {
  try {
    const shopId = req.auth.shopId;
    if (!shopId || !supabase) return res.json({ settings: {} });
    const { data } = await supabase.from("shops")
      .select("notify_new_order, notify_low_stock, notify_daily_summary, notify_new_chat, owner_line_id")
      .eq("id", shopId).single();
    res.json({ success: true, settings: data || {} });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/notifications/settings", authMW, async (req, res) => {
  try {
    const shopId = req.auth.shopId;
    if (!shopId || !supabase) return res.status(400).json({ success: false, error: "ไม่พบ shop" });
    const { notify_new_order, notify_low_stock, notify_daily_summary, notify_new_chat } = req.body;
    const { data, error } = await supabase.from("shops").update({
      notify_new_order: sanitize.bool(notify_new_order),
      notify_low_stock: sanitize.bool(notify_low_stock),
      notify_daily_summary: sanitize.bool(notify_daily_summary),
      notify_new_chat: sanitize.bool(notify_new_chat),
      updated_at: new Date().toISOString(),
    }).eq("id", shopId).select().single();
    if (error) return res.status(400).json({ success: false, error: error.message });
    // ล้าง cache
    delete notifySettingsCache[`ns_${shopId}`];
    res.json({ success: true, settings: data });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});


// --- 40____CHANNEL_MANAGEMENT_API__________LINE_FB_Sheet________.js ---
// ═══════════════════════════════════════════════════════════
//  🔌 CHANNEL MANAGEMENT API — จัดการ LINE/FB/Sheet ต่อร้าน
// ═══════════════════════════════════════════════════════════

// ดึงค่า channel config ของร้าน
app.get("/api/channels", authMW, async (req, res) => {
  try {
    const shopId = req.auth.shopId;
    if (!shopId || !supabase) return res.json({ success: false, error: "ไม่พบร้าน" });
    const { data, error } = await supabase.from("shops")
      .select("line_token, line_bot_id, owner_line_id, fb_token, fb_page_id, sheet_id")
      .eq("id", shopId).single();
    if (error) return res.status(400).json({ success: false, error: error.message });
    // Mask tokens สำหรับ security (แสดงแค่ 8 ตัวท้าย)
    const mask = (v) => v && v.length > 12 ? "•".repeat(v.length - 8) + v.slice(-8) : v || "";
    res.json({
      success: true,
      channels: {
        line_token:     mask(data.line_token),
        line_bot_id:    data.line_bot_id || "",
        owner_line_id:  data.owner_line_id || "",
        fb_token:       mask(data.fb_token),
        fb_page_id:     data.fb_page_id || "",
        sheet_id:       data.sheet_id || "",
      },
      connected: {
        line: !!(data.line_token && data.line_bot_id),
        facebook: !!(data.fb_token && data.fb_page_id),
        sheet: !!data.sheet_id,
      },
    });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// อัพเดท channel config
app.put("/api/channels", authMW, async (req, res) => {
  try {
    const shopId = req.auth.shopId;
    if (!shopId || !supabase) return res.status(400).json({ success: false, error: "ไม่พบร้าน" });

    const { line_token, line_bot_id, owner_line_id, fb_token, fb_page_id, sheet_id } = req.body;
    const updates = { updated_at: new Date().toISOString() };

    // อัพเดทเฉพาะ field ที่ส่งมา (ไม่ overwrite ด้วยค่าว่าง)
    if (line_token !== undefined && !line_token.includes("•")) updates.line_token = sanitize.text(line_token, 500) || null;
    if (line_bot_id !== undefined)    updates.line_bot_id = sanitize.text(line_bot_id, 200) || null;
    if (owner_line_id !== undefined)  updates.owner_line_id = sanitize.text(owner_line_id, 200) || null;
    if (fb_token !== undefined && !fb_token.includes("•")) updates.fb_token = sanitize.text(fb_token, 500) || null;
    if (fb_page_id !== undefined)     updates.fb_page_id = sanitize.text(fb_page_id, 200) || null;
    if (sheet_id !== undefined)       updates.sheet_id = sanitize.text(sheet_id, 200) || null;

    const { data, error } = await supabase.from("shops")
      .update(updates).eq("id", shopId).select().single();
    if (error) return res.status(400).json({ success: false, error: error.message });

    // 🔄 Hot-reload clients ทันทีหลังบันทึก
    await refreshClients();

    res.json({ success: true, message: "บันทึกสำเร็จ — ระบบอัพเดทแล้ว" });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// ทดสอบ LINE Token — เรียก LINE API ดูว่า token ใช้ได้หรือไม่
app.post("/api/channels/test-line", authMW, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: "กรุณาระบุ LINE Token" });
    const { data } = await axios.get("https://api.line.me/v2/bot/info", {
      headers: { Authorization: `Bearer ${token}` },
    });
    res.json({
      success: true,
      bot: { displayName: data.displayName, userId: data.userId, pictureUrl: data.pictureUrl || "" },
    });
  } catch (err) {
    const status = err.response?.status;
    const msg = status === 401 ? "Token ไม่ถูกต้องหรือหมดอายุ" : (err.response?.data?.message || err.message);
    res.status(400).json({ success: false, error: msg });
  }
});

// Force refresh clients (Super Admin)
app.post("/api/admin/refresh-clients", authMW, async (req, res) => {
  if (req.auth.role !== "superadmin") return res.status(403).json({ error: "Forbidden" });
  const clients = await refreshClients();
  res.json({ success: true, count: clients.length, clients: clients.map(c => ({ name: c.name, shopId: c.shopId, hasLine: !!c.lineToken, hasFb: !!c.fbToken })) });
});




};
