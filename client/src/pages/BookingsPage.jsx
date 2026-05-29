import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  BOOKINGS / SLOTS PAGE
// ═══════════════════════════════════════════════════════════
function BookingsPage({
  toast
}) {
  const [bookings, setBookings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [tab, setTab] = useState("bookings");
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [bkForm, setBkForm] = useState({
    name: "",
    phone: "",
    service: "",
    date: "",
    time: ""
  });
  const [slForm, setSlForm] = useState({
    day: "",
    time_slot: "",
    service: "ทุกบริการ",
    max_slots: "1"
  });
  const loadData = useCallback(() => {
    api("/api/bookings").then(d => setBookings(d.bookings || [])).catch(() => {});
    api("/api/slots").then(d => setSlots(d.slots || [])).catch(() => {});
  }, []);
  useEffect(loadData, [loadData]);
  const updateBooking = async (ri, status) => {
    const res = await api("/api/bookings/" + ri + "/status", {
      method: "PUT",
      body: {
        status
      }
    });
    toast(res.success ? "อัพเดทแล้ว" : "Error", res.success ? "ok" : "err");
    loadData();
  };
  const saveBooking = async () => {
    if (!bkForm.name || !bkForm.service || !bkForm.date) {
      toast("กรุณากรอกข้อมูลให้ครบ", "err");
      return;
    }
    const res = await api("/api/bookings", {
      method: "POST",
      body: bkForm
    });
    toast(res.success ? "สร้างนัดหมายแล้ว ✅" : res.error || "Error", res.success ? "ok" : "err");
    if (res.success) {
      setShowAddBooking(false);
      setBkForm({
        name: "",
        phone: "",
        service: "",
        date: "",
        time: ""
      });
      loadData();
    }
  };
  const saveSlot = async () => {
    if (!slForm.day || !slForm.time_slot) {
      toast("กรุณากรอกวันและเวลา", "err");
      return;
    }
    const res = await api("/api/slots", {
      method: "POST",
      body: slForm
    });
    toast(res.success ? "สร้าง Slot แล้ว ✅" : res.error || "Error", res.success ? "ok" : "err");
    if (res.success) {
      setShowAddSlot(false);
      setSlForm({
        day: "",
        time_slot: "",
        service: "ทุกบริการ",
        max_slots: "1"
      });
      loadData();
    }
  };
  return <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex flex-col">
          <h1 className="text-base md:text-xl font-black text-slate-900 leading-tight whitespace-nowrap">นัดหมาย / จอง</h1>
          <p className="text-[10px] text-gray-400 leading-none mt-0.5 hidden sm:block">จัดการตารางนัดหมายและการจองคิวบริการของลูกค้า</p>
        </div>
        {tab === "bookings" ? <button onClick={() => setShowAddBooking(true)} className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition shadow-md shadow-emerald-500/10">
            <Icon d={Icons.plus} size={14} /> <span className="hidden sm:inline">เพิ่มนัดหมาย</span><span className="sm:hidden">เพิ่มนัด</span>
          </button> : <button onClick={() => setShowAddSlot(true)} className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition shadow-md shadow-blue-500/10">
            <Icon d={Icons.plus} size={14} /> <span className="hidden sm:inline">เพิ่ม Slot</span><span className="sm:hidden">เพิ่ม Slot</span>
          </button>}
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
        {["bookings", "slots"].map(t => <button key={t} onClick={() => setTab(t)} className={"whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold transition border " + (tab === t ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/15" : "bg-white border-gray-200 text-slate-600 hover:bg-gray-50 hover:border-gray-300")}>
            {t === "bookings" ? "📅 รายการจอง" : "⏰ เวลาทำการ / Slots"}
          </button>)}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 mb-4 text-blue-300 text-xs leading-relaxed">
        💡 <strong>Sync บริการ:</strong> สำหรับร้านที่ให้บริการ (สปา, คลินิก, ร้านตัดผม ฯลฯ) ให้สร้าง Slot ตาม "วัน + เวลา + บริการ" ที่เปิดให้จอง
        แล้วลูกค้าจองผ่าน LINE Bot ได้อัตโนมัติ หรือ Sync จาก Google Sheet ชีต "Slots" ที่มีคอลัมน์: วัน, เวลา, บริการ, จำนวน, สถานะ
      </div>

      {tab === "bookings" ? <div className="space-y-2">
          {bookings.map(b => <div key={b.rowIndex || b.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-900 text-sm font-semibold">{b.bookingId || b.booking_code || "N/A"}</span>
                <span className={"text-xs px-2 py-0.5 rounded-full " + (b.status?.includes("ยืนยัน") || b.status === "confirmed" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400")}>{b.status}</span>
              </div>
              <div className="text-gray-500 text-xs">👤 {b.name || b.customer_name} | 🎯 {b.service} | 📆 {b.date || b.appt_date} {b.time || b.appt_time}</div>
              {(b.status === "รอยืนยัน" || b.status === "confirmed") && <div className="flex gap-2 mt-2">
                  <button onClick={() => updateBooking(b.rowIndex || b.id, "ยืนยัน")} className="text-xs bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 px-3 py-1 rounded-lg">ยืนยัน</button>
                  <button onClick={() => updateBooking(b.rowIndex || b.id, "ยกเลิก")} className="text-xs bg-red-500/20 text-red-400 border border-red-500/50 px-3 py-1 rounded-lg">ยกเลิก</button>
                </div>}
            </div>)}
          {bookings.length === 0 && <div className="text-gray-400 text-center py-10 text-sm">ไม่มีรายการจอง</div>}
        </div> : <div className="space-y-2">
          {slots.map(s => <div key={s.rowIndex || s.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-gray-900 text-sm font-medium">{s.day} — {s.time_slot || s.time}</div>
                <div className="text-gray-400 text-xs">{s.service} | จำนวน: {s.max_slots || s.maxSlots || 1} | {s.status || "open"}</div>
              </div>
              <span className={"text-xs px-2 py-0.5 rounded-full " + (s.status === "open" || !s.status ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
                {s.status === "open" || !s.status ? "เปิด" : "ปิด"}
              </span>
            </div>)}
          {slots.length === 0 && <div className="text-gray-400 text-center py-10 text-sm">ยังไม่มี Slots — กดปุ่ม "เพิ่ม Slot" เพื่อสร้าง</div>}
        </div>}

      {showAddBooking && <Modal title="เพิ่มนัดหมาย" onClose={() => setShowAddBooking(false)} onSave={saveBooking}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="ชื่อลูกค้า *" val={bkForm.name} set={v => setBkForm({
          ...bkForm,
          name: v
        })} />
            <Field label="เบอร์โทร" val={bkForm.phone} set={v => setBkForm({
          ...bkForm,
          phone: v
        })} />
            <Field label="บริการ *" val={bkForm.service} set={v => setBkForm({
          ...bkForm,
          service: v
        })} ph="เช่น ตัดผม, สปา, นวด" />
            <Field type="date" label="วันที่ *" val={bkForm.date} set={v => setBkForm({
          ...bkForm,
          date: v
        })} ph="วว/ดด/ปปปป" />
            <Field type="time" label="เวลา" val={bkForm.time} set={v => setBkForm({
          ...bkForm,
          time: v
        })} ph="10:00" />
          </div>
        </Modal>}

      {showAddSlot && <Modal title="เพิ่ม Slot" onClose={() => setShowAddSlot(false)} onSave={saveSlot}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field type="date" label="วัน *" val={slForm.day} set={v => setSlForm({
          ...slForm,
          day: v
        })} ph="วว/ดด/ปปปป" />
            <Field label="เวลา *" val={slForm.time_slot} set={v => setSlForm({
          ...slForm,
          time_slot: v
        })} ph="10:00-11:00" />
            <Field label="บริการ" val={slForm.service} set={v => setSlForm({
          ...slForm,
          service: v
        })} ph="ทุกบริการ" />
            <Field label="จำนวนสูงสุด" val={slForm.max_slots} set={v => setSlForm({
          ...slForm,
          max_slots: v
        })} ph="1" />
          </div>
        </Modal>}
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  🔌 CHANNEL SETTINGS — เชื่อมต่อ LINE / Facebook / Google Sheet
// ═══════════════════════════════════════════════════════════
