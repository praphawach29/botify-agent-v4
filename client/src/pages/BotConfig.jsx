import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  BOT PERSONALITY CONFIG
// ═══════════════════════════════════════════════════════════
function BotConfig({
  toast
}) {
  const [info, setInfo] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api("/api/shopinfo").then(d => setInfo(d.info || {})).catch(() => {});
  }, []);
  const save = async () => {
    setSaving(true);
    const res = await api("/api/shopinfo", {
      method: "PUT",
      body: {
        info
      }
    });
    toast(res.success ? "บันทึกค่า Bot แล้ว ✅" : "เกิดข้อผิดพลาด", res.success ? "ok" : "err");
    await api("/refresh").catch(() => {});
    setSaving(false);
  };
  if (!info) return <Loader />;
  const personalities = ["หญิง-สุภาพ", "ชาย-สุภาพ", "หญิง-น่ารัก", "ชาย-เป็นกันเอง", "กลาง"];
  const aiProviders = [{
    value: "claude",
    label: "🧠 Claude (แนะนำ)",
    desc: "คุณภาพสูงสุด ภาษาไทยดีเยี่ยม"
  }, {
    value: "openai",
    label: "💚 OpenAI GPT",
    desc: "ประหยัด ตอบเร็ว"
  }, {
    value: "gemini",
    label: "🔵 Google Gemini",
    desc: "ฟรี/ถูกมาก เหมาะทดสอบ"
  }, {
    value: "typhoon",
    label: "🌪️ Typhoon",
    desc: "เชี่ยวชาญภาษาไทย"
  }];
  return <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-base md:text-xl font-black text-slate-900 leading-tight whitespace-nowrap">ตั้งค่า Bot</h1>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
          <Icon d={Icons.save} size={16} /> {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h3 className="text-gray-900 font-semibold text-sm mb-3">🎭 บุคลิก Bot</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {personalities.map(p => <button key={p} onClick={() => setInfo({
          ...info,
          PERSONALITY: p
        })} className={"py-2 px-3 rounded-lg text-sm font-medium transition border " + (info.PERSONALITY === p ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-gray-50 border-gray-300 text-gray-500 hover:border-gray-400")}>
              {p}
            </button>)}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h3 className="text-gray-900 font-semibold text-sm mb-3">🤖 AI Provider</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {aiProviders.map(ap => <button key={ap.value} onClick={() => setInfo({
          ...info,
          AI_PROVIDER: ap.value
        })} className={"text-left p-3 rounded-lg transition border " + (info.AI_PROVIDER === ap.value ? "bg-blue-600/30 border-blue-500" : "bg-gray-50 border-gray-300 hover:border-gray-400")}>
              <div className={"text-sm font-semibold " + (info.AI_PROVIDER === ap.value ? "text-blue-300" : "text-gray-700")}>{ap.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{ap.desc}</div>
            </button>)}
        </div>
        <div className="mt-3">
          <label className="block text-gray-500 text-xs mb-1">Model (ไม่ใส่ = ค่าเริ่มต้น)</label>
          <input value={info.AI_MODEL || ""} onChange={e => setInfo({
          ...info,
          AI_MODEL: e.target.value
        })} placeholder="เช่น gpt-4o-mini, gemini-1.5-flash" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 transition" />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h3 className="text-gray-900 font-semibold text-sm mb-3">⏰ ตั้งเวลาแจ้งเตือน</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-500 text-xs mb-1">Follow-up หลังสนใจ (ชม.)</label>
            <input type="number" value={info.FOLLOWUP_HOURS || ""} onChange={e => setInfo({
            ...info,
            FOLLOWUP_HOURS: e.target.value
          })} placeholder="24" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 transition" />
          </div>
          <div>
            <label className="block text-gray-500 text-xs mb-1">แจ้งเตือนชำระเงินหลัง (ชม.)</label>
            <input type="number" value={info.UNPAID_REMINDER_HOURS || ""} onChange={e => setInfo({
            ...info,
            UNPAID_REMINDER_HOURS: e.target.value
          })} placeholder="2" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 transition" />
          </div>
          <div>
            <label className="block text-gray-500 text-xs mb-1">แจ้งเตือนสูงสุด (ครั้ง)</label>
            <input type="number" value={info.UNPAID_MAX_REMINDERS || ""} onChange={e => setInfo({
            ...info,
            UNPAID_MAX_REMINDERS: e.target.value
          })} placeholder="3" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 transition" />
          </div>
          <div>
            <label className="block text-gray-500 text-xs mb-1">แจ้งเตือนสต็อกต่ำ (ชิ้น)</label>
            <input type="number" value={info.LOW_STOCK_LIMIT || ""} onChange={e => setInfo({
            ...info,
            LOW_STOCK_LIMIT: e.target.value
          })} placeholder="3" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 transition" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h3 className="text-gray-900 font-semibold text-sm mb-3">💬 เชื่อมต่อ LINE OA</h3>
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mb-4 text-emerald-300 text-xs leading-relaxed">
          <strong>วิธีเชื่อมต่อ LINE OA:</strong><br />
          1. ไปที่ <a href="https://developers.line.biz/" target="_blank" className="underline">LINE Developers Console</a> → สร้าง Messaging API Channel<br />
          2. คัดลอก <strong>Channel Access Token</strong> และ <strong>Bot User ID</strong> มาใส่ด้านล่าง<br />
          3. ตั้ง Webhook URL เป็น: <code className="bg-white px-1 rounded">https://your-domain.com/webhook/line</code><br />
          4. กดบันทึก แล้ว Bot จะตอบลูกค้าอัตโนมัติตามข้อมูลร้านค้าและสินค้าของคุณ
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-500 text-xs mb-1">LINE Channel Access Token</label>
            <input value={info.LINE_TOKEN || ""} onChange={e => setInfo({
            ...info,
            LINE_TOKEN: e.target.value
          })} placeholder="ใส่ Token จาก LINE Developers" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 transition" />
          </div>
          <div>
            <label className="block text-gray-500 text-xs mb-1">LINE Bot User ID</label>
            <input value={info.LINE_BOT_ID || ""} onChange={e => setInfo({
            ...info,
            LINE_BOT_ID: e.target.value
          })} placeholder="U... (จาก Basic settings)" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 transition" />
          </div>
          <div>
            <label className="block text-gray-500 text-xs mb-1">LINE Owner User ID (สำหรับแจ้งเตือน)</label>
            <input value={info.OWNER_LINE_ID || ""} onChange={e => setInfo({
            ...info,
            OWNER_LINE_ID: e.target.value
          })} placeholder="Uxxxx (Your LINE user ID)" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 transition" />
          </div>
          <div>
            <label className="block text-gray-500 text-xs mb-1">Google Sheet ID (สำหรับ Sync ข้อมูล)</label>
            <input value={info.SHEET_ID || ""} onChange={e => setInfo({
            ...info,
            SHEET_ID: e.target.value
          })} placeholder="ใส่ ID จาก URL ของ Google Sheet" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 transition" />
          </div>
        </div>
        {info.LINE_TOKEN && <div className="mt-3 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-emerald-400 text-xs">LINE OA เชื่อมต่อแล้ว — Bot พร้อมตอบลูกค้าอัตโนมัติ</span>
          </div>}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-gray-900 font-semibold text-sm mb-3">📝 Custom Prompt (เพิ่มเติม)</h3>
        <textarea value={info.CUSTOM_PROMPT || ""} onChange={e => setInfo({
        ...info,
        CUSTOM_PROMPT: e.target.value
      })} placeholder="เพิ่มคำสั่งพิเศษให้ Bot เช่น: ห้ามลดราคาเกิน 10%, แนะนำสินค้า X เสมอ..." rows={4} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 transition resize-none" />
      </div>
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  PRODUCTS CRUD
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  ORDERS PAGE
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  PROMOTIONS PAGE
// ═══════════════════════════════════════════════════════════
