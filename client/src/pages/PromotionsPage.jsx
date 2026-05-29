import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  PRODUCTS CRUD
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  ORDERS PAGE
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  PROMOTIONS PAGE
// ═══════════════════════════════════════════════════════════
function PromotionsPage({
  toast
}) {
  const [promos, setPromos] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [broadcasting, setBroadcasting] = useState(false);
  const [confirmBroadcast, setConfirmBroadcast] = useState(null);

  const load = useCallback(() => {
    api("/api/promotions").then(d => setPromos(d.promotions || [])).catch(() => {});
  }, []);
  useEffect(load, [load]);
  const openEdit = p => {
    setEditing(p ? p.rowIndex : "new");
    setForm(p || {});
  };
  
  const handleBroadcast = async () => {
    if (!confirmBroadcast) return;
    setBroadcasting(true);
    const res = await api(`/api/promotions/${confirmBroadcast.rowIndex}/broadcast`, { method: "POST" });
    setBroadcasting(false);
    setConfirmBroadcast(null);
    
    if (res.success) {
      toast(`ส่งข้อความหาลูกค้า ${res.sentCount}/${res.totalTarget} คนสำเร็จ ✅`, "ok");
      load();
    } else {
      toast(res.error || "เกิดข้อผิดพลาดในการส่งข้อความ", "err");
    }
  };
  const savePromo = async () => {
    const method = editing === "new" ? "POST" : "PUT";
    const url = editing === "new" ? "/api/promotions" : "/api/promotions/" + editing;
    const res = await api(url, {
      method,
      body: form
    });
    toast(res.success ? "บันทึกโปรโมชั่นแล้ว ✅" : res.error || "Error", res.success ? "ok" : "err");
    if (res.success) {
      setEditing(null);
      load();
    }
  };
  return <div className="w-full flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex flex-col">
          <h1 className="text-base md:text-xl font-black text-slate-900 leading-tight whitespace-nowrap">โปรโมชั่น ({promos.length})</h1>
          <p className="text-[10px] text-gray-400 leading-none mt-0.5 hidden sm:block">จัดการคูปอง ส่วนลด และแคมเปญส่งเสริมการขายประจำร้าน</p>
        </div>
        <button onClick={() => openEdit(null)} className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition shadow-md shadow-emerald-500/10">
          <Icon d={Icons.plus} size={14} /> <span className="hidden sm:inline">เพิ่มโปรโมชั่น</span><span className="sm:hidden">เพิ่มโปรฯ</span>
        </button>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {promos.map(p => <div key={p.rowIndex} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex-1 min-w-0 pr-4">
              <div className="text-slate-900 text-sm font-black truncate">{p.promoName}</div>
              <div className="text-slate-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">{p.promoText}</div>
              <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-3 font-semibold">
                <span>📅 {p.startDate || "-"} ถึง {p.endDate || "-"}</span>
                {p.target && <>
                    <span>•</span>
                    <span className="bg-gray-100 text-slate-600 px-1.5 py-0.5 rounded-md">🎯 {p.target}</span>
                  </>}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => openEdit(p)} className="p-2 bg-gray-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-gray-100 hover:border-blue-200 rounded-xl transition shadow-sm flex justify-center items-center">
                <Icon d={Icons.edit} size={16} />
              </button>
              {p.sent === "yes" ? (
                <div className="px-2 py-1.5 bg-green-50 text-green-600 text-[10px] font-bold rounded-lg border border-green-200 text-center flex items-center justify-center gap-1">
                  <Icon d={Icons.check} size={12} /> ส่งแล้ว
                </div>
              ) : (
                <button onClick={() => setConfirmBroadcast(p)} className="px-2 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg transition shadow-sm shadow-amber-500/20 text-center flex items-center justify-center gap-1">
                  📢 บรอดแคสต์
                </button>
              )}
            </div>
          </div>)}
        {promos.length === 0 && <div className="col-span-full bg-white border border-gray-100 rounded-2xl py-12 text-center text-gray-400 font-bold shadow-sm">
            ยังไม่มีโปรโมชั่น
          </div>}
      </div>

      {editing !== null && <Modal title={editing === "new" ? "เพิ่มโปรโมชั่น" : "แก้ไขโปรโมชั่น"} onClose={() => setEditing(null)} onSave={savePromo}>
          <div className="space-y-3.5">
            <Field label="ชื่อโปรโมชั่น *" val={form.promoName} set={v => setForm({
          ...form,
          promoName: v
        })} />
            <Field label="ข้อความโปรโมชั่น *" val={form.promoText} set={v => setForm({
          ...form,
          promoText: v
        })} area />
            <div className="grid grid-cols-2 gap-3">
              <Field type="date" label="วันเริ่ม" val={form.startDate} set={v => setForm({
            ...form,
            startDate: v
          })} ph="วว/ดด/ปปปป" />
              <Field type="date" label="วันสิ้นสุด" val={form.endDate} set={v => setForm({
            ...form,
            endDate: v
          })} ph="วว/ดด/ปปปป" />
            </div>
            <Field label="กลุ่มเป้าหมาย" val={form.target} set={v => setForm({
          ...form,
          target: v
        })} ph="เช่น all, member" />
          </div>
        </Modal>}

      {/* Confirmation Modal */}
      {confirmBroadcast && (
        <Modal title="ยืนยันการยิงบรอดแคสต์" onClose={() => !broadcasting && setConfirmBroadcast(null)} onSave={handleBroadcast} saveText={broadcasting ? "กำลังส่ง..." : "🚀 ยืนยันการส่งข้อความ"}>
          <div className="text-sm text-gray-600 space-y-4">
            <p>
              คุณกำลังจะส่งข้อความโปรโมชัน <b>"{confirmBroadcast.promoName}"</b> ไปหาลูกค้าทุกคนที่เคยติดต่อกับร้าน และมี LINE ID ผูกไว้ในระบบ
            </p>
            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-xl text-xs">
              <p><b>ข้อความที่จะส่ง:</b></p>
              <p className="mt-1 whitespace-pre-wrap">{confirmBroadcast.promoText}</p>
            </div>
            <p className="text-xs text-red-500 mt-2">* หมายเหตุ: การส่งข้อความจะใช้โควต้า Push Message ของบัญชี LINE OA ของคุณ</p>
          </div>
        </Modal>
      )}
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  BOOKINGS / SLOTS PAGE
// ═══════════════════════════════════════════════════════════
