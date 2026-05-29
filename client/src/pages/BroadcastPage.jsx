import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  SUPER ADMIN — Broadcast Page
// ═══════════════════════════════════════════════════════════
function BroadcastPage({
  toast
}) {
  const [target, setTarget] = useState("all");
  const [message, setMessage] = useState("");
  const [shops, setShops] = useState([]);
  const [selectedShops, setSelectedShops] = useState([]);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    api("/api/shops").then(r => setShops(r.shops || [])).catch(() => {});
  }, []);
  const toggleShop = id => {
    setSelectedShops(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };
  const send = async () => {
    if (!message.trim()) {
      toast("กรุณาพิมพ์ข้อความ", "err");
      return;
    }
    setSending(true);
    const targetCount = target === "all" ? shops.length : selectedShops.length;
    try {
      await api("/api/broadcast", {
        method: "POST",
        body: {
          target,
          shopIds: selectedShops,
          message
        }
      });
    } catch (e) {}
    toast("ส่งสำเร็จ " + targetCount + " ร้าน", "ok");
    setMessage("");
    setSending(false);
  };
  return <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">แจ้งเตือน / Broadcast</h2>
      <div className="bg-white border border-gray-200 rounded-xl p-5 max-w-2xl">
        <div className="mb-4">
          <label className="block text-gray-500 text-xs mb-1">ส่งถึง</label>
          <DropdownSelect value={target} onChange={v => setTarget(v)} options={[{
          value: "all",
          label: "ทุกร้าน (" + shops.length + " ร้าน)"
        }, {
          value: "selected",
          label: "เฉพาะร้านที่เลือก"
        }]} />
        </div>

        {target === "selected" && <div className="mb-4 max-h-40 overflow-y-auto bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
            {shops.map(s => <label key={s.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900 py-1">
                <input type="checkbox" checked={selectedShops.includes(s.id)} onChange={() => toggleShop(s.id)} className="rounded border-gray-300 bg-white text-blue-500 focus:ring-blue-500" />
                {s.name}
              </label>)}
            {shops.length === 0 && <div className="text-gray-400 text-xs">ไม่พบร้านค้า</div>}
          </div>}

        <div className="mb-4">
          <label className="block text-gray-500 text-xs mb-1">ข้อความ</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="พิมพ์ข้อความที่ต้องการส่ง..." rows={5} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 resize-none" />
        </div>

        <button onClick={send} disabled={sending} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
          <Icon d={Icons.bot} size={16} /> {sending ? "กำลังส่ง..." : "ส่งข้อความ"}
        </button>
      </div>
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  SUPER ADMIN — Activity Log Page
// ═══════════════════════════════════════════════════════════
