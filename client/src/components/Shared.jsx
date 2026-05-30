import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const API_BASE = "";

export // ── Icons (Lucide-style SVG inline) ─────────────────────
const Icon = ({
  d,
  size = 20
}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;

export const Icons = {
  home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  box: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  cart: "M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6",
  settings: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z M12 8v4l3 3",
  tag: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z",
  bot: "M12 2a2 2 0 0 1 2 2v1h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3V4a2 2 0 0 1 2-2z M9 12h0 M15 12h0 M12 2v2",
  calendar: "M16 2v4 M8 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  save: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z M17 21v-8H7v8 M7 3v5h8",
  plus: "M12 5v14 M5 12h14",
  trash: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18 M6 6l12 12",
  refresh: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  search: "M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M21 21l-4.35-4.35",
  brain: "M12 2a7 7 0 0 0-7 7c0 3 2 5.5 5 7v4h4v-4c3-1.5 5-4 5-7a7 7 0 0 0-7-7z",
  bell: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  chat: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  creditCard: "M1 4h22v16H1z M1 10h22",
  fileText: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 3v5h5 M16 13H8 M16 17H8 M10 9H8",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  send: "M22 2L11 13 M22 2l-7 20-4-9-9-4z"
};

// ── Utility ─────────────────────────────────────────────
// ── Token Refresh Manager ──────────────────────────────────

export // ── Utility ─────────────────────────────────────────────
// ── Token Refresh Manager ──────────────────────────────────
const TokenManager = {
  _refreshTimer: null,
  _isRefreshing: false,
  _refreshPromise: null,
  // เริ่ม auto-refresh timer
  startAutoRefresh() {
    this.stopAutoRefresh();
    const expiresAt = Number(sessionStorage.getItem("botify_expires_at") || 0);
    if (!expiresAt) return;
    // refresh 5 นาทีก่อนหมดอายุ
    const refreshAt = expiresAt * 1000 - Date.now() - 5 * 60 * 1000;
    if (refreshAt <= 0) {
      // token ใกล้หมดแล้ว → refresh ทันที
      this.refresh();
    } else {
      this._refreshTimer = setTimeout(() => this.refresh(), refreshAt);
    }
  },
  stopAutoRefresh() {
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
    }
  },
  // Refresh token
  async refresh() {
    // ป้องกันเรียกซ้ำพร้อมกัน
    if (this._isRefreshing) return this._refreshPromise;
    const refreshToken = sessionStorage.getItem("botify_refresh_token");
    if (!refreshToken) return null;
    this._isRefreshing = true;
    this._refreshPromise = fetch(API_BASE + "/api/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        refresh_token: refreshToken
      })
    }).then(r => r.json()).then(res => {
      if (res.success && res.access_token) {
        sessionStorage.setItem("botify_token", res.access_token);
        sessionStorage.setItem("botify_refresh_token", res.refresh_token);
        sessionStorage.setItem("botify_expires_at", String(res.expires_at));
        sessionStorage.setItem("botify_role", res.role);
        if (res.displayName) sessionStorage.setItem("botify_display", res.displayName);
        if (res.shopId) sessionStorage.setItem("botify_shop_id", res.shopId);
        if (res.shopName) sessionStorage.setItem("botify_shop_name", res.shopName);
        this.startAutoRefresh(); // ตั้ง timer ใหม่
        return res;
      }
      return null; // refresh ไม่สำเร็จ
    }).catch(() => null).finally(() => {
      this._isRefreshing = false;
      this._refreshPromise = null;
    });
    return this._refreshPromise;
  }
};

export function api(path, opts = {}) {
  const token = sessionStorage.getItem("botify_token") || "";
  const key = sessionStorage.getItem("botify_key") || "";
  const authHeader = token ? {
    Authorization: "Bearer " + token
  } : key ? {
    "x-api-key": key
  } : {};
  return fetch(API_BASE + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...opts.headers
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  }).then(async r => {
    if (r.status === 401 && token) {
      // Token หมดอายุ → ลอง refresh ก่อน
      const refreshed = await TokenManager.refresh();
      if (refreshed) {
        // Retry request ด้วย token ใหม่
        const newToken = sessionStorage.getItem("botify_token");
        return fetch(API_BASE + path, {
          ...opts,
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + newToken,
            ...opts.headers
          },
          body: opts.body ? JSON.stringify(opts.body) : undefined
        }).then(r2 => {
          if (r2.status === 401) {
            sessionStorage.clear();
            TokenManager.stopAutoRefresh();
            window.location.reload();
          }
          return r2.json();
        });
      }
      // Refresh ไม่ได้ → logout
      sessionStorage.clear();
      TokenManager.stopAutoRefresh();
      window.location.reload();
    }
    return r.json();
  });
}

export function Toast({
  msg,
  type,
  onClose
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return <div className={"fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all " + (type === "ok" ? "bg-emerald-600" : "bg-red-500")}>
      {msg}
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  LOGIN SCREEN
// ═══════════════════════════════════════════════════════════

export const Field = ({
  label,
  ph,
  value,
  val,
  onChange,
  set,
  type,
  datalist
}) => {
  const actualValue = value !== undefined ? value : val || "";
  const actualOnChange = onChange || set || (() => {});
  const id = React.useId();
  
  return (
    <div className="mb-3">
      <label className="block text-gray-500 text-xs mb-1">{label}</label>
      {type === "textarea" ? (
        <textarea 
          value={actualValue} 
          onChange={e => actualOnChange(e.target.value)} 
          placeholder={ph} 
          className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none" 
          rows={3} 
        />
      ) : (
        <>
          <input 
            value={actualValue} 
            onChange={e => actualOnChange(e.target.value)} 
            placeholder={ph} 
            list={datalist ? id : undefined}
            className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-slate-500 focus:outline-none focus:border-blue-500" 
          />
          {datalist && (
            <datalist id={id}>
              {datalist.map((item, idx) => (
                <option key={idx} value={item} />
              ))}
            </datalist>
          )}
        </>
      )}
    </div>
  );
};

export // ═══════════════════════════════════════════════════════════
//  SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════
function Loader() {
  return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
}

export function DropdownSelect({
  value,
  onChange,
  options,
  placeholder,
  className
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  useEffect(() => {
    if (!open) return;
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);
  const selected = options.find(o => (typeof o === "object" ? o.value : o) === value);
  const displayLabel = selected ? typeof selected === "object" ? selected.label : selected : placeholder || "-- เลือก --";
  return <div ref={ref} className={"relative " + (className || "")}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition flex items-center justify-between text-left" style={{
      color: selected ? "#111827" : "#64748b"
    }}>
        <span className="truncate">{displayLabel}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={"transition-transform " + (open ? "rotate-180" : "")}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && <div className="mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50" style={{
      position: "relative"
    }}>
          {options.map((opt, i) => {
        const optVal = typeof opt === "object" ? opt.value : opt;
        const optLabel = typeof opt === "object" ? opt.label : opt;
        const isSelected = optVal === value;
        return <button key={i} type="button" onClick={() => {
          onChange(optVal);
          setOpen(false);
        }} className={"w-full text-left px-3 py-2.5 text-sm transition truncate font-medium " + (isSelected ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100/60 active:bg-gray-200")}>
                {optLabel}
              </button>;
      })}
        </div>}
    </div>;
}

export function Modal({
  title,
  children,
  onClose,
  onSave
}) {
  return <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div className="bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900 text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900"><Icon d={Icons.x} size={20} /></button>
        </div>
        {children}
        <div className="flex justify-end gap-2 mt-5 pb-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition">ยกเลิก</button>
          <button onClick={onSave} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition">บันทึก</button>
        </div>
      </div>
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  SHOP MANAGEMENT (Super Admin — สร้าง/จัดการร้านค้า)
// ═══════════════════════════════════════════════════════════

