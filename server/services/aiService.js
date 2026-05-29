// Auto-generated from chunks
const axios = require("axios");
const { supabase } = require("../config/db");
const { Cache } = require("../utils/redis");
const { AI_FALLBACK_CHAIN } = require("../config/globals");
const {
  sanitize, getProductImages, findProductImage, 
  sendLineTextAndImage, replyLineWithImage, isValidImageUrl, 
  checkStatus, suspendedMsg
} = require("../utils/helpers");
const { readSheet, writeSheet, appendSheet, getCustomerProfile, saveCustomerProfile, buildAddressSuggestion } = require("./sheetService");
const { processOrder, saveLead, getOrderStatus, markOrderPaid, findOrder, updateTracking } = require("./notificationService");
const { genBookingId, saveBooking, notifyOwnerBooking, getAvailableSlots, buildPrompt } = require("./bookingService");
// --- 08____MULTI-PROVIDER_AI.js ---
// ═══════════════════════════════════════════════════════════
//  🤖 MULTI-PROVIDER AI
//  ตั้งค่าใน Railway Variables:
//
//  AI_PROVIDER = claude   → Claude Sonnet (default, ดีสุด)
//  AI_PROVIDER = openai   → GPT-4o mini (ประหยัด)
//  AI_PROVIDER = gemini   → Gemini 2.0 Flash (ถูกสุด)
//  AI_PROVIDER = typhoon  → Typhoon v2 (เชี่ยวชาญภาษาไทย)
//
//  API Keys ที่ต้องใส่ตามที่เลือก:
//  CLAUDE_KEY  = sk-ant-...
//  OPENAI_KEY  = sk-...
//  GEMINI_KEY  = AIza...
//  TYPHOON_KEY = ...
// ═══════════════════════════════════════════════════════════

const AI_PROVIDER = (process.env.AI_PROVIDER || "claude").toLowerCase();

const AI_CONFIGS = {
  claude: {
    url:   "https://api.anthropic.com/v1/messages",
    model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-latest",
    key:   process.env.CLAUDE_KEY,
    type:  "claude",
  },
  openai: {
    url:   "https://api.openai.com/v1/chat/completions",
    model: process.env.OPENAI_MODEL || "gpt-4o",
    key:   process.env.OPENAI_KEY,
    type:  "openai",
  },
  gemini: {
    url:   "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
    key:   process.env.GEMINI_KEY,
    type:  "openai", // Gemini ใช้ OpenAI-compatible format
  },
  typhoon: {
    url:   "https://api.opentyphoon.ai/v1/chat/completions",
    model: process.env.TYPHOON_MODEL || "typhoon-v2-70b-instruct",
    key:   process.env.TYPHOON_KEY,
    type:  "openai",
  },
  deepseek: {
    url:   "https://api.deepseek.com/v1/chat/completions",
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    key:   process.env.DEEPSEEK_KEY,
    type:  "openai",
  },
};

// ── อ่าน API Key จาก Supabase settings → fallback .env ──
let _cachedSettings = null;
let _settingsCacheTime = 0;
async function getGlobalAIKey(provider) {
  try {
    if (!supabase) return null;
    // Cache settings for 5 min
    if (!_cachedSettings || Date.now() - _settingsCacheTime > 300000) {
      const { data } = await supabase.from("settings").select("key, value");
      _cachedSettings = {};
      (data || []).forEach(r => { _cachedSettings[r.key] = r.value; });
      _settingsCacheTime = Date.now();
    }
    const keyMap = { claude: "claude_key", openai: "openai_key", gemini: "gemini_key", typhoon: "typhoon_key", deepseek: "deepseek_key" };
    return _cachedSettings[keyMap[provider]] || null;
  } catch { return null; }
}

async function resolveAIConfig(provider, model, shopAiKey) {
  const base = AI_CONFIGS[provider] || AI_CONFIGS.claude;
  const cfg = { ...base };
  if (model) cfg.model = model;
  // Priority: shop-level key > Supabase global key > .env key
  if (shopAiKey) { cfg.key = shopAiKey; }
  else {
    const globalKey = await getGlobalAIKey(provider);
    if (globalKey) cfg.key = globalKey;
  }
  return cfg;
}

// ── เรียก AI ตาม Provider ที่เลือก ──────────────────────────
async function callAI(systemPrompt, messages, config = null) {
  const cfg = config || AI_CONFIGS[AI_PROVIDER] || AI_CONFIGS.claude;

  if (!cfg.key) {
    throw new Error(`❌ API Key ไม่พบสำหรับ provider: ${AI_PROVIDER} — ตรวจสอบ Railway Variables`);
  }

  // ── Claude format ─────────────────────────────────────────
  if (cfg.type === "claude") {
    const { data } = await axios.post(cfg.url, {
      model:      cfg.model,
      max_tokens: 1000,
      system:     systemPrompt,
      messages,
    }, {
      headers: {
        "x-api-key":          cfg.key,
        "anthropic-version":  "2023-06-01",
        "Content-Type":       "application/json",
      },
    });
    return data.content[0].text;
  }

  // ── OpenAI-compatible format (OpenAI, Gemini, Typhoon) ───
  const openaiMsgs = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];
  const { data } = await axios.post(cfg.url, {
    model:      cfg.model,
    max_tokens: 1000,
    messages:   openaiMsgs,
  }, {
    headers: {
      "Authorization": `Bearer ${cfg.key}`,
      "Content-Type":  "application/json",
    },
  });
  return data.choices[0].message.content;
}

// ── Vision (รูปภาพ) — รองรับ Claude และ GPT-4o ───────────────
async function callAIWithImage(systemPrompt, messages, imageBase64, config = null) {
  const cfg = config || AI_CONFIGS[AI_PROVIDER] || AI_CONFIGS.claude;

  // Claude Vision
  if (cfg.type === "claude" && cfg.key) {
    const { data } = await axios.post(cfg.url, {
      model:      cfg.model,
      max_tokens: 1000,
      system:     systemPrompt,
      messages: [
        ...messages.slice(-6),
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 }},
            { type: "text",  text: "ลูกค้าส่งรูปนี้มา" },
          ],
        },
      ],
    }, {
      headers: {
        "x-api-key":         cfg.key,
        "anthropic-version": "2023-06-01",
        "Content-Type":      "application/json",
      },
    });
    return data.content[0].text;
  }

  // OpenAI GPT-4o Vision
  if (cfg.type === "openai" && cfg.key) {
    const { data } = await axios.post(cfg.url, {
      model:      cfg.model,
      max_tokens: 1000,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.slice(-6),
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` }},
            { type: "text",      text: "ลูกค้าส่งรูปนี้มา" },
          ],
        },
      ],
    }, {
      headers: {
        "Authorization": `Bearer ${cfg.key}`,
        "Content-Type":  "application/json",
      },
    });
    return data.choices[0].message.content;
  }

  // Gemini/Typhoon ไม่รองรับ Vision → fallback ตอบทั่วไป
  return await callAI(systemPrompt, [
    ...messages.slice(-6),
    { role: "user", content: "ลูกค้าส่งรูปมาให้ดู (ไม่สามารถวิเคราะห์รูปได้)" },
  ]);
}

// ── Native Function Calling (Agent Tools) ──────────────────────────
const agentTools = [
  {
    type: "function",
    function: {
      name: "get_product_image",
      description: "ดึงลิงก์รูปภาพของสินค้าเพื่อนำไปแสดงให้ลูกค้าดู (ถ้าลูกค้าขอดูรูป)",
      parameters: {
        type: "object",
        properties: { product_name: { type: "string" } },
        required: ["product_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "take_order",
      description: "สรุปและสร้างออเดอร์ให้ลูกค้าเมื่อลูกค้าให้ข้อมูลครบถ้วน และตกลงซื้อแล้ว",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
          product: { type: "string" },
          qty: { type: "string" },
          variants: { type: "string", description: "สี, ขนาด หรือตัวเลือกอื่นๆ ถ้าไม่มีให้ใส่ '-'" },
          address: { type: "string", description: "ที่อยู่จัดส่งครบถ้วน" },
          payment_method: { type: "string", description: "วิธีการชำระเงิน เช่น โอนเงิน, เก็บปลายทาง" },
          tax_invoice: { type: "string", description: "ต้องการใบกำกับภาษีหรือไม่ (ต้องการ/ไม่ต้องการ)" }
        },
        required: ["name", "phone", "product", "qty", "address", "payment_method"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "save_lead",
      description: "บันทึกข้อมูลลูกค้าที่สนใจสินค้าแต่ยังไม่ตัดสินใจซื้อ หรือทิ้งช่วงการตอบไปนาน",
      parameters: {
        type: "object",
        properties: {
          product_name: { type: "string" },
          customer_name: { type: "string", description: "ชื่อลูกค้า ถ้ารู้" }
        },
        required: ["product_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_order_status",
      description: "ตรวจสอบสถานะการจัดส่งออเดอร์ของลูกค้า",
      parameters: {
        type: "object",
        properties: { order_id: { type: "string", description: "รหัสออเดอร์" } },
        required: ["order_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description: "บันทึกการจองนัดหมายคิวบริการ เมื่อลูกค้าให้ข้อมูลครบถ้วน",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
          service: { type: "string", description: "บริการที่ต้องการ" },
          date: { type: "string", description: "วันที่ต้องการจอง เช่น วันพรุ่งนี้, 15/10/2026" },
          time: { type: "string", description: "เวลาที่ต้องการจอง เช่น 10:00" }
        },
        required: ["name", "phone", "service", "date", "time"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_booking",
      description: "ตรวจสอบสถานะการจองนัดหมาย",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "ชื่อลูกค้า หรือ Booking ID" } },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "cancel_booking",
      description: "ยกเลิกการจองนัดหมาย",
      parameters: {
        type: "object",
        properties: { booking_id: { type: "string", description: "Booking ID ที่ต้องการยกเลิก" } },
        required: ["booking_id"]
      }
    }
  },
  // ── Priority 1 Tools (เพิ่มใหม่) ───────────────────────────────
  {
    type: "function",
    function: {
      name: "search_products",
      description: "ค้นหาสินค้าจากฐานข้อมูลจริง ใช้เมื่อลูกค้าถามสินค้า, ราคา, สินค้าที่เหมาะสม, หรือต้องการข้อมูลสินค้าที่ถูกต้องและทันสมัย",
      parameters: {
        type: "object",
        properties: {
          keyword:   { type: "string", description: "คำค้นหา เช่น 'ชุดนอน' 'สีชมพู' 'แบบไหน' หรือชื่อสินค้า" },
          category:  { type: "string", description: "หมวดหมู่สินค้า (optional)" },
          max_price: { type: "number", description: "ราคาสูงสุดที่ลูกค้ารับได้ (optional, หน่วย: บาท)" },
          limit:     { type: "number", description: "จำนวนสินค้าที่ต้องการ (default: 5, max: 10)" }
        },
        required: ["keyword"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_stock",
      description: "ตรวจสอบจำนวนสต็อกสินค้าแบบ real-time ก่อนตอบลูกค้าว่าสินค้ามีหรือไม่ เพื่อป้องกันแนะนำสินค้าที่หมดหรือไม่พร้อมขาย",
      parameters: {
        type: "object",
        properties: {
          product_name: { type: "string", description: "ชื่อสินค้าที่ต้องการเช็ค สามารถใช้ชื่อย่อได้" }
        },
        required: ["product_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_customer_note",
      description: "บันทึกข้อมูลสำคัญเกี่ยวกับลูกค้าคนนี้ เช่น ความชอบสินค้า, โรคประจำตัว, ข้อมูลพิเศษ เพื่อใช้ในการให้บริการที่ดีขึ้นในครั้งต่อไป",
      parameters: {
        type: "object",
        properties: {
          note: { type: "string", description: "ข้อมูลที่ต้องการบันทึก เช่น 'ชอบสีชมพู' 'แพ้สีเอียน' 'คืนเชียงใหม่' เป็นต้น" }
        },
        required: ["note"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "request_human_agent",
      description: "เรียกให้แอดมิน/เจ้าของร้านเข้ามาดูแลแชทนี้ เมื่อ AI ไม่สามารถช่วยได้ หรือลูกค้าต้องการพูดคุยกับคน",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "เหตุผลที่ต้องการ Human Agent" },
          urgency: { type: "string", description: "urgent | normal" }
        },
        required: ["reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_active_promotions",
      description: "ดึงโปรโมชั่นที่กำลังใช้งานอยู่ เพื่อแนะนำให้ลูกค้า",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_shipping",
      description: "เรียกดูและคำนวณอัตราค่าจัดส่งตามพื้นที่ เพื่อนำไปตอบลูกค้า",
      parameters: {
        type: "object",
        properties: {
          province: { type: "string", description: "จังหวัดปลายทาง" }
        },
        required: ["province"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_payment_slip_status",
      description: "ตรวจสอบว่าลูกค้าชำระเงินสำหรับออเดอร์นี้หรือยัง (เช็คสถานะสลิป)",
      parameters: {
        type: "object",
        properties: { order_id: { type: "string", description: "รหัสออเดอร์ที่ต้องการตรวจสอบ" } },
        required: ["order_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_quotation",
      description: "สร้างใบเสนอราคา (Quotation) และส่ง Link ให้ลูกค้า",
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string", description: "ชื่อลูกค้า" },
          items: {
            type: "array",
            description: "รายการสินค้า",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                qty: { type: "number" },
                price: { type: "number" }
              }
            }
          }
        },
        required: ["customer_name", "items"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_customer_history",
      description: "ดูประวัติการซื้อของลูกค้ารายนี้ (ออเดอร์เก่าๆ)",
      parameters: { type: "object", properties: {}, required: [] }
    }
  }
];

async function executeTool(name, args, client, userKey, platform, ownerUserId) {
  try {
    const sheetId = client.sheetId;
    const lineToken = client.lineToken;
    const cusLineId = platform === "LINE" ? userKey.replace("line_", "") : userKey.replace("fb_", "");

    if (name === "get_product_image") {
      const url = await findProductImage(sheetId, args.product_name, client.shopId);
      return url ? { success: true, image_url: url } : { success: false, message: "No image found" };
    }
    if (name === "take_order") {
      const orderId = "ORD" + Date.now().toString().slice(-6);
      const od = {
         name: args.name, phone: args.phone, product: args.product, qty: args.qty,
         variants: args.variants || "-", address: args.address, payment: args.payment_method,
         tax: args.tax_invoice || "ไม่ต้องการ", note: "", platform
      };
      const result = await processOrder(sheetId, orderId, od, lineToken, ownerUserId, cusLineId);
      return { success: true, order_id: orderId, result };
    }
    if (name === "save_lead") {
      await saveLead(sheetId, userKey, args.customer_name || "-", args.product_name, platform, lineToken);
      return { success: true };
    }
    if (name === "check_order_status") {
      const order = await getOrderStatus(sheetId, args.order_id).catch(()=>null);
      if (order) return { success: true, order };
      return { success: false, message: "Order not found" };
    }
    if (name === "book_appointment") {
      const bookingId = await genBookingId(sheetId);
      await saveBooking(sheetId, bookingId, { ...args, platform, userId: cusLineId });
      await notifyOwnerBooking(client, bookingId, args);
      return { success: true, booking_id: bookingId };
    }
    if (name === "check_booking") {
      const rows = await readSheet(sheetId, "Bookings!A:K");
      const found = rows.slice(1).filter(r => r[0]?.includes(args.query) || (r[2] || "").includes(args.query)).slice(0, 3);
      if (found.length > 0) return { success: true, bookings: found.map(r => ({ id: r[0], service: r[4], date: r[5], time: r[6], status: r[7] })) };
      return { success: false, message: "Booking not found" };
    }
    if (name === "cancel_booking") {
      const rows = await readSheet(sheetId, "Bookings!A:K");
      const idx  = rows.findIndex(r => r[0] === args.booking_id);
      if (idx > 0) {
        await writeSheet(sheetId, `Bookings!H${idx + 1}`, [["ยกเลิก"]]);
        return { success: true };
      }
      return { success: false, message: "Booking not found" };
    }

    // ── Priority 1 Tools (เพิ่มใหม่) ─────────────────────────
    if (name === "search_products") {
      const keyword   = (args.keyword   || "").toLowerCase().trim();
      const category  = (args.category  || "").toLowerCase().trim();
      const maxPrice  = args.max_price  ? Number(args.max_price) : null;
      const limit     = Math.min(10, args.limit || 5);

      let results = [];

      // 1. ค้นหาใน Supabase ก่อน (ถ้ามี shopId)
      if (client.shopId && supabase) {
        try {
          let q = supabase.from("products")
            .select("name, category, price_used, price_new, stock, image_url, description")
            .eq("shop_id", client.shopId)
            .ilike("name", `%${keyword}%`)
            .limit(limit);
          if (category) q = q.ilike("category", `%${category}%`);
          const { data, error } = await q;
          if (!error && data && data.length > 0) {
            results = data.map(p => ({
              name:     p.name,
              category: p.category || "-",
              price:    p.price_new || p.price_used || "-",
              stock:    p.stock || "ไม่ทราบ",
              driver:   p.link_driver || null,
              image:    p.image_url || null,
            }));
          }
        } catch (e) { console.error("search_products (DB):", e.message); }
      }

      // 2. Fallback: ค้นหาจาก Google Sheet
      if (results.length === 0 && sheetId) {
        try {
          const rows = await readSheet(sheetId, "Products!A:O");
          const matched = rows.slice(1).filter(r => {
            const name = (r[1] || "").toLowerCase();
            const cat  = (r[2] || "").toLowerCase();
            const matchKw  = name.includes(keyword) || keyword.split(" ").some(w => w.length > 1 && name.includes(w));
            const matchCat = !category || cat.includes(category);
            const priceNum = parseFloat((r[4] || r[3] || "").replace(/[^0-9.]/g, ""));
            const matchPx  = !maxPrice || isNaN(priceNum) || priceNum <= maxPrice;
            return matchKw && matchCat && matchPx;
          }).slice(0, limit);

          results = matched.map(r => ({
            name:     r[1] || "-",
            category: r[2] || "-",
            price:    r[4] || r[3] || "-",
            stock:    r[5] || "ไม่ทราบ",
            driver:   (r[13] || "").trim() || null,
            image:    (r[14] || "").trim() || null,
          }));
        } catch (e) { console.error("search_products (Sheet):", e.message); }
      }

      if (results.length === 0) return { success: false, message: `ไม่พบสินค้าที่ตรงกับ "${args.keyword}"` };
      return { success: true, products: results, count: results.length };
    }

    if (name === "check_stock") {
      const productName = (args.product_name || "").trim();
      if (!productName) return { success: false, message: "กรุณาระบุชื่อสินค้า" };

      // 1. ค้นหาใน Supabase ก่อน
      if (client.shopId && supabase) {
        try {
          const { data, error } = await supabase.from("products")
            .select("name, stock, price_new, price_used")
            .eq("shop_id", client.shopId)
            .ilike("name", `%${productName}%`)
            .limit(3);
          if (!error && data && data.length > 0) {
            const items = data.map(p => {
              const stockNum = parseInt(p.stock || "");
              const inStock = p.stock === "มี" || p.stock === "พร้อมส่ง" || (!isNaN(stockNum) && stockNum > 0);
              return { name: p.name, stock: p.stock || "ไม่ทราบ", in_stock: inStock, price: p.price_new || p.price_used || "-" };
            });
            return { success: true, items };
          }
        } catch (e) { console.error("check_stock (DB):", e.message); }
      }

      // 2. Fallback: Google Sheet
      if (sheetId) {
        try {
          const rows = await readSheet(sheetId, "Products!A:F");
          const query = productName.toLowerCase();
          const matched = rows.slice(1).filter(r =>
            (r[1] || "").toLowerCase().includes(query)
          ).slice(0, 3);

          if (matched.length === 0) return { success: false, message: `ไม่พบสินค้า "${productName}" ในระบบ` };
          const items = matched.map(r => {
            const stockNum = parseInt(r[5] || "");
            const inStock = r[5] === "มี" || r[5] === "พร้อมส่ง" || (!isNaN(stockNum) && stockNum > 0);
            return { name: r[1] || "-", stock: r[5] || "ไม่ทราบ", in_stock: inStock, price: r[4] || r[3] || "-" };
          });
          return { success: true, items };
        } catch (e) { console.error("check_stock (Sheet):", e.message); }
      }

      return { success: false, message: `ไม่สามารถตรวจสอบสต็อก "${productName}" ได้` };
    }

    if (name === "update_customer_note") {
      const note = (args.note || "").trim().slice(0, 500); // จำกัด 500 ตัวอักษร
      if (!note) return { success: false, message: "กรุณาระบุ note ที่ต้องการบันทึก" };

      try {
        await saveCustomerProfile(sheetId, userKey, { note });
        console.log(`📝 [${client.name}] Customer note updated: ${userKey} → "${note.slice(0, 50)}..."`);
        return { success: true, saved_note: note };
      } catch (e) {
        console.error("update_customer_note:", e.message);
        return { success: false, error: e.message };
      }
    }

    if (name === "request_human_agent") {
      const reason = args.reason || "ไม่ระบุ";
      const urgency = args.urgency || "normal";
      
      if (ownerUserId && lineToken) {
        const msg = `🔔 [ระบบ AI] ลูกค้าต้องการคุยกับแอดมิน\n` +
                    `แพลตฟอร์ม: ${platform}\n` +
                    `ลูกค้า: ${userKey}\n` +
                    `เหตุผล: ${reason}\n` +
                    `ความเร่งด่วน: ${urgency}`;
        if (typeof linePush === "function") {
          linePush(lineToken, ownerUserId, msg).catch(()=>{});
        }
      }
      return { success: true, message: "แจ้งเตือนแอดมินเรียบร้อยแล้ว แอดมินจะมาตอบกลับเร็วๆ นี้" };
    }

    if (name === "get_active_promotions") {
      let promoList = "";
      
      // 1. ค้นหาใน Supabase ก่อน
      if (client.shopId && supabase) {
        try {
          const { data, error } = await supabase.from("promotions")
            .select("name, description, start_date, end_date")
            .eq("shop_id", client.shopId)
            .eq("is_active", true);
            
          if (!error && data && data.length > 0) {
            promoList = data.map(r => {
              const start = r.start_date ? new Date(r.start_date).toLocaleDateString("th-TH") : "";
              const end = r.end_date ? new Date(r.end_date).toLocaleDateString("th-TH") : "";
              const period = start && end ? ` (ตั้งแต่ ${start} ถึง ${end})` : "";
              return `- ${r.name}: ${r.description}${period}`;
            }).join('\n');
          }
        } catch (e) { console.error("get_active_promotions (DB):", e.message); }
      }

      // 2. Fallback: Google Sheet
      if (!promoList && sheetId) {
        try {
          const rows = await readSheet(sheetId, "Promotions!A:G");
          const activePromos = rows.slice(1).filter(r => r[0] && r[1]);
          if (activePromos.length > 0) {
            promoList = activePromos.map(r => `- ${r[1]}: ${r[2]} (ตั้งแต่ ${r[3]||'-'} ถึง ${r[4]||'-'})`).join('\n');
          }
        } catch (e) { console.error("get_active_promotions (Sheet):", e.message); }
      }

      if (!promoList) return { success: true, message: "ไม่มีโปรโมชั่นในช่วงนี้" };
      return { success: true, promotions: promoList };
    }

    if (name === "calculate_shipping") {
      let responseText = "";

      // 1. ค้นหาใน Supabase ก่อน
      if (client.shopId && supabase) {
        try {
          const { data, error } = await supabase.from("shipping_rates")
            .select("*")
            .eq("shop_id", client.shopId)
            .single();
            
          if (!error && data) {
            responseText = "ข้อมูลค่าจัดส่ง:\n";
            if (data.bkk_vicinity_rate) responseText += `- กทม+ปริมณฑล: ${data.bkk_vicinity_rate}\n`;
            if (data.upcountry_rate)    responseText += `- ต่างจังหวัด: ${data.upcountry_rate}\n`;
            if (data.remote_area_rate)  responseText += `- พื้นที่ห่างไกล/เกาะ: ${data.remote_area_rate}\n`;
            if (data.free_shipping_min) responseText += `- ฟรีค่าส่งเมื่อซื้อครบ: ${data.free_shipping_min}\n`;
            if (data.note)              responseText += `- หมายเหตุ: ${data.note}\n`;
          }
        } catch (e) { console.error("calculate_shipping (DB):", e.message); }
      }

      // 2. Fallback: Google Sheet
      if (!responseText && sheetId) {
        try {
          const infoRows = await readSheet(sheetId, "ShopInfo!A:B");
          const info = {};
          infoRows.slice(1).forEach(([k,v]) => { if(k) info[k.trim()] = v||""; });
          
          const shipBkk      = info["ค่าส่ง กทม+ปริมณฑล"] || info["ค่าส่ง กทม"] || "ฟรี";
          const shipProvince = info["ค่าส่ง ต่างจังหวัด"]  || "";
          const shipRemote   = info["ค่าส่ง พื้นที่ห่างไกล"]|| "";
          const shipFreeMin  = info["ฟรีค่าส่งเมื่อซื้อ"]   || "";
          const shipNote     = info["หมายเหตุค่าส่ง"]        || "";
          const shipExtra    = info["ค่าส่งพิเศษ"]           || "";

          if (shipBkk || shipProvince || shipRemote || shipExtra || shipFreeMin) {
            responseText = "ข้อมูลค่าจัดส่ง:\n";
            if (shipBkk) responseText += `- กทม+ปริมณฑล: ${shipBkk}\n`;
            if (shipProvince) responseText += `- ต่างจังหวัด: ${shipProvince}\n`;
            if (shipRemote) responseText += `- พื้นที่ห่างไกล/เกาะ: ${shipRemote}\n`;
            if (shipExtra) responseText += `- จังหวัดพิเศษ: ${shipExtra}\n`;
            if (shipFreeMin) responseText += `- ฟรีค่าส่งเมื่อซื้อครบ: ${shipFreeMin}\n`;
            if (shipNote) responseText += `- หมายเหตุ: ${shipNote}\n`;
          }
        } catch (e) { console.error("calculate_shipping (Sheet):", e.message); }
      }

      if (!responseText) return { success: false, message: "ไม่สามารถคำนวณค่าส่งได้" };
      return { success: true, shipping_info: responseText.trim(), input_province: args.province || "ไม่ได้ระบุ" };
    }

    if (name === "get_payment_slip_status") {
      const orderId = (args.order_id || "").trim();
      if (!orderId) return { success: false, message: "กรุณาระบุรหัสออเดอร์" };
      
      let statusStr = null;
      if (client.shopId && supabase) {
        try {
          const { data } = await supabase.from("orders").select("status, payment_status, pay_status").eq("order_id", orderId).single();
          if (data) statusStr = data.payment_status || data.pay_status || data.status;
        } catch(e) {}
      }
      
      if (!statusStr && sheetId) {
        try {
          const rows = await readSheet(sheetId, "Orders!A:R");
          const order = rows.find(r => r[1] === orderId);
          if (order) statusStr = order[16] || "รอชำระ"; // Col Q is index 16
        } catch(e) {}
      }
      
      if (statusStr) {
        return { success: true, payment_status: statusStr, message: statusStr === "ชำระแล้ว" ? "ได้รับสลิปแล้ว" : "ยังไม่ได้รับยอด/รอชำระ" };
      }
      return { success: false, message: "ไม่พบออเดอร์นี้ในระบบ" };
    }

    if (name === "create_quotation") {
      if (!client.shopId || !supabase) {
        return { success: false, message: "ระบบสร้างใบเสนอราคารองรับเฉพาะร้านที่เชื่อมต่อฐานข้อมูล Supabase เท่านั้น" };
      }
      try {
        const docNo = "QT" + Date.now().toString().slice(-6);
        const subtotal = args.items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.price)), 0);
        
        const { data, error } = await supabase.from("documents").insert({
          workspace_id: client.shopId,
          doc_no: docNo,
          doc_type: "quotation",
          customer_info: { name: args.customer_name },
          items: args.items,
          subtotal: subtotal,
          total: subtotal
        }).select("id").single();
        
        if (error || !data) throw new Error(error?.message || "Failed to create document");
        
        const appUrl = process.env.APP_URL || "https://botify-v4.onrender.com";
        const docUrl = `${appUrl}/doc/${data.id}`;
        
        return { 
          success: true, 
          quotation_url: docUrl, 
          message: `สร้างใบเสนอราคา ${docNo} สำเร็จ! ลิงก์เอกสาร: ${docUrl}`
        };
      } catch (e) {
        console.error("create_quotation error:", e.message);
        return { success: false, message: "เกิดข้อผิดพลาดในการสร้างใบเสนอราคา" };
      }
    }

    if (name === "get_customer_history") {
      if (!cusLineId) return { success: false, message: "ไม่พบข้อมูลผู้ใช้" };
      
      let history = [];
      
      if (client.shopId && supabase) {
        try {
          const { data } = await supabase.from("orders")
            .select("order_id, product_name, qty, created_at, status")
            .eq("line_user_id", cusLineId)
            .eq("workspace_id", client.shopId)
            .order("created_at", { ascending: false })
            .limit(5);
          if (data && data.length > 0) history = data;
        } catch(e) {}
      }
      
      if (history.length === 0 && sheetId) {
        try {
          const rows = await readSheet(sheetId, "Orders!A:R");
          const matched = rows.slice(1).filter(r => r[15] === cusLineId).reverse().slice(0, 5);
          history = matched.map(r => ({
            order_id: r[1],
            product_name: r[4],
            qty: r[5],
            status: r[9],
            created_at: r[0]
          }));
        } catch(e) {}
      }
      
      if (history.length > 0) {
        return { success: true, count: history.length, orders: history };
      } else {
        return { success: true, message: "ลูกค้ารายนี้ยังไม่เคยมีประวัติการสั่งซื้อ" };
      }
    }

    return { success: false, message: "Unknown tool" };
  } catch (err) {
    console.error("Tool execution error:", err);
    return { success: false, error: err.message };
  }
}

async function notifySuperAdmin(msg) {
  try {
    const token = process.env.ADMIN_LINE_TOKEN;
    if (!token) return;
    const axios = require("axios");
    await axios.post("https://notify-api.line.me/api/notify", 
      `message=${encodeURIComponent(msg)}`, 
      { headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Bearer ${token}` } }
    );
  } catch (e) { console.error("notifySuperAdmin error:", e.message); }
}

async function callAIAgent(systemPrompt, messages, config = null, client, userKey, platform, ownerUserId) {
  // ลำดับ Fallback Chain ตามที่ตกลง (ถ้าพังให้สลับไปตัวถัดไป)
  const fallbackChain = AI_FALLBACK_CHAIN;
  let primaryProvider = config?.type || AI_PROVIDER;
  
  // จัดเรียงลำดับให้เอาค่ายที่ถูกตั้งค่าไว้ขึ้นเป็นอันดับแรก
  let providersToTry = [primaryProvider];
  fallbackChain.forEach(p => { if (!providersToTry.includes(p)) providersToTry.push(p); });

  let finalResponseText = "";
  let lastErrorMsg = "";

  for (const provider of providersToTry) {
    let cfg = { ...AI_CONFIGS[provider] };
    if (!cfg) continue;

    // หา API Key ให้เจอก่อน
    if (config?.key && provider === primaryProvider) {
      cfg.key = config.key; 
    } else {
      const globalKey = await getGlobalAIKey(provider);
      if (globalKey) cfg.key = globalKey;
    }

    if (!cfg.key) continue; // ข้ามไปตัวถัดไปถ้าไม่มี Key

    let openaiClient, geminiClient, anthropicClient;
    if (cfg.type === "openai" && (provider === "gemini" || cfg.url.includes("google"))) {
       geminiClient = new GoogleGenAI({ apiKey: cfg.key });
    } else if (cfg.type === "openai") {
       openaiClient = new OpenAI({ apiKey: cfg.key, baseURL: cfg.url.replace("/chat/completions", "") });
    } else if (cfg.type === "claude") {
       anthropicClient = new Anthropic({ apiKey: cfg.key });
    }

    let currentMessages = [...messages];
    let isSuccess = false;

    // Agent Loop (สูงสุด 4 ขั้นตอนการใช้ tools)
    for (let step = 0; step < 4; step++) {
      let toolCalls = [];
      let assistantMsgContent = "";

      try {
        if (geminiClient) {
          const formattedMsgs = currentMessages.map(m => ({
             role: m.role === "assistant" ? "model" : (m.role === "tool" ? "function" : "user"),
             parts: m.tool_calls ? m.tool_calls.map(tc => ({ functionCall: { name: tc.name, args: JSON.parse(tc.arguments) } })) :
                    (m.role === "tool" ? [{ functionResponse: { name: m.tool_name, response: JSON.parse(m.content) } }] : [{ text: m.content }])
          }));
          
          const geminiTools = [{ functionDeclarations: agentTools.map(t => ({
             name: t.function.name, description: t.function.description, 
             parameters: t.function.parameters
          }))}];

          const response = await geminiClient.models.generateContent({
             model: cfg.model,
             contents: formattedMsgs,
             config: { systemInstruction: systemPrompt, tools: geminiTools, temperature: 0.2 }
          });

          const fc = response.functionCalls;
          if (fc && fc.length > 0) {
             toolCalls = fc.map(c => ({ id: Math.random().toString(36).substring(7), name: c.name, arguments: JSON.stringify(c.args) }));
          } else {
             assistantMsgContent = response.text || "";
          }
        } 
        else if (openaiClient) {
          const response = await openaiClient.chat.completions.create({
             model: cfg.model,
             messages: [{ role: "system", content: systemPrompt }, ...currentMessages],
             tools: agentTools,
             temperature: 0.2
          });
          const msg = response.choices[0].message;
          if (msg.tool_calls) {
             toolCalls = msg.tool_calls.map(tc => ({ id: tc.id, name: tc.function.name, arguments: tc.function.arguments }));
             currentMessages.push(msg);
          } else {
             assistantMsgContent = msg.content || "";
          }
        }
        else if (anthropicClient) {
          const claudeTools = agentTools.map(t => ({
             name: t.function.name, description: t.function.description, input_schema: t.function.parameters
          }));
          const claudeMsgs = currentMessages.map(m => {
             if (m.role === "tool") return { role: "user", content: [{ type: "tool_result", tool_use_id: m.tool_call_id, content: m.content }] };
             if (m.tool_calls) return { role: "assistant", content: m.tool_calls.map(tc => ({ type: "tool_use", id: tc.id, name: tc.name, input: JSON.parse(tc.arguments) })) };
             return { role: m.role, content: m.content };
          });

          const response = await anthropicClient.messages.create({
             model: cfg.model, max_tokens: 1000, system: systemPrompt,
             messages: claudeMsgs, tools: claudeTools, temperature: 0.2
          });
          
          if (response.stop_reason === "tool_use") {
             const tools = response.content.filter(c => c.type === "tool_use");
             toolCalls = tools.map(t => ({ id: t.id, name: t.name, arguments: JSON.stringify(t.input) }));
             currentMessages.push({ role: "assistant", tool_calls: toolCalls });
          } else {
             assistantMsgContent = response.content.filter(c => c.type === "text").map(c => c.text).join("");
          }
        } else {
          // Fallback to old callAI if SDKs not configured properly
          finalResponseText = await callAI(systemPrompt, currentMessages, cfg);
          isSuccess = true;
          break;
        }

        if (toolCalls.length > 0) {
          if (!openaiClient && !anthropicClient) {
             currentMessages.push({ role: "assistant", tool_calls: toolCalls });
          }
          for (const tc of toolCalls) {
             const result = await executeTool(tc.name, JSON.parse(tc.arguments), client, userKey, platform, ownerUserId);
             currentMessages.push({ role: "tool", tool_call_id: tc.id, tool_name: tc.name, content: JSON.stringify(result) });
          }
        } else {
          finalResponseText = assistantMsgContent;
          isSuccess = true;
          break;
        }
      } catch (e) {
        lastErrorMsg = e.message;
        console.error(`Agent Loop Error with ${provider}:`, e.message);
        break; // Break the step loop to move to the next provider
      }
    } // End Step Loop

    // ถ้าทำงานจบอย่างสมบูรณ์ (isSuccess) ให้รีเทิร์นผลลัพธ์ทันที
    if (isSuccess && finalResponseText) {
      if (provider !== primaryProvider) {
        notifySuperAdmin(`🚨 [ระบบสำรองทำงาน] \nร้าน: ${client.name}\nค่ายหลัก (${primaryProvider}) ล้มเหลว\nระบบสลับมาใช้ค่าย: ${provider} อัตโนมัติแล้วครับ`);
      }
      return finalResponseText;
    }
    
    // ถ้าพัง (isSuccess = false) Loop จะไปค่ายสำรองตัวถัดไป
    console.warn(`[Fallback] ${provider} failed, trying next provider...`);
  } // End Provider Loop

  return "ขออภัยครับ ระบบประมวลผลมีปัญหาชั่วคราว ไม่สามารถเชื่อมต่อ AI ได้ กรุณาลองใหม่อีกครั้ง 🙏";
}

console.log(`🤖 AI Provider: ${AI_PROVIDER} | Model: ${AI_CONFIGS[AI_PROVIDER]?.model || "claude-sonnet-4-20250514"}`);

const CARRIERS = {
  kerry:    { name:"Kerry Express",    track:"https://th.kerryexpress.com/track/?track=" },
  flash:    { name:"Flash Express",   track:"https://www.flashexpress.com/tracking/?se=" },
  thaipost: { name:"ไปรษณีย์ไทย",    track:"https://track.thailandpost.co.th/?trackNumber=" },
  jandt:    { name:"J&T Express",     track:"https://www.jtexpress.co.th/trajectoryQuery?bills=" },
  ninja:    { name:"Ninja Van",       track:"https://www.ninjavan.co/th-th/tracking?id=" },
  shopee:   { name:"Shopee Express",  track:"https://spx.co.th/tracking?track_no=" },
  lazada:   { name:"Lazada Logistics",track:"https://www.lazada.co.th/order/tracking/" },
};

const PERSONALITIES = {
  "หญิง-สุภาพ":     { pronoun:"ค่ะ/นะคะ", closing:"นะคะ",  style:`พูดสุภาพ อบอุ่น ใช้ "ค่ะ" "นะคะ"` },
  "ชาย-สุภาพ":      { pronoun:"ครับ",      closing:"นะครับ", style:`พูดสุภาพ มืออาชีพ ใช้ "ครับ"` },
  "หญิง-น่ารัก":    { pronoun:"ค่ะ",       closing:"นะคะ",  style:`พูดน่ารัก ร่าเริง ใส่ emoji 😊` },
  "ชาย-เป็นกันเอง": { pronoun:"ครับ",      closing:"นะครับ", style:`พูดเป็นกันเอง สบายๆ` },
  "กลาง":           { pronoun:"ค่ะ/ครับ",  closing:"นะครับ", style:`พูดเป็นกลาง สุภาพ` },
};


// --- 24_Claude___Parse.js ---
// ═══════════════════════════════════════════════════════════
//  Claude + Parse
// ═══════════════════════════════════════════════════════════
const parseOrder  = t => {
  if(!t.includes("---สรุปออเดอร์---")) return null;
  const g = rx => t.match(rx)?.[1]?.trim() || "-";
  return {
    name:     g(/ชื่อ[:\s]+([^\n]+)/),
    phone:    g(/เบอร์[:\s]+([\d\-\s]+)/),
    product:  g(/สินค้า[:\s]+([^\n]+)/),
    qty:      g(/จำนวน[:\s]+([^\n]+)/),
    variants: g(/ตัวเลือก[:\s]+([^\n]+)/),  // ← สี/ขนาด/อุปกรณ์เสริม
    address:  g(/ที่อยู่[:\s]+([^\n]+)/),
    payment:  g(/ชำระเงิน[:\s]+([^\n]+)/),
    tax:      g(/ใบกำกับภาษี[:\s]+([^\n]+)/),
  };
};
const parseLead   = t => { if(!t.includes("---lead---"))return null; const g=rx=>t.match(rx)?.[1]?.trim()||"-"; return{product:g(/product[:\s]+([^\n]+)/),name:g(/name[:\s]+([^\n]+)/)}; };
const parseStatusQ = t => { if(!t.includes("---ถามสถานะ---"))return null; return t.match(/orderId[:\s]+([^\n]+)/)?.[1]?.trim()||"ไม่ทราบ"; };

// ─── Booking Parsers ─────────────────────────────────────────
const parseBooking = t => {
  if (!t.includes("---จอง---")) return null;
  const g = rx => t.match(rx)?.[1]?.trim() || "-";
  return {
    name:    g(/ชื่อ[:\s]+([^\n]+)/),
    phone:   g(/เบอร์[:\s]+([\d\-\s]+)/),
    service: g(/บริการ[:\s]+([^\n]+)/),
    date:    g(/วันที่[:\s]+([^\n]+)/),
    time:    g(/เวลา[:\s]+([^\n]+)/),
    note:    g(/หมายเหตุ[:\s]+([^\n]+)/) === "-" ? "" : g(/หมายเหตุ[:\s]+([^\n]+)/),
  };
};
const parseCheckBooking  = t => t.includes("---เช็คจอง---") ? (t.match(/query[:\s]+([^\n]+)/)?.[1]?.trim() || "") : null;
const parseCancelBooking = t => t.includes("---ยกเลิกจอง---") ? (t.match(/bookingId[:\s]+([^\n]+)/)?.[1]?.trim() || "") : null;

// ─── Parse Image Tag ─────────────────────────────────────
function parseImageTag(text) {
  // ปรับให้ดักจับชื่อสินค้าได้แม่นยำขึ้น แม้มีเว้นวรรค/บรรทัดใหม่ต่างกัน
  const match = text.match(/---img---\s*product[:\s]*(.*?)\s*---endimg---/i);
  if (!match) return null;
  return match[1].trim();
}


// --- 25_Main_Response_Handler.js ---
// ═══════════════════════════════════════════════════════════
//  Main Response Handler
//  คืนค่า: { textReply, imageUrl }
// ═══════════════════════════════════════════════════════════
async function askClaude(client, userKey, userText, platform) {
  const pd   = await getPromptData(client);
  const custProfile = await getCustomerProfile(client.sheetId, userKey).catch(() => null);
  const msgs = await loadHist(client.sheetId, userKey);
  msgs.push({ role:"user", content:userText });
  const trimmed = msgs.length>MAX_HISTORY ? msgs.slice(-MAX_HISTORY) : msgs;

  // ── Free Trial & Credit Check ─────────────────────────────
  if (client.shopId && supabase) {
    try {
      const { data: shop } = await supabase.from('shops').select('package_name, ai_credits, expired_at, custom_ai_key').eq('id', client.shopId).single();
      if (shop) {
        if (shop.package_name === 'free' && shop.expired_at && new Date(shop.expired_at) <= new Date()) {
          console.warn(`[${client.name}] Free Trial Expired for shop ${client.shopId}`);
          return {
            textReply: `ขออภัยครับ บริการแชทบอทของร้านหมดช่วงทดลองใช้งานฟรีแล้ว 🙏\nกรุณาติดต่อแอดมินหรือเจ้าของร้านเพื่อให้เปิดใช้งานอีกครั้งนะครับ`,
            imageUrl: null
          };
        }
        if (shop.ai_credits !== null && shop.ai_credits <= 0 && !shop.custom_ai_key) {
          console.warn(`[${client.name}] AI Credits exhausted for shop ${client.shopId}`);
          return {
            textReply: `ขออภัยครับ ระบบแชทบอทของร้านค้าหมดโควต้าชั่วคราว 🙏\nกรุณาติดต่อแอดมินหรือเจ้าของร้านนะครับ`,
            imageUrl: null
          };
        }
      }
    } catch (e) {
      console.error("Free Trial Check Error:", e.message);
    }
  }

  // ── สร้าง Customer Context ให้ Claude ใช้ ──────────────────
  let customerCtx = "";
  if (custProfile?.name && custProfile.name !== "-") {
    const p       = pd.personality || PERSONALITIES["ชาย-สุภาพ"];
    const closing = p.pronoun?.includes("ค่ะ") ? "ค่ะ" : "ครับ";
    const isFirst = msgs.length <= 2; // ข้อความแรกของ session นี้

    customerCtx = `

════════ 👤 ข้อมูลลูกค้าคนนี้ (สำคัญมาก) ════════
ชื่อ: ${custProfile.name}
เบอร์: ${custProfile.phone || "-"}
ออเดอร์ก่อนหน้า: ${custProfile.orderCount || 0} ครั้ง
ที่อยู่เดิม: ${[custProfile.address, custProfile.province, custProfile.zipcode].filter(Boolean).join(" ") || "-"}

กฎการใช้ข้อมูลนี้:
- ${isFirst
  ? `ทักทายด้วยชื่อทันทีในประโยคแรก เช่น "สวัสดี${closing} คุณ${custProfile.name}! 😊"`
  : `ลูกค้าคนนี้ชื่อ "${custProfile.name}" ใช้ชื่อเมื่อเหมาะสม`}
- ถ้าลูกค้าจะสั่งของ → ถามข้อมูลพร้อมกันครั้งเดียว แต่ใส่ที่อยู่เดิมไว้ให้เลยว่า "ที่อยู่เดิม: [ที่อยู่]" แล้วถามว่า "ใช้ที่อยู่เดิมหรือเปลี่ยนใหม่${closing}?"
- ถ้าลูกค้าตอบ "ใช่" / "เดิมเลย" / "ที่อยู่เดิม" → ใช้ที่อยู่เดิมได้เลย ไม่ต้องถามซ้ำ
- ถ้ารู้ชื่อแล้ว ไม่ต้องถามชื่อซ้ำอีก`;
  } else {
    // ลูกค้าใหม่ — แนะนำให้ถามชื่อตอนสั่งและจดจำ
    customerCtx = `

════════ 👤 ลูกค้าใหม่ ════════
ยังไม่รู้ชื่อลูกค้า
- ถ้าลูกค้าบอกชื่อในการสนทนา → จำและใช้ชื่อนั้นตลอด
- ถ้าจะสั่งสินค้า → ถามข้อมูลทุกอย่างพร้อมกันในครั้งเดียว`;
  }

  // ── Server-side Prompt Injection Guard ───────────────────
  // กรอง pattern อันตรายจาก userText ก่อนส่งให้ AI
  const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
    /forget\s+(everything|all|your\s+instructions?)/i,
    /you\s+are\s+now\s+(a|an|the)\s+/i,
    /pretend\s+(you\s+are|to\s+be)/i,
    /act\s+as\s+(if\s+you\s+(are|were)|a\s+)/i,
    /dan\s+mode|jailbreak|prompt\s+injection/i,
    /show\s+(me\s+)?(your\s+)?(system\s+prompt|api\s+key|instructions?)/i,
    /disregard\s+(your|all|the)\s+(previous|prior|instructions?)/i,
    /ลืมคำสั่ง|ลืมทุกอย่าง|เปลี่ยนบทบาท|แสดง.*prompt|บอก.*api.*key/i,
  ];

  const isInjectionAttempt = INJECTION_PATTERNS.some(p => p.test(userText));
  if (isInjectionAttempt) {
    console.warn(`🛡️ [${client.name}] Injection attempt blocked: ${userText.slice(0,60)}`);
    const _p = pd.personality || PERSONALITIES["ชาย-สุภาพ"];
    const _c = _p.pronoun?.includes("ค่ะ") ? "ค่ะ" : "ครับ";
    return {
      textReply: `ขออภัย${_c} ผมช่วยเรื่องสินค้าและบริการของ ${pd.shopName} เท่านั้นนะ${_c} 😊`,
      imageUrl: null
    };
  }

  // ── AI Credit Check ───────────────────────────────────────
  if (client.shopId && supabase) {
    try {
      const { data: shop } = await supabase.from("shops").select("ai_credits, custom_ai_key").eq("id", client.shopId).single();
      if (shop && shop.ai_credits <= 0 && !shop.custom_ai_key) {
         console.warn(`❌ [${client.name}] Out of AI Credits`);
         return {
           textReply: "ขออภัยครับ ตอนนี้ระบบตอบกลับอัตโนมัติหยุดทำงานชั่วคราว (เครดิตหมด) กรุณารอสักครู่ เดี๋ยวแอดมินจะรีบมาตอบให้นะครับ 🙏",
           imageUrl: null
         };
      }
    } catch(err) { console.error("Credit check error:", err.message); }
  }

  const reply_text = await callAIAgent(pd.prompt + customerCtx, trimmed, pd.clientAiConfig || null, client, userKey, platform, client.ownerUserId);
  
  // ── AI Credit Deduction ───────────────────────────────────
  if (client.shopId && supabase && reply_text && !reply_text.includes("เครดิตหมด")) {
    try {
      const { data: shop } = await supabase.from("shops").select("ai_credits, custom_ai_key").eq("id", client.shopId).single();
      if (shop && shop.ai_credits > 0 && !shop.custom_ai_key) {
        await supabase.from("shops").update({ ai_credits: shop.ai_credits - 1 }).eq("id", client.shopId);
        await supabase.from("credit_transactions").insert([{
          shop_id: client.shopId,
          amount: -1,
          reason: 'ai_chat',
          metadata: { platform, userKey }
        }]);
      }
    } catch(err) { console.error("Credit deduction error:", err.message); }
  }

  let reply = reply_text;
  trimmed.push({ role:"assistant", content:reply });
  saveHist(client.sheetId, userKey, trimmed).catch(()=>{});

  // ── Auto-extract ชื่อลูกค้าจากบทสนทนา ────────────────────
  // ถ้ายังไม่รู้ชื่อ → ดึงจากข้อความล่าสุด
  if (!custProfile?.name || custProfile.name === "-") {
    // คำที่ไม่ใช่ชื่อ — blacklist
    const NOT_NAME = /^(สวัสดี|หวัดดี|ดีครับ|ดีค่ะ|โอเค|โอเค|ขอบคุณ|ขอบใจ|ใช่|ไม่|เปล่า|ครับ|ค่ะ|นะ|เลย|ได้|ไม่ได้|ดี|แย่|เห็น|มี|ไม่มี|สอบถาม|ถาม|อยาก|ต้องการ|สนใจ|ราคา|เท่าไหร่|บาท)$/;

    // Pattern 1: บอกชื่อตรงๆ เช่น "ชื่อสมชาย" "ผมชื่อวิชัย"
    const nameMatch = userText.match(
      /(?:ผม|หนู|ชั้น|ฉัน|เรา)?(?:ชื่อ|นามว่า|เรียกว่า)\s*([ก-๙a-zA-Z]{2,20})/
    ) || (
      // Pattern 2: ประโยคสั้นที่น่าจะเป็นชื่อ เช่น "สมชายครับ" — แต่ไม่ใช่คำทักทาย
      userText.match(/^([ก-๙]{2,8})\s*(?:ครับ|ค่ะ|นะ|เลย)?$/) &&
      !NOT_NAME.test(userText.replace(/\s*(ครับ|ค่ะ|นะ|เลย)?\s*$/, "").trim())
        ? userText.match(/^([ก-๙]{2,8})\s*(?:ครับ|ค่ะ|นะ|เลย)?$/)
        : null
    );

    if (nameMatch?.[1] && nameMatch[1].length >= 2) {
      const detectedName = nameMatch[1].trim();
      if (!NOT_NAME.test(detectedName)) {
        saveCustomerProfile(client.sheetId, userKey, { name: detectedName }).catch(()=>{});
        console.log(`👤 [${client.name}] Auto-detected name: ${detectedName} (${userKey})`);
      }
    }
  }

  // ─── ดึง Image Tag ────────────────────────────────────
  const imageProductName = parseImageTag(reply);
  reply = reply.replace(/---img---[\s\S]*?---endimg---/gi, "").trim();
  let imageUrl = null;
  if (imageProductName) {
    imageUrl = await findProductImage(client.sheetId, imageProductName);
    if (imageUrl) console.log(`📸 Image found for "${imageProductName}": ${imageUrl.slice(0,50)}...`);
    else console.log(`📸 No image for "${imageProductName}"`);
  }

  // ─── Lead ──────────────────────────────────────────────
  const lead = parseLead(reply);
  reply = reply.replace(/---lead---[\s\S]*?---end---/g,"").trim();
  if (lead&&lead.product!=="-") await saveLead(client.sheetId, userKey, lead.name, lead.product, platform, client.lineToken);

  // ─── Status Query ──────────────────────────────────────
  const qId = parseStatusQ(reply);
  if (qId&&qId!=="ไม่ทราบ") {
    reply = reply.replace(/---ถามสถานะ---[\s\S]*?---สิ้นสุด---/g,"").trim();
    const order = await getOrderStatus(client.sheetId, qId).catch(()=>null);
    if (order) {
      const ci=CARRIERS[order.carrier?.toLowerCase()]||{name:order.carrier,track:""};
      const tu=ci.track&&order.trackingNo?`${ci.track}${order.trackingNo}`:"";
      reply+=`\n\n📦 สถานะออเดอร์ ${order.orderId}\n${"─".repeat(24)}\n🛒 ${order.product} × ${order.qty}\n📊 ${order.deliveryStatus}\n`+(order.trackingNo?`🚚 ${order.carrier}: ${order.trackingNo}\n${tu?`🔍 ${tu}\n`:""}`:"")+`📞 ${pd.phone} 🙏`;
    } else reply+=`\n\n❌ ไม่พบออเดอร์ ${qId}\nโทรสอบถาม ${pd.phone} ครับ`;
  }

  // ─── Customer Profile: ตรวจหาที่อยู่เดิม ────────────────
  // ถ้าลูกค้าพิมพ์ "ใช่" หรือ "ที่อยู่เดิม" ให้ดึง address จาก profile
  const confirmOldAddress = /^(ใช่|ใช้ที่อยู่เดิม|ที่อยู่เดิม|เดิมเลย|เดิม|ok|okay|yes)$/i.test(userText.trim());
  if (confirmOldAddress) {
    const profile = await getCustomerProfile(client.sheetId, userKey).catch(() => null);
    if (profile?.address) {
      // inject ที่อยู่เดิมเข้า context
      const injectedMsg = `[ระบบ: ลูกค้ายืนยันใช้ที่อยู่เดิม: ${profile.address} ${profile.province} ${profile.zipcode}]`;
      trimmed.push({ role: "user", content: injectedMsg });
    }
  }

  // ─── Booking: สร้างการจองใหม่ ────────────────────────────
  const bookingData = parseBooking(reply);
  if (bookingData && bookingData.name !== "-") {
    reply = reply.replace(/---จอง---[\s\S]*?---สิ้นสุด---/g, "").trim();
    try {
      const bookingId = await genBookingId(client.sheetId);
      const userId    = platform === "LINE" ? userKey.replace("line_", "") : userKey.replace("fb_", "");
      await saveBooking(client.sheetId, bookingId, { ...bookingData, platform, userId });
      await notifyOwnerBooking(client, bookingId, bookingData);

      const p       = pd.personality || PERSONALITIES["ชาย-สุภาพ"];
      const closing = p.pronoun?.includes("ค่ะ") ? "ค่ะ" : "ครับ";
      reply +=
        `\n\n✅ จองนัดหมายสำเร็จ!\n${"─".repeat(24)}\n` +
        `🆔 Booking ID: ${bookingId}\n` +
        `👤 ${bookingData.name} | 📞 ${bookingData.phone}\n` +
        `🎯 ${bookingData.service}\n` +
        `📆 ${bookingData.date} เวลา ${bookingData.time}\n` +
        `${"─".repeat(24)}\n` +
        `📲 ทีมงานจะยืนยันนัดหมายเร็วๆ นี้นะ${closing}\n` +
        `⏰ ระบบจะแจ้งเตือนก่อนนัด 1 วัน${closing} 🙏`;
      console.log(`📅 [${client.name}] Booking: ${bookingId} - ${bookingData.service}`);
    } catch(e) { console.error("saveBooking:", e.message); }
  }

  // ─── Booking: เช็คสถานะการจอง ───────────────────────────
  const checkQuery = parseCheckBooking(reply);
  if (checkQuery) {
    reply = reply.replace(/---เช็คจอง---[\s\S]*?---สิ้นสุด---/g, "").trim();
    try {
      const rows = await readSheet(client.sheetId, "Bookings!A:K");
      const found = rows.slice(1).filter(r =>
        r[0]?.includes(checkQuery) || (r[2] || "").includes(checkQuery)
      ).slice(0, 3);
      if (found.length > 0) {
        const details = found.map(r =>
          `🆔 ${r[0]} | 🎯 ${r[4]} | 📆 ${r[5]} ${r[6]} | สถานะ: ${r[7] || "-"}`
        ).join("\n");
        reply += `\n\n📅 ข้อมูลการจอง:\n${"─".repeat(24)}\n${details}\n📞 ${pd.phone}`;
      } else {
        reply += `\n\n❌ ไม่พบการจองของ "${checkQuery}"\nโทรสอบถาม ${pd.phone}`;
      }
    } catch(e) { console.error("checkBooking:", e.message); }
  }

  // ─── Booking: ยกเลิกการจอง ──────────────────────────────
  const cancelId = parseCancelBooking(reply);
  if (cancelId) {
    reply = reply.replace(/---ยกเลิกจอง---[\s\S]*?---สิ้นสุด---/g, "").trim();
    try {
      const rows = await readSheet(client.sheetId, "Bookings!A:K");
      const idx  = rows.findIndex(r => r[0] === cancelId);
      if (idx > 0) {
        await writeSheet(client.sheetId, `Bookings!H${idx + 1}`, [["ยกเลิก"]]);
        reply += `\n\n✅ ยกเลิกการจอง ${cancelId} แล้วครับ\nถ้าต้องการจองใหม่ทักมาได้เลยนะครับ 🙏`;
        // แจ้งเจ้าของผ่าน notifyOwner
        await notifyOwner(client, "new_order",
          `❌ ลูกค้ายกเลิกการจอง ${cancelId}\n${rows[idx][2]} | ${rows[idx][4]} | ${rows[idx][5]} ${rows[idx][6]}`
        );
      } else {
        reply += `\n\n❌ ไม่พบ Booking ID: ${cancelId}`;
      }
    } catch(e) { console.error("cancelBooking:", e.message); }
  }

  // ─── Order ─────────────────────────────────────────────
  const od = parseOrder(reply);
  if (od&&od.name!=="-") {
    od.platform=platform;
    const cusId=platform==="LINE"?userKey.replace("line_",""):"";
    await markLeadOrdered(client.sheetId, userKey);
    const orderId=await genOrderId(client.sheetId);
    const {stockResult:sr,isCOD,isStore,isTransfer}=await processOrder(client.sheetId,orderId,od,client.lineToken,client.ownerUserId,cusId);
    const sn=sr&&!isNaN(sr.after)&&sr.after<=LOW_STOCK_LIMIT?"\n\n⚠️ สินค้าใกล้หมดสต็อก":"";
    reply=reply.replace(/---สรุปออเดอร์---[\s\S]*?---สิ้นสุด---/g,"").trim();

    // ── ข้อความชำระเงินตามวิธีที่เลือก ────────────────────────
    const _p      = pd.personality || PERSONALITIES["ชาย-สุภาพ"];
    const closing = _p.pronoun?.includes("ค่ะ") ? "ค่ะ" : "ครับ";
    let payNote = "";
    if (isCOD) {
      payNote = `\n${"─".repeat(24)}\n📦 ชำระปลายทาง (COD)\nชำระเงินให้พนักงานขนส่งตอนรับสินค้า${closing}`;
    } else if (isStore) {
      payNote = `\n${"─".repeat(24)}\n🏪 รับสินค้าหน้าร้าน\nชำระ ณ จุดรับสินค้าได้เลย${closing}\n📞 ${pd.phone}`;
    } else {
      const ppLine = PROMPTPAY_NUMBER
        ? `📲 PromptPay: ${PROMPTPAY_NUMBER}`
        : `📞 โทรสอบถาม: ${pd.phone}`;
      payNote = `\n${"─".repeat(24)}\n💳 ชำระโดยการโอนเงิน\n${ppLine}\nโอนแล้วส่งสลิปมาที่แชทนี้ได้เลย${closing} 🙏`;
    }

    reply+=`\n\n✅ สร้างออเดอร์สำเร็จ!\n${"─".repeat(24)}\n`+
      `🆔 ${orderId}\n👤 ${od.name}\n🛍️ ${od.product} × ${od.qty}\n📍 ${od.address}`+
      payNote+sn;

    // ── บันทึกชื่อ เบอร์ ที่อยู่ลง Customer Profile ──────────
    saveCustomerProfile(client.sheetId, userKey, {
      name:           od.name,
      phone:          od.phone,
      address:        od.address,
      lastOrder:      orderId,
      incrementOrder: true,
    }).catch(()=>{});
  }

  return { textReply:reply.trim(), imageUrl };
}

async function logInq(sid, pl, uid, um, ar) {
  try {
    const now = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
    await appendSheet(sid, "Inquiries!A:E", [[now, pl, uid, um.slice(0,200), ar.slice(0,200)]]);
  } catch(e) { /* ignore */ }
}

// Typing
const lineTyping  = async (tok,uid) => { try{await axios.post("https://api.line.me/v2/bot/chat/loading/start",{chatId:uid,loadingSeconds:20},{headers:{Authorization:`Bearer ${tok}`,"Content-Type":"application/json"}})}catch(e){console.debug("lineTyping:", e.message)} };
const fbTypingOn  = async (tok,sid) => { try{await axios.post(`https://graph.facebook.com/v18.0/me/messages?access_token=${tok}`,{recipient:{id:sid},sender_action:"typing_on"})}catch(e){console.debug("fbTypingOn:", e.message)} };
const fbTypingOff = async (tok,sid) => { try{await axios.post(`https://graph.facebook.com/v18.0/me/messages?access_token=${tok}`,{recipient:{id:sid},sender_action:"typing_off"})}catch(e){console.debug("fbTypingOff:", e.message)} };


// --- 21_Prompt_Builder________________O_____________.js ---
// ═══════════════════════════════════════════════════════════
//  Prompt Builder (รองรับคอลัมน์ O = รูปสินค้า)

async function loadHist(sheetId, key) {
  const cached = await Cache.getHist(`${sheetId}_${key}`);
  if (cached) return cached;
  try { const rows = await readSheet(sheetId, "History!A:C"); const row = rows.find(r => r[0] === key); if (row?.[1]) { const m = JSON.parse(row[1]); await Cache.setHist(`${sheetId}_${key}`, m); return m; } } catch (e) { console.debug("loadHist readSheet err:", e.message); }
  return [];
}
async function saveHist(sheetId, key, msgs) {
  await Cache.setHist(`${sheetId}_${key}`, msgs);
  try {
    const rows = await readSheet(sheetId, "History!A:C"); const now = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
    const json = JSON.stringify(msgs); const idx = rows.findIndex(r => r[0] === key);
    if (idx === -1) await appendSheet(sheetId, "History!A:C", [[key, json, now]]);
    else await writeSheet(sheetId, `History!A${idx + 1}:C${idx + 1}`, [[key, json, now]]);
  } catch (e) { console.error("saveHist:", e.message); }
}

async function logChat(shopId, platform, userId, userName, direction, message, messageType = "text", imageUrl = "") {
  const { supabase } = require("../config/db");
  if (!supabase || !shopId) return;
  try {
    await supabase.from("chat_logs").insert({
      shop_id: shopId, platform, user_id: userId, user_name: userName || "",
      direction, message: (message || "").slice(0, 5000),
      message_type: messageType, image_url: imageUrl || "",
    });
  } catch (e) { console.error("logChat:", e.message); }
}

async function resolveShopId(client) {
  const { supabase } = require("../config/db");
  if (client.shopId) return client.shopId;
  if (!supabase || !client.lineToken) return null;
  try {
    const { data } = await supabase.from("shops").select("id").eq("line_token", client.lineToken).single();
    if (data) { client.shopId = data.id; return data.id; }
  } catch (e) { console.debug("resolveShopId err:", e.message); }
  return null;
}

function getShopIdFromClient(client) {
  return client.shopId || null;
}


module.exports = { AI_PROVIDER, AI_CONFIGS, _cachedSettings, _settingsCacheTime, getGlobalAIKey, resolveAIConfig, callAI, callAIWithImage, agentTools, executeTool, callAIAgent, CARRIERS, PERSONALITIES, parseOrder, parseLead, parseStatusQ, parseBooking, parseCheckBooking, parseCancelBooking, parseImageTag, askClaude, logInq, lineTyping, fbTypingOn, fbTypingOff, loadHist, saveHist, logChat, resolveShopId, getShopIdFromClient };
