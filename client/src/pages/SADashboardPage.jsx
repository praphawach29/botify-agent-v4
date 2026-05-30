import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  SUPER ADMIN — SA Dashboard
// ═══════════════════════════════════════════════════════════
function SADashboardPage() {
  const [stats, setStats] = useState(null);
  const [shops, setShops] = useState([]);
  const [users, setUsers] = useState([]);
  useEffect(() => {
    api("/api/stats").then(setStats).catch(() => {});
    api("/api/shops").then(r => setShops(r.shops || [])).catch(() => {});
    api("/api/auth/users").then(r => setUsers(r.users || [])).catch(() => {});
  }, []);
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringShops = shops.filter(s => {
    if (!s.expiry_date) return false;
    const exp = new Date(s.expiry_date);
    return exp <= thirtyDaysLater && exp >= now;
  });
  const revenueData = [{
    month: "พ.ย.",
    value: 12500
  }, {
    month: "ธ.ค.",
    value: 18000
  }, {
    month: "ม.ค.",
    value: 15500
  }, {
    month: "ก.พ.",
    value: 22000
  }, {
    month: "มี.ค.",
    value: 28500
  }, {
    month: "เม.ย.",
    value: 31000
  }];
  const maxRevenue = Math.max(...revenueData.map(d => d.value));
  const recentShops = shops.slice(0, 5);
  const cards = [{
    label: "รายได้เดือนนี้",
    value: "฿" + 31000 .toLocaleString(),
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    icon: "💰"
  }, {
    label: "ร้านค้าทั้งหมด",
    value: shops.length,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    icon: "🏪"
  }, {
    label: "ผู้ใช้ในระบบ",
    value: users.length,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.12)",
    icon: "👥"
  }, {
    label: "ร้านใกล้หมดอายุ",
    value: expiringShops.length,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    icon: "⏰"
  }];
  return <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Super Admin Dashboard</h2>
      <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "16px",
      marginBottom: "24px"
    }}>
        {cards.map(c => <div key={c.label} style={{
        background: c.bg,
        border: "1px solid " + c.color + "33",
        borderRadius: "16px",
        padding: "20px"
      }}>
            <div style={{
          fontSize: "24px",
          marginBottom: "4px"
        }}>{c.icon}</div>
            <div style={{
          color: "#6b7280",
          fontSize: "12px",
          marginBottom: "4px"
        }}>{c.label}</div>
            <div style={{
          color: c.color,
          fontSize: "28px",
          fontWeight: "800"
        }}>{c.value ?? 0}</div>
          </div>)}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-gray-900 font-semibold text-sm mb-4">รายได้ 6 เดือนล่าสุด</h3>
          <div style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "12px",
          height: "160px"
        }}>
            {revenueData.map(d => <div key={d.month} style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}>
                <div style={{
              fontSize: "10px",
              color: "#6b7280",
              marginBottom: "4px"
            }}>฿{(d.value / 1000).toFixed(1)}k</div>
                <div style={{
              width: "100%",
              maxWidth: "40px",
              height: Math.max(8, d.value / maxRevenue * 120) + "px",
              background: "linear-gradient(180deg, #3b82f6, #6366f1)",
              borderRadius: "6px 6px 2px 2px",
              transition: "height 0.5s ease"
            }} />
                <div style={{
              fontSize: "11px",
              color: "#6b7280",
              marginTop: "6px"
            }}>{d.month}</div>
              </div>)}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-gray-900 font-semibold text-sm mb-4">ร้านค้าล่าสุดที่ใช้งาน</h3>
          <div className="space-y-2">
            {recentShops.length === 0 ? <div className="text-gray-400 text-sm text-center py-4">ยังไม่มีร้านค้า</div> : recentShops.map(s => <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-200/50 last:border-0">
                <div>
                  <div className="text-gray-900 text-sm">{s.name}</div>
                  <div className="text-gray-400 text-xs">{s.ai_provider || "claude"} | {s.package || "free"}</div>
                </div>
                <span className={"text-xs px-2.5 py-0.5 rounded-full font-bold shadow-sm " + (s.status === "active" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")}>
                  {(s.status || "active").toUpperCase()}
                </span>
              </div>)}
          </div>
        </div>
      </div>

      {expiringShops.length > 0 && <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <h3 className="text-amber-400 text-sm font-semibold mb-2">⏰ ร้านที่ใกล้หมดอายุ (ภายใน 30 วัน)</h3>
          {expiringShops.map(s => <div key={s.id} className="text-gray-700 text-sm">{s.name} — หมดอายุ {s.expiry_date}</div>)}
        </div>}

      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-gray-900 font-semibold text-sm mb-3">📦 สำรองข้อมูลทั้งระบบ (Super Admin Backup)</h3>
        <p className="text-gray-500 text-xs mb-4">ดาวน์โหลดข้อมูลทั้งหมดในระบบ (ร้านค้า, แพ็กเกจ, ผู้ใช้) ในรูปแบบไฟล์ ZIP</p>
        
        <button onClick={() => {
          window.open("/api/backup/admin?token=" + TokenManager.get(), "_blank");
        }} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition inline-flex w-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          ดาวน์โหลด Global Backup (.zip)
        </button>
      </div>
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  SUPER ADMIN — Package Management
// ═══════════════════════════════════════════════════════════
