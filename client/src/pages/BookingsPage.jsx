import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Icon, Icons, api, Modal, Field } from '../components/Shared';

// ─────────────────────────────────────────────────────────
//  Thai Inline Calendar
// ─────────────────────────────────────────────────────────
const THAI_MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const THAI_DAYS = ["อา","จ","อ","พ","พฤ","ศ","ส"];

function ThaiCalendar({ label, val, set }) {
  const today = new Date();
  const selDate  = val ? (() => { const [y,m,d] = val.split("-").map(Number); return new Date(y,m-1,d); })() : null;
  const initYear = selDate ? selDate.getFullYear() : today.getFullYear();
  const initMonth= selDate ? selDate.getMonth()    : today.getMonth();
  const [vy, setVy] = useState(initYear);
  const [vm, setVm] = useState(initMonth);

  const daysInMonth = new Date(vy, vm + 1, 0).getDate();
  const firstDow    = new Date(vy, vm, 1).getDay();

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevM = () => vm === 0 ? (setVm(11), setVy(y=>y-1)) : setVm(m=>m-1);
  const nextM = () => vm === 11 ? (setVm(0),  setVy(y=>y+1)) : setVm(m=>m+1);
  const select = (d) => {
    if (!d) return;
    set(`${vy}-${String(vm+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
  };
  const isSel = (d) => selDate && selDate.getFullYear()===vy && selDate.getMonth()===vm && selDate.getDate()===d;
  const isTod = (d) => today.getFullYear()===vy && today.getMonth()===vm && today.getDate()===d;
  const fmtDisplay = () => {
    if (!val) return "";
    const [y,m,d] = val.split("-").map(Number);
    return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y+543}`;
  };

  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:6 }}>{label}</label>
      <div style={{ border:"1px solid #d1d5db", borderRadius:10, padding:"10px 12px", background:"#fff" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
          <button type="button" onClick={prevM} style={CAL_NAV}>‹</button>
          <span style={{ fontSize:13, fontWeight:700, color:"#111827" }}>
            {THAI_MONTHS[vm]} {vy+543}
            {val && <span style={{ fontSize:11, color:"#6b7280", marginLeft:8 }}>({fmtDisplay()})</span>}
          </span>
          <button type="button" onClick={nextM} style={CAL_NAV}>›</button>
        </div>
        {/* Day headers */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:3 }}>
          {THAI_DAYS.map(d => (
            <div key={d} style={{ textAlign:"center", fontSize:10, fontWeight:600, color:"#9ca3af", padding:"2px 0" }}>{d}</div>
          ))}
        </div>
        {/* Date cells */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
          {cells.map((d, i) => d === null ? <div key={`e${i}`} /> : (
            <button key={d} type="button" onClick={() => select(d)} style={{
              padding:"6px 2px", borderRadius:6, fontSize:12, border:"none", cursor:"pointer", textAlign:"center",
              background: isSel(d) ? "#3b82f6" : isTod(d) ? "#eff6ff" : "transparent",
              color: isSel(d) ? "#fff" : isTod(d) ? "#2563eb" : "#374151",
              fontWeight: isSel(d)||isTod(d) ? 700 : 400,
            }}>{d}</button>
          ))}
        </div>
        {/* Today shortcut */}
        <div style={{ textAlign:"center", marginTop:8, borderTop:"1px solid #f3f4f6", paddingTop:6 }}>
          <button type="button" onClick={() => { setVy(today.getFullYear()); setVm(today.getMonth()); select(today.getDate()); }}
            style={{ fontSize:11, color:"#3b82f6", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>
            วันนี้
          </button>
          {val && <button type="button" onClick={() => set("")}
            style={{ fontSize:11, color:"#ef4444", background:"none", border:"none", cursor:"pointer", fontWeight:600, marginLeft:12 }}>
            ล้างค่า
          </button>}
        </div>
      </div>
    </div>
  );
}
const CAL_NAV = { background:"none", border:"1px solid #e5e7eb", borderRadius:6, width:28, height:28, cursor:"pointer", fontSize:18, color:"#374151", lineHeight:1, display:"flex", alignItems:"center", justifyContent:"center", padding:0 };

// ─────────────────────────────────────────────────────────
//  Scroll-Wheel Time Picker
// ─────────────────────────────────────────────────────────
const MINUTES = ["00","15","30","45"];
const HOURS   = Array.from({length:24},(_,i)=>String(i).padStart(2,"0"));

function TimeWheel({ items, val, set, label }) {
  const idx   = items.indexOf(val) === -1 ? 0 : items.indexOf(val);
  const prev  = () => set(items[(idx - 1 + items.length) % items.length]);
  const next  = () => set(items[(idx + 1) % items.length]);
  const onWheel = (e) => { e.preventDefault(); e.deltaY > 0 ? next() : prev(); };
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:0 }}>
      <span style={{ fontSize:10, color:"#9ca3af", marginBottom:4, fontWeight:600 }}>{label}</span>
      <button type="button" onClick={prev} style={WHEEL_BTN}>▲</button>
      <div onWheel={onWheel} style={{ width:52, height:36, display:"flex", alignItems:"center", justifyContent:"center",
        background:"#f3f4f6", borderRadius:8, fontSize:20, fontWeight:700, color:"#111827",
        cursor:"ns-resize", userSelect:"none", border:"1px solid #d1d5db" }}>
        {val}
      </div>
      <button type="button" onClick={next} style={WHEEL_BTN}>▼</button>
    </div>
  );
}
const WHEEL_BTN = { background:"none", border:"none", cursor:"pointer", fontSize:14, color:"#6b7280", padding:"3px 10px", lineHeight:1 };

function TimePicker({ label, val, set }) {
  const [h, setH] = useState(val ? val.split(":")[0] : "09");
  const [m, setM] = useState(val ? val.split(":")[1] : "00");
  useEffect(() => { set(`${h}:${m}`); }, [h, m]);
  useEffect(() => {
    if (val && val.includes(":")) { const [hh,mm] = val.split(":"); setH(hh); setM(mm); }
  }, []);
  return (
    <div>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:6 }}>{label}</label>
      <div style={{ border:"1px solid #d1d5db", borderRadius:10, padding:"10px 16px", background:"#fff",
        display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        <TimeWheel items={HOURS}   val={h} set={setH} label="ชั่วโมง" />
        <span style={{ fontSize:22, fontWeight:700, color:"#374151", marginTop:14 }}>:</span>
        <TimeWheel items={MINUTES} val={m} set={setM} label="นาที" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Time Range Picker (เวลาเริ่ม → เวลาสิ้นสุด)
// ─────────────────────────────────────────────────────────
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function addMinutes(hhmm, mins) {
  const total = (toMinutes(hhmm) + mins + 1440) % 1440;
  return `${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;
}
function diffLabel(from, to) {
  const diff = toMinutes(to) - toMinutes(from);
  if (diff <= 0) return null;
  const h = Math.floor(diff / 60), m = diff % 60;
  if (h > 0 && m > 0) return `${h} ชม. ${m} นาที`;
  if (h > 0) return `${h} ชั่วโมง`;
  return `${m} นาที`;
}

const DURATION_PRESETS = [
  { label: "30 นาที", mins: 30 },
  { label: "1 ชม.",   mins: 60 },
  { label: "1.5 ชม.", mins: 90 },
  { label: "2 ชม.",   mins: 120 },
];

function TimeRangePicker({ valFrom, valTo, setFrom, setTo }) {
  const fh = valFrom?.split(":")[0] || "09";
  const fm = valFrom?.split(":")[1] || "00";
  const th = valTo?.split(":")[0]   || "10";
  const tm = valTo?.split(":")[1]   || "00";

  const setFH = (v) => { const nf = `${v}:${fm}`; setFrom(nf); };
  const setFM = (v) => { const nf = `${fh}:${v}`; setFrom(nf); };
  const setTH = (v) => setTo(`${v}:${tm}`);
  const setTM = (v) => setTo(`${th}:${v}`);

  // เมื่อเปลี่ยน from → auto-shift to ให้ duration เดิม
  const applyPreset = (mins) => {
    const nTo = addMinutes(valFrom || "09:00", mins);
    setTo(nTo);
  };

  const dur = diffLabel(valFrom || "09:00", valTo || "10:00");

  return (
    <div style={{ gridColumn:"1 / -1" }}>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:6 }}>
        ช่วงเวลา *
        {dur && <span style={{ marginLeft:8, fontSize:11, fontWeight:500,
          background:"#eff6ff", color:"#2563eb", padding:"2px 8px", borderRadius:99 }}>⏱ {dur}</span>}
      </label>

      {/* Preset buttons */}
      <div style={{ display:"flex", gap:6, marginBottom:10 }}>
        {DURATION_PRESETS.map(p => (
          <button key={p.label} type="button" onClick={() => applyPreset(p.mins)}
            style={{ fontSize:11, padding:"4px 10px", borderRadius:8, border:"1px solid #d1d5db",
              background: dur === p.label ? "#3b82f6" : "#f9fafb",
              color: dur === p.label ? "#fff" : "#374151",
              cursor:"pointer", fontWeight:600, transition:"all 0.15s" }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Two wheels side by side */}
      <div style={{ border:"1px solid #d1d5db", borderRadius:10, padding:"12px 16px", background:"#fff",
        display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:12 }}>
        {/* เวลาเริ่ม */}
        <div>
          <div style={{ fontSize:10, fontWeight:600, color:"#6b7280", textAlign:"center", marginBottom:6 }}>เวลาเริ่ม</div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <TimeWheel items={HOURS}   val={fh} set={setFH} label="ชม." />
            <span style={{ fontSize:18, fontWeight:700, color:"#374151", marginTop:10 }}>:</span>
            <TimeWheel items={MINUTES} val={fm} set={setFM} label="นาที" />
          </div>
        </div>

        {/* Arrow */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <div style={{ fontSize:18, color:"#9ca3af" }}>→</div>
        </div>

        {/* เวลาสิ้นสุด */}
        <div>
          <div style={{ fontSize:10, fontWeight:600, color:"#6b7280", textAlign:"center", marginBottom:6 }}>เวลาสิ้นสุด</div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <TimeWheel items={HOURS}   val={th} set={setTH} label="ชม." />
            <span style={{ fontSize:18, fontWeight:700, color:"#374151", marginTop:10 }}>:</span>
            <TimeWheel items={MINUTES} val={tm} set={setTM} label="นาที" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Service Dropdown (fetch unique services from slots)
// ─────────────────────────────────────────────────────────
function ServiceSelect({ label, val, set, placeholder, allowCustom = true }) {
  const [opts, setOpts]     = useState([]);
  const [open, setOpen]     = useState(false);
  const [typed, setTyped]   = useState(val || "");
  const ref = useRef(null);

  useEffect(() => {
    api("/api/slots").then(d => {
      const svcs = [...new Set((d.slots || []).map(s => s.service).filter(Boolean))];
      setOpts(svcs);
    }).catch(() => {});
  }, []);

  useEffect(() => { setTyped(val || ""); }, [val]);
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const filtered = opts.filter(o => o.toLowerCase().includes(typed.toLowerCase()));
  const showList = open && (filtered.length > 0);

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:4 }}>{label}</label>
      <div style={{ position:"relative" }}>
        <input value={typed} placeholder={placeholder || "พิมพ์หรือเลือกบริการ"}
          onChange={e => { setTyped(e.target.value); set(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          style={{ width:"100%", padding:"9px 32px 9px 12px", border:"1px solid #d1d5db", borderRadius:8,
            fontSize:13, color:"#111827", background:"#fff", boxSizing:"border-box" }} />
        <button type="button" onClick={() => setOpen(o=>!o)}
          style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
            background:"none", border:"none", cursor:"pointer", color:"#6b7280", fontSize:10, padding:0 }}>
          {open ? "▲" : "▼"}
        </button>
      </div>
      {showList && (
        <div style={{ position:"absolute", top:"calc(100% + 2px)", left:0, right:0, zIndex:50,
          background:"#fff", border:"1px solid #d1d5db", borderRadius:8, boxShadow:"0 6px 20px rgba(0,0,0,0.1)",
          maxHeight:160, overflowY:"auto" }}>
          {filtered.map(o => (
            <button key={o} type="button" onClick={() => { set(o); setTyped(o); setOpen(false); }}
              style={{ width:"100%", textAlign:"left", padding:"9px 12px", background:val===o?"#eff6ff":"#fff",
                border:"none", cursor:"pointer", fontSize:13, color: val===o?"#2563eb":"#111827",
                fontWeight: val===o?600:400 }}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  BOOKINGS / SLOTS PAGE
// ═══════════════════════════════════════════════════════════
export default function BookingsPage({ toast }) {
  const [bookings, setBookings] = useState([]);
  const [slots,    setSlots]    = useState([]);
  const [tab,      setTab]      = useState("bookings");
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [showAddSlot,    setShowAddSlot]    = useState(false);
  const [bkForm, setBkForm] = useState({ name:"", phone:"", service:"", date:"", time:"09:00" });
  const [slForm, setSlForm] = useState({ day:"", time_from:"09:00", time_to:"10:00", service:"ทุกบริการ", max_slots:"1" });

  const loadData = useCallback(() => {
    api("/api/bookings").then(d => setBookings(d.bookings || [])).catch(() => {});
    api("/api/slots").then(d => setSlots(d.slots || [])).catch(() => {});
  }, []);
  useEffect(loadData, [loadData]);

  const updateBooking = async (ri, status) => {
    const res = await api("/api/bookings/"+ri+"/status", { method:"PUT", body:{ status } });
    toast(res.success ? "อัพเดทแล้ว" : "Error", res.success ? "ok" : "err");
    loadData();
  };
  const saveBooking = async () => {
    if (!bkForm.name || !bkForm.service || !bkForm.date) { toast("กรุณากรอกข้อมูลให้ครบ","err"); return; }
    const res = await api("/api/bookings", { method:"POST", body:bkForm });
    toast(res.success ? "สร้างนัดหมายแล้ว ✅" : res.error||"Error", res.success ? "ok" : "err");
    if (res.success) { setShowAddBooking(false); setBkForm({ name:"",phone:"",service:"",date:"",time:"09:00" }); loadData(); }
  };
  const saveSlot = async () => {
    if (!slForm.day || !slForm.time_from) { toast("กรุณากรอกวันและเวลา","err"); return; }
    const payload = { ...slForm, time_slot: `${slForm.time_from}-${slForm.time_to}` };
    const res = await api("/api/slots", { method:"POST", body:payload });
    toast(res.success ? "สร้าง Slot แล้ว ✅" : res.error||"Error", res.success ? "ok" : "err");
    if (res.success) { setShowAddSlot(false); setSlForm({ day:"",time_from:"09:00",time_to:"10:00",service:"ทุกบริการ",max_slots:"1" }); loadData(); }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex flex-col">
          <h1 className="text-base md:text-xl font-black text-slate-900 leading-tight">นัดหมาย / จอง</h1>
          <p className="text-[10px] text-gray-400 leading-none mt-0.5 hidden sm:block">จัดการตารางนัดหมายและการจองคิวบริการของลูกค้า</p>
        </div>
        {tab === "bookings"
          ? <button onClick={() => setShowAddBooking(true)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition">
              <Icon d={Icons.plus} size={14} /> เพิ่มนัดหมาย
            </button>
          : <button onClick={() => setShowAddSlot(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition">
              <Icon d={Icons.plus} size={14} /> เพิ่ม Slot
            </button>
        }
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {["bookings","slots"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={"px-3.5 py-2 rounded-xl text-xs font-bold transition border " + (tab===t ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-slate-600 hover:bg-gray-50")}>
            {t==="bookings" ? "📅 รายการจอง" : "⏰ เวลาทำการ / Slots"}
          </button>
        ))}
      </div>

      {/* Info box */}
      <div style={{ background:"rgba(59,130,246,0.07)", border:"1px solid rgba(59,130,246,0.22)", borderRadius:12, padding:"10px 14px", marginBottom:16 }}>
        <p style={{ fontSize:12, color:"#1e40af", lineHeight:1.6, margin:0 }}>
          💡 <strong>Sync บริการ:</strong> สร้าง Slot ตาม "วัน + เวลา + บริการ" ที่เปิดให้จอง แล้วลูกค้าจองผ่าน LINE Bot ได้อัตโนมัติ
          หรือ Sync จาก Google Sheet ชีต "Slots" ที่มีคอลัมน์: วัน, เวลา, บริการ, จำนวน, สถานะ
        </p>
      </div>

      {/* List */}
      {tab === "bookings" ? (
        <div className="space-y-2">
          {bookings.map(b => (
            <div key={b.rowIndex||b.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-900 text-sm font-semibold">{b.bookingId||b.booking_code||"N/A"}</span>
                <span className={"text-xs px-2 py-0.5 rounded-full "+(b.status?.includes("ยืนยัน")||b.status==="confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{b.status}</span>
              </div>
              <div className="text-gray-500 text-xs">👤 {b.name||b.customer_name} | 🎯 {b.service} | 📆 {b.date||b.appt_date} {b.time||b.appt_time}</div>
              {(b.status==="รอยืนยัน"||b.status==="confirmed") && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => updateBooking(b.rowIndex||b.id,"ยืนยัน")} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg">ยืนยัน</button>
                  <button onClick={() => updateBooking(b.rowIndex||b.id,"ยกเลิก")} className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-lg">ยกเลิก</button>
                </div>
              )}
            </div>
          ))}
          {bookings.length === 0 && <div className="text-gray-400 text-center py-10 text-sm">ไม่มีรายการจอง</div>}
        </div>
      ) : (
        <div className="space-y-2">
          {slots.map(s => (
            <div key={s.rowIndex||s.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-gray-900 text-sm font-medium">{s.day} — {s.time_slot||s.time}</div>
                <div className="text-gray-400 text-xs">{s.service} | จำนวน: {s.max_slots||s.maxSlots||1}</div>
              </div>
              <span className={"text-xs px-2 py-0.5 rounded-full "+(s.status==="open"||!s.status ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600")}>
                {s.status==="open"||!s.status ? "เปิด" : "ปิด"}
              </span>
            </div>
          ))}
          {slots.length === 0 && <div className="text-gray-400 text-center py-10 text-sm">ยังไม่มี Slots</div>}
        </div>
      )}

      {/* ── Modal เพิ่มนัดหมาย ── */}
      {showAddBooking && (
        <Modal title="เพิ่มนัดหมาย" onClose={() => setShowAddBooking(false)} onSave={saveBooking}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="ชื่อลูกค้า *" val={bkForm.name} set={v=>setBkForm({...bkForm,name:v})} />
            <Field label="เบอร์โทร" val={bkForm.phone} set={v=>setBkForm({...bkForm,phone:v})} />
            <div style={{ gridColumn:"1 / -1" }}>
              <ServiceSelect label="บริการ *" val={bkForm.service} set={v=>setBkForm({...bkForm,service:v})} placeholder="เช่น ตัดผม, สปา, นวด" />
            </div>
            <ThaiCalendar label="วันที่ *" val={bkForm.date} set={v=>setBkForm({...bkForm,date:v})} />
            <div style={{ gridColumn:"1 / -1" }}>
              <TimePicker label="เวลา" val={bkForm.time} set={v=>setBkForm({...bkForm,time:v})} />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal เพิ่ม Slot ── */}
      {showAddSlot && (
        <Modal title="เพิ่ม Slot" onClose={() => setShowAddSlot(false)} onSave={saveSlot}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>

            {/* ปฏิทิน */}
            <ThaiCalendar label="วันที่ *" val={slForm.day} set={v=>setSlForm({...slForm,day:v})} />

            {/* Time Range */}
            <TimeRangePicker
              valFrom={slForm.time_from} valTo={slForm.time_to}
              setFrom={v=>setSlForm({...slForm,time_from:v})}
              setTo={v=>setSlForm({...slForm,time_to:v})}
            />

            {/* บริการ + จำนวน */}
            <div style={{ gridColumn:"1 / -1" }}>
              <ServiceSelect label="บริการ" val={slForm.service} set={v=>setSlForm({...slForm,service:v})} placeholder="ทุกบริการ" />
            </div>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:4 }}>จำนวนสูงสุด (คน)</label>
              <div style={{ display:"flex", alignItems:"center", gap:8, border:"1px solid #d1d5db", borderRadius:8, padding:"6px 12px", background:"#fff", width:"fit-content" }}>
                <button type="button" onClick={()=>setSlForm(f=>({...f,max_slots:String(Math.max(1,Number(f.max_slots)-1))}))}
                  style={{ width:28,height:28,borderRadius:6,border:"1px solid #d1d5db",background:"#f3f4f6",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>−</button>
                <span style={{ fontSize:16,fontWeight:700,color:"#111827",minWidth:24,textAlign:"center" }}>{slForm.max_slots}</span>
                <button type="button" onClick={()=>setSlForm(f=>({...f,max_slots:String(Number(f.max_slots)+1)}))}
                  style={{ width:28,height:28,borderRadius:6,border:"1px solid #d1d5db",background:"#f3f4f6",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
              </div>
            </div>

          </div>
        </Modal>
      )}
    </div>
  );
}
