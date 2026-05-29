import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  ORDERS PAGE
// ═══════════════════════════════════════════════════════════
function OrdersPage({
  toast
}) {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("");
  const load = useCallback(() => {
    api("/api/orders?limit=100").then(d => setOrders(d.orders || [])).catch(() => {});
  }, []);
  useEffect(load, [load]);
  const updateStatus = async (ri, status) => {
    const res = await api("/api/orders/" + ri + "/status", {
      method: "PUT",
      body: {
        status
      }
    });
    toast(res.success ? 'อัพเดทเป็น "' + status + '" แล้ว' : "Error", res.success ? "ok" : "err");
    load();
  };
  const statuses = ["ทั้งหมด", "รอยืนยัน", "กำลังจัดเตรียม", "จัดส่งแล้ว", "ยกเลิก"];
  const filtered = orders.filter(o => !filter || o.status === filter);
  const statusColors = {
    "รอยืนยัน": "bg-amber-50 text-amber-700 border border-amber-200",
    "กำลังจัดเตรียม": "bg-blue-50 text-blue-700 border border-blue-200",
    "จัดส่งแล้ว": "bg-emerald-50 text-emerald-700 border border-emerald-200",
    "ยกเลิก": "bg-red-50 text-red-700 border border-red-200"
  };
  return <div className="w-full flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex flex-col">
          <h1 className="text-base md:text-xl font-black text-slate-900 leading-tight whitespace-nowrap">ออเดอร์ ({orders.length})</h1>
          <p className="text-[10px] text-gray-400 leading-none mt-0.5 hidden sm:block">ตรวจสอบสถานะรายการสั่งซื้อและการจัดส่งทั้งหมด</p>
        </div>
        <button onClick={load} className="flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm">
          <Icon d={Icons.refresh} size={13} /> <span className="hidden sm:inline">รีเฟรชข้อมูล</span><span className="sm:hidden">รีเฟรช</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
        {statuses.map(s => <button key={s} onClick={() => setFilter(s === "ทั้งหมด" ? "" : s)} className={"whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold transition border " + (!filter && s === "ทั้งหมด" || filter === s ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/15" : "bg-white border-gray-200 text-slate-600 hover:bg-gray-50 hover:border-gray-300")}>
            {s}
          </button>)}
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(o => <div key={o.rowIndex} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="text-slate-900 text-sm font-black tracking-wide">{o.orderId}</div>
                <span className={"text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider " + (statusColors[o.status] || "bg-gray-50 border border-gray-200 text-gray-500")}>{o.status}</span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-slate-700 text-xs">
                  <span className="text-gray-400 w-4 text-center">👤</span>
                  <span className="font-semibold text-slate-800">{o.name}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 text-xs">
                  <span className="text-gray-400 w-4 text-center">🛍️</span>
                  <span className="font-semibold text-slate-800">{o.product} <span className="text-gray-400 font-normal">x{o.qty}</span></span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 text-xs">
                  <span className="text-gray-400 w-4 text-center">📱</span>
                  <span>แพลตฟอร์ม: <span className="font-bold text-slate-800">{o.platform}</span></span>
                </div>
                {o.trackingNo && <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-100/50 mt-1">
                    <span className="text-emerald-500 font-bold">🚚</span>
                    <span>จัดส่งโดย: <span className="font-bold">{o.carrier}</span> | เลขติดตาม: <span className="font-mono font-bold tracking-wider">{o.trackingNo}</span></span>
                  </div>}
              </div>
            </div>
            {o.status === "รอยืนยัน" && <div className="flex gap-2 pt-3 border-t border-gray-100 mt-2">
                <button onClick={() => updateStatus(o.rowIndex, "กำลังจัดเตรียม")} className="flex-1 text-center py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-sm shadow-emerald-500/10">
                  ยืนยันออเดอร์
                </button>
                <button onClick={() => updateStatus(o.rowIndex, "ยกเลิก")} className="py-2 px-4 bg-gray-50 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-gray-200 hover:border-red-200 text-xs font-bold rounded-xl transition">
                  ยกเลิก
                </button>
              </div>}
          </div>)}
        {filtered.length === 0 && <div className="col-span-full bg-white border border-gray-100 rounded-2xl py-12 text-center text-gray-400 font-bold shadow-sm">
            ไม่มีออเดอร์
          </div>}
      </div>
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  PROMOTIONS PAGE
// ═══════════════════════════════════════════════════════════
