import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  Customer Management
// ═══════════════════════════════════════════════════════════
function CustomerManagementPage({
  toast
}) {
  const [customers, setCustomers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showModal, setShowModal] = React.useState(false);
  const [editId, setEditId] = React.useState(null);
  const [form, setForm] = React.useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    tax_id: "",
    line_id: ""
  });
  const [search, setSearch] = React.useState("");
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers", {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("botify_token")
        }
      });
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (e) {
      toast("Error: " + e.message, "error");
    }
    setLoading(false);
  };
  React.useEffect(() => {
    loadData();
  }, []);
  const handleSave = async () => {
    if (!form.name) return toast("กรุณากรอกชื่อลูกค้า", "error");
    try {
      const url = editId ? `/api/customers/${editId}` : "/api/customers";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("botify_token")
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast("บันทึกข้อมูลเรียบร้อย", "success");
      setShowModal(false);
      loadData();
    } catch (e) {
      toast(e.message, "error");
    }
  };
  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone && c.phone.includes(search) || c.line_id && c.line_id.toLowerCase().includes(search.toLowerCase()));
  return <div className="w-full flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex flex-col">
          <h1 className="text-base md:text-xl font-black text-slate-900 leading-tight whitespace-nowrap">จัดการข้อมูลลูกค้า</h1>
          <p className="text-[10px] text-gray-400 leading-none mt-0.5 hidden sm:block">บันทึกประวัติ รายละเอียด และช่องทางการติดต่อของลูกค้าทั้งหมด</p>
        </div>
        <button onClick={() => {
        setEditId(null);
        setForm({
          name: "",
          phone: "",
          email: "",
          address: "",
          tax_id: "",
          line_id: ""
        });
        setShowModal(true);
      }} className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition shadow-md shadow-blue-500/10">
          <Icon d={Icons.plus} size={14} /> เพิ่มลูกค้า
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-5">
        <div className="absolute left-3 top-2.5 text-gray-400"><Icon d={Icons.search} size={16} /></div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ, เบอร์โทร, LINE ID..." className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-gray-900 text-sm outline-none focus:border-blue-500 transition shadow-sm" />
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-10 text-center text-gray-400 font-bold">กำลังโหลด...</div> : filtered.length === 0 ? <div className="p-10 text-center text-gray-400 font-bold">ไม่มีข้อมูลลูกค้า</div> : <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50">
                <tr className="text-xs text-gray-500 uppercase tracking-wider">
                  <th className="p-4 font-bold">ชื่อลูกค้า</th>
                  <th className="p-4 font-bold">เบอร์โทร</th>
                  <th className="p-4 font-bold">LINE ID</th>
                  <th className="p-4 font-bold text-center w-24">จัดการ</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {filtered.map(c => <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{c.name}</td>
                    <td className="p-4 text-gray-500">{c.phone || "-"}</td>
                    <td className="p-4 text-gray-500 font-mono">{c.line_id || "-"}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => {
                  setEditId(c.id);
                  setForm(c);
                  setShowModal(true);
                }} className="px-3 py-1.5 bg-gray-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-gray-200 hover:border-blue-200 text-xs font-bold rounded-lg transition-colors">
                        แก้ไข
                      </button>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>}
      </div>

      {/* Edit/Add Customer Modal using standard components */}
      {showModal && <Modal title={editId ? "แก้ไขลูกค้า" : "เพิ่มลูกค้าใหม่"} onClose={() => setShowModal(false)} onSave={handleSave}>
          <div className="space-y-3.5">
            <Field label="ชื่อลูกค้า / บริษัท *" val={form.name} set={v => setForm({
          ...form,
          name: v
        })} />
            <Field label="เบอร์โทรศัพท์" val={form.phone} set={v => setForm({
          ...form,
          phone: v
        })} />
            <Field label="LINE ID" val={form.line_id} set={v => setForm({
          ...form,
          line_id: v
        })} />
            <Field label="Email" val={form.email} set={v => setForm({
          ...form,
          email: v
        })} />
            <Field label="ที่อยู่" val={form.address} set={v => setForm({
          ...form,
          address: v
        })} area />
            <Field label="เลขประจำตัวผู้เสียภาษี" val={form.tax_id} set={v => setForm({
          ...form,
          tax_id: v
        })} />
          </div>
        </Modal>}
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  DocumentPreview Component
// ═══════════════════════════════════════════════════════════
