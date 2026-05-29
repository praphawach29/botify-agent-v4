import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default function AIKeyInput({
  label,
  settingKey,
  settings,
  onSave
}) {
  const [val, setVal] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const isSet = settings[settingKey + "_set"];
  const masked = settings[settingKey] || "";
  const save = async () => {
    if (!val.trim()) return;
    setSaving(true);
    const res = await api("/api/settings", {
      method: "PUT",
      body: {
        key: settingKey,
        value: val.trim()
      }
    });
    setSaving(false);
    if (res.success) {
      onSave();
      setEditing(false);
      setVal("");
    }
  };
  const clear = async () => {
    setSaving(true);
    await api("/api/settings", {
      method: "PUT",
      body: {
        key: settingKey,
        value: ""
      }
    });
    setSaving(false);
    onSave();
  };
  if (editing) {
    return <div>
        <label className="block text-gray-500 text-xs mb-1">{label}</label>
        <div className="flex gap-2">
          <input type="text" value={val} onChange={e => setVal(e.target.value)} placeholder="sk-ant-... หรือ sk-..." className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-blue-500 font-mono" />
          <button onClick={save} disabled={saving || !val.trim()} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition">
            {saving ? "..." : "บันทึก"}
          </button>
          <button onClick={() => {
          setEditing(false);
          setVal("");
        }} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg transition">
            ยกเลิก
          </button>
        </div>
      </div>;
  }
  return <div>
      <label className="block text-gray-500 text-xs mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <div className={"flex-1 bg-gray-50 border rounded-lg px-3 py-2 text-sm font-mono " + (isSet ? "border-emerald-600/30 text-gray-500" : "border-gray-200 text-slate-600")}>
          {isSet ? masked : "ยังไม่ได้ตั้งค่า"}
        </div>
        <button onClick={() => setEditing(true)} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition whitespace-nowrap">
          {isSet ? "เปลี่ยน" : "ใส่ Key"}
        </button>
        {isSet && <button onClick={clear} disabled={saving} className="px-3 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs rounded-lg transition">
            ลบ
          </button>}
      </div>
    </div>;
}
