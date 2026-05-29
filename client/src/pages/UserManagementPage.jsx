import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  USER MANAGEMENT (Super Admin only)
// ═══════════════════════════════════════════════════════════
function UserManagementPage({
  toast
}) {
  const [users, setUsers] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    displayName: "",
    shopId: "",
    role: "shop_owner"
  });
  const loadUsers = useCallback(() => {
    setLoading(true);
    Promise.all([api("/api/auth/users").then(r => {
      if (r.users) setUsers(r.users);
    }), api("/api/shops").then(r => {
      if (r.shops) setShops(r.shops);
    })]).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);
  const openCreate = () => {
    setEditUser(null);
    setForm({
      email: "",
      password: "",
      displayName: "",
      shopId: "",
      role: "shop_owner"
    });
    setShowCreate(true);
  };
  const openEdit = u => {
    setShowCreate(false);
    setForm({
      email: u.email || "",
      password: "",
      displayName: u.display_name || "",
      shopId: u.shop_id || "",
      role: u.role || "shop_owner"
    });
    setEditUser(u);
  };
  const createUser = async () => {
    if (!form.email.trim() || !form.password || form.password.length < 6) {
      toast("กรุณากรอก email และ password (อย่างน้อย 6 ตัว)", "err");
      return;
    }
    const res = await api("/api/auth/create-user", {
      method: "POST",
      body: {
        email: form.email.trim(),
        password: form.password,
        displayName: form.displayName.trim() || form.email.trim(),
        shopId: form.shopId || null,
        role: form.role
      }
    });
    if (res.success) {
      toast("สร้างผู้ใช้สำเร็จ", "ok");
      setShowCreate(false);
      setForm({
        email: "",
        password: "",
        displayName: "",
        shopId: "",
        role: "shop_owner"
      });
      loadUsers();
    } else {
      toast(res.error || "สร้างไม่สำเร็จ", "err");
    }
  };
  const updateUser = async () => {
    if (!editUser) return;
    const body = {
      userId: editUser.id,
      displayName: form.displayName.trim(),
      shopId: form.shopId || null,
      role: form.role
    };
    if (form.password && form.password.length >= 6) body.password = form.password;else if (form.password && form.password.length > 0 && form.password.length < 6) {
      toast("password ต้องอย่างน้อย 6 ตัว", "err");
      return;
    }
    const res = await api("/api/auth/update-user", {
      method: "PUT",
      body
    });
    if (res.success) {
      toast("อัพเดทผู้ใช้สำเร็จ", "ok");
      setEditUser(null);
      loadUsers();
    } else {
      toast(res.error || "อัพเดทไม่สำเร็จ", "err");
    }
  };
  if (loading) return <Loader />;
  const userFormFields = isEdit => <div className="space-y-3">
      <div>
        <label className="block text-gray-500 text-xs mb-1">Email</label>
        {isEdit ? <div className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-500 text-sm">{form.email}</div> : <input type="email" value={form.email} onChange={e => setForm(f => ({
        ...f,
        email: e.target.value
      }))} placeholder="user@example.com" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500" />}
      </div>
      <div>
        <label className="block text-gray-500 text-xs mb-1">{isEdit ? "Password ใหม่ (เว้นว่างถ้าไม่เปลี่ยน)" : "Password (อย่างน้อย 6 ตัว)"}</label>
        <input type="password" value={form.password} onChange={e => setForm(f => ({
        ...f,
        password: e.target.value
      }))} placeholder={isEdit ? "เว้นว่างถ้าไม่ต้องการเปลี่ยน" : ""} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-gray-500 text-xs mb-1">ชื่อที่แสดง</label>
        <input type="text" value={form.displayName} onChange={e => setForm(f => ({
        ...f,
        displayName: e.target.value
      }))} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-gray-500 text-xs mb-1">ร้านค้า</label>
        <DropdownSelect value={form.shopId} onChange={v => setForm(f => ({
        ...f,
        shopId: v
      }))} placeholder="-- เลือกร้าน --" options={[{
        value: "",
        label: "-- เลือกร้าน --"
      }, ...shops.map(s => ({
        value: s.id,
        label: s.name
      }))]} />
      </div>
      <div>
        <label className="block text-gray-500 text-xs mb-1">Role</label>
        <DropdownSelect value={form.role} onChange={v => setForm(f => ({
        ...f,
        role: v
      }))} options={[{
        value: "shop_owner",
        label: "Shop Owner"
      }, {
        value: "staff",
        label: "Staff"
      }]} />
      </div>
    </div>;
  return <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">จัดการผู้ใช้</h2>
        <button onClick={openCreate} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
          <Icon d={Icons.plus} size={16} /> เพิ่มผู้ใช้
        </button>
      </div>

      {/* Mobile: cards / Desktop: table */}
      <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-xs">
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">ชื่อที่แสดง</th>
              <th className="text-left px-4 py-3">ร้าน</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? <tr><td colSpan={5} className="text-center text-gray-400 py-8">ยังไม่มีผู้ใช้</td></tr> : users.map((u, i) => <tr key={i} className="border-b border-gray-200/50 hover:bg-gray-100/20">
                <td className="px-4 py-3 text-gray-900 text-xs">{u.email}</td>
                <td className="px-4 py-3 text-gray-700 text-sm">{u.display_name || "-"}</td>
                <td className="px-4 py-3 text-gray-700 text-sm">{u.shops?.name || u.shopName || "-"}</td>
                <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300">{u.role || "shop_owner"}</span></td>
                <td className="px-4 py-3">
                  <button onClick={() => openEdit(u)} className="text-blue-400 hover:text-blue-300 text-xs font-medium transition">แก้ไข</button>
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {users.length === 0 ? <div className="text-center text-gray-400 py-8">ยังไม่มีผู้ใช้</div> : users.map((u, i) => <div key={i} className="bg-white border border-gray-200 rounded-xl p-4" onClick={() => openEdit(u)}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-900 text-sm font-medium">{u.display_name || u.email}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300">{u.role || "shop_owner"}</span>
            </div>
            <div className="text-gray-500 text-xs mb-1">{u.email}</div>
            <div className="text-gray-400 text-xs">ร้าน: {u.shops?.name || u.shopName || "-"}</div>
          </div>)}
      </div>

      {showCreate && <Modal title="เพิ่มผู้ใช้ใหม่" onClose={() => setShowCreate(false)} onSave={createUser}>
          {userFormFields(false)}
        </Modal>}

      {editUser && <Modal title={"แก้ไขผู้ใช้: " + (editUser.display_name || editUser.email)} onClose={() => setEditUser(null)} onSave={updateUser}>
          {userFormFields(true)}
        </Modal>}
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  SHOP PICKER (Super Admin — switch between shops)
// ═══════════════════════════════════════════════════════════
