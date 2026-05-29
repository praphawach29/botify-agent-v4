import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  SUPER ADMIN — Billing & Payment Page
// ═══════════════════════════════════════════════════════════
function BillingPage({
  toast
}) {
  const [tab, setTab] = useState("bills"); // bills | usage | payment
  const [bills, setBills] = useState([]);
  const [shops, setShops] = useState([]);
  const [packages, setPackages] = useState([]);
  const [usage, setUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editBill, setEditBill] = useState(null);
  const [editPayment, setEditPayment] = useState(null);
  const [form, setForm] = useState({});
  const [payForm, setPayForm] = useState({});
  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([api("/api/billing").then(r => setBills(r.bills || [])), api("/api/shops").then(r => setShops(r.shops || [])), api("/api/packages").then(r => setPackages(r.packages || [])), api("/api/usage").then(r => setUsage(r.usage || []))]).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Create Bill ──
  const openCreateBill = () => {
    const today = new Date().toISOString().slice(0, 10);
    const next = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    setForm({
      shop_id: "",
      package_name: "Pro",
      amount: 1500,
      period_start: today,
      period_end: next,
      note: ""
    });
    setShowCreate(true);
  };
  const createBill = async () => {
    if (!form.shop_id) {
      toast("กรุณาเลือกร้านค้า", "err");
      return;
    }
    const res = await api("/api/billing", {
      method: "POST",
      body: form
    });
    if (res.success) {
      toast("สร้างบิลสำเร็จ", "ok");
      setShowCreate(false);
      loadAll();
    } else toast(res.error || "สร้างไม่สำเร็จ", "err");
  };

  // ── Confirm / Update Bill ──
  const confirmPaid = async bill => {
    const res = await api("/api/billing/" + bill.id, {
      method: "PUT",
      body: {
        status: "paid"
      }
    });
    if (res.success) {
      toast("ยืนยันชำระเงินสำเร็จ — ต่ออายุร้านแล้ว", "ok");
      loadAll();
    } else toast(res.error || "ยืนยันไม่สำเร็จ", "err");
  };
  const markOverdue = async bill => {
    const res = await api("/api/billing/" + bill.id, {
      method: "PUT",
      body: {
        status: "overdue"
      }
    });
    if (res.success) {
      toast("ระงับร้านค้าแล้ว", "ok");
      loadAll();
    } else toast(res.error || "ผิดพลาด", "err");
  };

  // ── Shop Payment Settings ──
  const openPaymentEdit = shop => {
    setPayForm({
      payment_transfer: shop.payment_transfer !== false,
      payment_promptpay: shop.payment_promptpay || "",
      payment_bank_name: shop.payment_bank_name || "",
      payment_bank_account: shop.payment_bank_account || "",
      payment_bank_acc_name: shop.payment_bank_acc_name || "",
      payment_cod: !!shop.payment_cod,
      payment_cod_fee: shop.payment_cod_fee || "",
      payment_pickup: !!shop.payment_pickup
    });
    setEditPayment(shop);
  };
  const savePayment = async () => {
    const res = await api("/api/shops/" + editPayment.id + "/payment", {
      method: "PUT",
      body: payForm
    });
    if (res.success) {
      toast("บันทึกวิธีชำระเงินสำเร็จ", "ok");
      setEditPayment(null);
      loadAll();
    } else toast(res.error || "บันทึกไม่สำเร็จ", "err");
  };
  const statusColors = {
    pending: "bg-amber-600/20 text-amber-300",
    paid: "bg-emerald-600/20 text-emerald-300",
    overdue: "bg-red-600/20 text-red-300",
    cancelled: "bg-slate-600/20 text-gray-500"
  };
  const statusLabels = {
    pending: "รอชำระ",
    paid: "ชำระแล้ว",
    overdue: "เกินกำหนด",
    cancelled: "ยกเลิก"
  };
  if (loading) return <Loader />;
  const pendingBills = bills.filter(b => b.status === "pending");
  const paidBills = bills.filter(b => b.status === "paid");
  const totalRevenue = paidBills.reduce((s, b) => s + (b.amount || 0), 0);
  const tabBtn = (id, label, count) => <button key={id} onClick={() => setTab(id)} className={"px-4 py-2 text-sm font-medium rounded-lg transition " + (tab === id ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:text-gray-900")}>
      {label} {count !== undefined && <span className="ml-1 text-xs opacity-70">({count})</span>}
    </button>;
  return <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">การเงิน & การชำระเงิน</h2>
        <button onClick={openCreateBill} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
          <Icon d={Icons.plus} size={16} /> สร้างบิล
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[{
        label: "รายได้รวม",
        val: "฿" + totalRevenue.toLocaleString(),
        color: "text-emerald-400"
      }, {
        label: "รอชำระ",
        val: pendingBills.length,
        color: "text-amber-400"
      }, {
        label: "ชำระแล้ว",
        val: paidBills.length,
        color: "text-blue-400"
      }, {
        label: "ร้านค้าทั้งหมด",
        val: shops.length,
        color: "text-violet-400"
      }].map((c, i) => <div key={i} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <div className={"text-xl font-black " + c.color}>{c.val}</div>
            <div className="text-gray-500 text-xs mt-1">{c.label}</div>
          </div>)}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {tabBtn("bills", "บิลทั้งหมด", bills.length)}
        {tabBtn("usage", "Usage Dashboard", usage.length)}
        {tabBtn("payment", "วิธีชำระเงินร้านค้า", shops.length)}
      </div>

      {/* ══════ TAB: Bills ══════ */}
      {tab === "bills" && <div className="space-y-3">
          {bills.length === 0 ? <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">ยังไม่มีบิล</div> : bills.map(bill => <div key={bill.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-900 font-medium">{bill.shops?.name || "ร้านค้า"}</span>
                    <span className={"text-xs px-2 py-0.5 rounded-full " + (statusColors[bill.status] || "")}>{statusLabels[bill.status] || bill.status}</span>
                  </div>
                  <div className="text-gray-500 text-xs space-x-3">
                    <span>แพ็กเกจ: {bill.package_name}</span>
                    <span>฿{(bill.amount || 0).toLocaleString()}</span>
                    <span>{bill.period_start} → {bill.period_end}</span>
                  </div>
                  {bill.paid_at && <div className="text-emerald-400 text-xs mt-1">ชำระเมื่อ: {new Date(bill.paid_at).toLocaleString("th-TH")}</div>}
                  {bill.note && <div className="text-gray-400 text-xs mt-1">หมายเหตุ: {bill.note}</div>}
                </div>
                {bill.status === "pending" && <div className="flex gap-2">
                    <button onClick={() => confirmPaid(bill)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition">
                      <Icon d={Icons.check} size={14} /> ยืนยันชำระ
                    </button>
                    <button onClick={() => markOverdue(bill)} className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs rounded-lg transition">
                      ระงับ
                    </button>
                  </div>}
              </div>
            </div>)}
        </div>}

      {/* ══════ TAB: Usage Dashboard ══════ */}
      {tab === "usage" && <div className="space-y-3">
          {usage.map(shop => {
        const pct = shop.msg_percent || 0;
        const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
        const isUnlimited = shop.msg_limit === -1;
        return <div key={shop.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={"w-2 h-2 rounded-full " + (shop.status === "active" ? "bg-emerald-400" : "bg-red-400")} />
                    <span className="text-gray-900 font-medium">{shop.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{shop.package_name || "free"}</span>
                  </div>
                  {shop.expired_at && <span className={"text-xs " + (new Date(shop.expired_at) < new Date() ? "text-red-400" : "text-gray-500")}>
                      หมดอายุ: {new Date(shop.expired_at).toLocaleDateString("th-TH")}
                    </span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">ข้อความ</span>
                      <span className="text-gray-700">
                        {shop.msg_used_this_month || 0} / {isUnlimited ? "∞" : shop.msg_limit}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={barColor + " h-2 rounded-full transition-all"} style={{
                  width: (isUnlimited ? 0 : Math.min(100, pct)) + "%"
                }} />
                    </div>
                  </div>
                  {!isUnlimited && <span className={"text-xs font-bold " + (pct >= 90 ? "text-red-400" : "text-gray-500")}>{pct}%</span>}
                </div>
              </div>;
      })}
        </div>}

      {/* ══════ TAB: Shop Payment Settings ══════ */}
      {tab === "payment" && <div className="space-y-3">
          {shops.map(shop => <div key={shop.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-900 font-medium">{shop.name}</span>
                <button onClick={() => openPaymentEdit(shop)} className="text-blue-400 hover:text-blue-300 text-xs font-medium transition">ตั้งค่า</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {shop.payment_transfer !== false && <span className="text-xs px-2 py-1 rounded-full bg-emerald-600/20 text-emerald-300">โอนเงิน</span>}
                {shop.payment_promptpay && <span className="text-xs px-2 py-1 rounded-full bg-blue-600/20 text-blue-300">PromptPay</span>}
                {shop.payment_cod && <span className="text-xs px-2 py-1 rounded-full bg-amber-600/20 text-amber-300">COD</span>}
                {shop.payment_pickup && <span className="text-xs px-2 py-1 rounded-full bg-violet-600/20 text-violet-300">รับหน้าร้าน</span>}
                {!shop.payment_transfer && !shop.payment_promptpay && !shop.payment_cod && !shop.payment_pickup && <span className="text-xs text-gray-400">ยังไม่ได้ตั้งค่า</span>}
              </div>
            </div>)}
        </div>}

      {/* ── Create Bill Modal ── */}
      {showCreate && <Modal title="สร้างบิลใหม่" onClose={() => setShowCreate(false)} onSave={createBill}>
          <div className="space-y-3">
            <div>
              <label className="block text-gray-500 text-xs mb-1">ร้านค้า *</label>
              <DropdownSelect value={form.shop_id} onChange={v => setForm(f => ({
            ...f,
            shop_id: v
          }))} placeholder="-- เลือกร้าน --" options={shops.map(s => ({
            value: s.id,
            label: s.name
          }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-500 text-xs mb-1">แพ็กเกจ</label>
                <DropdownSelect value={form.package_name} onChange={v => {
              const pkg = packages.find(p => p.name === v);
              setForm(f => ({
                ...f,
                package_name: v,
                amount: pkg ? pkg.price : f.amount
              }));
            }} options={packages.map(p => ({
              value: p.name,
              label: p.name + " — ฿" + p.price.toLocaleString()
            }))} />
              </div>
              <Field label="จำนวนเงิน (฿)" val={form.amount} set={v => setForm(f => ({
            ...f,
            amount: parseInt(v) || 0
          }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field type="date" label="เริ่ม" val={form.period_start} set={v => setForm(f => ({
            ...f,
            period_start: v
          }))} ph="วว/ดด/ปปปป" />
              <Field type="date" label="สิ้นสุด" val={form.period_end} set={v => setForm(f => ({
            ...f,
            period_end: v
          }))} ph="วว/ดด/ปปปป" />
            </div>
            <Field label="หมายเหตุ" val={form.note} set={v => setForm(f => ({
          ...f,
          note: v
        }))} />
          </div>
        </Modal>}

      {/* ── Payment Settings Modal ── */}
      {editPayment && <Modal title={"วิธีชำระเงิน: " + editPayment.name} onClose={() => setEditPayment(null)} onSave={savePayment}>
          <div className="space-y-4">
            {/* Transfer */}
            <div className="bg-gray-50 border border-gray-200/50 rounded-xl p-3">
              <label className="flex items-center gap-2 text-gray-900 text-sm font-medium mb-2 cursor-pointer">
                <input type="checkbox" checked={payForm.payment_transfer} onChange={e => setPayForm(f => ({
              ...f,
              payment_transfer: e.target.checked
            }))} className="rounded border-gray-300 bg-white text-blue-500" />
                โอนเงิน / PromptPay
              </label>
              {payForm.payment_transfer && <div className="space-y-2 ml-6">
                  <Field label="เลข PromptPay" val={payForm.payment_promptpay} set={v => setPayForm(f => ({
              ...f,
              payment_promptpay: v
            }))} ph="0955851136" />
                  <Field label="ธนาคาร" val={payForm.payment_bank_name} set={v => setPayForm(f => ({
              ...f,
              payment_bank_name: v
            }))} ph="กสิกรไทย" />
                  <Field label="เลขบัญชี" val={payForm.payment_bank_account} set={v => setPayForm(f => ({
              ...f,
              payment_bank_account: v
            }))} />
                  <Field label="ชื่อบัญชี" val={payForm.payment_bank_acc_name} set={v => setPayForm(f => ({
              ...f,
              payment_bank_acc_name: v
            }))} />
                </div>}
            </div>
            {/* COD */}
            <div className="bg-gray-50 border border-gray-200/50 rounded-xl p-3">
              <label className="flex items-center gap-2 text-gray-900 text-sm font-medium mb-2 cursor-pointer">
                <input type="checkbox" checked={payForm.payment_cod} onChange={e => setPayForm(f => ({
              ...f,
              payment_cod: e.target.checked
            }))} className="rounded border-gray-300 bg-white text-blue-500" />
                เก็บเงินปลายทาง (COD)
              </label>
              {payForm.payment_cod && <div className="ml-6">
                  <Field label="ค่าธรรมเนียม COD" val={payForm.payment_cod_fee} set={v => setPayForm(f => ({
              ...f,
              payment_cod_fee: v
            }))} ph="ฟรี หรือ 20 บาท" />
                </div>}
            </div>
            {/* Pickup */}
            <div className="bg-gray-50 border border-gray-200/50 rounded-xl p-3">
              <label className="flex items-center gap-2 text-gray-900 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={payForm.payment_pickup} onChange={e => setPayForm(f => ({
              ...f,
              payment_pickup: e.target.checked
            }))} className="rounded border-gray-300 bg-white text-blue-500" />
                รับหน้าร้าน (จ่ายเงินสดที่ร้าน)
              </label>
            </div>
          </div>
        </Modal>}
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  SUPER ADMIN — Broadcast Page
// ═══════════════════════════════════════════════════════════
