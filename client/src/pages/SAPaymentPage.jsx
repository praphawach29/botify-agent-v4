import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  SA PAYMENT PAGE (Super Admin — ดู/จัดการ payment ทั้งหมด)
// ═══════════════════════════════════════════════════════════
function SAPaymentPage({
  toast
}) {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({});
  const [gateways, setGateways] = useState({});
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview"); // overview | payments | events
  const [confirming, setConfirming] = useState(null);
  const load = async () => {
    setLoading(true);
    try {
      const [payR, evtR] = await Promise.all([api("/api/payment/admin/all"), api("/api/payment/admin/events")]);
      setPayments(payR.payments || []);
      setSummary(payR.summary || {});
      setGateways(payR.gateways || {});
      setEvents(evtR.events || []);
    } catch (e) {
      toast(e.message, "error");
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);
  const confirmPayment = async billingId => {
    setConfirming(billingId);
    try {
      const r = await api(`/api/payment/confirm/${billingId}`, {
        method: "POST"
      });
      if (r.success) {
        toast(r.message, "success");
        await load();
      } else toast(r.error, "error");
    } catch (e) {
      toast(e.message, "error");
    }
    setConfirming(null);
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
  const summaryCards = [{
    label: "รายได้รวม",
    value: `฿${(summary.total_revenue || 0).toLocaleString()}`,
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    icon: "💰"
  }, {
    label: "รายได้เดือนนี้",
    value: `฿${(summary.month_revenue || 0).toLocaleString()}`,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
    icon: "📈"
  }, {
    label: "ชำระแล้ว",
    value: summary.total_paid || 0,
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    icon: "✅"
  }, {
    label: "รอตรวจสอบ",
    value: summary.pending_review || 0,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    icon: "⏳"
  }];
  return <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Gateway Management</h2>

      {/* Gateway Status */}
      <div className="flex gap-3 mb-5 flex-wrap">
        {Object.entries(gateways).map(([k, v]) => <div key={k} style={{
        background: v.enabled ? "rgba(16,185,129,0.1)" : "rgba(100,116,139,0.1)",
        border: `1px solid ${v.enabled ? "rgba(16,185,129,0.3)" : "#e5e7eb"}`,
        borderRadius: "8px",
        padding: "8px 14px",
        display: "flex",
        alignItems: "center",
        gap: "6px"
      }}>
            <span style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: v.enabled ? "#10b981" : "#64748b"
        }} />
            <span style={{
          color: v.enabled ? "#6ee7b7" : "#94a3b8",
          fontSize: "12px",
          fontWeight: 600,
          textTransform: "capitalize"
        }}>{k}</span>
            {v.testMode && <span style={{
          fontSize: "9px",
          background: "#f59e0b",
          color: "#000",
          padding: "1px 5px",
          borderRadius: "3px",
          fontWeight: 700
        }}>TEST</span>}
          </div>)}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[{
        id: "overview",
        label: "📊 ภาพรวม"
      }, {
        id: "payments",
        label: "💳 รายการทั้งหมด"
      }, {
        id: "events",
        label: "📡 Webhook Events"
      }].map(t => <button key={t.id} onClick={() => setTab(t.id)} className={"px-4 py-2 rounded-lg text-xs font-semibold transition border " + (tab === t.id ? "bg-blue-600/20 border-blue-500 text-blue-300" : "bg-gray-50 border-gray-300 text-slate-500")}>
            {t.label}
          </button>)}
      </div>

      {tab === "overview" && <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      gap: "12px",
      marginBottom: "24px"
    }}>
          {summaryCards.map(c => <div key={c.label} style={{
        background: c.bg,
        border: `1px solid ${c.color}30`,
        borderRadius: "12px",
        padding: "16px"
      }}>
              <div style={{
          fontSize: "24px",
          marginBottom: "4px"
        }}>{c.icon}</div>
              <div style={{
          fontSize: "22px",
          fontWeight: 800,
          color: c.color
        }}>{c.value}</div>
              <div style={{
          fontSize: "11px",
          color: "#6b7280"
        }}>{c.label}</div>
            </div>)}
        </div>}

      {(tab === "overview" || tab === "payments") && <div style={{
      overflowX: "auto"
    }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-900 font-bold text-sm">{tab === "overview" ? "รายการล่าสุด (รอตรวจสอบ)" : "รายการทั้งหมด"}</h3>
            <button onClick={load} className="text-gray-500 hover:text-gray-900 text-xs flex items-center gap-1"><Icon d={Icons.refresh} size={14} /> รีเฟรช</button>
          </div>
          <table style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "12px"
      }}>
            <thead>
              <tr style={{
            borderBottom: "1px solid #e5e7eb"
          }}>
                <th style={{
              textAlign: "left",
              padding: "8px",
              color: "#6b7280"
            }}>เลขที่</th>
                <th style={{
              textAlign: "left",
              padding: "8px",
              color: "#6b7280"
            }}>ร้าน</th>
                <th style={{
              textAlign: "left",
              padding: "8px",
              color: "#6b7280"
            }}>แพ็กเกจ</th>
                <th style={{
              textAlign: "right",
              padding: "8px",
              color: "#6b7280"
            }}>เงิน</th>
                <th style={{
              textAlign: "center",
              padding: "8px",
              color: "#6b7280"
            }}>Gateway</th>
                <th style={{
              textAlign: "center",
              padding: "8px",
              color: "#6b7280"
            }}>สถานะ</th>
                <th style={{
              textAlign: "center",
              padding: "8px",
              color: "#6b7280"
            }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {(tab === "overview" ? payments.filter(p => p.status === "pending_review" || p.status === "pending") : payments).slice(0, tab === "overview" ? 10 : 100).map(p => <tr key={p.id} style={{
            borderBottom: "1px solid rgba(51,65,85,0.2)"
          }}>
                  <td style={{
              padding: "8px",
              color: "#111827",
              fontFamily: "monospace",
              fontSize: "10px"
            }}>{p.invoice_number || `#${p.id}`}</td>
                  <td style={{
              padding: "8px",
              color: "#111827"
            }}>{p.shops?.name || "-"}</td>
                  <td style={{
              padding: "8px",
              color: "#6b7280"
            }}>{p.package_name}</td>
                  <td style={{
              padding: "8px",
              color: "#3b82f6",
              textAlign: "right",
              fontWeight: 600
            }}>฿{(p.amount || 0).toLocaleString()}</td>
                  <td style={{
              padding: "8px",
              textAlign: "center",
              color: "#6b7280",
              fontSize: "10px",
              textTransform: "capitalize"
            }}>{p.gateway || "-"}</td>
                  <td style={{
              padding: "8px",
              textAlign: "center"
            }}>
                    <span style={{
                background: (statusColors[p.status] || "#64748b") + "20",
                color: statusColors[p.status] || "#64748b",
                padding: "2px 8px",
                borderRadius: "6px",
                fontSize: "10px",
                fontWeight: 600
              }}>{statusLabels[p.status] || p.status}</span>
                  </td>
                  <td style={{
              padding: "8px",
              textAlign: "center"
            }}>
                    {(p.status === "pending_review" || p.status === "pending") && <button onClick={() => confirmPayment(p.id)} disabled={confirming === p.id} style={{
                background: "#10b981",
                color: "#fff",
                border: "none",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                opacity: confirming === p.id ? 0.5 : 1
              }}>
                        {confirming === p.id ? "..." : "✅ ยืนยัน"}
                      </button>}
                  </td>
                </tr>)}
            </tbody>
          </table>
          {payments.length === 0 && <div className="text-gray-400 text-center py-8 text-sm">ยังไม่มีรายการชำระเงิน</div>}
        </div>}

      {tab === "events" && <div style={{
      overflowX: "auto"
    }}>
          <table style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "11px"
      }}>
            <thead>
              <tr style={{
            borderBottom: "1px solid #e5e7eb"
          }}>
                <th style={{
              textAlign: "left",
              padding: "6px",
              color: "#6b7280"
            }}>เวลา</th>
                <th style={{
              textAlign: "left",
              padding: "6px",
              color: "#6b7280"
            }}>Gateway</th>
                <th style={{
              textAlign: "left",
              padding: "6px",
              color: "#6b7280"
            }}>Event</th>
                <th style={{
              textAlign: "left",
              padding: "6px",
              color: "#6b7280"
            }}>Event ID</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => <tr key={ev.id} style={{
            borderBottom: "1px solid rgba(51,65,85,0.2)"
          }}>
                  <td style={{
              padding: "6px",
              color: "#6b7280"
            }}>{new Date(ev.created_at).toLocaleString("th-TH")}</td>
                  <td style={{
              padding: "6px",
              color: "#111827",
              textTransform: "capitalize"
            }}>{ev.gateway}</td>
                  <td style={{
              padding: "6px",
              color: "#3b82f6",
              fontFamily: "monospace"
            }}>{ev.event_type}</td>
                  <td style={{
              padding: "6px",
              color: "#64748b",
              fontFamily: "monospace",
              fontSize: "10px"
            }}>{(ev.event_id || "").slice(0, 24)}...</td>
                </tr>)}
            </tbody>
          </table>
          {events.length === 0 && <div className="text-gray-400 text-center py-8 text-sm">ยังไม่มี webhook events</div>}
        </div>}
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  Customer Management
// ═══════════════════════════════════════════════════════════
