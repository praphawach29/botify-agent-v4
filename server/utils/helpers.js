// Auto-generated from chunks
const validator = require("validator");
const axios = require("axios");
const { supabase } = require("../config/db");
const { CACHE_TTL_MS } = require("../config/globals");
const { readSheet } = require("../services/sheetService");
// --- 02____INPUT_VALIDATION_HELPERS.js ---
// ═══════════════════════════════════════════════════════════
//  🔒 INPUT VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════
const sanitize = {
  // ลบ HTML tags และ trim
  text(val, maxLen = 500) {
    if (val == null) return "";
    return validator.escape(validator.trim(String(val)).slice(0, maxLen));
  },
  // Email validation
  email(val) {
    const e = validator.trim(String(val || "")).toLowerCase();
    if (!validator.isEmail(e)) throw new Error("รูปแบบ email ไม่ถูกต้อง");
    return validator.normalizeEmail(e);
  },
  // ตัวเลข
  number(val, min = 0, max = 999999999) {
    const n = Number(val);
    if (isNaN(n) || n < min || n > max) throw new Error("ค่าตัวเลขไม่ถูกต้อง");
    return n;
  },
  // UUID validation
  uuid(val) {
    if (!val || !validator.isUUID(String(val))) throw new Error("UUID ไม่ถูกต้อง");
    return String(val);
  },
  // Password
  password(val) {
    const p = String(val || "");
    if (p.length < 6 || p.length > 128) throw new Error("รหัสผ่านต้อง 6-128 ตัวอักษร");
    return p;
  },
  // URL validation
  url(val) {
    if (!val) return "";
    const u = validator.trim(String(val));
    if (u && !validator.isURL(u, { protocols: ["http", "https"], require_protocol: false })) {
      throw new Error("รูปแบบ URL ไม่ถูกต้อง");
    }
    return u;
  },
  // Phone (Thai format)
  phone(val) {
    if (!val) return "";
    const p = validator.trim(String(val)).replace(/[^0-9+\-() ]/g, "");
    return p.slice(0, 20);
  },
  // Boolean
  bool(val) {
    return val === true || val === "true" || val === 1;
  },
  // Slug validation
  slug(val) {
    if (!val) return "";
    return String(val).toLowerCase().replace(/[^a-z0-9ก-๙-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  },
};


// --- 03____SLUG_HELPERS.js ---
// ═══════════════════════════════════════════════════════════
//  🔗 SLUG HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * สร้าง slug จากชื่อร้าน — ใช้ตอน register หรือตอนสร้างร้านใหม่
 * เช่น "KingVision Technology" → "kingvision-technology"
 * ถ้าซ้ำจะเติม random suffix
 */
function generateSlug(shopName) {
  let base = shopName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9ก-๙\s-]/g, "")  // keep English, Thai, numbers, spaces, hyphens
    .replace(/\s+/g, "-")               // spaces → hyphens
    .replace(/-+/g, "-")                // collapse multiple hyphens
    .replace(/^-|-$/g, "")              // trim leading/trailing hyphens
    .slice(0, 50);
  if (!base) base = "shop";
  return base;
}

async function ensureUniqueSlug(supabaseClient, baseSlug, excludeShopId = null) {
  let slug = baseSlug;
  let attempt = 0;
  while (true) {
    let query = supabaseClient.from("shops").select("id").eq("slug", slug);
    if (excludeShopId) query = query.neq("id", excludeShopId);
    const { data } = await query.maybeSingle();
    if (!data) return slug; // unique!
    attempt++;
    const suffix = Math.random().toString(36).slice(2, 6);
    slug = `${baseSlug.slice(0, 50)}-${suffix}`;
    if (attempt > 10) slug = `${baseSlug.slice(0, 40)}-${Date.now().toString(36)}`;
  }
}


// --- 11____IMAGE_HELPERS.js ---
// ═══════════════════════════════════════════════════════════
//  📸 IMAGE HELPERS
//
//  Products คอลัมน์:
//  A=รหัส B=ชื่อ C=หมวด D=ราคามือสอง E=ราคาใหม่ F=สต็อก
//  G=กระดาษ H=พอร์ต I=เหมาะกับ J=จุดเด่น K=ประกัน L=หมายเหตุ
//  M=ลิงค์สั่งซื้อ N=ลิงค์ Driver O=ลิงค์รูปสินค้า ← ใหม่!
// ═══════════════════════════════════════════════════════════

// Map ชื่อสินค้า → URL รูป (Cache 30 นาที)
let imageCache = { data: {}, at: 0 };
const { activeClients } = require("../config/globals");

function clearCache() {
  activeClients.forEach(c => { c.cache = null; c.cacheAt = 0; });
  imageCache.data = {};
  imageCache.at = 0;
}
async function getProductImages(sheetId) {
  const now = Date.now();
  if (imageCache.at && (now - imageCache.at) < CACHE_TTL_MS) return imageCache.data;
  try {
    // อ่านกว้างๆ A:P รองรับทุก schema (รูปอยู่ที่ col N = idx 13 หรือ O = idx 14)
    const rows = await readSheet(sheetId, "Products!A:P");
    const map  = {};
    rows.slice(1).forEach(r => {
      const name = (r[1] || "").trim().toLowerCase(); // col B = ชื่อสินค้า
      // ลองทั้ง col N (idx 13) และ col O (idx 14) เพื่อรองรับทุก schema
      const url = ((r[13] || "").trim() || (r[14] || "").trim());
      if (name && url && url.startsWith("https://")) map[name] = url;
    });
    imageCache = { data: map, at: now };
    return map;
  } catch { return {}; }
}

// หา URL รูปจากชื่อสินค้า (fuzzy match)
async function findProductImage(sheetId, productName, shopId = null) {
  if (!productName) return null;
  const query  = productName.toLowerCase();

  // 1. ลองหาใน Database ก่อน (ถ้ามี shopId)
  if (shopId && supabase) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("image_url")
        .eq("workspace_id", shopId)
        .ilike("name", `%${productName}%`)
        .not("image_url", "is", null)
        .limit(1);
      
      if (!error && data && data.length > 0 && data[0].image_url) {
        return data[0].image_url;
      }
    } catch (e) {
      console.error("DB findProductImage error:", e);
    }
  }

  // 2. ถ้าไม่เจอใน DB ให้มาหาใน Google Sheet (เดิม)
  const images = await getProductImages(sheetId);
  // ตรงทั้งหมดก่อน
  if (images[query]) return images[query];
  // หาแบบ contains
  for (const [name, url] of Object.entries(images)) {
    if (query.includes(name) || name.includes(query)) return url;
  }
  return null;
}

// ─── ส่งรูปผ่าน LINE ─────────────────────────────────────
// LINE ต้องการ URL ที่เป็น HTTPS และเป็นไฟล์ .jpg/.png/.gif
async function sendLineImage(token, replyToken, imageUrl, altText) {
  try {
    // ถ้ามี replyToken ให้ใช้ reply (ส่งฟรี)
    // ถ้าไม่มี ต้องใช้ push (ต้องมี userId)
    if (replyToken) {
      await axios.post("https://api.line.me/v2/bot/message/reply", {
        replyToken,
        messages: [{
          type: "image",
          originalContentUrl: imageUrl,  // URL รูปเต็ม (max 10MB)
          previewImageUrl: imageUrl,      // URL รูป preview (max 1MB) — ใช้ URL เดียวกันได้
        }],
      }, { headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" } });
    }
    return true;
  } catch(e) { console.error("sendLineImage:", e.response?.data || e.message); return false; }
}

// ส่งรูปผ่าน LINE แบบ push (ไม่ต้องมี replyToken)
async function pushLineImage(token, userId, imageUrl) {
  try {
    await axios.post("https://api.line.me/v2/bot/message/push", {
      to: userId,
      messages: [{
        type: "image",
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl,
      }],
    }, { headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" } });
    return true;
  } catch(e) { console.error("pushLineImage:", e.response?.data || e.message); return false; }
}

// ─── ส่งข้อความ LINE แบบ Multicast (ยิงบรอดแคสต์) ──────────────────────────
// LINE ยอมให้ยิงได้สูงสุด 500 คนต่อ 1 request
async function lineMulticast(token, userIds, text) {
  if (!userIds || userIds.length === 0) return true;
  try {
    await axios.post("https://api.line.me/v2/bot/message/multicast", {
      to: userIds,
      messages: [{ type: "text", text: text }]
    }, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });
    return true;
  } catch(e) { 
    console.error("lineMulticast Error:", e.response?.data || e.message); 
    return false; 
  }
}

// ─── ส่งรูปผ่าน Facebook ─────────────────────────────────
async function sendFbImage(fbToken, senderId, imageUrl) {
  try {
    await axios.post(`https://graph.facebook.com/v18.0/me/messages?access_token=${fbToken}`, {
      recipient: { id: senderId },
      message: {
        attachment: {
          type: "image",
          payload: {
            url: imageUrl,
            is_reusable: true,
          },
        },
      },
    });
    return true;
  } catch(e) { console.error("sendFbImage:", e.message); return false; }
}

// ─── ส่งรูป + ข้อความพร้อมกัน (LINE) ────────────────────
// LINE reply ได้แค่ครั้งเดียว ดังนั้นต้องส่งหลายข้อความใน messages array
// ─── ส่งรูป + ข้อความ LINE ────────────────────────────────
// Strategy: reply text ก่อน (ใช้ replyToken) แล้ว push รูปแยก (ใช้ userId)
// เหตุผล: replyToken ใช้ได้ครั้งเดียว ถ้ารูป error แล้ว fallback = replyToken หมดอายุ
async function sendLineTextAndImage(token, replyToken, userId, imageUrl, textMsg) {
  const compatUrl = toLineCompatibleUrl(imageUrl);
  console.log(`📸 IMG original: ${(imageUrl||"").slice(0,70)}`);
  console.log(`📸 IMG compat:   ${(compatUrl||"").slice(0,70)}`);

  // 1. Reply ด้วย text ก่อนเสมอ (ใช้ replyToken)
  await axios.post("https://api.line.me/v2/bot/message/reply",
    { replyToken, messages: [{ type: "text", text: textMsg }] },
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );

  // 2. Push รูปแยก (ใช้ userId — ไม่ใช้ replyToken)
  if (compatUrl) {
    try {
      await axios.post("https://api.line.me/v2/bot/message/push",
        { to: userId, messages: [{
          type: "image",
          originalContentUrl: compatUrl,
          previewImageUrl:    compatUrl,
        }]},
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      console.log(`📸 Image pushed OK → ${userId}`);
      return true;
    } catch(e) {
      const detail = e.response?.data?.message || e.message;
      console.error(`📸 Image push failed: ${detail}`);
      // แจ้งลูกค้าว่ารูปมีปัญหา (push ได้เพราะ reply ไปแล้ว)
      await axios.post("https://api.line.me/v2/bot/message/push",
        { to: userId, messages: [{ type: "text",
          text: `⚠️ ไม่สามารถแสดงรูปได้ครับ\nดูรูปได้ที่ Shopee: shopee.co.th/kingvision` }]},
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      ).catch(()=>{});
      return false;
    }
  }
  return true;
}

async function replyLineWithImage(token, replyToken, imageUrl, textMsg) {
  // เก็บ function เดิมไว้ใช้ใน context ที่ไม่มี userId
  try {
    const compatUrl = toLineCompatibleUrl(imageUrl);
    const messages = [];
    if (compatUrl) messages.push({ type:"image", originalContentUrl:compatUrl, previewImageUrl:compatUrl });
    if (textMsg)   messages.push({ type:"text", text:textMsg });
    if (!messages.length) return false;
    await axios.post("https://api.line.me/v2/bot/message/reply",
      { replyToken, messages },
      { headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" } }
    );
    return true;
  } catch(e) {
    console.error("replyLineWithImage:", e.response?.data?.message || e.message);
    return false;
  }
}

// ตรวจว่าเป็น URL รูปที่ LINE รับได้
function isValidImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  const lower = url.toLowerCase().trim();
  // ยอมรับทุก HTTPS URL ที่มี path (ให้ toLineCompatibleUrl จัดการ)
  return lower.startsWith("https://") && url.length > 12;
}

// แปลง URL ทุกชนิดให้ LINE ใช้ได้ผ่าน wsrv.nl proxy
// wsrv.nl = free image proxy ที่:
//   - แปลง .webp → .jpg ได้
//   - Proxy ผ่านทุก domain (Shopee, pic.in.th ฯลฯ)
//   - ส่งกลับ HTTPS เสมอ
//   - LINE Bot ใช้ได้ 100%
function toLineCompatibleUrl(url) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed.startsWith("https://")) return "";

  const lower = trimmed.toLowerCase();

  // Imgur ที่เป็น .jpg/.png/.gif อยู่แล้ว → ใช้ตรงได้
  const nativeOk = (lower.includes("i.imgur.com") || lower.includes("i.ibb.co")) &&
    (lower.includes(".jpg") || lower.includes(".jpeg") || lower.includes(".png") || lower.includes(".gif"));
  if (nativeOk) return trimmed;

  // ทุก URL อื่น → ผ่าน wsrv.nl เพื่อความน่าเชื่อถือ
  // output=jpg = แปลงเป็น jpg เสมอ (LINE รองรับ)
  // w=1000 = resize ไม่เกิน 1000px (LINE max preview 1MB)
  // q=90 = คุณภาพ 90%
  const encoded = encodeURIComponent(trimmed);
  return `https://wsrv.nl/?url=${encoded}&output=jpg&w=1000&q=90`;
}


// --- 16_Client_Status.js ---
// ═══════════════════════════════════════════════════════════
//  Client Status
// ═══════════════════════════════════════════════════════════
const statusCache = {};
async function checkStatus(sheetId, lineToken) {
  const key=`s_${lineToken}`, now=Date.now();
  if (statusCache[key]&&(now-statusCache[key].at)<300000) return statusCache[key].data;
  try {
    const rows=await readSheet(sheetId,"Clients!A:H");
    const row=rows.slice(1).find(r=>r[2]===lineToken);
    if (!row) return { active:true, daysLeft:999 };
    const status=(row[3]||"active").toLowerCase().trim();
    const expiry=row[4]?new Date(row[4]):null;
    const today=new Date(); today.setHours(0,0,0,0);
    const daysLeft=expiry?Math.ceil((expiry-today)/86400000):999;
    const result=status==="suspended"?{active:false,reason:"suspended"}
      :expiry&&daysLeft<0?{active:false,reason:"expired"}:{active:true,daysLeft};
    statusCache[key]={data:result,at:now};
    return result;
  } catch { return {active:true,daysLeft:999}; }
}
const suspendedMsg = s => s.reason==="suspended"
  ?"ขออภัยครับ บริการยังไม่พร้อม กรุณาติดต่อร้านโดยตรงครับ 🙏"
  :"ขออภัยครับ บริการหมดอายุแล้ว กรุณาติดต่อร้านโดยตรงครับ 🙏";

const scheduleDaily = (h, m, fn) => {
  const now = new Date(), next = new Date();
  next.setHours(h, m, 0, 0);
  if (now >= next) next.setDate(next.getDate() + 1);
  setTimeout(() => { fn(); setInterval(fn, 86400000); }, next - now);
};

module.exports = { sanitize, generateSlug, ensureUniqueSlug, imageCache, getProductImages, findProductImage, sendLineImage, pushLineImage, lineMulticast, sendFbImage, sendLineTextAndImage, replyLineWithImage, isValidImageUrl, toLineCompatibleUrl, statusCache, checkStatus, suspendedMsg, clearCache, scheduleDaily };
