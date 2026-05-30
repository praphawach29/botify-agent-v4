import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  SHOP MANAGEMENT (Super Admin — สร้าง/จัดการร้านค้า)
// ═══════════════════════════════════════════════════════════
function ShopManagementPage({
  toast
}) {
  const [shopList, setShopList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [detailShop, setDetailShop] = useState(null);
  const [detailForm, setDetailForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    personality: "ชาย-สุภาพ",
    ai_provider: "claude",
    line_token: "",
    line_bot_id: "",
    owner_line_id: "",
    sheet_id: ""
  });
  const [syncing, setSyncing] = useState(null);
  const load = useCallback(() => {
    setLoading(true);
    api("/api/shops").then(r => {
      if (r.shops) setShopList(r.shops);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const createShop = async () => {
    if (!form.name.trim()) {
      toast("กรุณาระบุชื่อร้าน", "err");
      return;
    }
    const res = await api("/api/shops", {
      method: "POST",
      body: form
    });
    if (res.success) {
      toast("สร้างร้านค้าสำเร็จ", "ok");
      setShowCreate(false);
      setForm({
        name: "",
        phone: "",
        personality: "ชาย-สุภาพ",
        ai_provider: "claude",
        line_token: "",
        line_bot_id: "",
        owner_line_id: "",
        sheet_id: ""
      });
      load();
    } else {
      toast(res.error || "สร้างไม่สำเร็จ", "err");
    }
  };
  const syncShop = async shopId => {
    setSyncing(shopId);
    const res = await api("/api/sync", {
      method: "POST",
      body: {
        shopId
      }
    });
    if (res.success) {
      const r = res.result;
      toast("Sync สำเร็จ: สินค้า " + (r.products?.synced || 0) + ", โปรโมชั่น " + (r.promotions?.synced || 0) + ", Slots " + (r.slots?.synced || 0), "ok");
    } else {
      toast(res.error || "Sync ไม่สำเร็จ", "err");
    }
    setSyncing(null);
  };
  const openDetail = shop => {
    setDetailShop(shop);
    setDetailForm({
      name: shop.name || "",
      package: shop.package || "free",
      status: shop.status || "active",
      expiry_date: shop.expiry_date || "",
      line_token: shop.line_token || "",
      line_bot_id: shop.line_bot_id || "",
      owner_line_id: shop.owner_line_id || "",
      ai_provider: shop.ai_provider || "claude",
      sheet_id: shop.sheet_id || ""
    });
  };
  const saveDetail = async () => {
    setSaving(true);
    const res = await api("/api/shops/" + detailShop.id, {
      method: "PUT",
      body: detailForm
    });
    if (res.success) {
      toast("บันทึกข้อมูลร้านแล้ว", "ok");
      setDetailShop(null);
      load();
    } else {
      toast(res.error || "บันทึกไม่สำเร็จ", "err");
    }
    setSaving(false);
  };
  const pkgLabels = {
    free: "Free",
    starter: "Starter - ฿590/เดือน",
    standard: "Standard - ฿990/เดือน",
    pro: "Pro - ฿1,500/เดือน",
    elite: "Elite - ฿1,590/เดือน",
    business: "Business - ฿3,500/เดือน"
  };
  if (loading) return <Loader />;
  return <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">จัดการร้านค้า ({shopList.length})</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
          <Icon d={Icons.plus} size={16} /> สร้างร้านใหม่
        </button>
      </div>

      <div className="space-y-3">
        {shopList.length === 0 ? <div className="text-center text-gray-400 py-12">ยังไม่มีร้านค้า — กดปุ่มด้านบนเพื่อสร้างร้านแรก</div> : shopList.map(s => <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openDetail(s)}>
              <div className="text-gray-900 font-semibold hover:text-blue-400 transition">{s.name}</div>
              <div className="text-gray-500 text-xs mt-1">
                {s.ai_provider || "claude"} | {pkgLabels[s.package] || "Free"} | {s.phone || "-"}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={"text-xs px-2.5 py-0.5 rounded-full font-bold shadow-sm " + (s.status === "active" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")}>
                  {(s.status || "active").toUpperCase()}
                </span>
                {s.expiry_date && <span className="text-gray-400 text-xs">หมดอายุ: {s.expiry_date}</span>}
              </div>
            </div>
            <button onClick={() => syncShop(s.id)} disabled={syncing === s.id} className="flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold px-3 py-2 rounded-lg transition disabled:opacity-50">
              <Icon d={Icons.refresh} size={14} /> {syncing === s.id ? "กำลัง Sync..." : "Sync Sheet"}
            </button>
          </div>)}
      </div>

      {detailShop && <Modal title={"รายละเอียดร้าน: " + detailShop.name} onClose={() => setDetailShop(null)} onSave={saveDetail}>
          <div className="space-y-3">
            <div>
              <label className="block text-gray-500 text-xs mb-1">ชื่อร้าน</label>
              <input type="text" value={detailForm.name} onChange={e => setDetailForm(f => ({
            ...f,
            name: e.target.value
          }))} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-500 text-xs mb-1">แพ็กเกจ</label>
                <DropdownSelect value={detailForm.package} onChange={v => setDetailForm(f => ({
              ...f,
              package: v
            }))} options={[{
              value: "free",
              label: "Free"
            }, {
              value: "pro",
              label: "Pro - ฿1,500/เดือน"
            }, {
              value: "business",
              label: "Business - ฿3,500/เดือน"
            }]} />
              </div>
              <div>
                <label className="block text-gray-500 text-xs mb-1">สถานะ</label>
                <DropdownSelect value={detailForm.status} onChange={v => setDetailForm(f => ({
              ...f,
              status: v
            }))} options={[{
              value: "active",
              label: "Active"
            }, {
              value: "suspended",
              label: "Suspended"
            }]} />
              </div>
            </div>
            <Field type="date" label="วันหมดอายุ" val={detailForm.expiry_date} set={v => setDetailForm(f => ({
          ...f,
          expiry_date: v
        }))} ph="วว/ดด/ปปปป" />
            <div>
              <label className="block text-gray-500 text-xs mb-1">LINE Channel Access Token</label>
              <input type="text" value={detailForm.line_token} onChange={e => setDetailForm(f => ({
            ...f,
            line_token: e.target.value
          }))} placeholder="ใส่ Token จาก LINE Developers" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-500 text-xs mb-1">LINE Bot User ID</label>
                <input type="text" value={detailForm.line_bot_id} onChange={e => setDetailForm(f => ({
              ...f,
              line_bot_id: e.target.value
            }))} placeholder="U..." className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-gray-500 text-xs mb-1">Owner LINE User ID</label>
                <input type="text" value={detailForm.owner_line_id} onChange={e => setDetailForm(f => ({
              ...f,
              owner_line_id: e.target.value
            }))} placeholder="Uxxxx" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">AI Provider</label>
              <DropdownSelect value={detailForm.ai_provider} onChange={v => setDetailForm(f => ({
            ...f,
            ai_provider: v
          }))} options={[{
            value: "claude",
            label: "Claude"
          }, {
            value: "openai",
            label: "OpenAI"
          }, {
            value: "gemini",
            label: "Gemini"
          }, {
            value: "typhoon",
            label: "Typhoon"
          }]} />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Google Sheet ID</label>
              <input type="text" value={detailForm.sheet_id} onChange={e => setDetailForm(f => ({
            ...f,
            sheet_id: e.target.value
          }))} placeholder="ใส่ ID จาก URL ของ Google Sheet" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500" />
            </div>
          </div>
        </Modal>}

      {showCreate && <Modal title="สร้างร้านค้าใหม่" onClose={() => setShowCreate(false)} onSave={createShop}>
          <label className="block text-gray-500 text-xs mb-1">ชื่อร้าน *</label>
          <input type="text" value={form.name} onChange={e => setForm(f => ({
        ...f,
        name: e.target.value
      }))} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 mb-3" />
          <label className="block text-gray-500 text-xs mb-1">เบอร์โทร</label>
          <input type="text" value={form.phone} onChange={e => setForm(f => ({
        ...f,
        phone: e.target.value
      }))} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 mb-3" />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-gray-500 text-xs mb-1">บุคลิก Bot</label>
              <DropdownSelect value={form.personality} onChange={v => setForm(f => ({
            ...f,
            personality: v
          }))} options={[{
            value: "ชาย-สุภาพ",
            label: "ชาย-สุภาพ"
          }, {
            value: "หญิง-สุภาพ",
            label: "หญิง-สุภาพ"
          }, {
            value: "ชาย-เป็นกันเอง",
            label: "ชาย-เป็นกันเอง"
          }, {
            value: "หญิง-เป็นกันเอง",
            label: "หญิง-เป็นกันเอง"
          }]} />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">AI Provider</label>
              <DropdownSelect value={form.ai_provider} onChange={v => setForm(f => ({
            ...f,
            ai_provider: v
          }))} options={[{
            value: "claude",
            label: "Claude"
          }, {
            value: "openai",
            label: "OpenAI"
          }, {
            value: "gemini",
            label: "Gemini"
          }, {
            value: "typhoon",
            label: "Typhoon"
          }]} />
            </div>
          </div>
          <label className="block text-gray-500 text-xs mb-1">LINE Channel Access Token</label>
          <input type="text" value={form.line_token} onChange={e => setForm(f => ({
        ...f,
        line_token: e.target.value
      }))} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 mb-3" />
          <label className="block text-gray-500 text-xs mb-1">LINE Bot User ID</label>
          <input type="text" value={form.line_bot_id} onChange={e => setForm(f => ({
        ...f,
        line_bot_id: e.target.value
      }))} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 mb-3" />
          <label className="block text-gray-500 text-xs mb-1">Owner LINE User ID</label>
          <input type="text" value={form.owner_line_id} onChange={e => setForm(f => ({
        ...f,
        owner_line_id: e.target.value
      }))} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 mb-3" />
          <label className="block text-gray-500 text-xs mb-1">Google Sheet ID (สำหรับ Sync)</label>
          <input type="text" value={form.sheet_id} onChange={e => setForm(f => ({
        ...f,
        sheet_id: e.target.value
      }))} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500" />
        </Modal>}
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  SUPER ADMIN — SA Dashboard
// ═══════════════════════════════════════════════════════════
