import React, { useState, useEffect, useCallback } from 'react';
import { Icon, Icons, api, Modal, Field } from '../components/Shared';

// ── Steps guide (collapsible on mobile) ──────────────────
function SyncGuide() {
  const [open, setOpen] = useState(true);
  const steps = [
    { n: '1', label: 'ตั้ง Sheet ID', desc: 'ไปที่เมนู "ข้อมูลร้าน" → กรอก Google Sheet ID ของคุณ' },
    { n: '2', label: 'เตรียมข้อมูล', desc: 'ดาวน์โหลด Template CSV แล้ว import เข้า Google Sheet ตามรูปแบบที่กำหนด' },
    { n: '3', label: 'กด Sync Sheet', desc: 'กดปุ่ม "Sync Sheet" เพื่อดึงสินค้าจาก Google Sheet เข้าระบบอัตโนมัติ' },
  ];
  return (
    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, marginBottom: 16, overflow: 'hidden' }}>
      {/* Header — always visible */}
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>💡</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>วิธี Sync สินค้ากับ Google Sheet</span>
        </div>
        <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>{open ? '▲ ซ่อน' : '▼ ดูวิธี'}</span>
      </button>

      {/* Expandable body */}
      {open && (
        <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {steps.map(s => (
            <div key={s.n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 24, height: 24, borderRadius: 99, background: '#f59e0b', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 900, flexShrink: 0, marginTop: 1 }}>
                {s.n}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#78350f', lineHeight: 1.3 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: '#92400e', lineHeight: 1.5, marginTop: 1 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────
function ProductCard({ p, onEdit, onDelete }) {
  const inStock = !p.stock || Number(p.stock) > 0;
  const price   = p.priceUsed || p.priceNew;

  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      transition: 'box-shadow 0.15s',
    }} className="hover:shadow-md">

      {/* Thumbnail / Icon */}
      <div style={{ width: 48, height: 48, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
        background: '#f8fafc', border: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
        ) : null}
        <div style={{ width: '100%', height: '100%', display: p.imageUrl ? 'none' : 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
          🛍️
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            {p.name}
          </span>
          {p.knowledge && <span title="มี Knowledge Base" style={{ fontSize: 12 }}>🧠</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
          {p.category && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#6366f1',
              background: '#eef2ff', padding: '1px 7px', borderRadius: 99 }}>
              {p.category}
            </span>
          )}
          {price && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>
              ฿{Number(price).toLocaleString()}
            </span>
          )}
          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
            color: inStock ? '#065f46' : '#991b1b',
            background: inStock ? '#ecfdf5' : '#fef2f2' }}>
            {inStock ? `สต็อก ${p.stock ?? '∞'}` : 'หมดสต็อก'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button onClick={() => onEdit(p)}
          style={{ width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s' }}
          title="แก้ไข">
          <Icon d={Icons.edit} size={15} />
        </button>
        <button onClick={() => onDelete(p.rowIndex)}
          style={{ width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s' }}
          title="ลบ">
          <Icon d={Icons.trash} size={15} />
        </button>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────
function EmptyState({ onAdd }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 6 }}>ยังไม่มีสินค้า</div>
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20, lineHeight: 1.6 }}>
        เพิ่มสินค้าด้วยตนเอง หรือ Sync จาก Google Sheet<br />เพื่อให้ Bot สามารถแนะนำสินค้าให้ลูกค้าได้
      </div>
      <button onClick={onAdd}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#059669',
          color: '#fff', fontSize: 13, fontWeight: 700, padding: '10px 22px',
          borderRadius: 12, border: 'none', cursor: 'pointer' }}>
        <Icon d={Icons.plus} size={15} /> เพิ่มสินค้าแรก
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  PRODUCTS PAGE
// ═══════════════════════════════════════════════════════════
export default function ProductsPage({ toast }) {
  const [products, setProducts] = useState([]);
  const [search,   setSearch]   = useState('');
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState({});
  const [syncing,  setSyncing]  = useState(false);

  const load = useCallback(() => {
    api('/api/products').then(d => setProducts(d.products || [])).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const filtered   = products.filter(p =>
    !search || (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );
  const categories = React.useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))], [products]);

  const openEdit   = p => { setEditing(p ? p.rowIndex : 'new'); setForm(p || {}); };

  const saveProduct = async () => {
    const method = editing === 'new' ? 'POST' : 'PUT';
    const url    = editing === 'new' ? '/api/products' : '/api/products/' + editing;
    const res    = await api(url, { method, body: form });
    toast(res.success ? 'บันทึกสินค้าแล้ว ✅' : res.error || 'Error', res.success ? 'ok' : 'err');
    if (res.success) { setEditing(null); load(); }
  };

  const delProduct = async ri => {
    if (!confirm('ลบสินค้านี้?')) return;
    const res = await api('/api/products/' + ri, { method: 'DELETE' });
    toast(res.success ? 'ลบแล้ว' : 'Error', res.success ? 'ok' : 'err');
    load();
  };

  const syncSheet = async () => {
    setSyncing(true);
    const res = await api('/api/sync', { method: 'POST', body: { type: 'products' } });
    toast(res.success ? 'Sync สำเร็จ ✅' : res.error || 'Sync ไม่สำเร็จ — ตรวจสอบ Sheet ID', res.success ? 'ok' : 'err');
    if (res.success) load();
    setSyncing(false);
  };

  const downloadTemplate = () => {
    const header  = 'รหัสสินค้า,ชื่อสินค้า,รายละเอียด,ราคา,ราคาโปร,จำนวนสต็อก,หมวดหมู่,ตัวเลือก,URL รูปภาพ,เปิดขาย';
    const example = 'P001,เสื้อยืด Oversize,เสื้อยืดผ้าคอตตอน 100%,350,290,50,เสื้อผ้า,"S,M,L,XL",https://example.com/img.jpg,TRUE';
    const blob = new Blob(['﻿' + header + '\n' + example], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'botify_products_template.csv'; a.click();
  };

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>

      {/* ── Header ──────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(16px,2.5vw,20px)', fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
            สินค้า
          </h1>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
            {products.length} รายการ
          </span>
        </div>

        {/* Desktop: 3 buttons | Mobile: เพิ่มสินค้า only, others below */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Template + Sync — hidden on xs, shown from sm */}
          <div className="hidden sm:flex gap-2">
            <button onClick={downloadTemplate}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff',
                border: '1px solid #bfdbfe', color: '#2563eb', fontSize: 12, fontWeight: 700,
                padding: '8px 14px', borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <span>📥</span> Template
            </button>
            <button onClick={syncSheet} disabled={syncing}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: syncing ? '#fef3c7' : '#fffbeb',
                border: '1px solid #fde68a', color: '#92400e', fontSize: 12, fontWeight: 700,
                padding: '8px 14px', borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap',
                opacity: syncing ? 0.7 : 1 }}>
              <Icon d={Icons.refresh} size={13} /> {syncing ? 'กำลัง Sync...' : 'Sync Sheet'}
            </button>
          </div>

          <button onClick={() => openEdit(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#059669',
              color: '#fff', fontSize: 13, fontWeight: 700, padding: '10px 18px',
              borderRadius: 12, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(5,150,105,0.25)' }}>
            <Icon d={Icons.plus} size={15} />
            <span className="hidden xs:inline">เพิ่มสินค้า</span>
            <span className="xs:hidden">เพิ่ม</span>
          </button>
        </div>
      </div>

      {/* Mobile secondary actions */}
      <div className="flex sm:hidden gap-2 mb-4">
        <button onClick={downloadTemplate}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            background: '#fff', border: '1px solid #bfdbfe', color: '#2563eb',
            fontSize: 11, fontWeight: 700, padding: '8px 10px', borderRadius: 10, cursor: 'pointer' }}>
          📥 Template
        </button>
        <button onClick={syncSheet} disabled={syncing}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e',
            fontSize: 11, fontWeight: 700, padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
            opacity: syncing ? 0.7 : 1 }}>
          <Icon d={Icons.refresh} size={12} /> {syncing ? 'Sync...' : 'Sync Sheet'}
        </button>
      </div>

      {/* ── Sync Guide ──────────────────────────────────── */}
      <SyncGuide />

      {/* ── Search ──────────────────────────────────────── */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}>
          <Icon d={Icons.search} size={15} />
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาสินค้า หรือ หมวดหมู่..."
          style={{ width: '100%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
            paddingLeft: 38, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
            fontSize: 13, color: '#0f172a', outline: 'none', boxSizing: 'border-box',
            transition: 'border-color 0.15s', fontFamily: 'inherit' }}
          onFocus={e => e.target.style.borderColor = '#2563eb'}
          onBlur={e => e.target.style.borderColor = '#e5e7eb'}
        />
        {search && (
          <button onClick={() => setSearch('')}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: '#f3f4f6', border: 'none', borderRadius: 99, cursor: 'pointer',
              width: 20, height: 20, fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✕
          </button>
        )}
      </div>

      {/* ── Product List ─────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(p => (
            <ProductCard key={p.rowIndex} p={p} onEdit={openEdit} onDelete={delProduct} />
          ))}
          <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>
            แสดง {filtered.length} จาก {products.length} รายการ
          </div>
        </div>
      ) : products.length === 0 ? (
        <EmptyState onAdd={() => openEdit(null)} />
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 13 }}>
          ไม่พบสินค้าที่ค้นหา "{search}"
        </div>
      )}

      {/* ── Add/Edit Modal ───────────────────────────────── */}
      {editing !== null && (
        <Modal title={editing === 'new' ? 'เพิ่มสินค้า' : 'แก้ไขสินค้า'}
          onClose={() => setEditing(null)} onSave={saveProduct}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="ชื่อสินค้า *" val={form.name} set={v => setForm({ ...form, name: v })} />
            <div style={{ position: 'relative' }}>
              <Field label="หมวดหมู่" val={form.category} set={v => setForm({ ...form, category: v })} datalist={categories} />
              <button type="button" onClick={() => { setForm({ ...form, category: '' }); toast('พิมพ์ชื่อหมวดหมู่ใหม่ลงในช่องได้เลย', 'ok'); }}
                style={{ position: 'absolute', right: 0, top: 0, fontSize: 10, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                + ใหม่
              </button>
            </div>
            <Field label="ราคา (มือสอง)" val={form.priceUsed} set={v => setForm({ ...form, priceUsed: v })} />
            <Field label="ราคา (ใหม่)"   val={form.priceNew}  set={v => setForm({ ...form, priceNew: v })} />
            <Field label="สต็อก"         val={form.stock}     set={v => setForm({ ...form, stock: v })} />
            <Field label="ลิงก์ซื้อ"     val={form.linkBuy}   set={v => setForm({ ...form, linkBuy: v })} />
            <Field label="URL รูปภาพ"    val={form.imageUrl}  set={v => setForm({ ...form, imageUrl: v })} ph="https://..." />
            <Field label="หมายเหตุ"      val={form.note}      set={v => setForm({ ...form, note: v })} />
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label="จุดเด่น / Features" val={form.feature} set={v => setForm({ ...form, feature: v })} area />
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label="🧠 ข้อมูลสอน AI (Knowledge Base)" val={form.knowledge}
              set={v => setForm({ ...form, knowledge: v })} area
              ph="เช่น วิธีใช้, ข้อควรระวัง, วิธีแก้ไขปัญหาเบื้องต้น..." />
          </div>
        </Modal>
      )}
    </div>
  );
}
