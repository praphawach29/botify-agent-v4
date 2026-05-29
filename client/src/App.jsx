import LoginScreen from './pages/LoginScreen';
import SmoothAreaChart from './pages/SmoothAreaChart';
import StatsPage from './pages/StatsPage';
import ShopSettings from './pages/ShopSettings';
import BotConfig from './pages/BotConfig';
import PromotionsPage from './pages/PromotionsPage';
import BookingsPage from './pages/BookingsPage';
import ChannelSettingsPage from './pages/ChannelSettingsPage';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import ChatHistoryPage from './pages/ChatHistoryPage';
import ShopManagementPage from './pages/ShopManagementPage';
import SADashboardPage from './pages/SADashboardPage';
import PackageManagementPage from './pages/PackageManagementPage';
import AIKeyInput from './pages/AIKeyInput';
import AIManagementPage from './pages/AIManagementPage';
import BillingPage from './pages/BillingPage';
import BroadcastPage from './pages/BroadcastPage';
import ActivityLogPage from './pages/ActivityLogPage';
import OnboardingWizard from './pages/OnboardingWizard';
import UserManagementPage from './pages/UserManagementPage';
import ShopPicker from './pages/ShopPicker';
import PaymentPage from './pages/PaymentPage';
import SAPaymentPage from './pages/SAPaymentPage';
import CustomerManagementPage from './pages/CustomerManagementPage';
import DocumentPreview from './pages/DocumentPreview';
import DocumentsPage from './pages/DocumentsPage';

import { Icon, Icons, TokenManager, api, Toast, Field, Loader, DropdownSelect, Modal } from './components/Shared';
import ProductsPage from './pages/ProductsPage';
import OrdersPage from './pages/OrdersPage';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ═══════════════════════════════════════════════════════════
//  BOTIFY Admin Dashboard — React SPA
//  ฟีเจอร์ครบ: Login, Stats, Shop Settings, Products,
//  Orders, Promotions, Bot Config, AI Provider, Bookings
// ═══════════════════════════════════════════════════════════

const API_BASE = "";

// ── Icons (Lucide-style SVG inline) ─────────────────────

// ── Utility ─────────────────────────────────────────────
// ── Token Refresh Manager ──────────────────────────────────

function getAuth() {
  try {
    return {
      role: sessionStorage.getItem("botify_role") || "shop_owner",
      displayName: sessionStorage.getItem("botify_display") || "",
      shopId: sessionStorage.getItem("botify_shop_id") || null,
      shopName: sessionStorage.getItem("botify_shop_name") || "",
      email: sessionStorage.getItem("botify_email") || "",
      username: sessionStorage.getItem("botify_display") || sessionStorage.getItem("botify_email") || ""
    };
  } catch (e) {
    return {
      role: "shop_owner"
    };
  }
}
// ═══════════════════════════════════════════════════════════
//  LOGIN SCREEN
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  STATS PAGE — Full Analytics Dashboard
// ═══════════════════════════════════════════════════════════
//  STATS PAGE — Clean Professional Dashboard
// ═══════════════════════════════════════════════════════════

// ── Smooth Bezier Area Chart (ภาษาไทย) ──

// ═══════════════════════════════════════════════════════════
//  SHOP SETTINGS
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  BOT PERSONALITY CONFIG
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  PRODUCTS CRUD
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  ORDERS PAGE
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  PROMOTIONS PAGE
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  BOOKINGS / SLOTS PAGE
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  🔌 CHANNEL SETTINGS — เชื่อมต่อ LINE / Facebook / Google Sheet
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  🔔 NOTIFICATION SETTINGS — ตั้งค่าแจ้งเตือน LINE
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  💬 CHAT HISTORY — ประวัติแชทลูกค้า
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  SHOP MANAGEMENT (Super Admin — สร้าง/จัดการร้านค้า)
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  SUPER ADMIN — SA Dashboard
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  SUPER ADMIN — Package Management
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  SUPER ADMIN — AI Management Page
// ═══════════════════════════════════════════════════════════
const AI_PROVIDERS = [{
  id: "claude",
  name: "Claude (Anthropic)",
  color: "from-orange-500 to-amber-600",
  border: "border-orange-500",
  icon: "M12 2a7 7 0 0 0-7 7c0 3 2 5.5 5 7v4h4v-4c3-1.5 5-4 5-7a7 7 0 0 0-7-7z",
  models: [{
    value: "claude-sonnet-4-20250514",
    label: "Claude Sonnet 4",
    desc: "เร็ว คุ้มค่า เหมาะกับงานทั่วไป",
    badge: "แนะนำ"
  }, {
    value: "claude-opus-4-20250514",
    label: "Claude Opus 4",
    desc: "ฉลาดที่สุด เหมาะกับงานซับซ้อน",
    badge: "Premium"
  }, {
    value: "claude-haiku-4-5-20251001",
    label: "Claude Haiku 4.5",
    desc: "เร็วมาก ประหยัดที่สุด",
    badge: "ประหยัด"
  }]
}, {
  id: "openai",
  name: "OpenAI",
  color: "from-emerald-500 to-teal-600",
  border: "border-emerald-500",
  icon: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z M12 8v4l3 3",
  models: [{
    value: "gpt-4o",
    label: "GPT-4o",
    desc: "Multimodal ครบทุกด้าน",
    badge: "แนะนำ"
  }, {
    value: "gpt-4o-mini",
    label: "GPT-4o Mini",
    desc: "เร็ว ราคาถูก เหมาะร้านทั่วไป",
    badge: "ประหยัด"
  }, {
    value: "gpt-4-turbo",
    label: "GPT-4 Turbo",
    desc: "แม่นยำสูง context ยาว"
  }]
}, {
  id: "gemini",
  name: "Gemini (Google)",
  color: "from-blue-500 to-indigo-600",
  border: "border-blue-500",
  icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  models: [{
    value: "gemini-1.5-flash",
    label: "Gemini 1.5 Flash",
    desc: "เร็ว ฟรี tier สูง",
    badge: "แนะนำ"
  }, {
    value: "gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    desc: "Context ยาว 1M tokens"
  }, {
    value: "gemini-1.0-pro",
    label: "Gemini 1.0 Pro",
    desc: "เร็ว ราคาถูก",
    badge: "ประหยัด"
  }]
}, {
  id: "typhoon",
  name: "Typhoon (SCB 10X)",
  color: "from-violet-500 to-purple-600",
  border: "border-violet-500",
  icon: "M12 2a2 2 0 0 1 2 2v1h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3V4a2 2 0 0 1 2-2z M9 12h0 M15 12h0 M12 2v2",
  models: [{
    value: "typhoon-v2-70b-instruct",
    label: "Typhoon v2 70B",
    desc: "เก่งภาษาไทยที่สุด",
    badge: "แนะนำ"
  }, {
    value: "typhoon-v2-8b-instruct",
    label: "Typhoon v2 8B",
    desc: "เบา เร็ว เหมาะงานง่าย",
    badge: "ประหยัด"
  }]
}];

// ═══════════════════════════════════════════════════════════
//  SUPER ADMIN — Billing & Payment Page
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  SUPER ADMIN — Broadcast Page
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  SUPER ADMIN — Activity Log Page
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  ONBOARDING WIZARD — นำทางร้านค้าใหม่ตั้งค่าระบบ
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  PAGE LISTS
// ═══════════════════════════════════════════════════════════
const BASE_PAGES = [{
  id: "stats",
  label: "Dashboard",
  shortLabel: "หน้าหลัก",
  icon: Icons.home
}, {
  id: "shop",
  label: "ข้อมูลร้าน",
  shortLabel: "ร้านค้า",
  icon: Icons.settings
}, {
  id: "bot",
  label: "ตั้งค่า Bot",
  shortLabel: "Bot",
  icon: Icons.bot
}, {
  id: "products",
  label: "สินค้า",
  shortLabel: "สินค้า",
  icon: Icons.box
}, {
  id: "orders",
  label: "ออเดอร์",
  shortLabel: "ออเดอร์",
  icon: Icons.cart
}, {
  id: "promos",
  label: "โปรโมชั่น",
  shortLabel: "โปรฯ",
  icon: Icons.tag
}, {
  id: "bookings",
  label: "นัดหมาย",
  shortLabel: "นัด",
  icon: Icons.calendar
}, {
  id: "channels",
  label: "เชื่อมต่อ",
  shortLabel: "ช่อง",
  icon: Icons.link
}, {
  id: "notifications",
  label: "แจ้งเตือน",
  shortLabel: "แจ้ง",
  icon: Icons.bell
}, {
  id: "chats",
  label: "ประวัติแชท",
  shortLabel: "แชท",
  icon: Icons.chat
}, {
  id: "payment",
  label: "ชำระเงิน",
  shortLabel: "จ่าย",
  icon: Icons.creditCard
}];
const SA_PAGES = [{
  id: "sa_dashboard",
  label: "Dashboard",
  shortLabel: "หน้าหลัก",
  icon: Icons.home
}, {
  id: "shops",
  label: "จัดการร้านค้า",
  shortLabel: "ร้านค้า",
  icon: Icons.box
}, {
  id: "users",
  label: "จัดการผู้ใช้",
  shortLabel: "Users",
  icon: Icons.settings
}, {
  id: "ai_management",
  label: "จัดการ AI",
  shortLabel: "AI",
  icon: Icons.brain
}, {
  id: "packages",
  label: "แพ็กเกจ",
  shortLabel: "แพ็ก",
  icon: Icons.tag
}, {
  id: "billing",
  label: "การเงิน",
  shortLabel: "การเงิน",
  icon: Icons.cart
}, {
  id: "sa_payments",
  label: "Payment Gateway",
  shortLabel: "Pay",
  icon: Icons.creditCard
}, {
  id: "broadcast",
  label: "แจ้งเตือน",
  shortLabel: "Broad",
  icon: Icons.bot
}, {
  id: "logs",
  label: "Log กิจกรรม",
  shortLabel: "Log",
  icon: Icons.search
}];

// ═══════════════════════════════════════════════════════════
//  USER MANAGEMENT (Super Admin only)
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  SHOP PICKER (Super Admin — switch between shops)
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  PAYMENT PAGE (Shop Owner — เลือกแพ็กเกจ + ชำระเงิน)
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  SA PAYMENT PAGE (Super Admin — ดู/จัดการ payment ทั้งหมด)
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  Customer Management
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  DocumentPreview Component
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  DocumentsPage Component
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════
function App() {
  const [loggedIn, setLoggedIn] = useState(() => !!(sessionStorage.getItem("botify_token") || sessionStorage.getItem("botify_key")));
  const [page, setPage] = useState(() => getAuth().role === "superadmin" ? "sa_dashboard" : "stats");
  const [toastData, setToastData] = useState(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [currentShop, setCurrentShop] = useState("all");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const auth = getAuth();
  const isSuperAdmin = auth.role === "superadmin";
  const [emailVerified, setEmailVerified] = useState(true);
  const [sendingVerify, setSendingVerify] = useState(false);
  const PAGES = isSuperAdmin ? SA_PAGES : BASE_PAGES;

  // เช็ค email verification status
  useEffect(() => {
    if (loggedIn && !isSuperAdmin) {
      api("/api/auth/email-status").then(r => {
        if (r.success && r.verified === false) setEmailVerified(false);
      }).catch(() => {});
    }
  }, [loggedIn]);

  // เช็ค onboarding status เมื่อ login
  // ⚠️ ปิดชั่วคราว — เปิดใช้ได้เมื่อต้องการทดสอบ onboarding flow
  useEffect(() => {
    setOnboardingChecked(true);
    // if (loggedIn && !isSuperAdmin && !onboardingChecked) {
    //   api("/api/onboarding").then(res => {
    //     if (!res.completed) setShowOnboarding(true);
    //     setOnboardingChecked(true);
    //   }).catch(() => setOnboardingChecked(true));
    // } else {
    //   setOnboardingChecked(true);
    // }
  }, [loggedIn]);

  // เริ่ม auto-refresh เมื่อเปิดหน้า + resume เมื่อกลับมาจาก tab อื่น
  useEffect(() => {
    if (loggedIn && sessionStorage.getItem("botify_token")) {
      TokenManager.startAutoRefresh();
      // เมื่อกลับมาจาก tab อื่น ให้เช็ค token
      const onVisibility = () => {
        if (document.visibilityState === "visible" && sessionStorage.getItem("botify_token")) {
          const expiresAt = Number(sessionStorage.getItem("botify_expires_at") || 0);
          const now = Math.floor(Date.now() / 1000);
          if (expiresAt && now > expiresAt - 60) {
            // token ใกล้หมดหรือหมดแล้ว → refresh ทันที
            TokenManager.refresh().then(res => {
              if (!res) {
                sessionStorage.clear();
                setLoggedIn(false);
              }
            });
          }
        }
      };
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        document.removeEventListener("visibilitychange", onVisibility);
        TokenManager.stopAutoRefresh();
      };
    }
  }, [loggedIn]);
  const toast = (msg, type) => setToastData({
    msg,
    type
  });
  const logout = () => {
    TokenManager.stopAutoRefresh();
    api("/api/auth/logout", {
      method: "POST"
    }).catch(() => {});
    sessionStorage.clear();
    setLoggedIn(false);
  };
  if (!loggedIn) return <LoginScreen onLogin={() => setLoggedIn(true)} />;
  if (showOnboarding) return <OnboardingWizard onComplete={() => setShowOnboarding(false)} />;
  const renderPage = () => {
    if (isSuperAdmin) {
      switch (page) {
        case "sa_dashboard":
          return <SADashboardPage />;
        case "shops":
          return <ShopManagementPage toast={toast} />;
        case "users":
          return <UserManagementPage toast={toast} />;
        case "ai_management":
          return <AIManagementPage toast={toast} />;
        case "packages":
          return <PackageManagementPage toast={toast} />;
        case "billing":
          return <BillingPage toast={toast} />;
        case "sa_payments":
          return <SAPaymentPage toast={toast} />;
        case "broadcast":
          return <BroadcastPage toast={toast} />;
        case "logs":
          return <ActivityLogPage />;
        default:
          return <SADashboardPage />;
      }
    }
    switch (page) {
      case "stats":
        return <StatsPage onNavigate={setPage} />;
      case "shop":
        return <ShopSettings toast={toast} />;
      case "bot":
        return <BotConfig toast={toast} />;
      case "products":
        return <ProductsPage toast={toast} />;
      case "documents":
        return <DocumentsPage toast={toast} />;
      case "customers":
        return <CustomerManagementPage toast={toast} />;
      case "orders":
        return <OrdersPage toast={toast} />;
      case "promos":
        return <PromotionsPage toast={toast} />;
      case "bookings":
        return <BookingsPage toast={toast} />;
      case "channels":
        return <ChannelSettingsPage toast={toast} />;
      case "notifications":
        return <NotificationSettingsPage toast={toast} />;
      case "chats":
        return <ChatHistoryPage toast={toast} />;
      case "payment":
        return <PaymentPage toast={toast} />;
      default:
        return <StatsPage onNavigate={setPage} />;
    }
  };
  return <div style={{
    height: "100vh",
    background: "#f3f4f6",
    display: "flex",
    overflow: "hidden"
  }}>
      {toastData && <Toast msg={toastData.msg} type={toastData.type} onClose={() => setToastData(null)} />}

      {/* Mobile overlay */}
      {sideOpen && <div className="lg:hidden fixed inset-0 bg-black/60 z-30" onClick={() => setSideOpen(false)} />}

      {/* ── Clean Light Sidebar (reference style) ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        .lsb { width: 220px; min-width: 220px; background: #fff; border-right: 1px solid #e5e7eb;
               display: flex; flex-direction: column; font-family: 'Inter', sans-serif; height: 100vh; }
        .lsb-logo { padding: 20px 20px 16px; border-bottom: 1px solid #f3f4f6;
                    font-size: 18px; font-weight: 900; color: #111827; letter-spacing: -0.5px; flex-shrink: 0; }
        .lsb-logo span { color: #f59e0b; }
        .lsb-nav { flex: 1; padding: 12px 12px 8px; overflow-y: auto; min-height: 0; }
        .lsb-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px;
                   border: none; background: transparent; border-radius: 8px; cursor: pointer;
                   font-size: 13.5px; font-weight: 500; color: #6b7280; transition: all 0.15s;
                   text-align: left; font-family: 'Inter', sans-serif; }
        .lsb-btn:hover { background: #f9fafb; color: #111827; }
        .lsb-btn.act { background: #f3f4f6; color: #111827; font-weight: 600; }
        .lsb-btn svg { flex-shrink: 0; opacity: 0.7; }
        .lsb-btn.act svg { opacity: 1; }
        .lsb-sep { height: 1px; background: #f3f4f6; margin: 8px 12px; }
        .lsb-footer { padding: 12px 16px 16px; border-top: 1px solid #f3f4f6;
                      display: flex; align-items: center; gap: 10px; flex-shrink: 0;
                      position: sticky; bottom: 0; background: #fff; }
        .lsb-avatar { width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
                      background: linear-gradient(135deg,#3b82f6,#8b5cf6);
                      display: flex; align-items: center; justify-content: center;
                      font-size: 13px; font-weight: 800; color: #fff; }
        .lsb-name { font-size: 12.5px; font-weight: 600; color: #111827; line-height: 1.2; }
        .lsb-role { font-size: 11px; color: #9ca3af; }
      `}</style>

      <aside className={"lsb fixed lg:static inset-y-0 left-0 z-40 transition-transform lg:translate-x-0 " + (sideOpen ? "translate-x-0" : "-translate-x-full")}>
        {/* Logo */}
        <div className="lsb-logo">BOT<span>IFY</span></div>

        {/* Main Nav */}
        <nav className="lsb-nav">
          {(isSuperAdmin ? SA_PAGES : [{
          id: "stats",
          label: "Overview",
          icon: Icons.home
        }, {
          id: "shop",
          label: "ข้อมูลร้าน",
          icon: Icons.settings
        }, {
          id: "bot",
          label: "ตั้งค่า Bot",
          icon: Icons.bot
        }, {
          id: "products",
          label: "สินค้า",
          icon: Icons.box
        }, {
          id: "documents",
          label: "เอกสารการขาย",
          icon: Icons.fileText
        }, {
          id: "customers",
          label: "จัดการลูกค้า",
          icon: Icons.users
        }, {
          id: "orders",
          label: "ออเดอร์",
          icon: Icons.cart
        }, {
          id: "promos",
          label: "โปรโมชั่น",
          icon: Icons.tag
        }]).filter(p => auth.role !== "staff" || !["shop", "bot"].includes(p.id)).map(p => <button key={p.id} onClick={() => {
          setPage(p.id);
          setSideOpen(false);
        }} className={"lsb-btn" + (page === p.id ? " act" : "")}>
              <Icon d={p.icon} size={16} />
              {p.label}
            </button>)}

          <div className="lsb-sep" />

          {!isSuperAdmin && [{
          id: "bookings",
          label: "นัดหมาย",
          icon: Icons.calendar
        }, {
          id: "channels",
          label: "เชื่อมต่อ",
          icon: Icons.link
        }, {
          id: "notifications",
          label: "แจ้งเตือน",
          icon: Icons.bell
        }, {
          id: "chats",
          label: "ประวัติแชท",
          icon: Icons.chat
        }, {
          id: "payment",
          label: "ชำระเงิน",
          icon: Icons.creditCard
        }].filter(p => auth.role !== "staff" || !["channels", "notifications", "payment"].includes(p.id)).map(p => <button key={p.id} onClick={() => {
          setPage(p.id);
          setSideOpen(false);
        }} className={"lsb-btn" + (page === p.id ? " act" : "")}>
              <Icon d={p.icon} size={16} />
              {p.label}
            </button>)}
        </nav>

        {/* Footer - logout */}
        <div className="lsb-footer" style={{
        justifyContent: "space-between"
      }}>
          <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}>
            <div className="lsb-avatar">
              {(() => {
              const name = auth.displayName || auth.username || auth.email || "US";
              if (name.includes("@")) {
                const parts = name.split("@")[0];
                return parts.length >= 2 ? parts.substring(0, 2).toUpperCase() : parts.toUpperCase();
              }
              const words = name.trim().split(/\s+/);
              if (words.length >= 2) {
                return (words[0][0] + words[1][0]).toUpperCase();
              }
              return name.length >= 2 ? name.substring(0, 2).toUpperCase() : name.toUpperCase();
            })()}
            </div>
          </div>
          <button onClick={logout} style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#9ca3af",
          padding: "4px"
        }} title="ออกจากระบบ">
            <Icon d={Icons.logout} size={16} />
          </button>
        </div>
      </aside>


      <main className="flex-1 min-w-0" style={{
      overflow: "auto",
      background: "#f3f4f6"
    }}>
        {/* Mobile topbar */}
        <div className="lg:hidden" style={{
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
          <button onClick={() => setSideOpen(true)} style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#374151"
        }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
          </button>
          <div style={{
          fontSize: "15px",
          fontWeight: 900,
          color: "#111827",
          letterSpacing: "-0.3px"
        }}>BOT<span style={{
            color: "#f59e0b"
          }}>IFY</span></div>
          <div style={{
          width: 22
        }} />
        </div>

        <div style={{
        padding: "24px 28px"
      }}>
          {!emailVerified && !isSuperAdmin && <div style={{
          background: "rgba(245,158,11,0.1)",
          border: "1px solid rgba(245,158,11,0.3)",
          borderRadius: "12px",
          padding: "12px 16px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px"
        }}>
              <div style={{
            color: "#fbbf24",
            fontSize: "13px"
          }}>
                ⚠️ อีเมลของคุณยังไม่ได้รับการยืนยัน กรุณายืนยันเพื่อใช้งานเต็มรูปแบบ
              </div>
              <button onClick={async () => {
            setSendingVerify(true);
            try {
              const email = sessionStorage.getItem("botify_email");
              const r = await api("/api/auth/send-verification", {
                method: "POST",
                body: JSON.stringify({
                  email
                })
              });
              if (r.success) toast(r.message || "ส่งลิงก์ยืนยันแล้ว", "ok");else toast(r.error || "ส่งไม่สำเร็จ", "error");
            } catch (e) {
              toast(e.message, "error");
            }
            setSendingVerify(false);
          }} disabled={sendingVerify} style={{
            background: "#f59e0b",
            color: "#000",
            border: "none",
            padding: "6px 14px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            opacity: sendingVerify ? 0.5 : 1,
            whiteSpace: "nowrap"
          }}>
                {sendingVerify ? "กำลังส่ง..." : "📧 ส่งลิงก์ยืนยัน"}
              </button>
            </div>}
          {renderPage()}
        </div>

        <div style={{
        padding: "16px 24px",
        borderTop: "1px solid #e5e7eb",
        textAlign: "center",
        fontSize: "11px",
        color: "#64748b"
      }}>
          © {new Date().getFullYear()} BOTIFY —
          <a href="/terms" target="_blank" style={{
          color: "#6b7280",
          textDecoration: "none"
        }}>ข้อกำหนดการใช้งาน</a>
          {" • "}
          <a href="/privacy" target="_blank" style={{
          color: "#6b7280",
          textDecoration: "none"
        }}>นโยบายความเป็นส่วนตัว</a>
        </div>
      </main>
    </div>;
}

// ── Mount App ─────────────────────────────────────────────
export default App;