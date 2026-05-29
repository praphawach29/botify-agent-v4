const { supabase } = require('./db');

// ═══════════════════════════════════════════════════════════
//  🏪 MULTI-TENANT CLIENT LOADING & ROUTING MAPS
// ═══════════════════════════════════════════════════════════
let CLIENTS = [];

const LINE_DEST_MAP  = {};
const LINE_TOKEN_MAP = {};
const FB_PAGE_MAP    = {};
const FB_TOKEN_MAP   = {};
let activeClients    = [];

function rebuildRoutingMaps() {
  // Clear old maps
  Object.keys(LINE_DEST_MAP).forEach(k => delete LINE_DEST_MAP[k]);
  Object.keys(LINE_TOKEN_MAP).forEach(k => delete LINE_TOKEN_MAP[k]);
  Object.keys(FB_PAGE_MAP).forEach(k => delete FB_PAGE_MAP[k]);
  Object.keys(FB_TOKEN_MAP).forEach(k => delete FB_TOKEN_MAP[k]);

  activeClients = CLIENTS.filter(c => (c.lineToken && c.lineToken !== "undefined") || (c.fbToken && c.fbToken !== "undefined"));
  activeClients.forEach(c => {
    if (c.lineToken && c.lineToken !== "undefined") {
      LINE_TOKEN_MAP[c.lineToken] = c;
      if (c.lineBotUserId && c.lineBotUserId !== "undefined") LINE_DEST_MAP[c.lineBotUserId] = c;
    }
    if (c.fbToken && c.fbToken !== "undefined") {
      FB_TOKEN_MAP[c.fbToken] = c;
      if (c.fbPageId && c.fbPageId !== "undefined") FB_PAGE_MAP[c.fbPageId] = c;
    }
  });
  console.log(`🗺️ Routing maps: ${Object.keys(LINE_DEST_MAP).length} LINE, ${Object.keys(FB_PAGE_MAP).length} FB`);
}

const findLineClient = dest => LINE_DEST_MAP[dest] || Object.values(LINE_TOKEN_MAP)[0] || null;
const findFbClient   = pid  => FB_PAGE_MAP[pid]   || Object.values(FB_TOKEN_MAP)[0]   || null;
const getFirstClient = ()   => activeClients[0] || null;

function getClientByShopId(shopId) {
  if (!shopId) return null;
  return CLIENTS.find(c => c.shopId === shopId) || null;
}

// Fallback จาก .env (backward compatible)
function loadClientsFromEnv() {
  const envClients = [];
  for (let i = 1; i <= 20; i++) {
    const lt = process.env[`LINE_TOKEN_${i}`];
    if (!lt || lt === "xxx" || lt === "undefined") continue;
    envClients.push({
      name:          process.env[`SHOP_NAME_${i}`] || `Shop ${i}`,
      lineToken:     lt,
      lineBotUserId: process.env[`LINE_BOTID_${i}`] || "",
      fbToken:       process.env[`FB_TOKEN_${i}`] || "",
      fbPageId:      process.env[`FB_PAGEID_${i}`] || "",
      sheetId:       process.env[`SHEET_ID_${i}`] || "",
      ownerUserId:   process.env[`OWNER_LINE_ID_${i}`] || "",
      shopId:        null, // จะถูก resolve จาก Supabase ทีหลัง
      cache: null, cacheAt: 0,
    });
  }
  return envClients;
}

// โหลดจาก Supabase shops table
async function loadClientsFromDB() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from("shops")
      .select("id, name, line_token, line_bot_id, owner_line_id, fb_token, fb_page_id, sheet_id, ai_provider, ai_model, ai_key, package_name");
    if (error || !data) return [];
    return data
      // .filter(s => s.line_token || s.fb_token) // ปิดไว้ก่อนเพื่อให้โหลดหน้า dashboard ได้แม้ยังไม่ได้ตั้งค่าบอท
      .map(s => ({
        name:          s.name || "Unnamed Shop",
        lineToken:     s.line_token || "",
        lineBotUserId: s.line_bot_id || "",
        fbToken:       s.fb_token || "",
        fbPageId:      s.fb_page_id || "",
        sheetId:       s.sheet_id || "",
        ownerUserId:   s.owner_line_id || "",
        shopId:        s.id,
        shopAiProvider: s.ai_provider || "",
        shopAiModel:   s.ai_model || "",
        shopAiKey:     s.ai_key || "",
        plan:          s.package_name || "free",
        cache: null, cacheAt: 0,
      }));
  } catch (e) {
    console.error("loadClientsFromDB:", e.message);
    return [];
  }
}

// รวม clients จาก DB + env (DB มี priority สูงกว่า)
async function refreshClients() {
  const dbClients  = await loadClientsFromDB();
  const envClients = loadClientsFromEnv();

  // Merge: ถ้า DB มีข้อมูล ใช้จาก DB เป็นหลัก
  const dbTokens = new Set(dbClients.map(c => c.lineToken).filter(Boolean));
  const dbFbIds  = new Set(dbClients.map(c => c.fbPageId).filter(Boolean));
  const uniqueEnv = envClients.filter(c =>
    (c.lineToken && !dbTokens.has(c.lineToken)) ||
    (c.fbPageId && !dbFbIds.has(c.fbPageId))
  );

  CLIENTS = [...dbClients, ...uniqueEnv];
  rebuildRoutingMaps();
  console.log(`🏪 Loaded ${CLIENTS.length} clients (${dbClients.length} from DB, ${uniqueEnv.length} from env)`);
  return CLIENTS;
}

// Initial load: env clients ก่อน (sync)
CLIENTS = loadClientsFromEnv();
rebuildRoutingMaps();

const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || ""; 
const ADMIN_API_KEY   = process.env.ADMIN_API_KEY;
const CACHE_TTL_MS    = 30 * 60 * 1000;
const MAX_HISTORY     = 20;
const LOW_STOCK_LIMIT = parseInt(process.env.LOW_STOCK_LIMIT || "3");
const FOLLOWUP_HOURS  = parseInt(process.env.FOLLOWUP_HOURS  || "24");
const AI_FALLBACK_CHAIN = (process.env.AI_FALLBACK_CHAIN || "claude,deepseek,openai,gemini,typhoon").split(",").map(s => s.trim()).filter(Boolean);

module.exports = {
  CLIENTS,
  activeClients,
  loadClientsFromEnv,
  loadClientsFromDB,
  refreshClients,
  rebuildRoutingMaps,
  findLineClient,
  findFbClient,
  getFirstClient,
  getClientByShopId,
  FB_VERIFY_TOKEN,
  ADMIN_API_KEY,
  CACHE_TTL_MS,
  MAX_HISTORY,
  LOW_STOCK_LIMIT,
  FOLLOWUP_HOURS,
  AI_FALLBACK_CHAIN
};
