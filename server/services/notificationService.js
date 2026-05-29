// Auto-generated from chunks
const axios = require("axios");
const { supabase } = require("../config/db");
const { readSheet, writeSheet, appendSheet } = require("./sheetService");
const { activeClients, FOLLOWUP_HOURS } = require("../config/globals");
// --- 12_Push_Helpers.js ---
// ═══════════════════════════════════════════════════════════
//  Push Helpers
// ═══════════════════════════════════════════════════════════
const linePush = async (token, to, text) => {
  try { await axios.post("https://api.line.me/v2/bot/message/push",{to,messages:[{type:"text",text}]},{headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"}}); return true; }
  catch(e) { console.error("linePush:",e.response?.data||e.message); return false; }
};
const fbPush = async (tok, to, text) => {
  try { await axios.post(`https://graph.facebook.com/v18.0/me/messages?access_token=${tok}`,{recipient:{id:to},message:{text}}); return true; }
  catch(e) { console.error("fbPush:",e.message); return false; }
};


// --- 13____NOTIFICATION_SYSTEM___LINE_Messaging_API_push.js ---
// ═══════════════════════════════════════════════════════════
//  🔔 NOTIFICATION SYSTEM — LINE Messaging API push

// --- 14_____notification_settings_____Supabase.js ---
// ═══════════════════════════════════════════════════════════
// ดึง notification settings จาก Supabase
const notifySettingsCache = {};
async function getNotifySettings(shopId) {
  if (!supabase || !shopId) return { notify_new_order: true, notify_low_stock: true, notify_daily_summary: true, notify_new_chat: false };
  const cacheKey = `ns_${shopId}`;
  if (notifySettingsCache[cacheKey] && Date.now() - notifySettingsCache[cacheKey].at < 300000) return notifySettingsCache[cacheKey].data;
  try {
    const { data } = await supabase.from("shops")
      .select("notify_new_order, notify_low_stock, notify_daily_summary, notify_new_chat, owner_line_id, line_token")
      .eq("id", shopId).single();
    const settings = data || {};
    notifySettingsCache[cacheKey] = { data: settings, at: Date.now() };
    return settings;
  } catch { return { notify_new_order: true, notify_low_stock: true, notify_daily_summary: true, notify_new_chat: false }; }
}

// แจ้งเตือนเจ้าของร้าน — เช็ค settings ก่อนส่ง
async function notifyOwner(client, type, message) {
  if (!client.lineToken || !client.ownerUserId) return false;
  // หา shopId จาก client
  let shopId = client.shopId;
  if (!shopId && supabase) {
    try {
      const { data } = await supabase.from("shops").select("id").eq("line_token", client.lineToken).single();
      if (data) { shopId = data.id; client.shopId = shopId; }
    } catch {}
  }
  if (shopId) {
    const settings = await getNotifySettings(shopId);
    // เช็คว่าเปิดแจ้งเตือนประเภทนี้หรือไม่
    if (type === "new_order" && !settings.notify_new_order) return false;
    if (type === "low_stock" && !settings.notify_low_stock) return false;
    if (type === "daily_summary" && !settings.notify_daily_summary) return false;
    if (type === "new_chat" && !settings.notify_new_chat) return false;
  }
  return linePush(client.lineToken, client.ownerUserId, message);
}


// --- 20____UNPAID_ORDER_REMINDER______________________________.js ---
// ═══════════════════════════════════════════════════════════
//  💳 UNPAID ORDER REMINDER — ติดตามออเดอร์ยังไม่ชำระเงิน
//
//  Orders Sheet ขยาย A-P → A-R:
//  Q = สถานะชำระ (รอชำระ/ชำระแล้ว/ยกเลิก)
//  R = เวลาที่ส่ง Reminder ล่าสุด
//
//  ENV ใหม่ใน Railway:
//  UNPAID_REMINDER_HOURS = 2   (ส่งหลังกี่ชั่วโมง ค่าเริ่มต้น 2)
//  UNPAID_MAX_REMINDERS  = 3   (ส่งสูงสุดกี่ครั้ง ค่าเริ่มต้น 3)
//  PROMPTPAY_NUMBER      = 095-585-1136
// ═══════════════════════════════════════════════════════════

const UNPAID_REMINDER_HOURS = parseFloat(process.env.UNPAID_REMINDER_HOURS || "2");
const UNPAID_MAX_REMINDERS  = parseInt(process.env.UNPAID_MAX_REMINDERS    || "3");
const PROMPTPAY_NUMBER      = process.env.PROMPTPAY_NUMBER || "";
const reminderCount         = {}; // cache: orderId → จำนวนครั้งที่ส่ง

async function runUnpaidReminders() {
  for (const c of activeClients) {
    try {
      const rows = await readSheet(c.sheetId, "Orders!A:R");
      const now  = Date.now();
      const pd   = await getPromptData(c).catch(() => null);
      const p    = pd?.personality || PERSONALITIES["ชาย-สุภาพ"];
      const closing = p.pronoun?.includes("ค่ะ") ? "ค่ะ" : "ครับ";
      const phone   = pd?.phone || "-";
      const shop    = pd?.shopName || c.name;

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r[1]) continue;

        const orderId    = r[1];
        const custName   = r[2]  || "-";
        const product    = r[4]  || "-";
        const qty        = r[5]  || "1";
        const orderStat  = (r[9]  || "").toLowerCase();
        const platform   = r[10] || "LINE";
        const userId     = r[15] || "";
        const payStatus  = (r[16] || "รอชำระ").trim();  // Q
        const lastRem    = r[17] || "";                  // R

        if (!userId)                      continue;
        if (payStatus === "ชำระแล้ว")    continue;
        if (payStatus === "ยกเลิก")      continue;
        if (payStatus === "ชำระปลายทาง") continue;  // ← ข้าม COD/หน้าร้าน
        if (orderStat  === "ยกเลิก")     continue;

        const sent    = reminderCount[orderId] || 0;
        if (sent >= UNPAID_MAX_REMINDERS) continue;

        // เช็คเวลา: ครั้งแรกหลัง UNPAID_REMINDER_HOURS, ครั้งต่อไป × 2
        const waitHrs  = sent === 0 ? UNPAID_REMINDER_HOURS : UNPAID_REMINDER_HOURS * 2;
        const lastTime = lastRem ? new Date(lastRem).getTime() : 0;
        if (lastTime && (now - lastTime) < waitHrs * 3600000) continue;

        // ถ้ายังไม่มี reminder ให้นับจากเวลาสร้างออเดอร์
        if (!lastRem && r[0]) {
          const created = new Date(r[0]).getTime();
          if (!isNaN(created) && (now - created) < UNPAID_REMINDER_HOURS * 3600000) continue;
        }

        // หาราคา
        let totalTxt = "";
        try {
          const pRows = await readSheet(c.sheetId, "Products!A:E");
          const pRow  = pRows.slice(1).find(pr =>
            pr[1] && (pr[1].toLowerCase().includes(product.toLowerCase()) ||
                      product.toLowerCase().includes((pr[1]||"").toLowerCase()))
          );
          if (pRow) {
            const price = parseFloat(pRow[3] || pRow[4] || "0");
            if (price > 0) totalTxt = `\n💰 ยอดชำระ: ฿${(price * (parseInt(qty)||1)).toLocaleString()}`;
          }
        } catch(e) { /* ไม่มีราคา */ }

        // ข้อความตามรอบ
        const urgency = sent === 0 ? "🛒 แจ้งเตือนการชำระเงิน"
          : sent === 1 ? "⏰ แจ้งเตือนครั้งที่ 2"
          : "🚨 แจ้งเตือนสุดท้าย";

        const ppLine = PROMPTPAY_NUMBER
          ? `\n📲 PromptPay: ${PROMPTPAY_NUMBER}\n   โอนแล้วส่งสลิปมาได้เลย${closing}`
          : `\n📞 ติดต่อชำระ: ${phone}`;

        const lastWarn = sent >= UNPAID_MAX_REMINDERS - 1
          ? `\n\n⚠️ หากไม่ชำระ ออเดอร์จะถูกยกเลิกอัตโนมัติ` : "";

        const msg =
          `${urgency}\n${"─".repeat(24)}\n` +
          `สวัสดี${closing} คุณ${custName}\n` +
          `ออเดอร์ ${orderId}\n` +
          `🛍️ ${product} × ${qty}${totalTxt}\n` +
          `ยังรอการชำระอยู่นะ${closing}\n` +
          `${"─".repeat(24)}${ppLine}${lastWarn}\n` +
          `\nขอบคุณที่ใช้บริการ ${shop} 🙏`;

        let sent_ok = false;
        if (platform === "Facebook" && c.fbToken) sent_ok = await fbPush(c.fbToken, userId, msg);
        else if (c.lineToken) sent_ok = await linePush(c.lineToken, userId, msg);

        if (sent_ok) {
          const nowStr = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
          await writeSheet(c.sheetId, `Orders!R${i+1}`, [[nowStr]]);
          if (!r[16]) await writeSheet(c.sheetId, `Orders!Q${i+1}`, [["รอชำระ"]]);
          reminderCount[orderId] = sent + 1;
          console.log(`💳 [${c.name}] Unpaid reminder #${sent+1} → ${orderId} (${custName})`);

          // แจ้งเจ้าของเมื่อส่งครบ max
          if (sent + 1 >= UNPAID_MAX_REMINDERS && c.ownerUserId) {
            await linePush(c.lineToken, c.ownerUserId,
              `⚠️ ${orderId} ส่ง Reminder ครบ ${UNPAID_MAX_REMINDERS} ครั้งแล้ว\n` +
              `👤 ${custName} | 🛍️ ${product}\n` +
              `กรุณาโทรติดต่อลูกค้าโดยตรง${closing} 📞`
            );
          }
        }
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    } catch(e) { console.error("unpaidReminders:", e.message); }
  }
}

// Mark order paid
async function markOrderPaid(sheetId, orderId) {
  const rows = await readSheet(sheetId, "Orders!A:R");
  const idx  = rows.findIndex(r => r[1] === orderId);
  if (idx === -1) return false;
  const now = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
  await writeSheet(sheetId, `Orders!Q${idx+1}`, [["ชำระแล้ว"]]);
  await writeSheet(sheetId, `Orders!R${idx+1}`, [[now]]);
  delete reminderCount[orderId];
  return true;
}

async function processOrder(sheetId,orderId,od,lineToken,ownerUserId,cusLineId){
  // ตรวจสอบประเภทการชำระ
  const payText   = (od.payment || "-").trim();
  const isCOD     = /ปลายทาง|cod|เก็บปลาย/i.test(payText);
  const isStore   = /หน้าร้าน|รับเอง|มารับ/i.test(payText);
  const isTransfer= /โอน|transfer|prompt/i.test(payText) || (!isCOD && !isStore);

  // สถานะชำระ — COD/หน้าร้าน = "ชำระปลายทาง", โอน = "รอชำระ"
  const initPayStatus = (isCOD || isStore) ? "ชำระปลายทาง" : "รอชำระ";

  await appendSheet(sheetId,"Orders!A:R",[[
    new Date().toLocaleString("th-TH",{timeZone:"Asia/Bangkok"}),
    orderId, od.name||"-", od.phone||"-",
    // รวม variants เข้าไปในชื่อสินค้า เช่น "EPSON LQ-310 [สีดำ, A4]"
    od.variants && od.variants !== "-"
      ? `${od.product||"-"} [${od.variants}]`
      : (od.product||"-"),
    od.qty||"1",
    od.address||"-", od.tax||"ไม่ต้องการ",
    `[${payText}] ${od.note||""}`.trim(),
    "รอยืนยัน", od.platform||"LINE",
    "","","รอจัดส่ง","", cusLineId||"",
    initPayStatus, "",
  ]]);
  const sr=await deductStock(sheetId,od.product,parseInt(od.qty)||1);
  await alertLowStock(sheetId,lineToken,ownerUserId);
  if(lineToken&&ownerUserId){
    const sn  = sr&&!isNaN(sr.after)&&sr.after<=LOW_STOCK_LIMIT?`\n⚠️ "${sr.name}" เหลือ ${sr.after} ชิ้น!`:"";
    const payIcon = isCOD ? "📦 เก็บปลายทาง (COD)" : isStore ? "🏪 รับหน้าร้าน" : "💳 โอนเงิน";
    const varText = od.variants && od.variants !== "-" ? `\n🎨 ${od.variants}` : "";
    await linePush(lineToken,ownerUserId,
      `🔔 ออเดอร์ใหม่! ${orderId}\n${"─".repeat(24)}\n`+
      `👤 ${od.name||"-"} | 📞 ${od.phone||"-"}\n`+
      `🛍️ ${od.product||"-"} × ${od.qty||"1"}${varText}\n`+
      `📍 ${od.address||"-"}\n`+
      `💳 ${payIcon}`+sn
    );
  }
  return { orderId, stockResult:sr, isCOD, isStore, isTransfer };
}
async function findOrder(sheetId,orderId){const rows=await readSheet(sheetId,"Orders!A:P");for(let i=1;i<rows.length;i++)if(rows[i][1]===orderId)return{rowIndex:i+1,data:rows[i]};return null;}
async function getOrderStatus(sheetId,orderId){const rows=await readSheet(sheetId,"Orders!A:P"),row=rows.slice(1).find(r=>r[1]===orderId);if(!row)return null;const ci=CARRIERS[(row[12]||"").toLowerCase()]||{name:row[12]||"-",track:""};return{orderId:row[1],name:row[2],product:row[4],qty:row[5],address:row[6],status:row[9]||"รอยืนยัน",trackingNo:row[11]||"",carrier:ci.name,trackUrl:ci.track&&row[11]?`${ci.track}${row[11]}`:"",shippedAt:row[14]||"",deliveryStatus:row[13]||"รอจัดส่ง"};}
async function updateTracking(sheetId,rowIndex,trackingNo,carrier,lineUserId){const now=new Date().toLocaleString("th-TH",{timeZone:"Asia/Bangkok"});await writeSheet(sheetId,`Orders!J${rowIndex}`,[["จัดส่งแล้ว"]]);await writeSheet(sheetId,`Orders!L${rowIndex}`,[[trackingNo]]);await writeSheet(sheetId,`Orders!M${rowIndex}`,[[carrier]]);await writeSheet(sheetId,`Orders!N${rowIndex}`,[["จัดส่งแล้ว"]]);await writeSheet(sheetId,`Orders!O${rowIndex}`,[[now]]);if(lineUserId)await writeSheet(sheetId,`Orders!P${rowIndex}`,[[lineUserId]]);}
async function saveLead(sheetId,userKey,name,product,platform,token){try{const rows=await readSheet(sheetId,"Leads!A:G"),idx=rows.findIndex(r=>r[0]===userKey),now=new Date().toLocaleString("th-TH",{timeZone:"Asia/Bangkok"}),data=[userKey,name||"-",product||"-",platform,now,"pending",token||""];if(idx===-1)await appendSheet(sheetId,"Leads!A:G",[data]);else await writeSheet(sheetId,`Leads!A${idx+1}:G${idx+1}`,[data]);}catch(e){console.error("saveLead:",e.message);}}
async function markLeadOrdered(sheetId,userKey){try{const rows=await readSheet(sheetId,"Leads!A:G"),idx=rows.findIndex(r=>r[0]===userKey);if(idx!==-1)await writeSheet(sheetId,`Leads!F${idx+1}`,[["ordered"]]);}catch{}}

// ─── DAILY / WEEKLY SALES SUMMARY (Smart Notifications) ─────────────────
async function generateSummaryMessage(shopName, orders, type = "Daily") {
  const count = orders.length;
  let totalSales = 0;
  const pc = {};
  
  orders.forEach(r => {
    const p = r.product_name || "ไม่ระบุ";
    const q = r.quantity || 1;
    const price = r.price || 0;
    pc[p] = (pc[p] || 0) + q;
    totalSales += price * q;
  });

  const top = Object.entries(pc).sort((a,b) => b[1] - a[1]).slice(0, 3).map(([p,q]) => `  • ${p}: ${q} ชิ้น`).join("\n");
  
  const title = type === "Daily" ? "📊 สรุปยอดขายประจำวัน" : "📊 สรุปยอดขายประจำสัปดาห์";
  
  return `${title} — ${shopName}\n` +
         `${"═".repeat(24)}\n` +
         `📦 ออเดอร์ทั้งหมด: ${count}\n` +
         `💰 ยอดขายรวม: ฿${totalSales.toLocaleString('th-TH')}\n` +
         `${"─".repeat(24)}\n` +
         `🏆 สินค้าขายดี:\n${top || "  ยังไม่มีข้อมูล"}`;
}

async function runDailySummary() {
  if (!supabase) return;
  try {
    const { data: shops } = await supabase.from("shops").select("id, name, line_token, owner_line_id, notify_daily_summary");
    if (!shops) return;
    
    // ตั้งแต่ 00:00 ของวันนี้
    const today = new Date();
    today.setHours(0,0,0,0);

    for (const shop of shops) {
      if (!shop.line_token || !shop.owner_line_id || shop.notify_daily_summary === false) continue;
      
      const { data: orders } = await supabase.from("orders")
        .select("product_name, quantity, price")
        .eq("workspace_id", shop.id)
        .gte("created_at", today.toISOString());
        
      if (orders && orders.length > 0) {
        const msg = await generateSummaryMessage(shop.name, orders, "Daily");
        await linePush(shop.line_token, shop.owner_line_id, msg);
        console.log(`📊 [${shop.name}] Daily summary sent.`);
      }
    }
  } catch (e) { console.error("runDailySummary error:", e.message); }
}

async function runWeeklySummary() {
  // รันเฉพาะวันจันทร์ (getDay() === 1)
  if (new Date().getDay() !== 1) return;
  if (!supabase) return;
  
  try {
    const { data: shops } = await supabase.from("shops").select("id, name, line_token, owner_line_id");
    if (!shops) return;
    
    // ย้อนหลัง 7 วัน
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    cutoff.setHours(0,0,0,0);

    for (const shop of shops) {
      if (!shop.line_token || !shop.owner_line_id) continue;
      
      const { data: orders } = await supabase.from("orders")
        .select("product_name, quantity, price")
        .eq("workspace_id", shop.id)
        .gte("created_at", cutoff.toISOString());
        
      if (orders && orders.length > 0) {
        const msg = await generateSummaryMessage(shop.name, orders, "Weekly");
        await linePush(shop.line_token, shop.owner_line_id, msg);
        console.log(`📊 [${shop.name}] Weekly summary sent.`);
      }
    }
  } catch (e) { console.error("runWeeklySummary error:", e.message); }
}

async function runExpiryWarnings(){for(const c of activeClients){try{const rows=await readSheet(c.sheetId,"Clients!A:H"),today=new Date();today.setHours(0,0,0,0);for(const r of rows.slice(1)){if(!r[4])continue;const status=(r[3]||"active").toLowerCase(),ownerLineId=r[7]||"",dl=Math.ceil((new Date(r[4])-today)/86400000);if(status==="suspended"||![7,3,1].includes(dl)||!ownerLineId)continue;const emoji=dl===1?"🚨":dl===3?"⚠️":"📢",exStr=new Date(r[4]).toLocaleDateString("th-TH",{year:"numeric",month:"long",day:"numeric"});await linePush(c.lineToken,ownerLineId,`${emoji} บริการ "${r[1]||"ร้านของท่าน"}" หมดอายุใน ${dl} วัน\n📅 ${exStr}\n💳 โอน ฿2,500 → PromptPay: 095-585-1136 🙏`);}}catch(e){console.error("expiryWarnings:",e.message);}}}
async function runFollowUps(){for(const c of activeClients){try{const rows=await readSheet(c.sheetId,"Leads!A:G"),now=Date.now();for(let i=1;i<rows.length;i++){const[key,name,product,platform,time,status]=rows[i];if(status!=="pending"||!time)continue;const hrs=(now-new Date(time).getTime())/3600000;if(isNaN(hrs)||hrs<FOLLOWUP_HOURS)continue;const msg=`สวัสดีครับ${name&&name!=="-"?" คุณ"+name:""}! 😊\nก่อนหน้าสนใจ "${product!=="-"?product:"สินค้าของเรา"}" ไว้ใช่ไหมครับ?\nยังมีสต็อกอยู่ครับ ทักมาได้เลย 🙏`;let ok=platform==="Facebook"&&c.fbToken?await fbPush(c.fbToken,key.replace("fb_",""),msg):await linePush(c.lineToken,key.replace("line_",""),msg);if(ok)await writeSheet(c.sheetId,`Leads!F${i+1}`,[["followed"]]);await new Promise(r=>setTimeout(r,1000));}}catch(e){console.error("followUps:",e.message);}}}

module.exports = { linePush, fbPush, notifySettingsCache, getNotifySettings, notifyOwner, UNPAID_REMINDER_HOURS, UNPAID_MAX_REMINDERS, PROMPTPAY_NUMBER, reminderCount, runUnpaidReminders, markOrderPaid, processOrder, findOrder, getOrderStatus, updateTracking, saveLead, markLeadOrdered, runDailySummary, runWeeklySummary, runExpiryWarnings, runFollowUps };
