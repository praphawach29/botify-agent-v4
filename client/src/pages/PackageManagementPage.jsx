import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  SUPER ADMIN — Package Management
// ═══════════════════════════════════════════════════════════
function PackageManagementPage({
  toast
}) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const loadPackages = useCallback(() => {
    setLoading(true);
    api("/api/packages").then(r => {
      if (r.packages) setPackages(r.packages);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    loadPackages();
  }, [loadPackages]);
  const openEdit = pkg => {
    setEditing(pkg.id);
    setForm({
      name: pkg.name,
      price: pkg.price,
      msg_limit: pkg.msg_limit,
      product_limit: pkg.product_limit,
      description: pkg.description || "",
      featuresText: (pkg.features || []).join("\n")
    });
  };
  const savePackage = async () => {
    setSaving(true);
    const body = {
      name: form.name,
      price: parseInt(form.price) || 0,
      msg_limit: parseInt(form.msg_limit) || 0,
      product_limit: parseInt(form.product_limit) || 0,
      description: form.description,
      features: form.featuresText.split("\n").filter(f => f.trim())
    };
    const res = await api("/api/packages/" + editing, {
      method: "PUT",
      body
    });
    setSaving(false);
    if (res.success) {
      toast("บันทึกแพ็กเกจแล้ว", "ok");
      setEditing(null);
      loadPackages();
    } else {
      toast(res.error || "บันทึกไม่สำเร็จ", "err");
    }
  };
  const pkgColors = {
    Free: "from-slate-600 to-slate-700",
    Starter: "from-slate-600 to-slate-700",
    Pro: "from-blue-600 to-indigo-700",
    Standard: "from-blue-600 to-indigo-700",
    Business: "from-amber-500 to-orange-600",
    Elite: "from-amber-500 to-orange-600"
  };
  const pkgBorders = {
    Free: "border-gray-300",
    Starter: "border-gray-300",
    Pro: "border-blue-500",
    Standard: "border-blue-500",
    Business: "border-amber-500",
    Elite: "border-amber-500"
  };
  if (loading) return <Loader />;
  return <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">จัดการแพ็กเกจ</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {packages.map(pkg => <div key={pkg.id} className={"bg-white border rounded-2xl overflow-hidden " + (pkgBorders[pkg.name] || "border-gray-200")}>
            <div className={"bg-gradient-to-r p-4 " + (pkgColors[pkg.name] || "from-slate-600 to-slate-700")}>
              <div className="text-gray-900 font-bold text-lg">{pkg.name}</div>
              <div className="text-white/80 text-xs">{pkg.description}</div>
            </div>
            <div className="p-4">
              <div className="text-gray-900 text-2xl font-black mb-1">
                {pkg.price === 0 ? "ฟรี" : "฿" + pkg.price.toLocaleString()}
                {pkg.price > 0 && <span className="text-gray-500 text-sm font-normal">/เดือน</span>}
              </div>
              <div className="text-gray-500 text-xs mb-3">
                {pkg.msg_limit === -1 ? "ข้อความไม่จำกัด" : pkg.msg_limit + " ข้อความ/เดือน"} | {pkg.product_limit === -1 ? "สินค้าไม่จำกัด" : pkg.product_limit + " สินค้า"}
              </div>
              <div className="space-y-1.5 mb-4">
                {(pkg.features || []).map((f, i) => <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-emerald-400 mt-0.5"><Icon d={Icons.check} size={14} /></span>
                    <span>{f}</span>
                  </div>)}
              </div>
              <button onClick={() => openEdit(pkg)} className="w-full text-center py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition">
                แก้ไข
              </button>
            </div>
          </div>)}
      </div>

      {editing && <Modal title={"แก้ไขแพ็กเกจ: " + form.name} onClose={() => setEditing(null)} onSave={savePackage}>
          <div className="space-y-3">
            <Field label="ชื่อแพ็กเกจ" val={form.name} set={v => setForm({
          ...form,
          name: v
        })} />
            <Field label="ราคา (฿/เดือน)" val={form.price} set={v => setForm({
          ...form,
          price: v
        })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="ข้อความ/เดือน (-1 = ไม่จำกัด)" val={form.msg_limit} set={v => setForm({
            ...form,
            msg_limit: v
          })} />
              <Field label="สินค้าสูงสุด (-1 = ไม่จำกัด)" val={form.product_limit} set={v => setForm({
            ...form,
            product_limit: v
          })} />
            </div>
            <Field label="คำอธิบาย" val={form.description} set={v => setForm({
          ...form,
          description: v
        })} />
            <Field label="ฟีเจอร์ (บรรทัดละ 1 รายการ)" val={form.featuresText} set={v => setForm({
          ...form,
          featuresText: v
        })} area />
          </div>
          {saving && <div className="text-center text-gray-500 text-xs mt-2">กำลังบันทึก...</div>}
        </Modal>}
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  SUPER ADMIN — AI Management Page
// ═══════════════════════════════════════════════════════════
