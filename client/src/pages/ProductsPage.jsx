import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  PRODUCTS CRUD
// ═══════════════════════════════════════════════════════════
function ProductsPage({
  toast
}) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const load = useCallback(() => {
    api("/api/products").then(d => setProducts(d.products || [])).catch(() => {});
  }, []);
  useEffect(load, [load]);
  const filtered = products.filter(p => !search || (p.name || "").toLowerCase().includes(search.toLowerCase()) || (p.category || "").toLowerCase().includes(search.toLowerCase()));
  const categories = React.useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))], [products]);
  const openEdit = p => {
    setEditing(p ? p.rowIndex : "new");
    setForm(p || {});
  };
  const saveProduct = async () => {
    const method = editing === "new" ? "POST" : "PUT";
    const url = editing === "new" ? "/api/products" : "/api/products/" + editing;
    const res = await api(url, {
      method,
      body: form
    });
    toast(res.success ? "บันทึกสินค้าแล้ว ✅" : res.error || "Error", res.success ? "ok" : "err");
    if (res.success) {
      setEditing(null);
      load();
    }
  };
  const delProduct = async ri => {
    if (!confirm("ลบสินค้านี้?")) return;
    const res = await api("/api/products/" + ri, {
      method: "DELETE"
    });
    toast(res.success ? "ลบแล้ว" : "Error", res.success ? "ok" : "err");
    load();
  };
  const [syncing, setSyncing] = useState(false);
  const syncSheet = async () => {
    setSyncing(true);
    const res = await api("/api/sync", {
      method: "POST",
      body: {
        type: "products"
      }
    });
    toast(res.success ? "Sync สินค้าจาก Google Sheet สำเร็จ ✅" : res.error || "Sync ไม่สำเร็จ — ตรวจสอบ Sheet ID", res.success ? "ok" : "err");
    if (res.success) load();
    setSyncing(false);
  };
  const downloadTemplate = () => {
    const header = "รหัสสินค้า,ชื่อสินค้า,รายละเอียด,ราคา,ราคาโปร,จำนวนสต็อก,หมวดหมู่,ตัวเลือก,URL รูปภาพ,เปิดขาย";
    const example = "P001,เสื้อยืด Oversize,เสื้อยืดผ้าคอตตอน 100%,350,290,50,เสื้อผ้า,\"S,M,L,XL\",https://example.com/img.jpg,TRUE";
    const csv = header + "\n" + example;
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;"
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "botify_products_template.csv";
    link.click();
  };
  return <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-base md:text-xl font-black text-slate-900 leading-tight whitespace-nowrap">สินค้า ({products.length})</h1>
        </div>
        <div className="flex w-full sm:w-auto gap-1.5 sm:gap-2">
          <button onClick={downloadTemplate} className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-white border border-blue-400 hover:bg-blue-50 text-blue-600 text-[11px] sm:text-xs font-semibold px-1 sm:px-3 py-2 rounded-lg transition whitespace-nowrap" title="ดาวน์โหลด Template CSV">
            📥 Template
          </button>
          <button onClick={syncSheet} disabled={syncing} className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-[11px] sm:text-xs font-semibold px-1 sm:px-3 py-2 rounded-lg transition whitespace-nowrap" title="Sync สินค้าจาก Google Sheet">
            <Icon d={Icons.refresh} size={14} /> {syncing ? "Sync..." : "Sync Sheet"}
          </button>
          <button onClick={() => openEdit(null)} className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-sm font-semibold px-1 sm:px-3 py-2 rounded-lg transition whitespace-nowrap">
            <Icon d={Icons.plus} size={14} /> เพิ่มสินค้า
          </button>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4 text-amber-300 text-xs">
        💡 <strong>Sync กับ Google Sheet:</strong> ตั้ง Sheet ID ในหน้า "ข้อมูลร้าน" → กดปุ่ม "Sync Sheet" เพื่อนำเข้าสินค้า หรือดาวน์โหลด Template แล้ว import เข้า Google Sheet ก่อน Sync
      </div>

      <div className="relative mb-4">
        <div className="absolute left-3 top-2.5 text-gray-400"><Icon d={Icons.search} size={16} /></div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาสินค้า..." className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-gray-900 text-sm outline-none focus:border-blue-500 transition" />
      </div>

      <div className="space-y-2">
        {filtered.map(p => <div key={p.rowIndex} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-gray-900 text-sm font-medium truncate">
                {p.name} {p.knowledge && <span title="มี Knowledge Base สอน AI" className="text-sm">🧠</span>}
              </div>
              <div className="text-gray-400 text-xs">{p.category} | ราคา: {p.priceUsed || p.priceNew || "-"} | สต็อก: {p.stock}</div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => openEdit(p)} className="text-blue-400 hover:bg-blue-500/20 p-1.5 rounded-lg transition"><Icon d={Icons.edit} size={16} /></button>
              <button onClick={() => delProduct(p.rowIndex)} className="text-red-400 hover:bg-red-500/20 p-1.5 rounded-lg transition"><Icon d={Icons.trash} size={16} /></button>
            </div>
          </div>)}
        {filtered.length === 0 && <div className="text-gray-400 text-center py-10 text-sm">ไม่พบสินค้า</div>}
      </div>

      {editing !== null && <Modal title={editing === "new" ? "เพิ่มสินค้า" : "แก้ไขสินค้า"} onClose={() => setEditing(null)} onSave={saveProduct}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="ชื่อสินค้า *" val={form.name} set={v => setForm({
          ...form,
          name: v
        })} />
            <div className="relative">
              <Field label="หมวดหมู่" val={form.category} set={v => setForm({
            ...form,
            category: v
          })} datalist={categories} />
              <button onClick={() => {
            setForm({
              ...form,
              category: ""
            });
            toast("พิมพ์ชื่อหมวดหมู่ใหม่ลงในช่องได้เลยครับ", "ok");
          }} className="absolute right-0 top-0 text-[10px] text-blue-500 font-bold hover:underline" type="button">
                + เพิ่มหมวดหมู่ใหม่
              </button>
            </div>
            <Field label="ราคา (มือสอง)" val={form.priceUsed} set={v => setForm({
          ...form,
          priceUsed: v
        })} />
            <Field label="ราคา (ใหม่)" val={form.priceNew} set={v => setForm({
          ...form,
          priceNew: v
        })} />
            <Field label="สต็อก" val={form.stock} set={v => setForm({
          ...form,
          stock: v
        })} />
            <Field label="ลิงก์ซื้อ" val={form.linkBuy} set={v => setForm({
          ...form,
          linkBuy: v
        })} />
            <Field label="URL รูปภาพ" val={form.imageUrl} set={v => setForm({
          ...form,
          imageUrl: v
        })} ph="https://..." />
            <Field label="หมายเหตุ" val={form.note} set={v => setForm({
          ...form,
          note: v
        })} />
          </div>
          <div className="mt-3">
            <Field label="จุดเด่น / Features" val={form.feature} set={v => setForm({
          ...form,
          feature: v
        })} area />
          </div>
          <div className="mt-3">
            <Field label="🧠 ข้อมูลสอน AI เฉพาะสินค้า (Knowledge Base)" val={form.knowledge} set={v => setForm({
          ...form,
          knowledge: v
        })} area ph="เช่น วิธีใช้, ข้อควรระวัง, วิธีแก้ไขปัญหาเบื้องต้น..." />
          </div>
        </Modal>}
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  ORDERS PAGE
// ═══════════════════════════════════════════════════════════
