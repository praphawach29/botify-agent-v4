import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  PAYMENT PAGE (Shop Owner — เลือกแพ็กเกจ + ชำระเงิน)
// ═══════════════════════════════════════════════════════════
function PaymentPage({
  toast
}) {
  const [packages, setPackages] = useState([]);
  const [config, setConfig] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [tab, setTab] = useState("plans"); // plans | history
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  useEffect(() => {
    Promise.all([api("/api/payment/packages"), api("/api/payment/config"), api("/api/payment/subscription"), api("/api/payment/history")]).then(([pkgR, cfgR, subR, hisR]) => {
      setPackages(pkgR.packages || []);
      setConfig(cfgR);
      setSubscription(subR.subscription);
      setHistory(hisR.payments || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  const payStripe = async pkgId => {
    setPaying(true);
    try {
      const r = await api("/api/payment/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({
          package_id: pkgId
        })
      });
      if (r.checkout_url) window.location.href = r.checkout_url;else toast(r.error || "ไม่สามารถสร้าง checkout ได้", "error");
    } catch (e) {
      toast(e.message, "error");
    }
    setPaying(false);
  };
  const payOmise = async (pkgId, sourceType) => {
    setPaying(true);
    try {
      const r = await api("/api/payment/omise/charge", {
        method: "POST",
        body: JSON.stringify({
          package_id: pkgId,
          source_type: sourceType
        })
      });
      if (r.authorize_uri) window.location.href = r.authorize_uri;else if (r.qr_code_url) {
        toast("สแกน QR Code เพื่อชำระเงิน", "success");
        // Show QR in modal (basic approach)
        setShowPayModal(false);
        window.open(r.qr_code_url, "_blank", "width=400,height=400");
      } else if (r.success && r.status === "successful") {
        toast("ชำระเงินสำเร็จ!", "success");
        setShowPayModal(false);
        // Reload
        const subR = await api("/api/payment/subscription");
        setSubscription(subR.subscription);
      } else toast(r.error || "เกิดข้อผิดพลาด", "error");
    } catch (e) {
      toast(e.message, "error");
    }
    setPaying(false);
  };
  const payManual = async (pkgId, method) => {
    setPaying(true);
    try {
      const r = await api("/api/payment/manual", {
        method: "POST",
        body: JSON.stringify({
          package_id: pkgId,
          payment_method: method
        })
      });
      if (r.success) {
        toast(`แจ้งชำระเงินสำเร็จ! เลขที่ ${r.invoice_number} — รอ Admin ยืนยัน`, "success");
        setShowPayModal(false);
        const hisR = await api("/api/payment/history");
        setHistory(hisR.payments || []);
      } else toast(r.error || "เกิดข้อผิดพลาด", "error");
    } catch (e) {
      toast(e.message, "error");
    }
    setPaying(false);
  };
  if (loading) return <Loader />;
  const statusColors = {
    paid: "#10b981",
    pending: "#f59e0b",
    pending_review: "#3b82f6",
    failed: "#ef4444",
    overdue: "#ef4444"
  };
  const statusLabels = {
    paid: "ชำระแล้ว",
    pending: "รอชำระ",
    pending_review: "รอตรวจสอบ",
    failed: "ไม่สำเร็จ",
    overdue: "เกินกำหนด"
  };
  const gwLabels = {
    stripe: "Stripe",
    omise: "Omise",
    omise_promptpay: "PromptPay (Omise)",
    promptpay: "พร้อมเพย์",
    bank_transfer: "โอนธนาคาร",
    manual: "แจ้งชำระ"
  };
  return <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex flex-col">
          <h1 className="text-base md:text-xl font-black text-slate-900 leading-tight whitespace-nowrap">ชำระเงิน & สมัครแพ็กเกจ</h1>
          <p className="text-[10px] text-gray-400 leading-none mt-0.5 hidden sm:block">เลือกต่ออายุการใช้บริการ บัญชีร้านค้า หรือดูประวัติการทำธุรกรรม</p>
        </div>
      </div>

      {subscription && <div style={{
      background: "rgba(16,185,129,0.1)",
      border: "1px solid rgba(16,185,129,0.3)",
      borderRadius: "12px",
      padding: "16px",
      marginBottom: "20px"
    }}>
          <div className="flex items-center gap-2 mb-2">
            <span style={{
          background: "#10b981",
          color: "#fff",
          padding: "2px 10px",
          borderRadius: "8px",
          fontSize: "11px",
          fontWeight: 700
        }}>ACTIVE</span>
            <span className="text-gray-900 font-bold">{subscription.packages?.name || "Pro"}</span>
          </div>
          <div className="text-gray-500 text-xs">
            หมดอายุ: {new Date(subscription.current_period_end).toLocaleDateString("th-TH", {
          year: "numeric",
          month: "long",
          day: "numeric"
        })}
            {" • "}Gateway: {gwLabels[subscription.gateway] || subscription.gateway}
          </div>
        </div>}

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
        {["plans", "history"].map(t => <button key={t} onClick={() => setTab(t)} className={"whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold transition border " + (tab === t ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/15" : "bg-white border-gray-200 text-slate-600 hover:bg-gray-50 hover:border-gray-300")}>
            {t === "plans" ? "📦 แพ็กเกจระบบ" : "📋 ประวัติชำระเงิน"}
          </button>)}
      </div>

      {tab === "plans" && <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "16px"
    }}>
          {packages.map(pkg => <div key={pkg.id} style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        padding: "20px",
        position: "relative"
      }}>
              {pkg.name?.toLowerCase() === "pro" && <div style={{
          position: "absolute",
          top: "-8px",
          right: "12px",
          background: "linear-gradient(135deg,#f59e0b,#ef4444)",
          color: "#fff",
          fontSize: "10px",
          fontWeight: 700,
          padding: "2px 10px",
          borderRadius: "8px"
        }}>แนะนำ</div>}
              <div className="text-gray-900 font-bold text-lg mb-1">{pkg.name}</div>
              <div style={{
          fontSize: "28px",
          fontWeight: 800,
          color: "#3b82f6",
          marginBottom: "8px"
        }}>฿{(pkg.price || 0).toLocaleString()}<span className="text-gray-400 text-sm font-normal">/เดือน</span></div>
              <div className="text-gray-500 text-xs mb-3">{pkg.description || ""}</div>
              <div className="text-gray-500 text-xs mb-4" style={{
          lineHeight: "1.8"
        }}>
                ✅ {(pkg.msg_limit || 0).toLocaleString()} ข้อความ/เดือน<br />
                ✅ {(pkg.product_limit || 0).toLocaleString()} สินค้า<br />
                {pkg.features?.ai && <span>✅ AI Chatbot<br /></span>}
                {pkg.features?.broadcast && <span>✅ Broadcast<br /></span>}
                {pkg.features?.analytics && <span>✅ Analytics<br /></span>}
              </div>
              <button onClick={() => {
          setSelectedPkg(pkg);
          setShowPayModal(true);
        }} disabled={pkg.price === 0} className="w-full py-2.5 rounded-lg text-sm font-bold transition" style={{
          background: pkg.price === 0 ? "#e5e7eb" : "linear-gradient(135deg,#3b82f6,#6366f1)",
          color: pkg.price === 0 ? "#6b7280" : "#fff",
          border: "none",
          cursor: pkg.price === 0 ? "default" : "pointer"
        }}>
                {pkg.price === 0 ? "แพ็กเกจปัจจุบัน" : "เลือกแพ็กเกจนี้"}
              </button>
            </div>)}
        </div>}

      {tab === "history" && <div style={{
      overflowX: "auto"
    }}>
          {history.length === 0 ? <div className="text-gray-400 text-center py-10">ยังไม่มีประวัติการชำระเงิน</div> : <table style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "13px"
      }}>
              <thead>
                <tr style={{
            borderBottom: "1px solid #e5e7eb"
          }}>
                  <th style={{
              textAlign: "left",
              padding: "8px",
              color: "#6b7280",
              fontWeight: 600
            }}>เลขที่</th>
                  <th style={{
              textAlign: "left",
              padding: "8px",
              color: "#6b7280",
              fontWeight: 600
            }}>แพ็กเกจ</th>
                  <th style={{
              textAlign: "right",
              padding: "8px",
              color: "#6b7280",
              fontWeight: 600
            }}>จำนวนเงิน</th>
                  <th style={{
              textAlign: "center",
              padding: "8px",
              color: "#6b7280",
              fontWeight: 600
            }}>ช่องทาง</th>
                  <th style={{
              textAlign: "center",
              padding: "8px",
              color: "#6b7280",
              fontWeight: 600
            }}>สถานะ</th>
                  <th style={{
              textAlign: "left",
              padding: "8px",
              color: "#6b7280",
              fontWeight: 600
            }}>วันที่</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => <tr key={h.id} style={{
            borderBottom: "1px solid #f3f4f6"
          }}>
                    <td style={{
              padding: "8px",
              color: "#111827",
              fontFamily: "monospace",
              fontSize: "11px"
            }}>{h.invoice_number || "-"}</td>
                    <td style={{
              padding: "8px",
              color: "#111827"
            }}>{h.package_name}</td>
                    <td style={{
              padding: "8px",
              color: "#3b82f6",
              textAlign: "right",
              fontWeight: 600
            }}>฿{(h.amount || 0).toLocaleString()}</td>
                    <td style={{
              padding: "8px",
              textAlign: "center",
              color: "#6b7280",
              fontSize: "11px"
            }}>{gwLabels[h.gateway] || gwLabels[h.payment_method] || h.gateway || "-"}</td>
                    <td style={{
              padding: "8px",
              textAlign: "center"
            }}>
                      <span style={{
                background: (statusColors[h.status] || "#64748b") + "20",
                color: statusColors[h.status] || "#64748b",
                padding: "2px 8px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 600
              }}>{statusLabels[h.status] || h.status}</span>
                    </td>
                    <td style={{
              padding: "8px",
              color: "#6b7280",
              fontSize: "11px"
            }}>{h.paid_at ? new Date(h.paid_at).toLocaleDateString("th-TH") : new Date(h.created_at).toLocaleDateString("th-TH")}</td>
                  </tr>)}
              </tbody>
            </table>}
        </div>}

      {showPayModal && selectedPkg && <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px"
    }} onClick={() => !paying && setShowPayModal(false)}>
          <div style={{
        background: "#1e293b",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        padding: "24px",
        maxWidth: "400px",
        width: "100%"
      }} onClick={e => e.stopPropagation()}>
            <h3 className="text-gray-900 font-bold text-lg mb-1">ชำระเงิน — {selectedPkg.name}</h3>
            <div style={{
          fontSize: "24px",
          fontWeight: 800,
          color: "#3b82f6",
          marginBottom: "16px"
        }}>฿{(selectedPkg.price || 0).toLocaleString()}</div>

            <div className="text-gray-500 text-xs mb-4">เลือกช่องทางชำระเงิน:</div>

            <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}>
              {config?.gateways?.stripe?.enabled && <button onClick={() => payStripe(selectedPkg.id)} disabled={paying} style={{
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid rgba(99,102,241,0.4)",
            background: "rgba(99,102,241,0.1)",
            color: "#a5b4fc",
            fontWeight: 600,
            fontSize: "14px",
            cursor: paying ? "not-allowed" : "pointer",
            opacity: paying ? 0.5 : 1
          }}>
                  💳 บัตรเครดิต / Debit (Stripe)
                  {config.gateways.stripe.testMode && <span style={{
              marginLeft: "8px",
              fontSize: "10px",
              background: "#f59e0b",
              color: "#000",
              padding: "1px 6px",
              borderRadius: "4px"
            }}>TEST</span>}
                </button>}
              {config?.gateways?.omise?.enabled && <>
                  <button onClick={() => payOmise(selectedPkg.id, "promptpay")} disabled={paying} style={{
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid rgba(16,185,129,0.4)",
              background: "rgba(16,185,129,0.1)",
              color: "#6ee7b7",
              fontWeight: 600,
              fontSize: "14px",
              cursor: paying ? "not-allowed" : "pointer",
              opacity: paying ? 0.5 : 1
            }}>
                    📱 PromptPay QR (Omise)
                    {config.gateways.omise.testMode && <span style={{
                marginLeft: "8px",
                fontSize: "10px",
                background: "#f59e0b",
                color: "#000",
                padding: "1px 6px",
                borderRadius: "4px"
              }}>TEST</span>}
                  </button>
                  <button onClick={() => payOmise(selectedPkg.id, "card")} disabled={paying} style={{
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid rgba(59,130,246,0.4)",
              background: "rgba(59,130,246,0.1)",
              color: "#93c5fd",
              fontWeight: 600,
              fontSize: "14px",
              cursor: paying ? "not-allowed" : "pointer",
              opacity: paying ? 0.5 : 1
            }}>
                    💳 บัตรเครดิต (Omise)
                    {config.gateways.omise.testMode && <span style={{
                marginLeft: "8px",
                fontSize: "10px",
                background: "#f59e0b",
                color: "#000",
                padding: "1px 6px",
                borderRadius: "4px"
              }}>TEST</span>}
                  </button>
                </>}
              <button onClick={() => payManual(selectedPkg.id, "bank_transfer")} disabled={paying} style={{
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid rgba(148,163,184,0.3)",
            background: "rgba(148,163,184,0.05)",
            color: "#cbd5e1",
            fontWeight: 600,
            fontSize: "14px",
            cursor: paying ? "not-allowed" : "pointer",
            opacity: paying ? 0.5 : 1
          }}>
                🏦 โอนเงิน / พร้อมเพย์ (แจ้งชำระ)
              </button>

              {!config?.gateways?.stripe?.enabled && !config?.gateways?.omise?.enabled && <div style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: "8px",
            padding: "10px",
            color: "#fbbf24",
            fontSize: "11px",
            textAlign: "center"
          }}>
                  ⚠️ Stripe/Omise ยังไม่ได้เปิดใช้งาน — สามารถแจ้งชำระผ่านโอนเงินได้
                </div>}
            </div>

            <button onClick={() => setShowPayModal(false)} disabled={paying} className="w-full mt-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 transition" style={{
          background: "transparent",
          border: "1px solid #e5e7eb"
        }}>
              ยกเลิก
            </button>
          </div>
        </div>}
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  SA PAYMENT PAGE (Super Admin — ดู/จัดการ payment ทั้งหมด)
// ═══════════════════════════════════════════════════════════
