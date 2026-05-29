// Auto-generated from chunks
const { google } = require("googleapis");
// --- 10_Google_Sheets.js ---
// ═══════════════════════════════════════════════════════════
//  Google Sheets
// ═══════════════════════════════════════════════════════════
let _sh = null;
async function getSheets() {
  if (_sh) return _sh;
  try {
    const creds = JSON.parse(process.env.GOOGLE_CREDS || '{}');
    if (!creds.client_email) throw new Error("Invalid GOOGLE_CREDS");
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    _sh = google.sheets({ version:"v4", auth });
    return _sh;
  } catch (e) {
    throw new Error("Google Sheets setup failed: " + e.message);
  }
}
const readSheet   = async (id, range) => { if (!id) throw new Error("Sheet ID is null"); const s=await getSheets(); return (await s.spreadsheets.values.get({spreadsheetId:id,range})).data.values||[]; };
const writeSheet  = async (id, range, values) => { if (!id) throw new Error("Sheet ID is null"); const s=await getSheets(); await s.spreadsheets.values.update({spreadsheetId:id,range,valueInputOption:"USER_ENTERED",resource:{values}}); };
const appendSheet = async (id, range, values) => { if (!id) throw new Error("Sheet ID is null"); const s=await getSheets(); await s.spreadsheets.values.append({spreadsheetId:id,range,valueInputOption:"USER_ENTERED",resource:{values}}); };



// --- 18____CUSTOMER_PROFILE___________________________.js ---
// ═══════════════════════════════════════════════════════════
//  👤 CUSTOMER PROFILE — จำข้อมูลและที่อยู่ลูกค้า
//  แท็บ "Customers" คอลัมน์:
//  A=UserKey  B=ชื่อ  C=เบอร์  D=ที่อยู่ล่าสุด
//  E=จังหวัด  F=รหัสไปรษณีย์  G=จำนวนออเดอร์
//  H=ออเดอร์ล่าสุด  I=หมายเหตุ  J=อัพเดทล่าสุด
// ═══════════════════════════════════════════════════════════
const customerCache = {};

async function getCustomerProfile(sheetId, userKey) {
  const cacheKey = `cust_${sheetId}_${userKey}`;
  if (customerCache[cacheKey]) return customerCache[cacheKey];
  try {
    const rows = await readSheet(sheetId, "Customers!A:J");
    const row  = rows.slice(1).find(r => r[0] === userKey);
    if (!row) return null;
    const profile = {
      userKey:   row[0] || "",
      name:      row[1] || "",
      phone:     row[2] || "",
      address:   row[3] || "",
      province:  row[4] || "",
      zipcode:   row[5] || "",
      orderCount: parseInt(row[6] || "0"),
      lastOrder: row[7] || "",
      note:      row[8] || "",
    };
    customerCache[cacheKey] = profile;
    return profile;
  } catch (e) { console.error("getCustomerProfile:", e.message); return null; }
}

async function saveCustomerProfile(sheetId, userKey, data) {
  // Update RAM cache
  const cacheKey = `cust_${sheetId}_${userKey}`;
  customerCache[cacheKey] = { ...customerCache[cacheKey], ...data };

  try {
    const rows = await readSheet(sheetId, "Customers!A:J");
    const now  = new Date().toLocaleDateString("th-TH");
    const idx  = rows.findIndex(r => r[0] === userKey);

    if (idx === -1) {
      // ลูกค้าใหม่ — เพิ่มแถว
      await appendSheet(sheetId, "Customers!A:J", [[
        userKey,
        data.name    || "",
        data.phone   || "",
        data.address || "",
        data.province || "",
        data.zipcode || "",
        data.orderCount || "1",
        data.lastOrder  || now,
        data.note || "",
        now,
      ]]);
    } else {
      // ลูกค้าเก่า — อัพเดทแถว
      const existing = rows[idx];
      const newCount = (parseInt(existing[6] || "0") + (data.incrementOrder ? 1 : 0)).toString();
      await writeSheet(sheetId, `Customers!A${idx+1}:J${idx+1}`, [[
        userKey,
        data.name    || existing[1] || "",
        data.phone   || existing[2] || "",
        data.address || existing[3] || "",
        data.province || existing[4] || "",
        data.zipcode || existing[5] || "",
        newCount,
        data.lastOrder || now,
        data.note || existing[8] || "",
        now,
      ]]);
    }
    console.log(`👤 Customer profile saved: ${userKey}`);
  } catch (e) { console.error("saveCustomerProfile:", e.message); }
}

// สร้างข้อความเสนอที่อยู่เดิม
function buildAddressSuggestion(profile, personality) {
  const closing = personality?.pronoun?.includes("ค่ะ") ? "ค่ะ" : "ครับ";
  return (
    `ยินดีให้บริการอีกครั้ง${profile.name ? " คุณ"+profile.name : ""}! 😊\n` +
    `จัดส่งที่อยู่เดิมเลยไหม${closing}?\n` +
    `📍 ${profile.address}${profile.province ? " "+profile.province : ""}${profile.zipcode ? " "+profile.zipcode : ""}\n\n` +
    `พิมพ์ "ใช่" เพื่อยืนยัน หรือแจ้งที่อยู่ใหม่ได้เลย${closing}`
  );
}

module.exports = { _sh, getSheets, readSheet, writeSheet, appendSheet, customerCache, getCustomerProfile, saveCustomerProfile, buildAddressSuggestion };
