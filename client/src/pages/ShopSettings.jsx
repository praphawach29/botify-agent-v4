import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

function getAuth() {
  try {
    return {
      role: sessionStorage.getItem("botify_role") || "shop_owner",
      displayName: sessionStorage.getItem("botify_display") || "",
      shopId: sessionStorage.getItem("botify_shop_id") || null,
      shopName: sessionStorage.getItem("botify_shop_name") || "",
      email: sessionStorage.getItem("botify_email") || "",
      userId: sessionStorage.getItem("botify_userId") || "",
      username: sessionStorage.getItem("botify_display") || sessionStorage.getItem("botify_email") || ""
    };
  } catch (e) {
    return { role: "shop_owner" };
  }
}

function TeamTab({ toast, shopId }) {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteData, setInviteData] = useState({ name: "", email: "", password: "", role: "staff" });
  const [submitting, setSubmitting] = useState(false);
  const auth = getAuth();

  const loadTeam = useCallback(() => {
    setLoading(true);
    api("/api/team").then(res => {
      if (res.success) setTeam(res.team);
      else toast(res.error || "โหลดข้อมูลทีมไม่สำเร็จ", "err");
    }).catch(e => toast(e.message, "err")).finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  const handleInvite = async () => {
    if (!inviteData.name || !inviteData.email || !inviteData.password) return toast("กรอกข้อมูลไม่ครบ", "err");
    setSubmitting(true);
    try {
      const res = await api("/api/team/invite", { method: "POST", body: inviteData });
      if (res.success) {
        toast("เชิญทีมงานสำเร็จ", "ok");
        setShowInvite(false);
        setInviteData({ name: "", email: "", password: "", role: "staff" });
        loadTeam();
      } else {
        toast(res.error || "เกิดข้อผิดพลาด", "err");
      }
    } catch (e) {
      toast(e.message, "err");
    }
    setSubmitting(false);
  };

  const handleRemove = async (id, name) => {
    if (!window.confirm(`ยืนยันการลบ ${name} ออกจากร้าน?`)) return;
    try {
      const res = await api(`/api/team/${id}`, { method: "DELETE" });
      if (res.success) {
        toast("ลบทีมงานสำเร็จ", "ok");
        loadTeam();
      } else toast(res.error || "ลบไม่สำเร็จ", "err");
    } catch (e) {
      toast(e.message, "err");
    }
  };

  if (loading) return <div className="text-gray-500 text-sm py-4">กำลังโหลด...</div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">จัดการพนักงานและทีมงาน</h3>
          <p className="text-xs text-gray-500">เจ้าของร้านสามารถเพิ่มและกำหนดสิทธิ์ผู้ดูแลระบบได้</p>
        </div>
        {auth.role === "owner" && (
          <button onClick={() => setShowInvite(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition flex gap-1 items-center">
            <Icon d={Icons.plus} size={14} /> เพิ่มพนักงาน
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
            <tr>
              <th className="px-4 py-3 border-b border-gray-100">ชื่อ - นามสกุล</th>
              <th className="px-4 py-3 border-b border-gray-100">อีเมล</th>
              <th className="px-4 py-3 border-b border-gray-100">สิทธิ์การใช้งาน (Role)</th>
              <th className="px-4 py-3 border-b border-gray-100 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {team.map(member => (
              <tr key={member.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3 text-gray-900 font-medium">{member.name}</td>
                <td className="px-4 py-3 text-gray-500">{member.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${member.role === 'owner' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {member.role === 'owner' ? 'เจ้าของร้าน (Owner)' : 'พนักงาน (Staff)'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {auth.role === "owner" && member.id !== auth.userId && (
                    <button onClick={() => handleRemove(member.id, member.name)} className="text-red-500 hover:text-red-600 p-1 bg-red-50 hover:bg-red-100 rounded transition">
                      <Icon d={Icons.trash} size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {team.length === 0 && (
              <tr><td colSpan={4} className="text-center py-6 text-gray-400">ยังไม่มีทีมงาน</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showInvite && (
        <Modal title="เพิ่มพนักงานใหม่" onClose={() => setShowInvite(false)} onConfirm={handleInvite} confirmText="เพิ่มบัญชี" loading={submitting}>
          <div className="space-y-3">
            <Field label="ชื่อ - นามสกุล">
              <input className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="เช่น นายเอ นามสกุลบี" value={inviteData.name} onChange={e => setInviteData({...inviteData, name: e.target.value})} />
            </Field>
            <Field label="อีเมลสำหรับเข้าสู่ระบบ">
              <input type="email" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="email@example.com" value={inviteData.email} onChange={e => setInviteData({...inviteData, email: e.target.value})} />
            </Field>
            <Field label="รหัสผ่านชั่วคราว">
              <input type="text" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="ตั้งรหัสผ่านให้พนักงาน (6 ตัวขึ้นไป)" value={inviteData.password} onChange={e => setInviteData({...inviteData, password: e.target.value})} />
            </Field>
            <Field label="สิทธิ์การใช้งาน">
              <select className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" value={inviteData.role} onChange={e => setInviteData({...inviteData, role: e.target.value})}>
                <option value="staff">พนักงาน (จัดการสินค้า/ออเดอร์/ตอบแชท)</option>
                <option value="owner">เจ้าของร้าน (ตั้งค่าทุกอย่าง)</option>
              </select>
            </Field>
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mt-2">
              ⚠️ โปรดส่งอีเมลและรหัสผ่านนี้ให้พนักงาน เพื่อใช้ล็อคอินเข้าสู่ร้านของคุณ
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default // ═══════════════════════════════════════════════════════════
//  SHOP SETTINGS
// ═══════════════════════════════════════════════════════════
function ShopSettings({
  toast
}) {
  const [info, setInfo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [pay, setPay] = useState(null);
  const [savingPay, setSavingPay] = useState(false);
  // Slug state
  const [slugData, setSlugData] = useState({
    slug: "",
    url: ""
  });
  const [slugInput, setSlugInput] = useState("");
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState(null);
  const [savingSlug, setSavingSlug] = useState(false);
  const [slugCopied, setSlugCopied] = useState(false);
  const auth = getAuth();
  const shopId = auth.shopId;
  useEffect(() => {
    api("/api/shopinfo").then(d => setInfo(d.info || {})).catch(() => {});
    api("/api/slug").then(d => {
      if (d.success) {
        setSlugData(d);
        setSlugInput(d.slug || "");
      }
    }).catch(() => {});
    if (shopId) {
      api("/api/shops").then(r => {
        const shop = (r.shops || []).find(s => s.id === shopId);
        if (shop) setPay({
          payment_transfer: shop.payment_transfer !== false,
          payment_promptpay: shop.payment_promptpay || "",
          payment_bank_name: shop.payment_bank_name || "",
          payment_bank_account: shop.payment_bank_account || "",
          payment_bank_acc_name: shop.payment_bank_acc_name || "",
          payment_cod: !!shop.payment_cod,
          payment_cod_fee: shop.payment_cod_fee || "",
          payment_pickup: !!shop.payment_pickup
        });
      }).catch(() => {});
    }
  }, [shopId]);

  // Slug check debounce
  useEffect(() => {
    if (!slugInput || slugInput.length < 3 || slugInput === slugData.slug) {
      setSlugAvailable(null);
      return;
    }
    setSlugChecking(true);
    const t = setTimeout(() => {
      fetch("/api/slug/check/" + encodeURIComponent(slugInput)).then(r => r.json()).then(d => {
        setSlugAvailable(d.available);
        setSlugChecking(false);
      }).catch(() => setSlugChecking(false));
    }, 500);
    return () => clearTimeout(t);
  }, [slugInput]);
  const save = async () => {
    setSaving(true);
    const res = await api("/api/shopinfo", {
      method: "PUT",
      body: {
        info
      }
    });
    toast(res.success ? "บันทึกข้อมูลร้านแล้ว" : "เกิดข้อผิดพลาด", res.success ? "ok" : "err");
    setSaving(false);
  };
  const savePayment = async () => {
    if (!shopId) {
      toast("ไม่พบ shop ID", "err");
      return;
    }
    setSavingPay(true);
    const res = await api("/api/shops/" + shopId + "/payment", {
      method: "PUT",
      body: pay
    });
    toast(res.success ? "บันทึกวิธีชำระเงินสำเร็จ" : "บันทึกไม่สำเร็จ: " + (res.error || "ไม่ทราบสาเหตุ"), res.success ? "ok" : "err");
    setSavingPay(false);
  };
  if (!info) return <Loader />;
  const fields = [{
    key: "SHOP_NAME",
    label: "ชื่อร้าน",
    ph: "ร้าน ABC"
  }, {
    key: "LOGO",
    label: "ลิงก์รูปภาพโลโก้ร้านค้า (สำหรับแสดงบนหัวเอกสารการขาย)",
    ph: "เช่น https://..."
  }, {
    key: "PHONE",
    label: "เบอร์โทร",
    ph: "081-234-5678"
  }, {
    key: "ADDRESS",
    label: "ที่อยู่",
    ph: "123 ถ.xxx แขวง/ตำบล..."
  }, {
    key: "OPEN_HOURS",
    label: "เวลาทำการ",
    ph: "จ-ศ 9:00-18:00"
  }, {
    key: "LINE_OA",
    label: "LINE OA",
    ph: "@shopname"
  }, {
    key: "FACEBOOK_PAGE",
    label: "Facebook Page",
    ph: "https://fb.com/..."
  }, {
    key: "WEBSITE",
    label: "Website",
    ph: "https://..."
  }, {
    key: "WELCOME_MSG",
    label: "ข้อความต้อนรับ",
    ph: "สวัสดีครับ! ยินดีต้อนรับ..."
  }, {
    key: "CLOSING_MSG",
    label: "ข้อความปิดการขาย",
    ph: "ขอบคุณที่ใช้บริการครับ..."
  }, {
    key: "WARRANTY_POLICY",
    label: "นโยบายรับประกัน",
    ph: "รับประกัน 1 ปี..."
  }, {
    key: "RETURN_POLICY",
    label: "นโยบายคืนสินค้า",
    ph: "คืนได้ภายใน 7 วัน..."
  }];
  const inputCls = "w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 transition";
  return <div>
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col">
          <h1 className="text-base md:text-xl font-black text-slate-900 leading-tight whitespace-nowrap">ข้อมูลร้าน</h1>
          <p className="text-[10px] text-gray-400 leading-none mt-0.5 hidden sm:block">ตั้งค่าข้อมูลทั่วไป วิธีรับชำระเงิน และลิงก์ร้านค้าของคุณ</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
          {[{
          id: "general",
          label: "ข้อมูลทั่วไป"
        }, {
          id: "payment",
          label: "วิธีชำระเงิน"
        }, {
          id: "slug",
          label: "URL ร้านค้า"
        }, {
          id: "backup",
          label: "สำรองข้อมูล"
        }, {
          id: "team",
          label: "ทีมงาน"
        }].map(t => <button key={t.id} onClick={() => setActiveTab(t.id)} className={"flex-1 sm:flex-none flex items-center justify-center py-2 px-3.5 text-[11px] sm:text-xs font-bold rounded-xl transition-all shadow-sm border " + (activeTab === t.id ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/15" : "bg-white text-slate-600 border-gray-200 hover:bg-gray-50")}>
              {t.label}
            </button>)}
        </div>
      </div>

      {/* ── Tab: ข้อมูลทั่วไป ── */}
      {activeTab === "general" && <div>
          <div className="grid md:grid-cols-2 gap-4">
            {fields.map(f => <div key={f.key} className="bg-white border border-gray-200 rounded-xl p-4">
                <label className="block text-gray-500 text-xs mb-1">{f.label}</label>
                {f.key.includes("MSG") || f.key.includes("POLICY") ? <textarea value={info[f.key] || ""} onChange={e => setInfo({
            ...info,
            [f.key]: e.target.value
          })} placeholder={f.ph} rows={3} className={inputCls + " resize-none"} /> : <input value={info[f.key] || ""} onChange={e => setInfo({
            ...info,
            [f.key]: e.target.value
          })} placeholder={f.ph} className={inputCls} />}
              </div>)}
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
              <Icon d={Icons.save} size={16} /> {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลร้าน"}
            </button>
          </div>
        </div>}

      {/* ── Tab: วิธีชำระเงิน ── */}
      {activeTab === "payment" && pay && <div className="space-y-4 max-w-2xl">
          {/* Transfer / PromptPay */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <label className="flex items-center gap-2 text-gray-900 text-sm font-medium mb-3 cursor-pointer">
              <input type="checkbox" checked={pay.payment_transfer} onChange={e => setPay(p => ({
            ...p,
            payment_transfer: e.target.checked
          }))} className="rounded border-gray-300 bg-white text-blue-500" />
              โอนเงิน / PromptPay
            </label>
            {pay.payment_transfer && <div className="space-y-3 ml-6">
                <div>
                  <label className="block text-gray-500 text-xs mb-1">เลข PromptPay</label>
                  <input value={pay.payment_promptpay} onChange={e => setPay(p => ({
              ...p,
              payment_promptpay: e.target.value
            }))} placeholder="095-585-1136 หรือ เลขบัตรประชาชน" className={inputCls} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">ธนาคาร</label>
                    <input value={pay.payment_bank_name} onChange={e => setPay(p => ({
                ...p,
                payment_bank_name: e.target.value
              }))} placeholder="กสิกรไทย" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">เลขบัญชี</label>
                    <input value={pay.payment_bank_account} onChange={e => setPay(p => ({
                ...p,
                payment_bank_account: e.target.value
              }))} placeholder="xxx-x-xxxxx-x" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">ชื่อบัญชี</label>
                    <input value={pay.payment_bank_acc_name} onChange={e => setPay(p => ({
                ...p,
                payment_bank_acc_name: e.target.value
              }))} placeholder="นาย/นาง..." className={inputCls} />
                  </div>
                </div>
              </div>}
          </div>

          {/* COD */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <label className="flex items-center gap-2 text-gray-900 text-sm font-medium mb-3 cursor-pointer">
              <input type="checkbox" checked={pay.payment_cod} onChange={e => setPay(p => ({
            ...p,
            payment_cod: e.target.checked
          }))} className="rounded border-gray-300 bg-white text-blue-500" />
              เก็บเงินปลายทาง (COD)
            </label>
            {pay.payment_cod && <div className="ml-6">
                <label className="block text-gray-500 text-xs mb-1">ค่าธรรมเนียม COD</label>
                <input value={pay.payment_cod_fee} onChange={e => setPay(p => ({
            ...p,
            payment_cod_fee: e.target.value
          }))} placeholder="ฟรี หรือ 20 บาท" className={inputCls} />
              </div>}
          </div>

          {/* Pickup */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <label className="flex items-center gap-2 text-gray-900 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={pay.payment_pickup} onChange={e => setPay(p => ({
            ...p,
            payment_pickup: e.target.checked
          }))} className="rounded border-gray-300 bg-white text-blue-500" />
              รับหน้าร้าน (จ่ายเงินสดที่ร้าน)
            </label>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-blue-300 text-xs">
            Bot จะแจ้งวิธีชำระเงินให้ลูกค้าอัตโนมัติตามที่ตั้งค่าไว้
          </div>

          <div className="flex justify-end">
            <button onClick={savePayment} disabled={savingPay} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
              <Icon d={Icons.save} size={16} /> {savingPay ? "กำลังบันทึก..." : "บันทึกวิธีชำระเงิน"}
            </button>
          </div>
        </div>}

      {activeTab === "payment" && !pay && <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-300 text-sm">
          ไม่สามารถโหลดข้อมูลวิธีชำระเงินได้ กรุณาลองใหม่อีกครั้ง
        </div>}

      {/* ── Tab: URL ร้านค้า (Slug) ── */}
      {activeTab === "slug" && <div className="space-y-5 max-w-2xl">
          {/* Current URL */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-gray-900 font-semibold text-sm mb-3">🔗 URL หน้าร้านค้าสาธารณะ</h3>
            <p className="text-gray-500 text-xs mb-4">ลูกค้าสามารถเปิดดูสินค้าของร้านได้ผ่าน URL นี้ แชร์ลงโซเชียลได้เลย</p>

            {slugData.url ? <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-lg p-3">
                <span className="text-blue-400 text-sm flex-1 truncate">{slugData.url}</span>
                <button onClick={() => {
            navigator.clipboard.writeText(slugData.url);
            setSlugCopied(true);
            setTimeout(() => setSlugCopied(false), 2000);
          }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition whitespace-nowrap">
                  {slugCopied ? "Copied!" : "Copy"}
                </button>
                <a href={slugData.url} target="_blank" rel="noopener" className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-900 text-xs font-medium rounded-lg transition whitespace-nowrap">
                  Open
                </a>
              </div> : <div className="text-amber-400 text-sm">ยังไม่มี slug — กรุณาตั้งค่าด้านล่าง</div>}
          </div>

          {/* Edit Slug */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-gray-900 font-semibold text-sm mb-3">แก้ไข Slug</h3>
            <p className="text-gray-500 text-xs mb-4">Slug คือส่วนท้ายของ URL เช่น /shop/<b className="text-gray-900">my-store</b> — ใช้ตัวอักษรภาษาอังกฤษ ตัวเลข และขีด (-) เท่านั้น ขั้นต่ำ 3 ตัวอักษร</p>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-gray-400 text-sm whitespace-nowrap">/shop/</span>
              <input value={slugInput} onChange={e => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").slice(0, 60))} placeholder="my-store" className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 transition" />
            </div>

            {/* Status indicator */}
            {slugInput && slugInput.length >= 3 && slugInput !== slugData.slug && <div className={"text-xs mb-3 " + (slugChecking ? "text-gray-500" : slugAvailable ? "text-green-400" : slugAvailable === false ? "text-red-400" : "text-gray-500")}>
                {slugChecking ? "Checking..." : slugAvailable ? "✅ ใช้ได้!" : slugAvailable === false ? "❌ ถูกใช้แล้ว กรุณาเลือกชื่ออื่น" : ""}
              </div>}
            {slugInput && slugInput.length < 3 && <div className="text-xs mb-3 text-amber-400">ต้องมีอย่างน้อย 3 ตัวอักษร</div>}

            <button onClick={async () => {
          if (!slugInput || slugInput.length < 3) {
            toast("Slug ต้องมีอย่างน้อย 3 ตัวอักษร", "err");
            return;
          }
          if (slugInput === slugData.slug) {
            toast("Slug ไม่มีการเปลี่ยนแปลง", "err");
            return;
          }
          setSavingSlug(true);
          const res = await api("/api/slug", {
            method: "PUT",
            body: {
              slug: slugInput
            }
          });
          if (res.success) {
            setSlugData({
              slug: res.slug,
              url: res.url
            });
            toast("บันทึก URL สำเร็จ!", "ok");
            setSlugAvailable(null);
          } else {
            toast(res.error || "บันทึกไม่สำเร็จ", "err");
          }
          setSavingSlug(false);
        }} disabled={savingSlug || !slugInput || slugInput.length < 3 || slugInput === slugData.slug || slugAvailable === false} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
              <Icon d={Icons.save} size={16} /> {savingSlug ? "กำลังบันทึก..." : "บันทึก URL"}
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-blue-300 text-xs space-y-1">
            <p>💡 <b>ประโยชน์ของ URL ร้านค้า:</b></p>
            <p>• แชร์ลิงก์ร้านให้ลูกค้าดูแค็ตตาล็อกสินค้าได้ทันที</p>
            <p>• ลูกค้ากดปุ่ม "แชทใน LINE" เพื่อสั่งซื้อผ่าน Bot ได้เลย</p>
            <p>• ใช้โปรโมทบน Social Media หรือนามบัตรได้</p>
          </div>
        </div>}

      {/* ── Tab: สำรองข้อมูล (Backup) ── */}
      {activeTab === "backup" && <div className="space-y-5 max-w-2xl">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-gray-900 font-semibold text-sm mb-3">📦 สำรองข้อมูลร้านค้า</h3>
            <p className="text-gray-500 text-xs mb-4">ดาวน์โหลดข้อมูลสินค้า ออเดอร์ และลูกค้าทั้งหมดในรูปแบบไฟล์ ZIP (ประกอบด้วยไฟล์ CSV) เพื่อนำไปใช้งานต่อ หรือเก็บเป็นแบ็คอัพ</p>
            
            <button onClick={() => {
              window.open("/api/backup/shop?shop_id=" + shopId + "&token=" + TokenManager.get(), "_blank");
            }} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              ดาวน์โหลด Backup (.zip)
            </button>
            <p className="text-xs text-gray-400 mt-3">ระบบจะรวบรวมข้อมูลล่าสุดจากฐานข้อมูลทันที</p>
          </div>
        </div>}

      {/* ── Tab: ทีมงาน (Team) ── */}
      {activeTab === "team" && <TeamTab toast={toast} shopId={shopId} />}
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  BOT PERSONALITY CONFIG
// ═══════════════════════════════════════════════════════════
