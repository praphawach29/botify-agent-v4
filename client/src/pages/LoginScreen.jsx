import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  LOGIN SCREEN
// ═══════════════════════════════════════════════════════════
function LoginScreen({
  onLogin
}) {
  const [mode, setMode] = useState("shop");
  const [view, setView] = useState("login"); // "login" | "register" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [key, setKey] = useState("");
  const [regName, setRegName] = useState("");
  const [regShop, setRegShop] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [acceptTos, setAcceptTos] = useState(false);
  const EyeIcon = ({
    show,
    toggle
  }) => <button type="button" onClick={toggle} style={{
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    cursor: "pointer",
    background: "none",
    border: "none",
    padding: "4px",
    color: "#6b7280"
  }}>
      {show ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>}
    </button>;
  const tryLogin = async () => {
    setLoading(true);
    setErr("");
    setSuccessMsg("");
    try {
      let body;
      if (mode === "admin") {
        if (!key.trim()) {
          setErr("กรุณากรอก API Key");
          setLoading(false);
          return;
        }
        body = {
          mode: "admin",
          apiKey: key.trim()
        };
      } else {
        if (!email.trim() || !password) {
          setErr("กรุณากรอก email และ password");
          setLoading(false);
          return;
        }
        body = {
          email: email.trim(),
          password
        };
      }
      const res = await fetch(API_BASE + "/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }).then(r => r.json());
      if (res.success && res.access_token) {
        sessionStorage.setItem("botify_token", res.access_token);
        sessionStorage.setItem("botify_refresh_token", res.refresh_token || "");
        sessionStorage.setItem("botify_expires_at", String(res.expires_at || 0));
        sessionStorage.setItem("botify_role", res.role);
        sessionStorage.setItem("botify_display", res.displayName || "");
        sessionStorage.setItem("botify_shop_id", res.shopId || "");
        sessionStorage.setItem("botify_shop_name", res.shopName || "");
        sessionStorage.setItem("botify_email", email.trim());
        TokenManager.startAutoRefresh();
        onLogin();
      } else if (res.success && res.mode === "apikey") {
        sessionStorage.setItem("botify_key", key.trim());
        sessionStorage.setItem("botify_role", "superadmin");
        sessionStorage.setItem("botify_display", "Super Admin");
        onLogin();
      } else {
        setErr(res.error || "เข้าสู่ระบบไม่สำเร็จ");
      }
    } catch (e) {
      setErr("เชื่อมต่อ Server ไม่ได้");
    }
    setLoading(false);
  };
  const tryRegister = async () => {
    setLoading(true);
    setErr("");
    setSuccessMsg("");
    try {
      if (!acceptTos) {
        setErr("กรุณายอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว");
        setLoading(false);
        return;
      }
      if (!email.trim() || !password || !regShop.trim()) {
        setErr("กรุณากรอก email, password และชื่อร้าน");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setErr("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
        setLoading(false);
        return;
      }
      const res = await fetch(API_BASE + "/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          displayName: regName.trim() || email.trim(),
          shopName: regShop.trim(),
          phone: regPhone.trim()
        })
      }).then(r => r.json());
      if (res.success) {
        setSuccessMsg("สมัครสำเร็จ! กำลังเข้าสู่ระบบ...");
        // Auto-login after register
        setTimeout(async () => {
          const loginRes = await fetch(API_BASE + "/api/auth/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              email: email.trim(),
              password
            })
          }).then(r => r.json());
          if (loginRes.success && loginRes.access_token) {
            sessionStorage.setItem("botify_token", loginRes.access_token);
            sessionStorage.setItem("botify_refresh_token", loginRes.refresh_token || "");
            sessionStorage.setItem("botify_expires_at", String(loginRes.expires_at || 0));
            sessionStorage.setItem("botify_role", loginRes.role);
            sessionStorage.setItem("botify_display", loginRes.displayName || "");
            sessionStorage.setItem("botify_shop_id", loginRes.shopId || "");
            sessionStorage.setItem("botify_shop_name", loginRes.shopName || "");
            sessionStorage.setItem("botify_email", email.trim());
            TokenManager.startAutoRefresh();
            onLogin();
          } else {
            setView("login");
            setSuccessMsg("สมัครสำเร็จ! กรุณาเข้าสู่ระบบ");
          }
          setLoading(false);
        }, 500);
        return;
      } else {
        setErr(res.error || "สมัครไม่สำเร็จ");
      }
    } catch (e) {
      setErr("เชื่อมต่อ Server ไม่ได้");
    }
    setLoading(false);
  };
  return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl font-black tracking-wider text-gray-900 mb-1">BOT<span className="text-amber-400">IFY</span></div>
          <div className="text-gray-500 text-sm">{view === "register" ? "สมัครสมาชิก" : view === "forgot" ? "ลืมรหัสผ่าน" : "Admin Dashboard"}</div>
        </div>
        <div className="bg-white backdrop-blur border border-gray-200 rounded-2xl p-6">

          {view === "forgot" ? <>
              <p className="text-gray-500 text-xs mb-4">กรอกอีเมลที่ใช้สมัคร แล้วเราจะส่งลิงก์รีเซ็ตรหัสผ่านให้</p>
              <label className="block text-gray-500 text-xs mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => {
            if (e.key === "Enter") {
              setLoading(true);
              setErr("");
              setSuccessMsg("");
              fetch(API_BASE + "/api/auth/forgot-password", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  email: email.trim()
                })
              }).then(r => r.json()).then(r => {
                if (r.success) setSuccessMsg(r.message);else setErr(r.error || "เกิดข้อผิดพลาด");
              }).catch(() => setErr("เชื่อมต่อ Server ไม่ได้")).finally(() => setLoading(false));
            }
          }} placeholder="อีเมลของคุณ" autoComplete="email" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-blue-500 transition mb-4" />
              {err && <div className="text-red-400 text-xs mb-3">{err}</div>}
              {successMsg && <div className="text-emerald-400 text-xs mb-3">{successMsg}</div>}
              <button onClick={() => {
            setLoading(true);
            setErr("");
            setSuccessMsg("");
            fetch(API_BASE + "/api/auth/forgot-password", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                email: email.trim()
              })
            }).then(r => r.json()).then(r => {
              if (r.success) setSuccessMsg(r.message);else setErr(r.error || "เกิดข้อผิดพลาด");
            }).catch(() => setErr("เชื่อมต่อ Server ไม่ได้")).finally(() => setLoading(false));
          }} disabled={loading || !email.trim()} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition mb-3">
                {loading ? "กำลังส่ง..." : "📧 ส่งลิงก์รีเซ็ตรหัสผ่าน"}
              </button>
              <div className="text-center">
                <button onClick={() => {
              setView("login");
              setErr("");
              setSuccessMsg("");
            }} className="text-gray-500 hover:text-blue-400 text-xs transition">
                  ← กลับหน้า Login
                </button>
              </div>
            </> : view === "register" ? <>
              <label className="block text-gray-500 text-xs mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="อีเมลของคุณ" autoComplete="email" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-emerald-500 transition mb-3" />
              <label className="block text-gray-500 text-xs mb-1">Password</label>
              <div className="relative mb-3">
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)" autoComplete="new-password" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 pr-11 text-gray-900 text-sm outline-none focus:border-emerald-500 transition" />
                <EyeIcon show={showPw} toggle={() => setShowPw(!showPw)} />
              </div>
              <label className="block text-gray-500 text-xs mb-1">ชื่อที่แสดง</label>
              <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="ชื่อของคุณ (ไม่บังคับ)" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-emerald-500 transition mb-3" />
              <label className="block text-gray-500 text-xs mb-1">ชื่อร้านค้า <span className="text-red-400">*</span></label>
              <input type="text" value={regShop} onChange={e => setRegShop(e.target.value)} placeholder="ชื่อร้านค้าของคุณ" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-emerald-500 transition mb-3" />
              <label className="block text-gray-500 text-xs mb-1">เบอร์โทร</label>
              <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} onKeyDown={e => e.key === "Enter" && tryRegister()} placeholder="เบอร์โทร (ไม่บังคับ)" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-emerald-500 transition mb-3" />

              <label className="flex items-start gap-2 mb-4 cursor-pointer">
                <input type="checkbox" checked={acceptTos} onChange={e => setAcceptTos(e.target.checked)} className="mt-0.5 accent-emerald-500" style={{
              width: "16px",
              height: "16px",
              flexShrink: 0
            }} />
                <span className="text-gray-500 text-xs leading-relaxed">
                  ฉันยอมรับ <a href="/terms" target="_blank" className="text-emerald-400 hover:text-emerald-300 underline">ข้อกำหนดการใช้งาน</a> และ <a href="/privacy" target="_blank" className="text-emerald-400 hover:text-emerald-300 underline">นโยบายความเป็นส่วนตัว (PDPA)</a>
                </span>
              </label>

              {err && <div className="text-red-400 text-xs mb-3">{err}</div>}
              {successMsg && <div className="text-emerald-400 text-xs mb-3">{successMsg}</div>}
              <button onClick={tryRegister} disabled={loading || !acceptTos} className={"w-full font-bold py-3 rounded-xl transition mb-3 " + (acceptTos ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-gray-100 text-slate-500 cursor-not-allowed")} style={{
            opacity: loading ? 0.5 : undefined
          }}>
                {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
              </button>
              <div className="text-center">
                <button onClick={() => {
              setView("login");
              setErr("");
              setSuccessMsg("");
              setAcceptTos(false);
            }} className="text-gray-500 hover:text-blue-400 text-xs transition">
                  มีบัญชีแล้ว? เข้าสู่ระบบ
                </button>
              </div>
            </> : <>
              <div className="flex gap-2 mb-5">
                <button onClick={() => setMode("shop")} className={"flex-1 py-2 rounded-lg text-xs font-semibold transition border " + (mode === "shop" ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-gray-50 border-gray-300 text-slate-500")}>
                  🏪 เจ้าของร้าน
                </button>
                <button onClick={() => setMode("admin")} className={"flex-1 py-2 rounded-lg text-xs font-semibold transition border " + (mode === "admin" ? "bg-violet-600/30 border-violet-500 text-violet-300" : "bg-gray-50 border-gray-300 text-slate-500")}>
                  👑 Super Admin
                </button>
              </div>

              {mode === "shop" ? <>
                  <label className="block text-gray-500 text-xs mb-1">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="อีเมล" autoComplete="email" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-blue-500 transition mb-3" />
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-gray-500 text-xs">Password</label>
                    <button type="button" onClick={() => {
                setView("forgot");
                setErr("");
                setSuccessMsg("");
              }} className="text-blue-400 hover:text-blue-300 text-xs transition" style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0
              }}>
                      ลืมรหัสผ่าน?
                    </button>
                  </div>
                  <div className="relative mb-4">
                    <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && tryLogin()} placeholder="รหัสผ่าน" autoComplete="current-password" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 pr-11 text-gray-900 text-sm outline-none focus:border-blue-500 transition" />
                    <EyeIcon show={showPw} toggle={() => setShowPw(!showPw)} />
                  </div>
                </> : <>
                  <label className="block text-gray-500 text-xs mb-1">Admin API Key</label>
                  <div className="relative mb-4">
                    <input type={showKey ? "text" : "password"} value={key} onChange={e => setKey(e.target.value)} onKeyDown={e => e.key === "Enter" && tryLogin()} placeholder="ใส่ ADMIN_API_KEY จากไฟล์ .env" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 pr-11 text-gray-900 text-sm outline-none focus:border-blue-500 transition" />
                    <EyeIcon show={showKey} toggle={() => setShowKey(!showKey)} />
                  </div>
                </>}

              {err && <div className="text-red-400 text-xs mb-3">{err}</div>}
              {successMsg && <div className="text-emerald-400 text-xs mb-3">{successMsg}</div>}
              <button onClick={tryLogin} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition">
                {loading ? "กำลังเข้าสู่ระบบ..." : "🔐 เข้าสู่ระบบ"}
              </button>
              {mode === "shop" && <div className="text-center mt-3">
                  <button onClick={() => {
              setView("register");
              setErr("");
              setSuccessMsg("");
            }} className="text-gray-500 hover:text-emerald-400 text-xs transition">
                    ยังไม่มีบัญชี? สมัครสมาชิก
                  </button>
                </div>}
            </>}
        </div>
        <div className="text-center mt-4" style={{
        fontSize: "11px",
        color: "#64748b"
      }}>
          <a href="/terms" target="_blank" style={{
          color: "#6b7280",
          textDecoration: "none"
        }} onMouseOver={e => e.target.style.color = "#e2e8f0"} onMouseOut={e => e.target.style.color = "#94a3b8"}>ข้อกำหนดการใช้งาน</a>
          <span style={{
          margin: "0 8px"
        }}>•</span>
          <a href="/privacy" target="_blank" style={{
          color: "#6b7280",
          textDecoration: "none"
        }} onMouseOver={e => e.target.style.color = "#e2e8f0"} onMouseOut={e => e.target.style.color = "#94a3b8"}>นโยบายความเป็นส่วนตัว</a>
        </div>
      </div>
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  STATS PAGE — Full Analytics Dashboard
// ═══════════════════════════════════════════════════════════
//  STATS PAGE — Clean Professional Dashboard
// ═══════════════════════════════════════════════════════════

// ── Smooth Bezier Area Chart (ภาษาไทย) ──
