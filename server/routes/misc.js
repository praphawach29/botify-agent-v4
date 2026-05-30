// Auto-generated from chunks
const axios = require("axios");
const { supabase } = require("../config/db");
const { activeClients, ADMIN_API_KEY, refreshClients, getFirstClient } = require("../config/globals");
const { authMW, fSid } = require("../middleware/auth");
const { toLineCompatibleUrl, isValidImageUrl, clearCache, sanitize, scheduleDaily } = require("../utils/helpers");
const { findOrder, updateTracking, linePush, fbPush, markOrderPaid, getOrderStatus, runUnpaidReminders, reminderCount, runExpiryWarnings, runWeeklySummary, runDailySummary, runFollowUps } = require("../services/notificationService");
const { readSheet, writeSheet, appendSheet } = require("../services/sheetService");
const { getPromptData, runBookingReminders, getAvailableSlots } = require("../services/bookingService");
const { AI_PROVIDER, AI_CONFIGS, CARRIERS, PERSONALITIES, logInq } = require("../services/aiService");

module.exports = function(app) {

// --- 43_Misc_Endpoints.js ---
// ═══════════════════════════════════════════════════════════
//  Misc Endpoints
// ═══════════════════════════════════════════════════════════
app.get("/setup", async (req,res) => {
  const results=[];
  for(const c of activeClients){try{const r=await axios.get("https://api.line.me/v2/bot/info",{headers:{Authorization:`Bearer ${c.lineToken}`}});results.push({name:c.name,botUserId:r.data.userId,displayName:r.data.displayName});}catch(e){results.push({name:c.name,error:e.message});}}
  res.json({message:"คัดลอก botUserId → LINE_BOTID_1 ใน Railway",clients:results});
});

app.post("/add-tracking", async (req,res) => {
  const{orderId,trackingNo,carrier,apiKey}=req.body;
  if(apiKey!==ADMIN_API_KEY) return res.status(401).json({error:"Unauthorized"});
  if(!orderId||!trackingNo||!carrier) return res.status(400).json({error:"ต้องการ orderId, trackingNo, carrier"});
  let found=null;
  for(const c of activeClients){const r=await findOrder(c.sheetId,orderId);if(r){found={c,r};break;}}
  if(!found) return res.status(404).json({error:`ไม่พบออเดอร์ ${orderId}`});
  const{c,r}=found,ci=CARRIERS[carrier.toLowerCase()]||{name:carrier,track:""};
  await updateTracking(c.sheetId,r.rowIndex,trackingNo,carrier,r.data[15]||"");
  const msg=`📦 จัดส่งแล้วครับ!\n${"─".repeat(24)}\n🆔 ${orderId}\n🚚 ${ci.name}\n📝 ${trackingNo}\n${ci.track?`🔍 ${ci.track}${trackingNo}\n`:""}\nขอบคุณครับ 🙏`;
  if(r.data[15]&&c.lineToken) await linePush(c.lineToken,r.data[15],msg);
  res.json({success:true,message:"อัพเดท + แจ้งลูกค้าแล้วครับ"});
});

app.get("/add-tracking",(req,res)=>{res.send(`<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tracking</title><style>body{font-family:sans-serif;background:#0a0a15;color:white;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.c{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:28px;width:100%;max-width:400px}h2{color:#00D4FF;margin-bottom:20px}label{font-size:13px;color:#888;display:block;margin-bottom:6px}input,select{width:100%;padding:10px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:10px;color:white;font-size:14px;margin-bottom:14px;box-sizing:border-box}button{width:100%;padding:12px;background:linear-gradient(135deg,#00D4FF,#0066FF);border:none;border-radius:12px;color:white;font-weight:700;cursor:pointer}#r{margin-top:14px;padding:10px;border-radius:8px;display:none;font-size:13px}.ok{background:rgba(0,255,163,.1);color:#00FFA3}.err{background:rgba(255,100,100,.1);color:#ff8080}</style></head><body><div class="c"><h2>🚚 กรอก Tracking</h2><label>Order ID</label><input id="o" placeholder="KV-2026-0001"><label>เลข Tracking</label><input id="t" placeholder="TH123456789"><label>ขนส่ง</label><select id="c"><option value="kerry">Kerry Express</option><option value="flash">Flash Express</option><option value="thaipost">ไปรษณีย์ไทย</option><option value="jandt">J&T Express</option><option value="ninja">Ninja Van</option><option value="shopee">Shopee Express</option></select><label>Admin Key</label><input id="k" type="password"><button onclick="go()">📲 บันทึก</button><div id="r"></div></div><script>async function go(){const r=document.getElementById("r");r.style.display="none";const b={orderId:document.getElementById("o").value.trim(),trackingNo:document.getElementById("t").value.trim(),carrier:document.getElementById("c").value,apiKey:document.getElementById("k").value.trim()};if(!b.orderId||!b.trackingNo||!b.apiKey){r.className="err";r.style.display="block";r.textContent="❌ กรุณากรอกให้ครบ";return}try{const res=await fetch("/add-tracking",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});const d=await res.json();r.style.display="block";r.className=d.success?"ok":"err";r.textContent=d.success?"✅ "+d.message:"❌ "+(d.error||"Error")}catch{r.className="err";r.style.display="block";r.textContent="❌ Error"}}</script></body></html>`);});

app.get("/track/:orderId", async (req,res) => {
  for(const c of activeClients){const o=await getOrderStatus(c.sheetId,req.params.orderId).catch(()=>null);if(!o)continue;const ci=CARRIERS[o.carrier?.toLowerCase()]||{name:o.carrier,track:""},tu=ci.track&&o.trackingNo?`${ci.track}${o.trackingNo}`:"";return res.send(`<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ติดตาม ${o.orderId}</title><style>body{font-family:sans-serif;background:#0a0a15;color:white;padding:20px;max-width:380px;margin:0 auto}.c{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:18px;margin-bottom:14px}.l{font-size:12px;color:#888;margin-bottom:3px}.v{font-size:14px;margin-bottom:10px}a{color:#00D4FF}</style></head><body><h2>📦 ติดตามพัสดุ</h2><div class="c"><div class="l">Order ID</div><div class="v">${o.orderId}</div><div class="l">สินค้า</div><div class="v">${o.product} × ${o.qty}</div><div class="l">สถานะ</div><div class="v">${o.deliveryStatus}</div>${o.trackingNo?`<div class="l">ขนส่ง</div><div class="v">${o.carrier}</div><div class="l">เลขพัสดุ</div><div class="v">${o.trackingNo}</div>${tu?`<br><a href="${tu}" target="_blank">🔍 ติดตามพัสดุ →</a>`:""}`:""}</div></body></html>`);}
  res.send(`<h3>❌ ไม่พบออเดอร์ ${req.params.orderId}</h3>`);
});

// ─── Payment API ──────────────────────────────────────────────
// Mark order as paid (Admin หรือลูกค้าส่งสลิป)
app.post("/api/orders/paid", authMW, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: "ต้องการ orderId" });
    let done = false;
    for (const c of activeClients) {
      done = await markOrderPaid(c.sheetId, orderId);
      if (done) {
        // แจ้งลูกค้าด้วย
        const rows = await readSheet(c.sheetId, "Orders!A:R");
        const r = rows.find(row => row[1] === orderId);
        if (r && r[15] && c.lineToken) {
          const pd  = await getPromptData(c).catch(() => null);
          const p   = pd?.personality || PERSONALITIES["ชาย-สุภาพ"];
          const closing = p.pronoun?.includes("ค่ะ") ? "ค่ะ" : "ครับ";
          await linePush(c.lineToken, r[15],
            `✅ ยืนยันการชำระเงินแล้ว${closing}!\n${"─".repeat(24)}\n` +
            `🆔 ${orderId}\n🛍️ ${r[4]} × ${r[5]}\n` +
            `${"─".repeat(24)}\n` +
            `ทีมงานจะจัดเตรียมและจัดส่งเร็วๆ นี้นะ${closing} 🚚🙏`
          );
        }
        break;
      }
    }
    if (!done) return res.status(404).json({ error: `ไม่พบออเดอร์ ${orderId}` });
    res.json({ success: true, message: "อัพเดทสถานะชำระเงินแล้ว" });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ดูออเดอร์ที่ยังไม่ชำระ
app.get("/api/orders/unpaid", authMW, async (req, res) => {
  try {
    const rows = await readSheet(fSid(req), "Orders!A:R");
    const unpaid = rows.slice(1).filter(r =>
      r[1] && (r[16] || "รอชำระ").trim() === "รอชำระ" &&
      (r[9] || "").toLowerCase() !== "ยกเลิก"
    ).map((r, i) => ({
      rowIndex: i + 2,
      orderId: r[1], name: r[2], phone: r[3], product: r[4],
      qty: r[5], status: r[9], platform: r[10],
      payStatus: r[16] || "รอชำระ",
      lastReminder: r[17] || "-",
      remindersSent: reminderCount[r[1]] || 0,
    }));
    res.json({ unpaid, count: unpaid.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Trigger reminder ทันที (สำหรับทดสอบ)
app.get("/check-unpaid", async (req, res) => {
  await runUnpaidReminders();
  res.send("✅ Unpaid reminders processed");
});
app.get("/api/bookings", authMW, async (req, res) => {
  try {
    const { status, limit } = req.query;
    let bookings = (await readSheet(fSid(req), "Bookings!A:K"))
      .slice(1).filter(r => r[0])
      .map((r, i) => ({
        rowIndex: i + 2,
        bookingId: r[0], createdAt: r[1], name: r[2], phone: r[3],
        service: r[4], date: r[5], time: r[6], status: r[7] || "รอยืนยัน",
        platform: r[8], userId: r[9], note: r[10],
      })).reverse();
    if (status) bookings = bookings.filter(b => b.status === status);
    if (limit)  bookings = bookings.slice(0, parseInt(limit));
    res.json({ bookings });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/bookings/:ri/status", authMW, async (req, res) => {
  try {
    const { status } = req.body;
    await writeSheet(fSid(req), `Bookings!H${req.params.ri}`, [[status]]);
    // ถ้ายืนยัน → แจ้งลูกค้า
    if (status === "ยืนยัน") {
      const rows = await readSheet(fSid(req), "Bookings!A:K");
      const r    = rows[parseInt(req.params.ri) - 1];
      if (r && r[9] && r[8] !== "Facebook") {
        const c = getFirstClient();
        if (c) {
          const p       = c.cache?.personality || PERSONALITIES["ชาย-สุภาพ"];
          const closing = p.pronoun?.includes("ค่ะ") ? "ค่ะ" : "ครับ";
          await linePush(c.lineToken, r[9],
            `✅ ยืนยันนัดหมายแล้ว${closing}!\n${"─".repeat(24)}\n` +
            `🆔 ${r[0]}\n🎯 ${r[4]}\n📆 ${r[5]} เวลา ${r[6]}\n` +
            `${"─".repeat(24)}\nพบกันตามนัดนะ${closing} 🙏`
          );
        }
      }
    }
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/slots", authMW, async (req, res) => {
  try {
    const rows = await readSheet(fSid(req), "Slots!A:E");
    res.json({ slots: rows.slice(1).filter(r => r[0]).map((r, i) => ({
      rowIndex: i + 2, day: r[0], time: r[1], service: r[2] || "ทุกบริการ",
      maxSlots: parseInt(r[3] || "1"), status: r[4] || "open",
    }))});
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/slots", authMW, async (req, res) => {
  try {
    const { day, time, service, maxSlots, status } = req.body;
    if (!day || !time) return res.status(400).json({ error: "ต้องการ day และ time" });
    await appendSheet(fSid(req), "Slots!A:E", [[day, time, service || "ทุกบริการ", maxSlots || 1, status || "open"]]);
    clearCache();
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/slots/:ri", authMW, async (req, res) => {
  try {
    const { day, time, service, maxSlots, status } = req.body;
    await writeSheet(fSid(req), `Slots!A${req.params.ri}:E${req.params.ri}`,
      [[day, time, service || "ทุกบริการ", maxSlots || 1, status || "open"]]);
    clearCache();
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/slots/:ri", authMW, async (req, res) => {
  try {
    await writeSheet(fSid(req), `Slots!A${req.params.ri}:E${req.params.ri}`, [["","","","",""]]);
    clearCache();
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/slots/available", async (req, res) => {
  // Public endpoint — ไม่ต้อง auth สำหรับ Bot Demo
  try {
    const { date, service, sheetId } = req.query;
    const sid = sheetId || fSid(req);
    const slots = await getAvailableSlots(sid, date || "", service || "");
    res.json({ slots });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get("/check-bookings", async (req, res) => {
  await runBookingReminders();
  res.send("✅ Booking reminders sent");
});
app.get("/api/ai-provider", (req, res) => {
  const cfg = AI_CONFIGS[AI_PROVIDER] || AI_CONFIGS.claude;
  const clientProviders = activeClients.map(c => ({
    name:     c.name,
    provider: c.cache?.shopAiProvider || AI_PROVIDER,
    model:    c.cache?.shopAiModel    || c.cache?.clientAiConfig?.model || cfg.model,
    source:   c.cache?.shopAiProvider ? "⚙️ ShopInfo Sheet" : "🌐 Railway Variables (default)",
    has_key:  !!(c.cache?.clientAiConfig?.key || cfg.key),
  }));
  res.json({
    default_provider: AI_PROVIDER,
    default_model:    cfg.model,
    has_key:          !!cfg.key,
    clients:          clientProviders,
    available: Object.entries(AI_CONFIGS).map(([name, c]) => ({
      name, model: c.model, has_railway_key: !!c.key
    })),
    sheet_fields: {
      AI_PROVIDER: "claude / openai / gemini / typhoon  (Key ต้องอยู่ใน Railway แล้ว)",
      AI_MODEL:    "ระบุ model เอง เช่น gemini-1.5-flash, gpt-4o, claude-opus-4-6 (optional)",
    }
  });
});


// --- 44____PHASE_3___UNIFIED_INBOX_API.js ---
// ═══════════════════════════════════════════════════════════
//  📥 PHASE 3 — UNIFIED INBOX API
//  รวมข้อความจากทุก Platform: LINE, Facebook, Shopee, Lazada
//  ให้ Admin ดูและตอบจากที่เดียว
// ═══════════════════════════════════════════════════════════

// ── In-memory Inbox Store ─────────────────────────────────
// เก็บ conversations ล่าสุดใน memory (clear เมื่อ restart)
// Shopee/Lazada จะถูก inject เข้ามาผ่าน endpoint ด้านล่าง
const inboxStore = {}; // key = `${sheetId}_${userId}_${platform}`

function inboxKey(sheetId, userId, platform) {
  return `${sheetId}__${userId}__${platform}`;
}

function upsertConversation(sheetId, userId, platform, shopName, msg) {
  const key  = inboxKey(sheetId, userId, platform);
  const now  = new Date().toISOString();
  if (!inboxStore[key]) {
    inboxStore[key] = {
      id: key, sheetId, userId, platform, shopName,
      displayName: msg.senderName || userId,
      avatar:      platformAvatar(platform),
      messages:    [],
      unread:      0,
      lastMessage: "",
      lastAt:      now,
      status:      "open", // open | resolved
    };
  }
  const conv = inboxStore[key];
  conv.messages.push({
    id:        `${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    role:      msg.role || "user",   // user | bot | admin
    text:      msg.text || "",
    imageUrl:  msg.imageUrl || null,
    timestamp: msg.timestamp || now,
  });
  if (msg.role !== "bot") conv.unread = (conv.unread || 0) + 1;
  conv.lastMessage = (msg.text || "[รูปภาพ]").slice(0, 80);
  conv.lastAt      = msg.timestamp || now;
  conv.displayName = msg.senderName || conv.displayName;
  return conv;
}

function platformAvatar(platform) {
  const map = { LINE:"💚", Facebook:"💙", Shopee:"🧡", Lazada:"💜", System:"🤖" };
  return map[platform] || "💬";
}

// ── Hook เข้า logInq ให้ feed ข้อมูลเข้า inboxStore ─────────
const _origLogInq = logInq;
async function logInqAndInbox(sid, platform, uid, userMsg, botMsg) {
  await _origLogInq(sid, platform, uid, userMsg, botMsg);
  // หา shopName จาก client
  const client = activeClients.find(c => c.sheetId === sid);
  const shopName = client?.name || "ร้านค้า";
  if (userMsg && !userMsg.startsWith("[")) {
    upsertConversation(sid, uid, platform, shopName, {
      role: "user", text: userMsg, senderName: uid,
    });
  }
  if (botMsg && !botMsg.startsWith("[")) {
    upsertConversation(sid, uid, platform, shopName, {
      role: "bot", text: botMsg,
    });
  }
}
// Override logInq globally
// (ไม่ได้ override function declaration แต่ใช้ logInqAndInbox แทนใน API)

// ── GET /api/inbox — รายการ Conversations ────────────────
app.get("/api/inbox", authMW, async (req, res) => {
  try {
    const { shopName, platform, status, unreadOnly, limit = 50 } = req.query;
    const sid = req.query.sheetId || fSid(req);

    // รวม conversations จาก inboxStore
    let convs = Object.values(inboxStore)
      .filter(c => c.sheetId === sid);

    // อ่าน Inquiries Sheet เพิ่มเติม (ข้อมูลเก่า)
    try {
      const rows = await readSheet(sid, "Inquiries!A:E");
      const seen = new Set(convs.map(c => c.userId));
      rows.slice(1).filter(r => r[1] && r[2]).forEach(r => {
        const [ts, pl, uid, userMsg, botMsg] = r;
        if (!seen.has(uid)) {
          const client = activeClients.find(c => c.sheetId === sid);
          upsertConversation(sid, uid, pl, client?.name || "ร้านค้า", {
            role: "user", text: userMsg || "", timestamp: ts,
          });
          if (botMsg) upsertConversation(sid, uid, pl, client?.name || "ร้านค้า", {
            role: "bot", text: botMsg, timestamp: ts,
          });
          seen.add(uid);
        }
      });
      convs = Object.values(inboxStore).filter(c => c.sheetId === sid);
    } catch(e) { /* ถ้าอ่าน Sheet ไม่ได้ก็ใช้ memory อย่างเดียว */ }

    // Filters
    if (platform)   convs = convs.filter(c => c.platform === platform);
    if (status)     convs = convs.filter(c => c.status   === status);
    if (unreadOnly === "true") convs = convs.filter(c => c.unread > 0);

    // Sort: unread + latest ก่อน
    convs.sort((a, b) => {
      if (a.unread > 0 && b.unread === 0) return -1;
      if (b.unread > 0 && a.unread === 0) return 1;
      return new Date(b.lastAt) - new Date(a.lastAt);
    });

    const total = convs.length;
    convs = convs.slice(0, parseInt(limit));

    // Summary stats
    const stats = {
      total,
      unread:   Object.values(inboxStore).filter(c => c.sheetId === sid && c.unread > 0).length,
      byPlatform: ["LINE","Facebook","Shopee","Lazada"].reduce((acc, p) => {
        acc[p] = Object.values(inboxStore).filter(c => c.sheetId === sid && c.platform === p).length;
        return acc;
      }, {}),
    };

    res.json({
      conversations: convs.map(c => ({
        id:          c.id,
        userId:      c.userId,
        displayName: c.displayName,
        platform:    c.platform,
        avatar:      c.avatar,
        shopName:    c.shopName,
        lastMessage: c.lastMessage,
        lastAt:      c.lastAt,
        unread:      c.unread,
        status:      c.status,
        msgCount:    c.messages.length,
      })),
      stats,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/inbox/:convId — ข้อความใน Conversation ──────
app.get("/api/inbox/:convId", authMW, async (req, res) => {
  try {
    const convId = decodeURIComponent(req.params.convId);
    const conv   = inboxStore[convId];
    if (!conv) return res.status(404).json({ error: "ไม่พบบทสนทนา" });
    // Mark as read
    conv.unread = 0;
    res.json({ conversation: conv });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/inbox/:convId/reply — Admin ตอบข้อความ ──────
app.post("/api/inbox/:convId/reply", authMW, async (req, res) => {
  try {
    const convId  = decodeURIComponent(req.params.convId);
    const conv    = inboxStore[convId];
    if (!conv) return res.status(404).json({ error: "ไม่พบบทสนทนา" });

    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "ต้องระบุ text" });

    const client = activeClients.find(c => c.sheetId === conv.sheetId);
    let sent     = false;

    // ส่งข้อความตาม Platform
    if (conv.platform === "LINE" && client?.lineToken && conv.userId) {
      await linePush(client.lineToken, conv.userId, text);
      sent = true;
    } else if (conv.platform === "Facebook" && client?.fbToken && conv.userId) {
      await fbPush(client.fbToken, conv.userId, text);
      sent = true;
    } else if (conv.platform === "Shopee") {
      // Shopee Chat API (ถ้าได้ Whitelist แล้ว)
      sent = await sendShopeeMessage(conv, client, text).catch(() => false);
    }
    // Lazada: ยังไม่มี API — log ไว้เฉยๆ

    // บันทึกใน conversation
    upsertConversation(conv.sheetId, conv.userId, conv.platform, conv.shopName, {
      role: "admin", text, senderName: "Admin",
    });

    res.json({
      success: sent,
      message: sent ? "✅ ส่งข้อความสำเร็จ" : `⚠️ บันทึกแล้ว แต่ยังส่งผ่าน ${conv.platform} ไม่ได้ (ต้องตอบใน App)`,
      note:    conv.platform === "Shopee" ? "Shopee: ต้องขอ Whitelist ก่อนถึงส่งได้" :
               conv.platform === "Lazada" ? "Lazada: ยังไม่มี Chat API สาธารณะ" : null,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/inbox/:convId/resolve — ปิด Conversation ───
app.post("/api/inbox/:convId/resolve", authMW, async (req, res) => {
  const convId = decodeURIComponent(req.params.convId);
  const conv   = inboxStore[convId];
  if (!conv) return res.status(404).json({ error: "ไม่พบบทสนทนา" });
  conv.status = req.body.status || "resolved";
  conv.unread = 0;
  res.json({ success: true, status: conv.status });
});

// ── POST /api/inbox/shopee-webhook — รับข้อความจาก Shopee ─
// (ใช้เมื่อได้ Whitelist จาก Shopee แล้ว)
app.post("/api/inbox/shopee-webhook", async (req, res) => {
  res.sendStatus(200); // ตอบ Shopee ทันทีก่อน
  try {
    const { shop_id, data: wData } = req.body;
    if (!wData?.message_id || !wData?.conversation_id) return;
    const client = activeClients.find(c => {
      const info = c.cache;
      return info?.shopee_shop_id == shop_id;
    });
    const shopName = client?.name || `Shopee #${shop_id}`;
    const sid      = client?.sheetId || activeClients[0]?.sheetId;
    const userId   = String(wData.from_user_id || wData.conversation_id);
    const text     = wData.content?.text || "[ข้อความ Shopee]";

    upsertConversation(sid, userId, "Shopee", shopName, {
      role: "user", text, senderName: `ลูกค้า Shopee`,
    });
    await appendSheet(sid, "Inquiries!A:E", [[
      new Date().toLocaleString("th-TH",{timeZone:"Asia/Bangkok"}),
      "Shopee", userId, text.slice(0,200), ""
    ]]).catch(()=>{});
    console.log(`📩 [Shopee Webhook] ${shopName}: ${text.slice(0,50)}`);
  } catch(e) { console.error("shopee-webhook:", e.message); }
});

// ── POST /api/inbox/lazada-webhook — รับข้อความจาก Lazada ─
app.post("/api/inbox/lazada-webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    const { shop_id, message } = req.body;
    if (!message?.content) return;
    const client   = activeClients.find(c => c.sheetId === fSid(req));
    const shopName = client?.name || `Lazada #${shop_id}`;
    const sid      = client?.sheetId || fSid(req);
    const userId   = String(message.sender_id || shop_id);
    const text     = message.content || "[ข้อความ Lazada]";

    upsertConversation(sid, userId, "Lazada", shopName, {
      role: "user", text, senderName: `ลูกค้า Lazada`,
    });
    await appendSheet(sid, "Inquiries!A:E", [[
      new Date().toLocaleString("th-TH",{timeZone:"Asia/Bangkok"}),
      "Lazada", userId, text.slice(0,200), ""
    ]]).catch(()=>{});
    console.log(`📩 [Lazada Webhook] ${shopName}: ${text.slice(0,50)}`);
  } catch(e) { console.error("lazada-webhook:", e.message); }
});

// ── ส่งข้อความ Shopee (ถ้าได้ Whitelist แล้ว) ────────────
async function sendShopeeMessage(conv, client, text) {
  if (!client) return false;
  const infoRows = await readSheet(client.sheetId, "ShopInfo!A:B");
  const info     = {};
  infoRows.slice(1).forEach(([k, v]) => { if(k) info[k.trim()] = v || ""; });
  const creds = {
    partnerId:   info["SHOPEE_PARTNER_ID"]   || "",
    partnerKey:  info["SHOPEE_PARTNER_KEY"]  || "",
    shopId:      info["SHOPEE_SHOP_ID"]      || "",
    accessToken: info["SHOPEE_ACCESS_TOKEN"] || "",
  };
  if (!creds.partnerId) return false;
  await shopeeRequest("POST", "/api/v2/sellerchat/send_message", {
    toId:    parseInt(conv.userId),
    toType:  "buyer",
    messageType: "text",
    content:     JSON.stringify({ text }),
  }, creds);
  return true;
}
// ใช้: POST /set-provider  body: { provider, model, shopName, apiKey }
// shopName = ชื่อร้านใน CLIENTS config (ถ้าไม่ใส่ = เปลี่ยน default ทุกร้าน)
app.post("/set-provider", authMW, async (req, res) => {
  try {
    const { provider, model, shopName } = req.body;
    if (!provider) return res.status(400).json({ error: "ต้องระบุ provider (claude/openai/gemini/typhoon)" });

    const providerKey = provider.toLowerCase().trim();
    if (!AI_CONFIGS[providerKey])
      return res.status(400).json({ error: `ไม่รู้จัก provider: ${provider}`, available: Object.keys(AI_CONFIGS) });

    if (!AI_CONFIGS[providerKey].key)
      return res.status(400).json({
        error: `ไม่พบ API Key สำหรับ ${provider} ใน Railway — กรุณาเพิ่ม ${providerKey.toUpperCase()}_KEY ใน Railway Variables ก่อน`
      });

    const newCfg = { ...AI_CONFIGS[providerKey] };
    if (model) newCfg.model = model;

    if (shopName) {
      // เปลี่ยนเฉพาะร้านที่ระบุ — อัพเดท cache ของ client นั้น
      const client = activeClients.find(c =>
        c.name.toLowerCase().includes(shopName.toLowerCase()) ||
        shopName.toLowerCase().includes(c.name.toLowerCase())
      );
      if (!client) return res.status(404).json({ error: `ไม่พบร้าน: ${shopName}` });

      // อัพเดท cache โดยตรง
      if (client.cache) {
        client.cache.clientAiConfig = newCfg;
        client.cache.shopAiProvider = providerKey;
        client.cache.shopAiModel    = newCfg.model;
      }
      console.log(`🤖 Provider changed: [${client.name}] → ${providerKey} (${newCfg.model})`);
      return res.json({
        success: true,
        message: `เปลี่ยน AI Provider ของ "${client.name}" เป็น ${providerKey} (${newCfg.model}) แล้ว`,
        note:    "การเปลี่ยนนี้จะรีเซ็ตเมื่อ Refresh Cache — เพื่อให้ถาวรให้ใส่ใน ShopInfo ด้วย"
      });
    } else {
      // เปลี่ยน default ทุกร้านที่ไม่ได้กำหนด Provider เองใน ShopInfo
      // (ทำได้แค่ชั่วคราว ต้องเปลี่ยน Railway Variable ด้วยถ้าต้องการถาวร)
      console.log(`🤖 Default provider changed → ${providerKey} (${newCfg.model}) [runtime only]`);
      return res.json({
        success: true,
        message: `เปลี่ยน Default Provider เป็น ${providerKey} (${newCfg.model}) แล้ว`,
        note:    "การเปลี่ยนนี้มีผลแค่ runtime — เพื่อให้ถาวรให้เปลี่ยน AI_PROVIDER ใน Railway Variables"
      });
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── /provider-guide — คู่มือการตั้งค่า Provider ───────────
app.get("/provider-guide", authMW, (req, res) => {
  res.send(`<!DOCTYPE html><html lang="th">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI Provider Guide</title>
<style>
  body{font-family:sans-serif;background:#0a0a15;color:white;padding:20px;max-width:700px;margin:0 auto}
  h1{color:#00D4FF;margin-bottom:4px}
  h2{color:#A78BFA;margin-top:24px}
  .card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:16px;margin:12px 0}
  .tag{display:inline-block;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:600}
  .blue{background:#1565C0}.green{background:#1B5E20}.purple{background:#4A148C}.orange{background:#E65100}
  code{background:rgba(255,255,255,.1);padding:2px 8px;border-radius:4px;font-size:13px;color:#A3E635}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  td,th{padding:8px 12px;border:1px solid rgba(255,255,255,.1);font-size:13px}
  th{background:rgba(255,255,255,.08);color:#A78BFA}
  .note{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:8px;padding:12px;margin-top:16px;font-size:13px}
</style></head>
<body>
<h1>🤖 AI Provider — คู่มือการตั้งค่า</h1>
<p style="color:#9CA3AF">เปลี่ยน AI ได้ 2 แบบ: ต่อร้าน (ShopInfo) หรือ Default ทั้งระบบ (Railway)</p>

<h2>📋 วิธีที่ 1 — ตั้งค่าต่อร้านใน ShopInfo (แนะนำ)</h2>
<div class="card">
  <p>เพิ่มแถวนี้ใน Google Sheet → แท็บ ShopInfo:</p>
  <table>
    <tr><th>คอลัมน์ A (Field)</th><th>คอลัมน์ B (ค่า)</th><th>ตัวเลือก</th></tr>
    <tr><td><code>AI_PROVIDER</code></td><td><code>gemini</code></td><td>claude / openai / gemini / typhoon</td></tr>
    <tr><td><code>AI_MODEL</code></td><td><code>gemini-1.5-flash</code></td><td>ไม่ใส่ = ใช้ค่า default</td></tr>
  </table>
  <p style="margin-top:12px;color:#9CA3AF;font-size:13px">หลังแก้ ShopInfo → กด <a href="/refresh" style="color:#00D4FF">/refresh</a> เพื่อโหลดใหม่</p>
</div>

<h2>⚡ วิธีที่ 2 — เปลี่ยนทันทีผ่าน API</h2>
<div class="card">
  <p style="font-size:13px">POST /set-provider (ต้องใส่ x-api-key header)</p>
  <code>{"provider":"gemini","shopName":"Lotus Spa"}</code>
  <p style="color:#9CA3AF;font-size:12px;margin-top:8px">⚠️ ชั่วคราว — รีเซ็ตเมื่อ Refresh Cache</p>
</div>

<h2>📊 เปรียบเทียบ AI Provider</h2>
<table>
  <tr><th>Provider</th><th>ราคา/เดือน (ประมาณ)</th><th>ภาษาไทย</th><th>Vision</th><th>เหมาะกับ</th></tr>
  <tr><td>🧠 Claude Sonnet</td><td>฿500-1,500</td><td>⭐⭐⭐⭐⭐</td><td>✅</td><td>Full Service, คุณภาพสูงสุด</td></tr>
  <tr><td>💚 GPT-4o mini</td><td>฿50-200</td><td>⭐⭐⭐⭐</td><td>✅</td><td>Self-API, ประหยัด</td></tr>
  <tr><td>🔵 Gemini Flash</td><td>฿0-100</td><td>⭐⭐⭐⭐</td><td>❌</td><td>Dev/ทดสอบ, ถูกสุด</td></tr>
  <tr><td>🌪️ Typhoon v2</td><td>฿200-500</td><td>⭐⭐⭐⭐⭐</td><td>❌</td><td>เชี่ยวชาญไทย</td></tr>
</table>

<div class="note">
  🔐 <strong>Security Note:</strong> API Key ทั้งหมดเก็บใน Railway Variables เท่านั้น<br>
  ShopInfo เก็บแค่ชื่อ Provider (เช่น "gemini") ไม่เก็บ Key จริง — ปลอดภัย 100%
</div>

<p style="margin-top:24px"><a href="/" style="color:#00D4FF">← กลับหน้าหลัก</a> | <a href="/api/ai-provider" style="color:#00D4FF">ดูสถานะปัจจุบัน →</a></p>
</body></html>`);
});

app.get("/check-warnings", async (req,res) => { await runExpiryWarnings(); res.send("✅ Done"); });

// ─── /test-image — ทดสอบส่งรูปไปยัง LINE โดยตรง ────────────
// ใช้: /test-image?url=https://...&userid=Uxxxxxxx
app.get("/test-image", async (req, res) => {
  const { url, userid } = req.query;
  if (!url) return res.send(`
    <h3>🖼️ ทดสอบส่งรูปไป LINE</h3>
    <form>
      <label>Image URL:<br>
        <input name="url" style="width:500px" placeholder="https://i.ibb.co/xxx/xxx.jpg">
      </label><br><br>
      <label>LINE User ID:<br>
        <input name="userid" style="width:300px" placeholder="Uxxxxxxxxxxxxxxxxxx">
      </label><br><br>
      <button type="submit">ทดสอบส่ง</button>
    </form>
  `);

  const compatUrl = toLineCompatibleUrl(url);
  const valid = isValidImageUrl(url);

  let sendResult = "ไม่ได้ทดสอบส่ง (ไม่มี userid)";
  if (userid) {
    try {
      const c = activeClients[0];
      if (c) {
        await axios.post("https://api.line.me/v2/bot/message/push", {
          to: userid,
          messages: [{
            type: "image",
            originalContentUrl: compatUrl,
            previewImageUrl: compatUrl,
          }]
        }, { headers: { Authorization: `Bearer ${c.lineToken}`, "Content-Type": "application/json" } });
        sendResult = "✅ ส่งสำเร็จ! ตรวจสอบใน LINE";
      }
    } catch(e) {
      sendResult = `❌ Error: ${e.response?.data?.message || e.message}`;
    }
  }

  res.send(`
    <h3>🖼️ ผลทดสอบรูป</h3>
    <p><b>URL เดิม:</b><br><code>${url}</code></p>
    <p><b>Valid:</b> ${valid ? "✅ ผ่าน" : "❌ ไม่ผ่าน"}</p>
    <p><b>URL ที่ส่งให้ LINE:</b><br><code>${compatUrl}</code></p>
    <p><b>ผลการส่ง:</b> ${sendResult}</p>
    <hr>
    <p>Preview รูป (ถ้าแสดงได้ = LINE น่าจะรับได้):</p>
    <img src="${compatUrl}" style="max-width:400px;border:1px solid #ccc" onerror="this.style.border='3px solid red';this.alt='❌ โหลดรูปไม่ได้'">
    <br><br>
    <a href="/test-image">← ทดสอบ URL อื่น</a>
  `);
});
// Server Status (ย้ายจาก / เดิม → /status)
app.get("/status", (req,res) => {
  const list=activeClients.map(c=>`✅ ${c.name} | dest: ${c.lineBotUserId||"❓"} | page: ${c.fbPageId||"❓"}`).join("<br>");
  const cfg = AI_CONFIGS[AI_PROVIDER] || AI_CONFIGS.claude;
  res.send(`<h2>🤖 SellMate AI / Botify ✅</h2><p>${list}</p><p>🧠 AI: <b>${AI_PROVIDER}</b> | Model: ${cfg.model}</p><br>
    <a href="/dashboard" style="font-weight:bold;color:#00D4FF">📊 Dashboard</a> |
    <a href="/inbox" style="font-weight:bold;color:#4B9EFF">📥 Unified Inbox</a> |
    <a href="/setup">🔍 Bot IDs</a> | <a href="/refresh">🔄 Refresh</a> |
    <a href="/add-tracking">🚚 Tracking</a> | <a href="/check-bookings">📅 Booking</a> |
    <a href="/check-unpaid">💳 Unpaid</a> | <a href="/test-image">🖼️ Test Image</a> |
    <a href="/api/ai-provider">📊 AI Provider</a>`);
});


// --- 45____SLUG_URL_SYSTEM___Shop_Storefront.js ---
// ═══════════════════════════════════════════════════════════
//  🔗 SLUG URL SYSTEM — Shop Storefront
// ═══════════════════════════════════════════════════════════

// ── GET /api/slug — ดึง slug ของร้านตัวเอง ────────────────
app.get("/api/slug", authMW, async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });
    const shopId = req.auth.shopId;
    if (!shopId) return res.status(400).json({ success: false, error: "ไม่พบร้านค้า" });
    const { data, error } = await supabase.from("shops").select("slug").eq("id", shopId).single();
    if (error) return res.status(400).json({ success: false, error: error.message });
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.json({ success: true, slug: data.slug || "", url: data.slug ? `${baseUrl}/shop/${data.slug}` : "" });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── PUT /api/slug — เปลี่ยน slug ของร้านตัวเอง ────────────
app.put("/api/slug", authMW, async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });
    const shopId = req.auth.shopId;
    if (!shopId) return res.status(400).json({ success: false, error: "ไม่พบร้านค้า" });

    const newSlug = sanitize.slug(req.body.slug);
    if (!newSlug || newSlug.length < 3) {
      return res.status(400).json({ success: false, error: "Slug ต้องมีอย่างน้อย 3 ตัวอักษร" });
    }
    if (newSlug.length > 60) {
      return res.status(400).json({ success: false, error: "Slug ต้องไม่เกิน 60 ตัวอักษร" });
    }

    // เช็คว่าไม่ซ้ำกับร้านอื่น
    const { data: existing } = await supabase.from("shops").select("id").eq("slug", newSlug).neq("id", shopId).maybeSingle();
    if (existing) {
      return res.status(409).json({ success: false, error: "Slug นี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น" });
    }

    const { error } = await supabase.from("shops").update({ slug: newSlug }).eq("id", shopId);
    if (error) return res.status(400).json({ success: false, error: error.message });

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.json({ success: true, slug: newSlug, url: `${baseUrl}/shop/${newSlug}` });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── GET /api/slug/check/:slug — เช็คว่า slug ว่างไหม ──────
app.get("/api/slug/check/:slug", async (req, res) => {
  try {
    if (!supabase) return res.json({ available: false });
    const slug = sanitize.slug(req.params.slug);
    if (!slug || slug.length < 3) return res.json({ available: false, error: "ต้องมีอย่างน้อย 3 ตัวอักษร" });
    const { data } = await supabase.from("shops").select("id").eq("slug", slug).maybeSingle();
    res.json({ available: !data, slug });
  } catch (err) { res.json({ available: false }); }
});

// ── GET /api/storefront/:slug — Public API ดึงข้อมูลร้าน + สินค้า ──
app.get("/api/storefront/:slug", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ success: false, error: "Database not configured" });
    const slug = sanitize.slug(req.params.slug);
    if (!slug) return res.status(400).json({ success: false, error: "Invalid slug" });

    // ดึงข้อมูลร้าน
    const { data: shop, error: shopErr } = await supabase
      .from("shops")
      .select("id, name, phone, slug, description, line_oa_url, line_bot_id, status")
      .eq("slug", slug)
      .eq("status", "active")
      .single();
    if (shopErr || !shop) return res.status(404).json({ success: false, error: "ไม่พบร้านค้า" });

    // ดึงสินค้า (เฉพาะที่เปิดขาย)
    const { data: products } = await supabase
      .from("products")
      .select("id, name, price, image_url, category, description, stock")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false });

    // ดึงข้อมูลเพิ่มเติมจาก shop_info ถ้ามี
    const { data: shopInfoRows } = await supabase
      .from("shop_info")
      .select("key, value")
      .eq("shop_id", shop.id);
    const shopInfo = {};
    (shopInfoRows || []).forEach(r => { if (r.key) shopInfo[r.key] = r.value; });

    res.json({
      success: true,
      shop: {
        name: shop.name,
        slug: shop.slug,
        phone: shop.phone,
        description: shop.description || shopInfo.description || "",
        lineOaUrl: shop.line_oa_url || shopInfo.line_oa_url || "",
        openHours: shopInfo.open_hours || shopInfo.เวลาเปิด || "",
        address: shopInfo.address || shopInfo.ที่อยู่ || "",
        logo: shopInfo.logo_url || shopInfo.logo || "",
      },
      products: (products || []).map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.image_url,
        category: p.category,
        description: p.description,
        inStock: p.stock === null || p.stock === undefined || p.stock > 0,
      })),
    });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── GET /shop/:slug — Storefront HTML page ────────────────
app.get("/shop/:slug", (req, res) => {
  const fs = require("fs");
  const path = require("path");
  const htmlPath = path.join(__dirname, "views", "storefront.html");
  if (fs.existsSync(htmlPath)) return res.sendFile(htmlPath);
  res.status(404).send("Storefront page not found");
});

// ─── Terms of Service & Privacy Policy ─────────────────────
app.get("/terms", (req, res) => {
  const fs = require("fs");
  const path = require("path");
  const htmlPath = path.join(__dirname, "views", "terms.html");
  if (fs.existsSync(htmlPath)) return res.sendFile(htmlPath);
  res.status(404).send("Terms of Service page not found");
});
app.get("/privacy", (req, res) => {
  const fs = require("fs");
  const path = require("path");
  const htmlPath = path.join(__dirname, "views", "privacy.html");
  if (fs.existsSync(htmlPath)) return res.sendFile(htmlPath);
  res.status(404).send("Privacy Policy page not found");
});

// ─── Dashboard (served as React SPA via app.js catch-all) ──
// NOTE: GET "/" and "/dashboard" are handled by the static catch-all
// in app.js which serves client/dist/index.html. Do NOT add redirects here.

// ── GET /inbox — Unified Inbox Dashboard (Auto-serve with injected config) ──
app.get("/inbox", (req, res) => {
  const keyFromQuery  = req.query.key || "";
  const keyFromCookie = (req.headers.cookie || "").match(/inbox_key=([^;]+)/)?.[1] || "";
  const key           = decodeURIComponent(keyFromQuery || keyFromCookie);

  if (!ADMIN_API_KEY) return res.status(503).send("ตั้งค่า ADMIN_API_KEY ใน Railway Variables ก่อนครับ");

  // ยังไม่ได้ Login
  if (key !== ADMIN_API_KEY) {
    return res.send(`<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BOTIFY Inbox — Login</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#0F1117;display:flex;align-items:center;justify-content:center;min-height:100vh}.box{background:#1A1D27;border:1px solid #2E3250;border-radius:20px;padding:40px;width:340px;text-align:center}.logo{font-size:2rem;font-weight:800;color:#fff;letter-spacing:2px;margin-bottom:6px}.logo span{color:#FFD166}.sub{color:#8B90B8;font-size:13px;margin-bottom:32px}input{width:100%;background:#22263A;border:1px solid #2E3250;border-radius:12px;padding:12px 16px;color:#E8EAF6;font-size:14px;outline:none;margin-bottom:12px;transition:.15s}input:focus{border-color:#4B9EFF}input::placeholder{color:#545880}button{width:100%;background:#4B9EFF;border:none;border-radius:12px;padding:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer}.err{color:#FF5C7A;font-size:12px;margin-top:8px;display:none}</style></head>
<body><div class="box"><div class="logo">BOT<span>IFY</span></div><div class="sub">Unified Inbox — Admin Access</div>
<form onsubmit="login(event)"><input type="password" id="k" placeholder="Admin API Key" autofocus><button>🔐 เข้าสู่ระบบ</button><div class="err" id="err">❌ API Key ไม่ถูกต้อง</div></form></div>
<script>function login(e){e.preventDefault();const k=document.getElementById('k').value.trim();if(!k){document.getElementById('err').style.display='block';return;}document.cookie='inbox_key='+encodeURIComponent(k)+';path=/;max-age=86400';window.location.href='/inbox?key='+encodeURIComponent(k);}</script></body></html>`);
  }

  res.setHeader("Set-Cookie", `inbox_key=${encodeURIComponent(key)}; Path=/; Max-Age=86400; HttpOnly; SameSite=Strict`);

  const proto   = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host    = req.headers["x-forwarded-host"]  || req.headers.host || "localhost";
  const baseUrl = `${proto}://${host}`;
  const shopList = activeClients.map(c => ({ name: c.name, sheetId: c.sheetId }));

  const cfg_script = `<script>
window.BOTIFY_URL   = ${JSON.stringify(baseUrl)};
window.BOTIFY_KEY   = ${JSON.stringify(ADMIN_API_KEY)};
window.BOTIFY_SHOPS = ${JSON.stringify(shopList)};
<\/script>`;

  res.send(INBOX_HTML.replace("<!-- __BOTIFY_CONFIG__ -->", cfg_script));
});

app.get("/inbox-logout", (req, res) => {
  res.setHeader("Set-Cookie", "inbox_key=; Path=/; Max-Age=0");
  res.redirect("/inbox");
});


// ── Unified Inbox HTML (served at /inbox) ────────────────
const INBOX_HTML = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BOTIFY — Unified Inbox</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0F1117;--surface:#1A1D27;--surface2:#22263A;--surface3:#2A2F47;
  --border:#2E3250;--border2:#3D4266;
  --text:#E8EAF6;--muted:#8B90B8;--hint:#545880;
  --blue:#4B9EFF;--lblue:#1A3A6B;--green:#4ECDC4;--lgreen:#1A3D3A;
  --orange:#FF8C42;--lorng:#3D2E1A;--purple:#9B72FF;--lpurp:#2A1A4D;
  --red:#FF5C7A;--lred:#3D1A24;--gold:#FFD166;
  --line:#06C755;--fb:#1877F2;--shopee:#EE4D2D;--lazada:#0F146D;
}
body{font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text);height:100vh;display:flex;flex-direction:column;overflow:hidden}

/* TOP BAR */
.topbar{height:52px;background:var(--surface);border-bottom:1px solid var(--border);
        display:flex;align-items:center;padding:0 16px;gap:12px;flex-shrink:0}
.logo{font-weight:800;font-size:1.1rem;letter-spacing:1px;color:var(--blue)}
.logo span{color:var(--gold)}
.topbar-stats{display:flex;gap:8px;margin-left:auto}
.stat-pill{background:var(--surface2);border:1px solid var(--border);border-radius:20px;
           padding:4px 12px;font-size:11px;display:flex;align-items:center;gap:5px}
.stat-pill .dot{width:7px;height:7px;border-radius:50%}
.unread-badge{background:var(--red);color:#fff;border-radius:50%;width:18px;height:18px;
              font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center}
.topbar-right{display:flex;gap:8px;margin-left:8px}
.icon-btn{background:var(--surface2);border:1px solid var(--border);border-radius:8px;
          padding:6px 10px;cursor:pointer;color:var(--muted);font-size:12px;transition:.15s}
.icon-btn:hover{border-color:var(--blue);color:var(--blue)}

/* MAIN LAYOUT */
.main{display:flex;flex:1;overflow:hidden}

/* SIDEBAR */
.sidebar{width:300px;background:var(--surface);border-right:1px solid var(--border);
         display:flex;flex-direction:column;flex-shrink:0}
.sidebar-head{padding:12px;border-bottom:1px solid var(--border)}
.search-box{background:var(--surface2);border:1px solid var(--border);border-radius:10px;
            padding:8px 12px;width:100%;color:var(--text);font-size:13px;outline:none;transition:.15s}
.search-box:focus{border-color:var(--blue)}
.search-box::placeholder{color:var(--hint)}
.filter-tabs{display:flex;gap:4px;margin-top:8px;flex-wrap:wrap}
.ftab{background:transparent;border:1px solid var(--border);border-radius:8px;
      padding:4px 10px;font-size:11px;color:var(--muted);cursor:pointer;transition:.15s;white-space:nowrap}
.ftab:hover,.ftab.active{border-color:var(--blue);color:var(--blue);background:var(--lblue)}
.ftab.line.active{border-color:var(--line);color:var(--line);background:#0A2A18}
.ftab.fb.active{border-color:var(--fb);color:var(--fb);background:#0A1A30}
.ftab.shopee.active{border-color:var(--shopee);color:var(--shopee);background:#2A0F0A}
.ftab.lazada.active{border-color:#6B7DFF;color:#6B7DFF;background:#0A0C20}

/* CONVERSATION LIST */
.conv-list{flex:1;overflow-y:auto;padding:4px}
.conv-list::-webkit-scrollbar{width:4px}
.conv-list::-webkit-scrollbar-track{background:transparent}
.conv-list::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}

.conv-item{padding:10px 12px;border-radius:10px;cursor:pointer;transition:.15s;margin-bottom:2px;position:relative}
.conv-item:hover{background:var(--surface2)}
.conv-item.active{background:var(--surface3);border:1px solid var(--border2)}
.conv-item.unread .conv-name{font-weight:700}
.conv-top{display:flex;align-items:center;gap:8px}
.platform-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;
               justify-content:center;font-size:14px;flex-shrink:0}
.pi-line{background:#0A2A18}
.pi-fb{background:#0A1A30}
.pi-shopee{background:#2A0F0A}
.pi-lazada{background:#0A0C20}
.pi-system{background:var(--surface3)}
.conv-info{flex:1;min-width:0}
.conv-name{font-size:13px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.conv-time{font-size:10px;color:var(--hint);flex-shrink:0}
.conv-preview{font-size:11px;color:var(--muted);margin-top:2px;white-space:nowrap;
              overflow:hidden;text-overflow:ellipsis}
.unread-dot{position:absolute;top:10px;right:10px;width:8px;height:8px;
            border-radius:50%;background:var(--blue)}
.conv-unread-count{background:var(--blue);color:#fff;border-radius:10px;
                   padding:1px 6px;font-size:10px;font-weight:700;position:absolute;bottom:8px;right:10px}

/* CHAT AREA */
.chat-area{flex:1;display:flex;flex-direction:column;overflow:hidden}
.chat-empty{flex:1;display:flex;flex-direction:column;align-items:center;
            justify-content:center;color:var(--hint);gap:12px}
.chat-empty .big-icon{font-size:3rem;opacity:.4}
.chat-empty p{font-size:13px}

.chat-head{padding:12px 16px;background:var(--surface);border-bottom:1px solid var(--border);
           display:flex;align-items:center;gap:10px;flex-shrink:0}
.chat-head-info{flex:1}
.chat-head-name{font-weight:700;font-size:14px}
.chat-head-meta{font-size:11px;color:var(--muted);margin-top:2px}
.platform-badge{padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700}
.pb-line{background:#0A2A18;color:var(--line)}
.pb-fb{background:#0A1A30;color:var(--fb)}
.pb-shopee{background:#2A0F0A;color:var(--shopee)}
.pb-lazada{background:#0A0C20;color:#6B7DFF}
.pb-system{background:var(--surface3);color:var(--muted)}
.head-btn{background:var(--surface2);border:1px solid var(--border);border-radius:8px;
          padding:5px 12px;font-size:11px;cursor:pointer;color:var(--muted);transition:.15s}
.head-btn:hover{border-color:var(--green);color:var(--green)}
.head-btn.resolve{border-color:var(--green);color:var(--green)}

.messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px}
.messages::-webkit-scrollbar{width:4px}
.messages::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}

.msg{max-width:70%;display:flex;flex-direction:column;gap:2px}
.msg.user{align-self:flex-start}
.msg.bot,.msg.admin{align-self:flex-end}
.msg-label{font-size:10px;color:var(--hint);padding:0 4px}
.msg.admin .msg-label{text-align:right}
.bubble{padding:10px 14px;border-radius:16px;font-size:13px;line-height:1.55}
.msg.user .bubble{background:var(--surface2);border:1px solid var(--border);border-bottom-left-radius:4px}
.msg.bot .bubble{background:var(--lblue);border:1px solid var(--blue)40;border-bottom-right-radius:4px}
.msg.admin .bubble{background:var(--lgreen);border:1px solid var(--green)40;border-bottom-right-radius:4px}
.msg-time{font-size:10px;color:var(--hint);padding:0 4px}
.msg.bot .msg-time,.msg.admin .msg-time{text-align:right}

.day-divider{text-align:center;font-size:10px;color:var(--hint);margin:8px 0;
             display:flex;align-items:center;gap:8px}
.day-divider::before,.day-divider::after{content:'';flex:1;height:1px;background:var(--border)}

/* INPUT AREA */
.input-area{padding:12px 16px;background:var(--surface);border-top:1px solid var(--border);flex-shrink:0}
.input-note{font-size:11px;color:var(--hint);margin-bottom:8px;padding:6px 10px;
            background:var(--surface2);border-radius:8px;border-left:3px solid var(--orange)}
.input-row{display:flex;gap:8px;align-items:flex-end}
.msg-input{flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:12px;
           padding:10px 14px;color:var(--text);font-size:13px;resize:none;outline:none;
           min-height:44px;max-height:120px;font-family:inherit;line-height:1.5;transition:.15s}
.msg-input:focus{border-color:var(--blue)}
.msg-input::placeholder{color:var(--hint)}
.send-btn{background:var(--blue);border:none;border-radius:12px;padding:10px 18px;
          color:#fff;font-size:13px;font-weight:600;cursor:pointer;transition:.15s;white-space:nowrap}
.send-btn:hover{background:#6BAFFF}
.send-btn:disabled{background:var(--hint);cursor:not-allowed}

/* DETAIL PANEL */
.detail-panel{width:260px;background:var(--surface);border-left:1px solid var(--border);
              display:flex;flex-direction:column;padding:16px;gap:12px;overflow-y:auto;flex-shrink:0}
.detail-panel h3{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--hint);margin-bottom:4px}
.detail-item{display:flex;flex-direction:column;gap:2px;padding:8px 10px;
             background:var(--surface2);border-radius:8px;border:1px solid var(--border)}
.detail-label{font-size:10px;color:var(--hint)}
.detail-val{font-size:12px;color:var(--text);word-break:break-all}
.quick-reply{background:var(--surface2);border:1px solid var(--border);border-radius:8px;
             padding:6px 10px;font-size:11px;color:var(--muted);cursor:pointer;text-align:left;
             transition:.15s;width:100%}
.quick-reply:hover{border-color:var(--blue);color:var(--blue)}

/* TOAST */
.toast{position:fixed;bottom:20px;right:20px;background:var(--surface3);border:1px solid var(--border2);
       border-radius:12px;padding:10px 16px;font-size:12px;color:var(--text);z-index:999;
       transform:translateY(80px);opacity:0;transition:.3s;max-width:280px}
.toast.show{transform:translateY(0);opacity:1}
.toast.success{border-color:var(--green)}
.toast.error{border-color:var(--red)}
</style>
</head>
<body>

<!-- TOP BAR -->
<div class="topbar">
  <div class="logo">BOT<span>IFY</span></div>
  <div style="font-size:12px;color:var(--muted);margin-left:4px">Unified Inbox</div>
  <div class="topbar-stats" id="topStats">
    <div class="stat-pill"><span class="dot" style="background:var(--green)"></span><span id="statOnline">0 แชท</span></div>
    <div class="stat-pill" id="unreadPill" style="display:none">
      <span class="dot" style="background:var(--red)"></span>
      <span id="statUnread">0 ยังไม่อ่าน</span>
    </div>
  </div>
  <div class="topbar-right">
    <button class="icon-btn" onclick="loadInbox()">🔄 รีเฟรช</button>
    <button class="icon-btn" id="filterOpenBtn">📥 เปิดอยู่</button>
  </div>
</div>

<div class="main">
  <!-- SIDEBAR -->
  <div class="sidebar">
    <div class="sidebar-head">
      <input class="search-box" id="searchBox" placeholder="🔍 ค้นหาลูกค้า..." oninput="filterConvs(this.value)">
      <div class="filter-tabs">
        <button class="ftab active" onclick="setFilter('all',this)">ทั้งหมด</button>
        <button class="ftab line" onclick="setFilter('LINE',this)">💚 LINE</button>
        <button class="ftab fb" onclick="setFilter('Facebook',this)">💙 Facebook</button>
        <button class="ftab shopee" onclick="setFilter('Shopee',this)">🧡 Shopee</button>
        <button class="ftab lazada" onclick="setFilter('Lazada',this)">💜 Lazada</button>
      </div>
    </div>
    <div class="conv-list" id="convList">
      <div style="text-align:center;padding:40px 20px;color:var(--hint);font-size:13px">
        กำลังโหลด...
      </div>
    </div>
  </div>

  <!-- CHAT AREA -->
  <div class="chat-area" id="chatArea">
    <div class="chat-empty">
      <div class="big-icon">💬</div>
      <p>เลือกบทสนทนาเพื่อเริ่มต้น</p>
      <p style="font-size:11px">ข้อความจาก LINE · Facebook · Shopee · Lazada</p>
    </div>
  </div>

  <!-- DETAIL PANEL -->
  <div class="detail-panel" id="detailPanel" style="display:none">
    <div>
      <h3>ข้อมูลลูกค้า</h3>
      <div class="detail-item"><span class="detail-label">User ID</span><span class="detail-val" id="dUserId">-</span></div>
      <div class="detail-item"><span class="detail-label">Platform</span><span class="detail-val" id="dPlatform">-</span></div>
      <div class="detail-item"><span class="detail-label">ข้อความ</span><span class="detail-val" id="dMsgCount">-</span></div>
      <div class="detail-item"><span class="detail-label">ล่าสุด</span><span class="detail-val" id="dLastAt">-</span></div>
    </div>
    <div>
      <h3>ตอบด่วน</h3>
      <div id="quickReplies" style="display:flex;flex-direction:column;gap:4px"></div>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
// ═══════════════════════════════════════════════════
// CONFIG — เปลี่ยน BASE_URL ให้ตรงกับ Railway URL
// ═══════════════════════════════════════════════════
const BASE_URL   = window.BOTIFY_URL || "https://your-bot.railway.app";
const API_KEY    = window.BOTIFY_KEY || "your-admin-api-key";
const SHOP_ID    = window.BOTIFY_SHOP || "";

const HEADERS    = { "Content-Type":"application/json", "x-api-key": API_KEY };

const QUICK_REPLIES = [
  "สวัสดีครับ! มีอะไรให้ช่วยไหมครับ? 😊",
  "ขอบคุณที่ทักมานะครับ รอสักครู่...",
  "ได้รับข้อมูลแล้วครับ จะดำเนินการให้ทันที",
  "สินค้ามีสต็อกครับ สนใจสั่งซื้อเลยได้เลยครับ",
  "ขออภัยด้วยนะครับ จะรีบแก้ไขให้ครับ 🙏",
];

let allConvs     = [];
let activeFilter = "all";
let activeConvId = null;
let showStatus   = "open";
let refreshTimer = null;

// ── Load Inbox ─────────────────────────────────────
async function loadInbox() {
  try {
    const params = new URLSearchParams({ limit: 100, status: showStatus });
    if (SHOP_ID) params.set("sheetId", SHOP_ID);
    const res  = await fetch(\`\${BASE_URL}/api/inbox?\${params}\`, { headers: HEADERS });
    const data = await res.json();
    allConvs   = data.conversations || [];
    updateStats(data.stats);
    renderList(allConvs);
  } catch(e) {
    document.getElementById("convList").innerHTML =
      \`<div style="text-align:center;padding:40px 20px;color:var(--red);font-size:13px">
       ❌ เชื่อมต่อ Server ไม่ได้<br><small>\${e.message}</small></div>\`;
  }
}

function updateStats(stats) {
  if (!stats) return;
  document.getElementById("statOnline").textContent = \`\${stats.total} บทสนทนา\`;
  const unreadPill = document.getElementById("unreadPill");
  if (stats.unread > 0) {
    document.getElementById("statUnread").textContent = \`\${stats.unread} ยังไม่อ่าน\`;
    unreadPill.style.display = "flex";
  } else {
    unreadPill.style.display = "none";
  }
}

// ── Render List ────────────────────────────────────
function renderList(convs) {
  const search  = document.getElementById("searchBox").value.toLowerCase();
  let filtered  = convs;
  if (activeFilter !== "all") filtered = filtered.filter(c => c.platform === activeFilter);
  if (search) filtered = filtered.filter(c =>
    c.displayName.toLowerCase().includes(search) ||
    c.lastMessage.toLowerCase().includes(search) ||
    c.userId.toLowerCase().includes(search)
  );

  const list = document.getElementById("convList");
  if (!filtered.length) {
    list.innerHTML = \`<div style="text-align:center;padding:40px 20px;color:var(--hint);font-size:12px">ไม่มีบทสนทนา</div>\`;
    return;
  }

  list.innerHTML = filtered.map(c => \`
    <div class="conv-item \${c.unread>0?'unread':''} \${c.id===activeConvId?'active':''}"
         onclick="openConv('\${c.id}')">
      <div class="conv-top">
        <div class="platform-icon pi-\${c.platform.toLowerCase()}">
          \${c.avatar}
        </div>
        <div class="conv-info">
          <div class="conv-name">\${escHtml(c.displayName)}</div>
          <div class="conv-preview">\${escHtml(c.lastMessage || '...')}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
          <div class="conv-time">\${formatTime(c.lastAt)}</div>
          \${c.unread>0 ? \`<div class="unread-dot"></div>\` : ''}
        </div>
      </div>
    </div>
  \`).join("");
}

// ── Open Conversation ──────────────────────────────
async function openConv(convId) {
  activeConvId = convId;
  renderList(allConvs); // re-render to show active

  const chatArea = document.getElementById("chatArea");
  chatArea.innerHTML = \`<div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--hint);font-size:13px">กำลังโหลด...</div>\`;

  try {
    const res  = await fetch(\`\${BASE_URL}/api/inbox/\${encodeURIComponent(convId)}\`, { headers: HEADERS });
    const data = await res.json();
    const conv = data.conversation;
    if (!conv) throw new Error("ไม่พบบทสนทนา");

    // อัพเดท unread ใน local
    const local = allConvs.find(c => c.id === convId);
    if (local) local.unread = 0;

    renderChat(conv);
    renderDetail(conv);
  } catch(e) {
    chatArea.innerHTML = \`<div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--red);font-size:13px">❌ \${e.message}</div>\`;
  }
}

function renderChat(conv) {
  const canSend = (conv.platform === "LINE" || conv.platform === "Facebook");
  const warningNote = {
    Shopee: "⚠️ Shopee: ต้องตอบผ่าน Shopee Seller Center (รอ Whitelist API)",
    Lazada: "⚠️ Lazada: ต้องตอบผ่าน Lazada Seller Center (ยังไม่มี Chat API)",
  }[conv.platform] || null;

  const pbClass = \`pb-\${conv.platform.toLowerCase()}\`;
  const msgs    = conv.messages || [];

  let msgsHtml = "";
  let lastDate  = "";
  msgs.forEach(m => {
    const d = new Date(m.timestamp).toLocaleDateString("th-TH",{day:"numeric",month:"short"});
    if (d !== lastDate) {
      msgsHtml += \`<div class="day-divider">\${d}</div>\`;
      lastDate = d;
    }
    const label = m.role==="user" ? (conv.displayName || "ลูกค้า") :
                  m.role==="admin" ? "👤 Admin" : "🤖 บอท";
    const time  = new Date(m.timestamp).toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"});
    msgsHtml += \`
      <div class="msg \${m.role}">
        <div class="msg-label">\${label}</div>
        <div class="bubble">\${escHtml(m.text || "[รูปภาพ]")}</div>
        <div class="msg-time">\${time}</div>
      </div>\`;
  });

  document.getElementById("chatArea").innerHTML = \`
    <div class="chat-head">
      <div class="platform-icon pi-\${conv.platform.toLowerCase()}" style="width:36px;height:36px;font-size:18px">\${conv.avatar}</div>
      <div class="chat-head-info">
        <div class="chat-head-name">\${escHtml(conv.displayName)}</div>
        <div class="chat-head-meta">
          <span class="platform-badge \${pbClass}">\${conv.platform}</span>
          <span style="margin-left:6px;font-size:11px;color:var(--hint)">\${conv.shopName}</span>
        </div>
      </div>
      <button class="head-btn resolve" onclick="resolveConv('\${conv.id}')">✅ ปิด</button>
    </div>
    <div class="messages" id="msgList">\${msgsHtml || '<div style="text-align:center;padding:40px;color:var(--hint);font-size:12px">ยังไม่มีข้อความ</div>'}</div>
    <div class="input-area">
      \${warningNote ? \`<div class="input-note">\${warningNote}</div>\` : ''}
      <div class="input-row">
        <textarea class="msg-input" id="msgInput" placeholder="\${canSend ? 'พิมพ์ข้อความ...' : 'ดูเฉพาะ — ต้องตอบใน Platform นั้น'}"
          \${canSend ? '' : 'disabled'} rows="1"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMsg()}"
          oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>
        <button class="send-btn" onclick="sendMsg()" \${canSend ? '' : 'disabled'}>ส่ง</button>
      </div>
    </div>\`;

  // Scroll to bottom
  setTimeout(() => {
    const ml = document.getElementById("msgList");
    if (ml) ml.scrollTop = ml.scrollHeight;
  }, 50);
}

function renderDetail(conv) {
  const panel = document.getElementById("detailPanel");
  panel.style.display = "flex";
  document.getElementById("dUserId").textContent    = conv.userId || "-";
  document.getElementById("dPlatform").textContent  = conv.platform || "-";
  document.getElementById("dMsgCount").textContent  = \`\${conv.messages?.length || 0} ข้อความ\`;
  document.getElementById("dLastAt").textContent    = conv.lastAt ? formatTime(conv.lastAt) : "-";

  const qr = document.getElementById("quickReplies");
  qr.innerHTML = QUICK_REPLIES.map((r,i) =>
    \`<button class="quick-reply" onclick="useQuickReply(\${i})">\${r}</button>\`
  ).join("");
}

// ── Send Message ────────────────────────────────────
async function sendMsg() {
  const input = document.getElementById("msgInput");
  const text  = input?.value?.trim();
  if (!text || !activeConvId) return;

  input.value   = "";
  input.style.height = "auto";

  try {
    const res  = await fetch(\`\${BASE_URL}/api/inbox/\${encodeURIComponent(activeConvId)}/reply\`, {
      method: "POST", headers: HEADERS,
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    showToast(data.message || "✅ ส่งสำเร็จ", data.success ? "success" : "error");
    await openConv(activeConvId); // รีโหลด
  } catch(e) {
    showToast("❌ ส่งไม่สำเร็จ: " + e.message, "error");
  }
}

function useQuickReply(idx) {
  const input = document.getElementById("msgInput");
  if (input && !input.disabled) {
    input.value = QUICK_REPLIES[idx];
    input.focus();
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
  }
}

async function resolveConv(convId) {
  try {
    await fetch(\`\${BASE_URL}/api/inbox/\${encodeURIComponent(convId)}/resolve\`, {
      method: "POST", headers: HEADERS, body: JSON.stringify({ status: "resolved" }),
    });
    showToast("✅ ปิดบทสนทนาแล้ว", "success");
    await loadInbox();
    document.getElementById("chatArea").innerHTML = \`<div class="chat-empty"><div class="big-icon">✅</div><p>ปิดบทสนทนาแล้ว</p></div>\`;
    document.getElementById("detailPanel").style.display = "none";
    activeConvId = null;
  } catch(e) { showToast("❌ " + e.message, "error"); }
}

// ── Filters ─────────────────────────────────────────
function setFilter(platform, btn) {
  activeFilter = platform;
  document.querySelectorAll(".ftab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderList(allConvs);
}

function filterConvs(q) { renderList(allConvs); }

// ── Helpers ─────────────────────────────────────────
function escHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\\n/g,"<br>");
}

function formatTime(iso) {
  if (!iso) return "";
  const d   = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60)    return "เมื่อกี้";
  if (diff < 3600)  return \`\${Math.floor(diff/60)} นาที\`;
  if (diff < 86400) return d.toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"});
  return d.toLocaleDateString("th-TH",{day:"numeric",month:"short"});
}

function showToast(msg, type="success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className   = \`toast \${type} show\`;
  setTimeout(() => t.classList.remove("show"), 3000);
}

// ── Filter open/resolved toggle ──────────────────────
document.getElementById("filterOpenBtn").addEventListener("click", function() {
  showStatus = showStatus === "open" ? "resolved" : "open";
  this.textContent = showStatus === "open" ? "📥 เปิดอยู่" : "✅ ปิดแล้ว";
  loadInbox();
});

// ── Init ─────────────────────────────────────────────
loadInbox();
refreshTimer = setInterval(loadInbox, 30000); // Auto-refresh ทุก 30 วินาที
</script>
</body>
</html>
`;


// --- 46____PHASE_1___Shopee___Lazada_Order_Sync.js ---
// ═══════════════════════════════════════════════════════════
//  🛒 PHASE 1 — Shopee & Lazada Order Sync
//
//  ตั้งค่าใน ShopInfo ของแต่ละร้าน:
//  ─── Shopee ─────────────────────────────────────────────
//  SHOPEE_PARTNER_ID   = 123456
//  SHOPEE_PARTNER_KEY  = abcdef...
//  SHOPEE_SHOP_ID      = 789012
//  SHOPEE_ACCESS_TOKEN = token...
//  ─── Lazada ─────────────────────────────────────────────
//  LAZADA_APP_KEY      = 123456
//  LAZADA_APP_SECRET   = abcdef...
//  LAZADA_ACCESS_TOKEN = token...
//
//  รันทุก 5 นาที → ดึงออเดอร์ใหม่ → บันทึก Sheet → แจ้ง LINE
// ═══════════════════════════════════════════════════════════

const crypto = require("crypto");

// ── Shopee API Helper ────────────────────────────────────
function shopeeSign(partnerId, partnerKey, path, timestamp, accessToken, shopId) {
  const base = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  return crypto.createHmac("sha256", partnerKey).update(base).digest("hex");
}

async function shopeeRequest(method, path, params, creds) {
  const ts        = Math.floor(Date.now() / 1000);
  const sign      = shopeeSign(creds.partnerId, creds.partnerKey, path, ts, creds.accessToken, creds.shopId);
  const base      = "https://partner.shopeemobile.com";
  const queryStr  = new URLSearchParams({
    partner_id:   creds.partnerId,
    shop_id:      creds.shopId,
    access_token: creds.accessToken,
    timestamp:    ts,
    sign,
    ...params,
  }).toString();

  const url = `${base}${path}?${queryStr}`;
  try {
    const { data } = await axios({ method, url, timeout: 15000 });
    return data;
  } catch(e) {
    throw new Error(`Shopee API error: ${e.response?.data?.message || e.message}`);
  }
}

// ── Lazada API Helper ─────────────────────────────────────
function lazadaSign(appSecret, path, params) {
  const sorted = Object.keys(params).sort().map(k => `${k}${params[k]}`).join("");
  const payload = `${path}${sorted}`;
  return crypto.createHmac("sha256", appSecret).update(payload).digest("hex").toUpperCase();
}

async function lazadaRequest(path, params, creds) {
  const ts      = Date.now();
  const allParams = {
    app_key:      creds.appKey,
    access_token: creds.accessToken,
    timestamp:    ts,
    sign_method:  "sha256",
    ...params,
  };
  allParams.sign = lazadaSign(creds.appSecret, path, allParams);
  const url = `https://api.lazada.co.th/rest${path}?${new URLSearchParams(allParams)}`;
  try {
    const { data } = await axios.get(url, { timeout: 15000 });
    if (data.code && data.code !== "0") throw new Error(data.message || data.code);
    return data;
  } catch(e) {
    throw new Error(`Lazada API error: ${e.response?.data?.message || e.message}`);
  }
}

// ── แปลงสถานะ Platform → สถานะ Botify ────────────────────
const SHOPEE_STATUS_MAP = {
  UNPAID:"รอชำระ", READY_TO_SHIP:"รอจัดส่ง", SHIPPED:"จัดส่งแล้ว",
  COMPLETED:"สำเร็จ", CANCELLED:"ยกเลิก", IN_CANCEL:"ขอยกเลิก",
  TO_RETURN:"ขอคืน",
};
const LAZADA_STATUS_MAP = {
  unpaid:"รอชำระ", pending:"รอยืนยัน", ready_to_ship:"รอจัดส่ง",
  shipped:"จัดส่งแล้ว", delivered:"สำเร็จ", failed:"ล้มเหลว",
  canceled:"ยกเลิก",
};

// ── ดึงออเดอร์ใหม่จาก Shopee ─────────────────────────────
async function syncShopeeOrders(client, info) {
  const creds = {
    partnerId:   info["SHOPEE_PARTNER_ID"]   || "",
    partnerKey:  info["SHOPEE_PARTNER_KEY"]  || "",
    shopId:      info["SHOPEE_SHOP_ID"]      || "",
    accessToken: info["SHOPEE_ACCESS_TOKEN"] || "",
  };
  if (!creds.partnerId || !creds.partnerKey || !creds.shopId || !creds.accessToken) return 0;

  // ดึงออเดอร์ 30 นาทีล่าสุด
  const now     = Math.floor(Date.now() / 1000);
  const from    = now - 30 * 60;
  const res     = await shopeeRequest("GET", "/api/v2/order/get_order_list", {
    time_range_field: "create_time",
    time_from:        from,
    time_to:          now,
    page_size:        50,
    order_status:     "UNPAID,READY_TO_SHIP",
  }, creds);

  const orderList = res?.response?.order_list || [];
  if (!orderList.length) return 0;

  // อ่าน Order IDs ที่บันทึกไปแล้ว
  const existing = await readSheet(client.sheetId, "Orders!B:B");
  const existingIds = new Set(existing.flat().map(v => String(v).trim()));

  let newCount = 0;
  for (const order of orderList) {
    const orderId = `SP-${order.order_sn}`;
    if (existingIds.has(orderId)) continue;

    // ดึงรายละเอียดออเดอร์
    let detail = {};
    try {
      const detailRes = await shopeeRequest("GET", "/api/v2/order/get_order_detail", {
        order_sn_list: order.order_sn,
      }, creds);
      detail = detailRes?.response?.order_list?.[0] || {};
    } catch(e) { console.warn("Shopee detail fetch:", e.message); }

    const items      = (detail.item_list || []).map(i => i.item_name).join(", ") || "สินค้า Shopee";
    const qty        = (detail.item_list || []).reduce((s, i) => s + (i.model_quantity_purchased || 1), 0);
    const buyerName  = detail.buyer_user_id ? `Shopee #${detail.buyer_user_id}` : "ลูกค้า Shopee";
    const address    = [detail.recipient_address?.full_address || "", detail.recipient_address?.city || ""].filter(Boolean).join(" ");
    const payStatus  = SHOPEE_STATUS_MAP[order.order_status] || order.order_status;
    const now_th     = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
    const totalAmt   = detail.total_amount ? `฿${Number(detail.total_amount).toLocaleString()}` : "-";

    await appendSheet(client.sheetId, "Orders!A:R", [[
      now_th, orderId, buyerName,
      detail.recipient_address?.phone || "-",
      items, qty,
      address, "ไม่ต้องการ", `Shopee | ยอด: ${totalAmt}`,
      payStatus === "รอชำระ" ? "รอยืนยัน" : payStatus,
      "Shopee", "", "Shopee Express", "รอจัดส่ง", "",
      "", payStatus, "",
    ]]);

    // แจ้งเจ้าของร้าน
    if (client.ownerUserId && client.lineToken) {
      await linePush(client.lineToken, client.ownerUserId,
        `🛒 ออเดอร์ใหม่จาก Shopee!\n${"─".repeat(24)}\n` +
        `🆔 ${orderId}\n🛍️ ${items} × ${qty}\n` +
        `💰 ${totalAmt} | 📦 ${payStatus}\n` +
        `${"─".repeat(24)}\n` +
        `👉 ดูใน Shopee Seller Center`
      );
    }
    existingIds.add(orderId);
    newCount++;
  }
  return newCount;
}

// ── ดึงออเดอร์ใหม่จาก Lazada ─────────────────────────────
async function syncLazadaOrders(client, info) {
  const creds = {
    appKey:      info["LAZADA_APP_KEY"]      || "",
    appSecret:   info["LAZADA_APP_SECRET"]   || "",
    accessToken: info["LAZADA_ACCESS_TOKEN"] || "",
  };
  if (!creds.appKey || !creds.appSecret || !creds.accessToken) return 0;

  // ดึงออเดอร์ 30 นาทีล่าสุด
  const now        = new Date();
  const from       = new Date(now - 30 * 60 * 1000);
  const toISO      = now.toISOString().replace(/\.\d{3}Z$/, "+00:00");
  const fromISO    = from.toISOString().replace(/\.\d{3}Z$/, "+00:00");

  const res = await lazadaRequest("/orders/get", {
    created_after:  fromISO,
    created_before: toISO,
    status:         "pending",
    limit:          50,
    offset:         0,
  }, creds);

  const orders = res?.data?.orders || [];
  if (!orders.length) return 0;

  const existing    = await readSheet(client.sheetId, "Orders!B:B");
  const existingIds = new Set(existing.flat().map(v => String(v).trim()));

  let newCount = 0;
  for (const order of orders) {
    const orderId = `LZ-${order.order_id}`;
    if (existingIds.has(orderId)) continue;

    // ดึง items ของออเดอร์
    let items = "สินค้า Lazada"; let qty = 1;
    try {
      const itemRes = await lazadaRequest("/order/items/get", { order_id: order.order_id }, creds);
      const itemList = itemRes?.data || [];
      items = itemList.map(i => i.name || i.product_name).filter(Boolean).join(", ") || items;
      qty   = itemList.length || 1;
    } catch(e) { console.warn("Lazada items fetch:", e.message); }

    const payStatus  = LAZADA_STATUS_MAP[order.status?.toLowerCase()] || order.status;
    const totalAmt   = order.price ? `฿${Number(order.price).toLocaleString()}` : "-";
    const now_th     = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
    const address    = order.address_billing?.address1 || "-";
    const buyerName  = `Lazada #${order.order_id}`;

    await appendSheet(client.sheetId, "Orders!A:R", [[
      now_th, orderId, buyerName,
      order.address_billing?.phone || "-",
      items, qty,
      address, "ไม่ต้องการ", `Lazada | ยอด: ${totalAmt}`,
      payStatus === "รอชำระ" ? "รอยืนยัน" : payStatus,
      "Lazada", "", "Lazada Logistics", "รอจัดส่ง", "",
      "", payStatus, "",
    ]]);

    // แจ้งเจ้าของร้าน
    if (client.ownerUserId && client.lineToken) {
      await linePush(client.lineToken, client.ownerUserId,
        `🛒 ออเดอร์ใหม่จาก Lazada!\n${"─".repeat(24)}\n` +
        `🆔 ${orderId}\n🛍️ ${items} × ${qty}\n` +
        `💰 ${totalAmt} | 📦 ${payStatus}\n` +
        `${"─".repeat(24)}\n` +
        `👉 ดูใน Lazada Seller Center`
      );
    }
    existingIds.add(orderId);
    newCount++;
  }
  return newCount;
}

// ── รัน Sync ทุกร้าน ──────────────────────────────────────
async function runMarketplaceSync() {
  for (const client of activeClients) {
    try {
      const infoRows = await readSheet(client.sheetId, "ShopInfo!A:B");
      const info     = {};
      infoRows.slice(1).forEach(([k, v]) => { if(k) info[k.trim()] = v || ""; });

      // Phase 2: ตรวจสอบ Token ก่อน Sync
      await checkAndRefreshTokens(client, info, infoRows);

      const shopeeNew  = await syncShopeeOrders(client, info).catch(e => { console.error(`[${client.name}] Shopee sync:`, e.message); return 0; });
      const lazadaNew  = await syncLazadaOrders(client, info).catch(e => { console.error(`[${client.name}] Lazada sync:`, e.message); return 0; });

      if (shopeeNew + lazadaNew > 0) {
        console.log(`🛒 [${client.name}] Sync: +${shopeeNew} Shopee, +${lazadaNew} Lazada`);
      }
    } catch(e) {
      console.error(`[${client.name}] marketplace sync error:`, e.message);
    }
  }
}


// --- 47____PHASE_2___Auto_Token_Refresh___Expiry_Warning.js ---
// ═══════════════════════════════════════════════════════════
//  🔄 PHASE 2 — Auto Token Refresh + Expiry Warning
//
//  เพิ่มใน ShopInfo:
//  SHOPEE_REFRESH_TOKEN     = [Refresh Token จาก OAuth]
//  SHOPEE_TOKEN_EXPIRES_AT  = [Unix timestamp หมดอายุ]
//  LAZADA_REFRESH_TOKEN     = [Refresh Token จาก OAuth]
//  LAZADA_TOKEN_EXPIRES_AT  = [Unix timestamp หมดอายุ]
//
//  Logic:
//  - Token เหลือ < 30 นาที → Refresh อัตโนมัติ
//  - Refresh Token หมดอายุ → แจ้ง LINE เจ้าของร้าน
//  - บันทึก Token ใหม่กลับลง ShopInfo Sheet อัตโนมัติ
// ═══════════════════════════════════════════════════════════

// ── เขียน Token ใหม่กลับลง ShopInfo Sheet ─────────────────
async function updateTokenInSheet(sheetId, infoRows, fieldKey, newValue) {
  try {
    const rows = infoRows || await readSheet(sheetId, "ShopInfo!A:B");
    const idx  = rows.findIndex(([k]) => k?.trim() === fieldKey);
    if (idx >= 1) {
      await writeSheet(sheetId, `ShopInfo!B${idx + 1}`, [[newValue]]);
    } else {
      // ไม่มี field นี้ → เพิ่มแถวใหม่
      await appendSheet(sheetId, "ShopInfo!A:B", [[fieldKey, newValue]]);
    }
    console.log(`🔑 Updated ${fieldKey} in ShopInfo`);
  } catch(e) {
    console.error(`updateTokenInSheet [${fieldKey}]:`, e.message);
  }
}

// ── Refresh Shopee Token ──────────────────────────────────
async function refreshShopeeToken(client, info, infoRows) {
  const partnerId    = info["SHOPEE_PARTNER_ID"]    || "";
  const partnerKey   = info["SHOPEE_PARTNER_KEY"]   || "";
  const shopId       = info["SHOPEE_SHOP_ID"]       || "";
  const refreshToken = info["SHOPEE_REFRESH_TOKEN"] || "";

  if (!partnerId || !partnerKey || !shopId || !refreshToken) {
    console.warn(`[${client.name}] Shopee refresh token not configured`);
    return false;
  }

  try {
    const ts   = Math.floor(Date.now() / 1000);
    const sign = crypto.createHmac("sha256", partnerKey)
      .update(`${partnerId}/api/v2/auth/access_token/get${ts}`)
      .digest("hex");

    const { data } = await axios.post(
      "https://partner.shopeemobile.com/api/v2/auth/access_token/get",
      { partner_id: parseInt(partnerId), shop_id: parseInt(shopId), refresh_token: refreshToken },
      { params: { partner_id: partnerId, timestamp: ts, sign }, timeout: 15000 }
    );

    if (data.access_token) {
      const expiresAt = ts + (data.expire_in || 14400); // default 4 ชั่วโมง
      await updateTokenInSheet(client.sheetId, infoRows, "SHOPEE_ACCESS_TOKEN",    data.access_token);
      await updateTokenInSheet(client.sheetId, infoRows, "SHOPEE_REFRESH_TOKEN",   data.refresh_token || refreshToken);
      await updateTokenInSheet(client.sheetId, infoRows, "SHOPEE_TOKEN_EXPIRES_AT", String(expiresAt));
      // อัพเดท info object ด้วย
      info["SHOPEE_ACCESS_TOKEN"]    = data.access_token;
      info["SHOPEE_TOKEN_EXPIRES_AT"] = String(expiresAt);
      console.log(`✅ [${client.name}] Shopee Token refreshed — expires ${new Date(expiresAt * 1000).toLocaleString("th-TH")}`);
      return true;
    }
    throw new Error(data.message || "No access_token in response");
  } catch(e) {
    console.error(`[${client.name}] Shopee refresh failed:`, e.message);
    // แจ้งเจ้าของร้านว่า Refresh ล้มเหลว
    if (client.ownerUserId && client.lineToken) {
      await linePush(client.lineToken, client.ownerUserId,
        `⚠️ Shopee Token หมดอายุแล้ว!\n${"─".repeat(24)}\n` +
        `ร้าน: ${client.name}\n` +
        `❌ Auto-refresh ไม่สำเร็จ: ${e.message}\n` +
        `${"─".repeat(24)}\n` +
        `📋 วิธีแก้:\n` +
        `1. เปิด open.shopee.com\n` +
        `2. Re-authorize ร้านค้า\n` +
        `3. อัพเดท SHOPEE_ACCESS_TOKEN\n    และ SHOPEE_REFRESH_TOKEN\n    ใน ShopInfo Sheet`
      ).catch(()=>{});
    }
    return false;
  }
}

// ── Refresh Lazada Token ──────────────────────────────────
async function refreshLazadaToken(client, info, infoRows) {
  const appKey       = info["LAZADA_APP_KEY"]       || "";
  const appSecret    = info["LAZADA_APP_SECRET"]    || "";
  const refreshToken = info["LAZADA_REFRESH_TOKEN"] || "";

  if (!appKey || !appSecret || !refreshToken) {
    console.warn(`[${client.name}] Lazada refresh token not configured`);
    return false;
  }

  try {
    const ts     = Date.now();
    const params = {
      app_key:       appKey,
      timestamp:     ts,
      sign_method:   "sha256",
      refresh_token: refreshToken,
    };
    params.sign = lazadaSign(appSecret, "/auth/token/refresh", params);
    const { data } = await axios.post(
      `https://auth.lazada.com/rest/auth/token/refresh`,
      null,
      { params, timeout: 15000 }
    );

    if (data.access_token) {
      const expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in || 604800); // default 7 วัน
      await updateTokenInSheet(client.sheetId, infoRows, "LAZADA_ACCESS_TOKEN",    data.access_token);
      await updateTokenInSheet(client.sheetId, infoRows, "LAZADA_REFRESH_TOKEN",   data.refresh_token || refreshToken);
      await updateTokenInSheet(client.sheetId, infoRows, "LAZADA_TOKEN_EXPIRES_AT", String(expiresAt));
      info["LAZADA_ACCESS_TOKEN"]    = data.access_token;
      info["LAZADA_TOKEN_EXPIRES_AT"] = String(expiresAt);
      console.log(`✅ [${client.name}] Lazada Token refreshed — expires ${new Date(expiresAt * 1000).toLocaleString("th-TH")}`);
      return true;
    }
    throw new Error(data.message || "No access_token in response");
  } catch(e) {
    console.error(`[${client.name}] Lazada refresh failed:`, e.message);
    if (client.ownerUserId && client.lineToken) {
      await linePush(client.lineToken, client.ownerUserId,
        `⚠️ Lazada Token หมดอายุแล้ว!\n${"─".repeat(24)}\n` +
        `ร้าน: ${client.name}\n` +
        `❌ Auto-refresh ไม่สำเร็จ: ${e.message}\n` +
        `${"─".repeat(24)}\n` +
        `📋 วิธีแก้:\n` +
        `1. เปิด open.lazada.com\n` +
        `2. Re-authorize ร้านค้า\n` +
        `3. อัพเดท LAZADA_ACCESS_TOKEN\n    และ LAZADA_REFRESH_TOKEN\n    ใน ShopInfo Sheet`
      ).catch(()=>{});
    }
    return false;
  }
}

// ── ตรวจสอบและ Refresh Token ก่อน Sync ───────────────────
async function checkAndRefreshTokens(client, info, infoRows) {
  const now           = Math.floor(Date.now() / 1000);
  const BUFFER_SECS   = 30 * 60; // Refresh ถ้าเหลือน้อยกว่า 30 นาที

  // Shopee Token Check
  const shopeeExpiry  = parseInt(info["SHOPEE_TOKEN_EXPIRES_AT"] || "0");
  const shopeeHasToken = !!(info["SHOPEE_ACCESS_TOKEN"] && info["SHOPEE_PARTNER_ID"]);

  if (shopeeHasToken && shopeeExpiry > 0) {
    const secsLeft = shopeeExpiry - now;
    if (secsLeft < BUFFER_SECS) {
      console.log(`🔄 [${client.name}] Shopee Token เหลือ ${Math.floor(secsLeft/60)} นาที — กำลัง Refresh...`);
      await refreshShopeeToken(client, info, infoRows);
    }
  }

  // Lazada Token Check
  const lazadaExpiry  = parseInt(info["LAZADA_TOKEN_EXPIRES_AT"] || "0");
  const lazadaHasToken = !!(info["LAZADA_ACCESS_TOKEN"] && info["LAZADA_APP_KEY"]);

  if (lazadaHasToken && lazadaExpiry > 0) {
    const secsLeft = lazadaExpiry - now;
    if (secsLeft < BUFFER_SECS) {
      console.log(`🔄 [${client.name}] Lazada Token เหลือ ${Math.floor(secsLeft/60)} นาที — กำลัง Refresh...`);
      await refreshLazadaToken(client, info, infoRows);
    }
  }
}

// ── รายงาน Token Status ───────────────────────────────────
async function runTokenStatusReport() {
  const now = Math.floor(Date.now() / 1000);
  for (const client of activeClients) {
    if (!client.ownerUserId || !client.lineToken) continue;
    try {
      const infoRows = await readSheet(client.sheetId, "ShopInfo!A:B");
      const info     = {};
      infoRows.slice(1).forEach(([k, v]) => { if(k) info[k.trim()] = v || ""; });

      const warnings = [];

      const shopeeExp = parseInt(info["SHOPEE_TOKEN_EXPIRES_AT"] || "0");
      if (shopeeExp > 0) {
        const hrsLeft = Math.floor((shopeeExp - now) / 3600);
        if (hrsLeft < 2 && hrsLeft >= 0) {
          warnings.push(`⚠️ Shopee Token เหลือ ${hrsLeft} ชั่วโมง`);
        } else if (hrsLeft < 0) {
          warnings.push("❌ Shopee Token หมดอายุแล้ว");
        }
      }

      const lazadaExp = parseInt(info["LAZADA_TOKEN_EXPIRES_AT"] || "0");
      if (lazadaExp > 0) {
        const daysLeft = Math.floor((lazadaExp - now) / 86400);
        if (daysLeft < 2 && daysLeft >= 0) {
          warnings.push(`⚠️ Lazada Token เหลือ ${daysLeft} วัน`);
        } else if (daysLeft < 0) {
          warnings.push("❌ Lazada Token หมดอายุแล้ว");
        }
      }

      if (warnings.length > 0) {
        await linePush(client.lineToken, client.ownerUserId,
          `🔑 แจ้งเตือน Token ร้าน ${client.name}\n${"─".repeat(24)}\n` +
          warnings.join("\n") + "\n" +
          `${"─".repeat(24)}\n` +
          `ระบบจะ Auto-refresh ให้อัตโนมัติ\nถ้าไม่สำเร็จจะแจ้งให้ทราบ 🙏`
        ).catch(()=>{});
        console.log(`🔑 [${client.name}] Token warning sent:`, warnings.join(", "));
      }
    } catch(e) {
      console.error(`[${client.name}] token status check:`, e.message);
    }
  }
}

// ── API Endpoint — ทดสอบ Sync ทันที ─────────────────────
app.get("/sync-marketplace", authMW, async (req, res) => {
  try {
    await runMarketplaceSync();
    res.json({ success: true, message: "Sync เสร็จแล้ว ตรวจสอบ Orders Sheet" });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API Endpoint — เช็คสถานะ Credentials ────────────────
app.get("/marketplace-status", authMW, async (req, res) => {
  try {
    const now     = Math.floor(Date.now() / 1000);
    const results = [];
    for (const client of activeClients) {
      const infoRows = await readSheet(client.sheetId, "ShopInfo!A:B");
      const info     = {};
      infoRows.slice(1).forEach(([k, v]) => { if(k) info[k.trim()] = v || ""; });

      const shopeeExp  = parseInt(info["SHOPEE_TOKEN_EXPIRES_AT"] || "0");
      const lazadaExp  = parseInt(info["LAZADA_TOKEN_EXPIRES_AT"] || "0");
      const shopeeLeft = shopeeExp ? Math.floor((shopeeExp - now) / 60) : null; // นาที
      const lazadaLeft = lazadaExp ? Math.floor((lazadaExp - now) / 3600) : null; // ชั่วโมง

      results.push({
        shop:   client.name,
        shopee: {
          configured:    !!info["SHOPEE_PARTNER_ID"],
          has_token:     !!info["SHOPEE_ACCESS_TOKEN"],
          has_refresh:   !!info["SHOPEE_REFRESH_TOKEN"],
          expires_in:    shopeeLeft !== null
                           ? (shopeeLeft > 0 ? `${shopeeLeft} นาที` : "❌ หมดอายุแล้ว")
                           : "ไม่ได้ตั้งค่า",
          status:        !info["SHOPEE_PARTNER_ID"] ? "❌ ยังไม่ตั้งค่า"
                           : shopeeLeft === null     ? "⚠️ ไม่มี expiry"
                           : shopeeLeft > 30         ? "✅ ปกติ"
                           : shopeeLeft > 0           ? "⚠️ ใกล้หมด"
                           : "❌ หมดอายุ",
        },
        lazada: {
          configured:    !!info["LAZADA_APP_KEY"],
          has_token:     !!info["LAZADA_ACCESS_TOKEN"],
          has_refresh:   !!info["LAZADA_REFRESH_TOKEN"],
          expires_in:    lazadaLeft !== null
                           ? (lazadaLeft > 0 ? `${lazadaLeft} ชั่วโมง` : "❌ หมดอายุแล้ว")
                           : "ไม่ได้ตั้งค่า",
          status:        !info["LAZADA_APP_KEY"] ? "❌ ยังไม่ตั้งค่า"
                           : lazadaLeft === null  ? "⚠️ ไม่มี expiry"
                           : lazadaLeft > 24      ? "✅ ปกติ"
                           : lazadaLeft > 0        ? "⚠️ ใกล้หมด"
                           : "❌ หมดอายุ",
        }
      });
    }
    res.json({
      results,
      sheet_fields: {
        shopee: ["SHOPEE_PARTNER_ID","SHOPEE_PARTNER_KEY","SHOPEE_SHOP_ID",
                 "SHOPEE_ACCESS_TOKEN","SHOPEE_REFRESH_TOKEN","SHOPEE_TOKEN_EXPIRES_AT"],
        lazada: ["LAZADA_APP_KEY","LAZADA_APP_SECRET",
                 "LAZADA_ACCESS_TOKEN","LAZADA_REFRESH_TOKEN","LAZADA_TOKEN_EXPIRES_AT"],
      },
      note: "SHOPEE_TOKEN_EXPIRES_AT และ LAZADA_TOKEN_EXPIRES_AT ระบบจะอัพเดทให้อัตโนมัติหลัง Refresh"
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API — Force Refresh Token ─────────────────────────────
app.post("/refresh-token", authMW, async (req, res) => {
  const { shopName, platform } = req.body;
  const client = shopName
    ? activeClients.find(c => c.name.toLowerCase().includes(shopName.toLowerCase()))
    : activeClients[0];
  if (!client) return res.status(404).json({ error: "ไม่พบร้าน" });

  try {
    const infoRows = await readSheet(client.sheetId, "ShopInfo!A:B");
    const info     = {};
    infoRows.slice(1).forEach(([k, v]) => { if(k) info[k.trim()] = v || ""; });

    let ok = false;
    if (!platform || platform === "shopee") {
      ok = await refreshShopeeToken(client, info, infoRows) || ok;
    }
    if (!platform || platform === "lazada") {
      ok = await refreshLazadaToken(client, info, infoRows) || ok;
    }
    res.json({ success: ok, message: ok ? "✅ Refresh สำเร็จ" : "❌ Refresh ไม่สำเร็จ — ตรวจสอบ Refresh Token" });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});


// --- 53_Web_View_-_Document_Printable_Page.js ---
// ═══════════════════════════════════════════════════════════
//  Web View - Document Printable Page
// ═══════════════════════════════════════════════════════════
app.get("/doc/:id", async (req, res) => {
  try {
    if (!supabase) return res.send("Database not configured");
    const { data: doc, error } = await supabase.from("documents").select("*, shops(name)").eq("id", req.params.id).single();
    if (error || !doc) return res.status(404).send("Document Not Found");
    
    // Minimal beautiful HTML output
    const typeName = { "quotation": "ใบเสนอราคา", "receipt": "ใบเสร็จรับเงิน", "billing": "ใบแจ้งหนี้/วางบิล", "delivery": "ใบส่งของ" }[doc.doc_type] || "เอกสาร";
    const cus = doc.customer_info || {};
    const itemsHtml = (doc.items || []).map(i => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${i.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${i.qty}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${Number(i.price).toLocaleString('th-TH')}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${(Number(i.price)*Number(i.qty)).toLocaleString('th-TH')}</td>
      </tr>
    `).join("");

    const html = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${typeName} - ${doc.doc_no}</title>
        <style>
          body { font-family: 'Sarabun', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; color: #111827; }
          .page { max-width: 800px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-radius: 8px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .title { font-size: 24px; font-weight: bold; color: #1f2937; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
          .info-box h4 { margin: 0 0 10px 0; color: #6b7280; font-size: 14px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f9fafb; padding: 12px; text-align: left; font-size: 14px; color: #4b5563; border-bottom: 2px solid #e5e7eb; }
          .totals { width: 300px; margin-left: auto; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
          .totals-row.grand { font-weight: bold; font-size: 18px; border-top: 2px solid #e5e7eb; border-bottom: none; margin-top: 8px; padding-top: 12px; }
          @media print { body { padding: 0; background: white; } .page { box-shadow: none; max-width: 100%; padding: 0; } .no-print { display: none; } }
          .btn-print { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; margin-bottom: 20px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="no-print" style="text-align: right;">
            <button class="btn-print" onclick="window.print()">🖨️ พิมพ์ / บันทึก PDF</button>
          </div>
          <div class="header">
            <div>
              <div style="font-size: 20px; font-weight: bold;">${doc.workspaces?.name || 'ร้านค้า'}</div>
            </div>
            <div style="text-align: right;">
              <div class="title">${typeName}</div>
              <div style="color: #6b7280; margin-top: 4px;">เลขที่: ${doc.doc_no}</div>
              <div style="color: #6b7280;">วันที่: ${new Date(doc.created_at).toLocaleDateString('th-TH')}</div>
            </div>
          </div>
          <div class="info-grid">
            <div class="info-box">
              <h4>ลูกค้า</h4>
              <div><strong>${cus.name || '-'}</strong></div>
              <div>${cus.address || ''}</div>
              <div>โทร: ${cus.phone || '-'}</div>
              <div>เลขประจำตัวผู้เสียภาษี: ${cus.tax_id || '-'}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>รายการสินค้า</th>
                <th style="text-align: center; width: 100px;">จำนวน</th>
                <th style="text-align: right; width: 150px;">ราคา/หน่วย</th>
                <th style="text-align: right; width: 150px;">รวม</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="totals">
            <div class="totals-row"><span>รวมเป็นเงิน</span><span>${Number(doc.subtotal).toLocaleString('th-TH')}</span></div>
            ${doc.discount > 0 ? `<div class="totals-row"><span>ส่วนลด</span><span>-${Number(doc.discount).toLocaleString('th-TH')}</span></div>` : ''}
            ${doc.tax > 0 ? `<div class="totals-row"><span>ภาษี (VAT)</span><span>${Number(doc.tax).toLocaleString('th-TH')}</span></div>` : ''}
            <div class="totals-row grand"><span>ยอดสุทธิ</span><span>฿ ${Number(doc.total).toLocaleString('th-TH')}</span></div>
          </div>
          ${doc.note ? `<div style="margin-top: 40px; color: #4b5563;"><strong>หมายเหตุ:</strong><br>${doc.note.replace(/\n/g, '<br>')}</div>` : ''}
        </div>
      </body>
      </html>
    `;
    res.send(html);
  } catch (e) { res.status(500).send("Error generating document: " + e.message); }
});

// Scheduler and app.listen removed from here




// ─── 2-Way Sync Backup (Supabase -> Google Sheets) ──────────────
async function runBackupToSheet() {
  console.log("🔄 Running Nightly Backup to Google Sheets...");
  if (!supabase) return;
  try {
    const { data: shops, error: wsErr } = await supabase.from("shops").select("id, name, sheet_id");
    if (wsErr) {
      console.error("Backup Error: Failed to fetch shops", wsErr.message);
      return;
    }
    if (!shops) return;
    for (const ws of shops) {
      if (!ws.sheet_id) continue;
      
      const { data: products } = await supabase.from("products").select("*").eq("shop_id", ws.id).order("created_at", { ascending: true });
      if (products && products.length > 0) {
        const header = [["รหัสสินค้า (SKU)","ชื่อสินค้า","หมวดหมู่","ราคา (มือสอง)","ราคา (ใหม่)","สถานะสต็อก","วัสดุ/กระดาษ","พอร์ตเชื่อมต่อ","เหมาะสำหรับ","คุณสมบัติพิเศษ","การรับประกัน","หมายเหตุเพิ่มเติม","ลิงก์สั่งซื้อ","ลิงก์คู่มือ/ไดรเวอร์","ลิงก์รูปภาพ"]];
        const rows = products.map(p => [
          p.sku || "", p.name || "", p.category || "", p.price_used || "", p.price_new || "", p.stock || "",
          p.metadata?.col_6||"", p.metadata?.col_7||"", p.metadata?.col_8||"",
          p.metadata?.col_9||"", p.metadata?.col_10||"", p.metadata?.col_11||"",
          p.link_buy||"", p.link_driver||"", p.image_url||""
        ]);
        const padEmpty = Array(50).fill(["","","","","","","","","","","","","","",""]); 
        await writeSheet(ws.sheet_id, "Products!A1:O", [...header, ...rows, ...padEmpty]).catch(() => null);
      }

      const { data: orders } = await supabase.from("orders").select("*").eq("shop_id", ws.id).order("created_at", { ascending: true });
      if (orders && orders.length > 0) {
        const header = [["วันที่","รหัสออเดอร์","ชื่อลูกค้า","เบอร์โทร","สินค้า","จำนวน","ที่อยู่","เลขผู้เสียภาษี","หมายเหตุ","สถานะ","ช่องทาง","เลขพัสดุ","ขนส่ง","สถานะจัดส่ง","วันที่ส่ง","LineUserID"]];
        const rows = orders.map(o => [
          new Date(o.created_at).toLocaleString("th-TH") || "", o.order_id || "", o.customer_name || "", o.phone || "",
          o.product_name || "", o.qty || "", o.address || "", o.tax_id || "", o.note || "",
          o.status || "", o.platform || "", o.tracking_no || "", o.carrier || "", o.delivery_status || "",
          o.shipped_at ? new Date(o.shipped_at).toLocaleString("th-TH") : "", o.line_user_id || ""
        ]);
        const padEmpty = Array(50).fill(Array(16).fill("")); 
        await writeSheet(ws.sheet_id, "Orders!A1:P", [...header, ...rows, ...padEmpty]).catch(() => null);
      }

      const { data: customers } = await supabase.from("customers").select("*").eq("workspace_id", ws.id).order("created_at", { ascending: true });
      if (customers && customers.length > 0) {
        const header = [["ID","ชื่อลูกค้า","เบอร์โทร","อีเมล","ที่อยู่","เลขผู้เสียภาษี","LineID","สร้างเมื่อ"]];
        const rows = customers.map(c => [
          c.id || "", c.name || "", c.phone || "", c.email || "", c.address || "", c.tax_id || "", c.line_id || "",
          new Date(c.created_at).toLocaleString("th-TH") || ""
        ]);
        const padEmpty = Array(50).fill(Array(8).fill("")); 
        await writeSheet(ws.sheet_id, "Customers!A1:H", [...header, ...rows, ...padEmpty]).catch(() => null);
      }
    }
    console.log("✅ Backup to Google Sheets Complete");
  } catch (e) { console.error("Backup Error:", e.message); }
}

(async () => {
  // 🏪 โหลด clients จาก Supabase (เพิ่มเติมจาก env ที่โหลดตอน init)
  await refreshClients();
  await Promise.all(activeClients.map(c=>getPromptData(c)));

  // 🔄 Auto-refresh clients ทุก 5 นาที (รับร้านใหม่โดยไม่ต้อง restart)
  setInterval(() => refreshClients().catch(e => console.error("refreshClients:", e.message)), 5 * 60 * 1000);

  // ⚡ Delay tasks ตอน startup เพื่อไม่ให้ยิง LINE API พร้อมกัน → 529
  setTimeout(() => runExpiryWarnings().catch(e=>console.error("startup:expiryWarnings",e.message)),  8000);
  setTimeout(() => runMarketplaceSync().catch(e=>console.error("startup:marketplaceSync",e.message)), 20000);
  setTimeout(() => runTokenStatusReport().catch(e=>console.error("startup:tokenReport",e.message)),   35000);

  scheduleDaily(8,0,()=>{runExpiryWarnings();runWeeklySummary();});
  scheduleDaily(8,30,runTokenStatusReport);
  scheduleDaily(9,0, runBookingReminders);
  scheduleDaily(10,0,runFollowUps);
  scheduleDaily(11,0,runUnpaidReminders);
  scheduleDaily(18,0,runDailySummary);
  scheduleDaily(0,0, runBackupToSheet);

  setInterval(runUnpaidReminders, 60 * 60 * 1000);
  setInterval(runMarketplaceSync, 5 * 60 * 1000);
  setInterval(runTokenStatusReport, 60 * 60 * 1000);
  
  console.log("🏪 Multi-Tenant: ✅ (" + activeClients.length + " shops active, auto-refresh ทุก 5 นาที)");
  console.log("📸 Image Sending: LINE ✅ | Facebook ✅");
  console.log("🛒 Marketplace Sync: ✅ (ทุก 5 นาที | delayed 20s)");
  console.log("🔑 Token Auto-Refresh: ✅ | Status Report: 08:30 ทุกวัน");
  console.log("💾 2-Way Sync Backup: ✅ (ทุกคืนเวลา 00:00)");
})();

};
