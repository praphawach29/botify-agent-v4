import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  🔔 NOTIFICATION SETTINGS — ตั้งค่าแจ้งเตือน LINE
// ═══════════════════════════════════════════════════════════
function NotificationSettingsPage({
  toast
}) {
  const [settings, setSettings] = useState({
    notify_new_order: true,
    notify_low_stock: true,
    notify_daily_summary: false,
    notify_new_chat: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api("/api/notifications/settings").then(r => {
      if (r.success) setSettings(r.settings);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  const save = async () => {
    setSaving(true);
    try {
      const r = await api("/api/notifications/settings", "PUT", settings);
      if (r.success) toast("บันทึกการตั้งค่าแจ้งเตือนสำเร็จ", "success");else toast(r.error || "บันทึกไม่สำเร็จ", "error");
    } catch (e) {
      toast(e.message, "error");
    }
    setSaving(false);
  };
  const ITEMS = [{
    key: "notify_new_order",
    label: "ออเดอร์ใหม่",
    desc: "แจ้งเตือนเมื่อมีออเดอร์ใหม่ / ลูกค้าส่งสลิป",
    icon: "🛒"
  }, {
    key: "notify_low_stock",
    label: "สินค้าใกล้หมด",
    desc: "แจ้งเตือนเมื่อสินค้าเหลือน้อยกว่าที่กำหนด",
    icon: "📦"
  }, {
    key: "notify_daily_summary",
    label: "สรุปรายวัน",
    desc: "รับรายงานสรุปยอดขายและแชทประจำวัน",
    icon: "📊"
  }, {
    key: "notify_new_chat",
    label: "แชทใหม่",
    desc: "แจ้งเตือนเมื่อมีลูกค้าทักแชทครั้งแรก / แจ้งซ่อม",
    icon: "💬"
  }];
  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  return <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex flex-col">
          <h1 className="text-base md:text-xl font-black text-slate-900 leading-tight whitespace-nowrap">ตั้งค่าแจ้งเตือน LINE</h1>
          <p className="text-[10px] text-gray-400 leading-none mt-0.5 hidden sm:block">ตั้งค่าการรับข้อมูลแจ้งเตือนออเดอร์ใหม่และสต็อกสินค้าผ่าน LINE OA</p>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition shadow-md shadow-blue-500/10 disabled:opacity-50">
          <Icon d={Icons.save} size={14} /> {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200/50 p-1">
        <div className="p-4 border-b border-gray-200/30">
          <p className="text-gray-500 text-sm">เลือกประเภทการแจ้งเตือนที่ต้องการรับผ่าน LINE OA ของคุณ</p>
          <p className="text-amber-400/80 text-xs mt-1">* ต้องเชื่อมต่อ LINE OA และตั้งค่า Owner LINE ID ในหน้าข้อมูลร้านก่อน</p>
        </div>
        <div className="divide-y divide-gray-200/30">
          {ITEMS.map(item => <div key={item.key} className="flex items-center justify-between p-4 hover:bg-gray-100/20 transition">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <div className="text-gray-900 font-medium text-sm">{item.label}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{item.desc}</div>
                </div>
              </div>
              <button onClick={() => setSettings(s => ({
            ...s,
            [item.key]: !s[item.key]
          }))} className={"relative w-11 h-6 rounded-full transition-colors " + (settings[item.key] ? "bg-green-500" : "bg-slate-600")}>
                <span className={"absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform " + (settings[item.key] ? "translate-x-5" : "")} />
              </button>
            </div>)}
        </div>
      </div>
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  💬 CHAT HISTORY — ประวัติแชทลูกค้า
// ═══════════════════════════════════════════════════════════
