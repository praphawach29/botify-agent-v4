module.exports = function(app) {

// Auto-generated from chunks
const axios = require("axios");
const { supabase } = require("../config/db");
const { FB_VERIFY_TOKEN, findLineClient, findFbClient } = require("../config/globals");
const { toLineCompatibleUrl, isValidImageUrl, checkStatus, suspendedMsg, sendFbImage } = require("../utils/helpers");
const { getPromptData } = require("../services/bookingService");
const { readSheet, appendSheet } = require("../services/sheetService");
const { markOrderPaid, notifyOwner, linePush, fbPush } = require("../services/notificationService");
const { askClaude, callAIWithImage, logInq, logChat, loadHist, saveHist, fbTypingOn, fbTypingOff, lineTyping, resolveShopId, PERSONALITIES } = require("../services/aiService");
const { Cache } = require("../utils/redis");

// --- 26_LINE_Webhook.js ---
// ═══════════════════════════════════════════════════════════
//  LINE Webhook
// ═══════════════════════════════════════════════════════════
// ─── Spam Protection & Debouncing ────────────────────────────────
const _rateLimits = new Map();

function isSpamming(userId) {
  const now = Date.now();
  if (!_rateLimits.has(userId)) {
    _rateLimits.set(userId, { count: 1, firstSeen: now });
    return false;
  }
  const data = _rateLimits.get(userId);
  if (now - data.firstSeen > 60000) {
    data.count = 1;
    data.firstSeen = now;
    return false;
  }
  data.count++;
  if (data.count > 15) return true;
  return false;
}

async function processLineMessage(client, userId, userText, replyToken, _webhookShopId) {
  try {
    const st = await checkStatus(client.sheetId, client.lineToken);
    if (!st.active) {
      await axios.post("https://api.line.me/v2/bot/message/reply",
        { replyToken, messages: [{ type: "text", text: suspendedMsg(st) }] },
        { headers: { Authorization: `Bearer ${client.lineToken}`, "Content-Type": "application/json" } }
      );
      return;
    }
    await lineTyping(client.lineToken, userId);

    const { textReply, imageUrl } = await askClaude(client, `line_${userId}`, userText, "LINE");

    // ─── Reply text + image ใน replyToken เดียว ──
    const messages = [];
    if (textReply) messages.push({ type: "text", text: textReply });
    if (imageUrl && isValidImageUrl(imageUrl)) {
      const compatUrl = toLineCompatibleUrl(imageUrl);
      if (compatUrl) {
        messages.push({ type: "image", originalContentUrl: compatUrl, previewImageUrl: compatUrl });
        console.log(`📸 [${client.name}] +IMG: ${imageUrl.slice(0, 50)}`);
      }
    }

    if (messages.length > 0) {
      try {
        await axios.post("https://api.line.me/v2/bot/message/reply",
          { replyToken, messages: messages.slice(0, 5) },
          { headers: { Authorization: `Bearer ${client.lineToken}`, "Content-Type": "application/json" } }
        );
        console.log(`✅ [${client.name}] LINE replied (${messages.length} msg): ${userText.replace(/\n/g, " ").slice(0, 30)}`);
      } catch (replyErr) {
        const errMsg = replyErr.response?.data?.message || replyErr.message || "";
        console.warn(`⚠️ [${client.name}] Reply failed: ${errMsg}`);
        if (messages.length > 1 && textReply) {
          await axios.post("https://api.line.me/v2/bot/message/reply",
            { replyToken, messages: [{ type: "text", text: textReply }] },
            { headers: { Authorization: `Bearer ${client.lineToken}`, "Content-Type": "application/json" } }
          ).catch(e2 => console.error(`❌ [${client.name}] Text fallback failed:`, e2.message));
        }
      }
    }

    await logInq(client.sheetId, "LINE", userId, userText, textReply);
    if (_webhookShopId) {
      await logChat(_webhookShopId, "LINE", userId, "", "in", userText);
      await logChat(_webhookShopId, "LINE", userId, "", "out", textReply.slice(0, 2000));
      const hist = await loadHist(client.sheetId, `line_${userId}`).catch(() => []);
      if (hist.length <= 2) {
        await notifyOwner(client, "new_chat",
          `💬 แชทใหม่จากลูกค้า (LINE)\n${"─".repeat(24)}\n👤 ${userId}\n💬 ${userText.slice(0, 100)}`
        );
      }
    }
  } catch (err) {
    console.error(`[${client.name}] LINE:`, err.message);
    if (!/image|img|529|quota/i.test(err.message)) {
      try {
        await axios.post("https://api.line.me/v2/bot/message/reply",
          { replyToken, messages: [{ type: "text", text: "ขออภัยครับ ระบบประมวลผลมีปัญหาชั่วคราว 🙏" }] },
          { headers: { Authorization: `Bearer ${client.lineToken}`, "Content-Type": "application/json" } }
        );
      } catch(e) { console.debug("processLineMessage fallback error:", e.message); }
    }
  }
}

async function processFbMessage(client, senderId, userText, _fbShopId) {
  try {
    const st = await checkStatus(client.sheetId, client.lineToken);
    if (!st.active) { await fbPush(client.fbToken, senderId, suspendedMsg(st)); return; }
    await fbTypingOn(client.fbToken, senderId);

    const { textReply, imageUrl } = await askClaude(client, `fb_${senderId}`, userText, "Facebook");

    await fbTypingOff(client.fbToken, senderId);

    if (imageUrl && isValidImageUrl(imageUrl)) {
      await sendFbImage(client.fbToken, senderId, imageUrl);
      console.log(`📸 [${client.name}] FB+IMG: ${userText.replace(/\n/g, " ").slice(0, 30)}`);
    }
    await fbPush(client.fbToken, senderId, textReply);
    await logInq(client.sheetId, "Facebook", senderId, userText, textReply);

    if (_fbShopId) {
      await logChat(_fbShopId, "Facebook", senderId, "", "in", userText);
      await logChat(_fbShopId, "Facebook", senderId, "", "out", textReply.slice(0, 2000));
      const fbHist = await loadHist(client.sheetId, `fb_${senderId}`).catch(() => []);
      if (fbHist.length <= 2) {
        await notifyOwner(client, "new_chat",
          `💬 แชทใหม่จากลูกค้า (Facebook)\n${"─".repeat(24)}\n👤 ${senderId}\n💬 ${userText.slice(0, 100)}`
        );
      }
    }
  } catch (err) {
    console.error(`[${client.name}] FB:`, err.message);
    try { await fbTypingOff(client.fbToken, senderId); await fbPush(client.fbToken, senderId, "ขออภัยครับ 🙏"); } catch(e) { console.debug("processFbMessage fallback error:", e.message); }
  }
}

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  const events=req.body?.events||[];
  if (!events.length) return;
  const client=findLineClient(req.body.destination);
  if (!client) { console.error(`❌ No client: ${req.body.destination}`); return; }
  // Resolve shopId once for chat logging
  const _webhookShopId = await resolveShopId(client);

  for (const ev of events) {

    // ─── Follow Event — ลูกค้าเพิ่มเพื่อน ──────────────────
    if (ev.type === "follow") {
      const userId = ev.source.userId;
      try {
        const pd  = await getPromptData(client);
        const info = await readSheet(client.sheetId, "ShopInfo!A:B").catch(() => []);
        const infoMap = {};
        info.slice(1).forEach(([k,v]) => { if(k) infoMap[k.trim()] = v||""; });

        // ดึงข้อความต้อนรับจาก Sheet ถ้ามี
        const customWelcome = infoMap["ข้อความต้อนรับ"] || "";
        const p = pd.personality || {};
        const closing = p.pronoun?.includes("ค่ะ") ? "ค่ะ" : "ครับ";

        const welcome = customWelcome ||
          `สวัสดี${closing}! 😊 ยินดีต้อนรับสู่ ${pd.shopName}\n` +
          `ผม/หนูคือ AI Assistant ของร้านนะ${closing}\n\n` +
          `ทักมาได้เลย${closing} จะถามเรื่องสินค้า ราคา หรืออยากสั่งซื้อ\n` +
          `พร้อมช่วยตลอด 24 ชั่วโมง${closing} 🙏`;

        await linePush(client.lineToken, userId, welcome);
        console.log(`👋 [${client.name}] Welcome sent → ${userId}`);

        // Log ใน Inquiries + Chat Logs
        await logInq(client.sheetId, "LINE", userId, "[follow]", welcome);
        if (_webhookShopId) {
          await logChat(_webhookShopId, "LINE", userId, "", "out", welcome);
        }
      } catch(err) {
        console.error(`[${client.name}] follow event:`, err.message);
      }
      continue;
    }

    // ─── Unfollow Event — ลูกค้าบล็อก/ลบเพื่อน ─────────────
    if (ev.type === "unfollow") {
      const userId = ev.source.userId;
      console.log(`👋 [${client.name}] Unfollow: ${userId}`);
      // Log ไว้เฉยๆ ไม่ต้องส่งอะไร
      await logInq(client.sheetId, "LINE", userId, "[unfollow]", "-").catch(()=>{});
      continue;
    }

    // ─── Image Handler — ลูกค้าส่งรูปมา ───────────────────
    if (ev.type === "message" && ev.message.type === "image") {
      const userId     = ev.source.userId;
      const replyToken = ev.replyToken;
      const imageId    = ev.message.id;

      try {
        const pd      = await getPromptData(client);
        const p       = pd?.personality || PERSONALITIES["ชาย-สุภาพ"];
        const closing = p.pronoun?.includes("ค่ะ") ? "ค่ะ" : "ครับ";

        // ── ดาวน์โหลดรูปจาก LINE API ────────────────────────
        let imageBase64 = null;
        try {
          const imgRes = await axios.get(
            `https://api-data.line.me/v2/bot/message/${imageId}/content`,
            { headers: { Authorization: `Bearer ${client.lineToken}` }, responseType: "arraybuffer" }
          );
          imageBase64 = Buffer.from(imgRes.data).toString("base64");
        } catch(e) {
          console.error("Download LINE image failed:", e.message);
        }

        // ── ดึงบทสนทนาล่าสุดเพื่อเข้าใจ context ──────────
        const hist = await loadHist(client.sheetId, `line_${userId}`);
        const lastMsg = hist.length > 0
          ? (hist[hist.length - 1]?.content || "").toLowerCase()
          : "";

        // ── ตรวจ context จากข้อความก่อนหน้า ───────────────
        const isRepairContext = /เสีย|ชำรุด|พัง|ซ่อม|แตก|ไม่ทำงาน|error|ปัญหา|help|ช่วย/.test(lastMsg);
        const isSearchContext = /หาให้|ค้นหา|มีไหม|แบบนี้|รุ่นนี้|อยากได้|ขอดู|เหมือน/.test(lastMsg);

        // ── Case 1: ออเดอร์รอชำระ → รับสลิป ───────────────
        const orderRows = await readSheet(client.sheetId, "Orders!A:R");
        const pending = orderRows.slice(1).filter(r =>
          r[15] === userId &&
          (r[16] || "รอชำระ").trim() === "รอชำระ" &&
          (r[9]  || "").toLowerCase() !== "ยกเลิก"
        );

        if (pending.length > 0 && !isRepairContext && !isSearchContext) {
          // มีออเดอร์รอชำระ → ถือว่าเป็นสลิป
          const latest  = pending[pending.length - 1];
          const orderId = latest[1];
          
          let slipVerified = false;
          let isAutoVerified = false;
          let slipMessage = `ได้รับสลิปแล้ว${closing}! 🙏\n${"─".repeat(20)}\n🆔 ${orderId}\n🛍️ ${latest[4]} × ${latest[5]}\n${"─".repeat(20)}\nทีมงานกำลังตรวจสอบ จะจัดส่งเร็วๆ นี้นะ${closing} 🚚`;
          let outOfCredits = false;

          // ── Slip Verification & Credit Deduction ────────────────
          if (client.shopId && supabase && imageBase64) {
            try {
              const { data: shop } = await supabase.from("shops").select("ai_credits").eq("id", client.shopId).single();
              if (shop && shop.ai_credits >= 5) {
                // TODO: Call External API here (SlipOK / EasySlip)
                // const slipOkRes = await axios.post("...", { image: imageBase64 });
                // slipVerified = slipOkRes.data.success;
                
                // MOCK: สมมติว่าตรวจผ่าน
                slipVerified = true;
                isAutoVerified = true;
                
                await supabase.from("shops").update({ ai_credits: shop.ai_credits - 5 }).eq("id", client.shopId);
                await supabase.from("credit_transactions").insert([{ shop_id: client.shopId, amount: -5, reason: 'slip_check', metadata: { orderId } }]);
                await supabase.from("slip_checks").insert([{ shop_id: client.shopId, order_id: orderId, status: slipVerified ? 'success' : 'failed' }]);
                
                if (slipVerified) {
                   slipMessage = `ตรวจสอบสลิปสำเร็จ (ระบบอัตโนมัติ)${closing}! 🙏\nยอดเงินถูกต้อง\n${"─".repeat(20)}\n🆔 ${orderId}\nทีมงานเตรียมจัดส่งสินค้าให้ครับ 🚚`;
                } else {
                   slipMessage = `ได้รับสลิปแล้ว แต่ระบบไม่สามารถตรวจสอบยอดเงินอัตโนมัติได้ แอดมินจะเข้ามาตรวจสอบเพิ่มเติมนะครับ 🙏`;
                }
              } else {
                outOfCredits = true;
              }
            } catch(err) { console.error("Slip check error:", err.message); }
          }

          await markOrderPaid(client.sheetId, orderId);
          // แจ้งเจ้าของร้านผ่าน notifyOwner
          await notifyOwner(client, "new_order",
            `📲 ลูกค้าส่งสลิป!\n🆔 ${orderId}\n👤 ${latest[2]} | 🛍️ ${latest[4]}\n${isAutoVerified ? '✅ ตรวจสอบสลิปผ่านแล้ว' : (outOfCredits ? '⚠️ ไม่ได้ตรวจสลิป (เครดิตหมด)' : '⚠️ รอแอดมินตรวจสอบสลิป')}`
          );
          await axios.post("https://api.line.me/v2/bot/message/reply",
            { replyToken, messages: [{ type: "text", text: slipMessage }]},
            { headers: { Authorization: `Bearer ${client.lineToken}`, "Content-Type": "application/json" }}
          );
          await logInq(client.sheetId, "LINE", userId, "[slip]", `paid: ${orderId}`);
          // Chat Logs — บันทึกสลิป (in) + bot reply (out)
          if (_webhookShopId) {
            await logChat(_webhookShopId, "LINE", userId, "", "in", "[ส่งสลิปชำระเงิน]", "image");
            await logChat(_webhookShopId, "LINE", userId, "", "out", slipMessage);
          }
          console.log(`📲 [${client.name}] Slip → ${orderId}`);
          continue;
        }

        // ── Case 2: บอท + Claude วิเคราะห์รูป ───────────────
        // ส่งรูปให้ Claude พร้อม context ของร้านและบทสนทนา
        if (imageBase64) {
          await lineTyping(client.lineToken, userId);

          // สร้าง System Prompt สำหรับวิเคราะห์รูป
          const imageSystemPrompt = `${pd.prompt}

════════ 📷 การรับรูปจากลูกค้า ════════
ลูกค้าส่งรูปมาให้ดู วิเคราะห์รูปและตอบตามหนึ่งใน 3 กรณีนี้:

กรณี 1 — ค้นหาสินค้า:
ถ้ารูปเป็นสินค้าที่คล้ายกับที่ร้านมี (ปริ้นเตอร์ อุปกรณ์สำนักงาน ฯลฯ)
→ แจ้งว่า "เห็นรูปแล้ว${closing}! คิดว่าน่าจะเป็น [ชื่อสินค้า] ..."
→ แนะนำสินค้าในร้านที่ใกล้เคียงที่สุดพร้อมราคา
→ ถามว่าสนใจรุ่นไหน

กรณี 2 — สินค้าเสีย/ชำรุด:
ถ้ารูปดูเหมือนอุปกรณ์เสียหาย ชำรุด มีอาการผิดปกติ
→ แสดงความเสียใจ
→ ถามอาการเพิ่มเติม (เสียยังไง ใช้มานานแค่ไหน มีประกันไหม)
→ ใส่ tag นี้เพื่อให้ระบบรับเรื่อง:
---แจ้งซ่อม---
อาการ: [อธิบายสิ่งที่เห็นในรูป]
สินค้า: [ชื่อสินค้าถ้าระบุได้]
---สิ้นสุด---

กรณี 3 — รูปอื่นๆ:
ถ้าไม่แน่ใจ → ถามว่า "ได้รับรูปแล้ว${closing} ต้องการให้ช่วยอะไรเกี่ยวกับรูปนี้${closing}?"`;

          // เรียก AI วิเคราะห์รูป (Vision) — ใช้ config ต่อร้าน
          const msgs = await loadHist(client.sheetId, `line_${userId}`);
          const pd2  = await getPromptData(client).catch(() => null);
          let reply  = await callAIWithImage(imageSystemPrompt, msgs, imageBase64, pd2?.clientAiConfig || null);

          // ── ตรวจ tag แจ้งซ่อม ─────────────────────────────
          const repairMatch = reply.match(/---แจ้งซ่อม---([\s\S]*?)---สิ้นสุด---/);
          if (repairMatch) {
            reply = reply.replace(/---แจ้งซ่อม---[\s\S]*?---สิ้นสุด---/g, "").trim();

            // บันทึกการแจ้งซ่อม
            const repairInfo = repairMatch[1];
            const symptom = repairInfo.match(/อาการ[:\s]+([^\n]+)/)?.[1]?.trim() || "ไม่ระบุ";
            const product  = repairInfo.match(/สินค้า[:\s]+([^\n]+)/)?.[1]?.trim() || "ไม่ระบุ";
            const now      = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });

            await appendSheet(client.sheetId, "Inquiries!A:E", [[
              now, "LINE", userId,
              `[แจ้งซ่อม] ${product} — ${symptom}`,
              reply
            ]]);

            // แจ้งเจ้าของร้านผ่าน notifyOwner
            await notifyOwner(client, "new_chat",
              `🔧 ลูกค้าแจ้งซ่อม!\n${"─".repeat(24)}\n` +
              `👤 UserID: ${userId}\n🛍️ สินค้า: ${product}\n⚠️ อาการ: ${symptom}\n` +
              `${"─".repeat(24)}\nกรุณาโทรติดต่อกลับ${closing} 📞 ${pd.phone}`
            );

            reply += `\n\n${"─".repeat(20)}\n📋 รับเรื่องแล้ว${closing}!\nทีมงานจะโทรติดต่อกลับเร็วๆ นี้นะ${closing} 🙏`;
            console.log(`🔧 [${client.name}] Repair report: ${product} — ${symptom}`);
          }

          // ── บันทึกประวัติ ──────────────────────────────────
          msgs.push({ role: "user",      content: "[ส่งรูปมา]" });
          msgs.push({ role: "assistant", content: reply });
          saveHist(client.sheetId, `line_${userId}`, msgs.slice(-20)).catch(()=>{});

          // ── ตอบลูกค้า ──────────────────────────────────────
          await axios.post("https://api.line.me/v2/bot/message/reply",
            { replyToken, messages: [{ type: "text", text: reply }] },
            { headers: { Authorization: `Bearer ${client.lineToken}`, "Content-Type": "application/json" }}
          );
          await logInq(client.sheetId, "LINE", userId, "[image]", reply.slice(0, 200));
          // Chat Logs — บันทึกรูป (in) + bot reply (out)
          if (_webhookShopId) {
            await logChat(_webhookShopId, "LINE", userId, "", "in", "[ส่งรูปมา]", "image");
            await logChat(_webhookShopId, "LINE", userId, "", "out", reply.slice(0, 2000));
          }

        } else {
          // ดาวน์โหลดรูปไม่ได้ → ตอบทั่วไป
          await axios.post("https://api.line.me/v2/bot/message/reply",
            { replyToken, messages: [{ type: "text",
              text: `ได้รับรูปแล้ว${closing}! 😊\nต้องการให้ช่วยอะไรเกี่ยวกับรูปนี้${closing}?\n(ค้นหาสินค้า / แจ้งซ่อม / อื่นๆ)`
            }]},
            { headers: { Authorization: `Bearer ${client.lineToken}`, "Content-Type": "application/json" }}
          );
        }
      } catch(err) {
        console.error(`[${client.name}] image handler:`, err.message);
        try {
          await axios.post("https://api.line.me/v2/bot/message/reply",
            { replyToken, messages: [{ type: "text",
              text: `ได้รับรูปแล้วครับ สักครู่ทีมงานจะตรวจสอบและติดต่อกลับ 🙏`
            }]},
            { headers: { Authorization: `Bearer ${client.lineToken}`, "Content-Type": "application/json" }}
          );
        } catch {}
      }
      continue;
    }

    // ─── Message Event — ข้อความจากลูกค้า (Debounced) ─────────
    if (ev.type!=="message"||ev.message.type!=="text") continue;
    const userId=ev.source.userId, replyToken=ev.replyToken, userText=ev.message.text;

    if (isSpamming(userId)) {
      console.warn(`🛡️ Rate Limit: ${userId} is spamming.`);
      continue;
    }

    Cache.enqueueMessage(userId, userText, replyToken, 2500, async (combinedText, rToken) => {
      await processLineMessage(client, userId, combinedText, rToken, _webhookShopId);
    });
  }
});


// --- 27_Facebook_Webhook.js ---
// ═══════════════════════════════════════════════════════════
//  Facebook Webhook
// ═══════════════════════════════════════════════════════════
app.get("/webhook-fb", (req,res) => {
  const{"hub.mode":m,"hub.verify_token":t,"hub.challenge":c}=req.query;
  if(m==="subscribe"&&t===FB_VERIFY_TOKEN) return res.status(200).send(c);
  res.sendStatus(403);
});
app.post("/webhook-fb", async (req,res) => {
  res.sendStatus(200);
  if(req.body.object!=="page") return;
  for (const entry of req.body.entry||[]) {
    const client=findFbClient(entry.id);
    if (!client) { console.error(`❌ No FB client: ${entry.id}`); continue; }
    const _fbShopId = await resolveShopId(client);
    for (const ev of entry.messaging||[]) {
      if(!ev.message?.text||ev.message.is_echo) continue;
      const senderId=ev.sender.id, userText=ev.message.text;

      if (isSpamming(senderId)) {
        console.warn(`🛡️ Rate Limit: ${senderId} (FB) is spamming.`);
        continue;
      }

      Cache.enqueueMessage(senderId, userText, null, 2500, async (combinedText) => {
        await processFbMessage(client, senderId, combinedText, _fbShopId);
      });
    }
  }
});




};
