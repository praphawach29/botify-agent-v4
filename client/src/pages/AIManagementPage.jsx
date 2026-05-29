import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default function AIManagementPage({
  toast
}) {
  const [shops, setShops] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [expandedProvider, setExpandedProvider] = useState(null);
  const [shopKeyEditing, setShopKeyEditing] = useState(null);
  const [shopKeyVal, setShopKeyVal] = useState("");
  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([api("/api/shops").then(r => {
      if (r.shops) setShops(r.shops);
    }), api("/api/settings").then(r => {
      if (r.settings) setSettings(r.settings);
    })]).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    loadAll();
  }, [loadAll]);
  const reloadSettings = () => {
    api("/api/settings").then(r => {
      if (r.settings) setSettings(r.settings);
      toast("บันทึก API Key สำเร็จ", "ok");
    });
  };
  const updateShopAI = async (shopId, ai_provider, ai_model, ai_key) => {
    setSaving(shopId);
    const body = {
      ai_provider,
      ai_model
    };
    if (ai_key !== undefined) body.ai_key = ai_key;
    const res = await api("/api/shops/" + shopId + "/ai", {
      method: "PUT",
      body
    });
    setSaving(null);
    if (res.success) {
      toast("บันทึกสำเร็จ", "ok");
      setShops(prev => prev.map(s => s.id === shopId ? {
        ...s,
        ai_provider,
        ai_model,
        ai_key: res.shop?.ai_key || s.ai_key
      } : s));
    } else {
      toast(res.error || "บันทึกไม่สำเร็จ", "err");
    }
  };
  const changeProvider = (shopId, newProvider) => {
    const p = AI_PROVIDERS.find(x => x.id === newProvider);
    const defaultModel = p ? p.models[0].value : "";
    updateShopAI(shopId, newProvider, defaultModel);
  };
  const changeModel = (shopId, currentProvider, newModel) => {
    updateShopAI(shopId, currentProvider, newModel);
  };
  const saveShopKey = async (shopId, prov, model) => {
    await updateShopAI(shopId, prov, model, shopKeyVal.trim());
    setShopKeyEditing(null);
    setShopKeyVal("");
  };
  const clearShopKey = async (shopId, prov, model) => {
    await updateShopAI(shopId, prov, model, "");
  };
  const getModelsForProvider = providerId => {
    const p = AI_PROVIDERS.find(x => x.id === providerId);
    return p ? p.models.map(m => ({
      value: m.value,
      label: m.label + (m.badge ? " (" + m.badge + ")" : "")
    })) : [];
  };
  const providerKeyMap = {
    claude: "claude_key",
    openai: "openai_key",
    gemini: "gemini_key",
    typhoon: "typhoon_key"
  };
  if (loading) return <Loader />;
  return <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">จัดการ AI</h2>
      <p className="text-gray-500 text-sm mb-6">ตั้งค่า API Keys, เลือก Provider และ Model สำหรับแต่ละร้านค้า</p>

      {/* ══════ Section 1: Global API Keys ══════ */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Icon d={Icons.save} size={18} /> API Keys กลาง
        </h3>
        <p className="text-gray-500 text-xs mb-4">Key กลางที่ทุกร้านใช้ร่วมกัน (ร้านที่มี key ของตัวเองจะใช้ key ของร้านแทน)</p>
        <div className="space-y-3">
          <AIKeyInput label="Claude API Key" settingKey="claude_key" settings={settings} onSave={reloadSettings} />
          <AIKeyInput label="OpenAI API Key" settingKey="openai_key" settings={settings} onSave={reloadSettings} />
          <AIKeyInput label="Gemini API Key" settingKey="gemini_key" settings={settings} onSave={reloadSettings} />
          <AIKeyInput label="Typhoon API Key" settingKey="typhoon_key" settings={settings} onSave={reloadSettings} />
        </div>
        <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-300 text-xs">
          <strong>ลำดับการใช้ Key:</strong> Key ของร้าน (ถ้ามี) → Key กลาง (ที่ตั้งไว้ด้านบน) → Key จาก .env (Vercel/Railway)
        </div>
      </div>

      {/* ══════ Section 2: AI Provider Cards ══════ */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {AI_PROVIDERS.map(p => {
        const isOpen = expandedProvider === p.id;
        const shopCount = shops.filter(s => s.ai_provider === p.id).length;
        const hasGlobalKey = settings[p.id === "claude" ? "claude_key_set" : p.id === "openai" ? "openai_key_set" : p.id === "gemini" ? "gemini_key_set" : "typhoon_key_set"];
        return <div key={p.id} className={"bg-white border rounded-2xl overflow-hidden transition-all " + p.border}>
              <button onClick={() => setExpandedProvider(isOpen ? null : p.id)} className="w-full text-left">
                <div className={"bg-gradient-to-r p-4 flex items-center gap-3 " + p.color}>
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Icon d={p.icon} size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-900 font-bold flex items-center gap-2">
                      {p.name}
                      {hasGlobalKey && <span className="w-2 h-2 rounded-full bg-emerald-400" title="มี API Key แล้ว" />}
                    </div>
                    <div className="text-white/70 text-xs">{p.models.length} models | ใช้อยู่ {shopCount} ร้าน</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={"text-white/70 transition-transform " + (isOpen ? "rotate-180" : "")}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </button>
              {isOpen && <div className="p-4 space-y-2">
                  {p.models.map(m => <div key={m.value} className="bg-gray-50 border border-gray-200/50 rounded-xl p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 text-sm font-medium">{m.label}</span>
                          {m.badge && <span className={"text-xs px-1.5 py-0.5 rounded-full " + (m.badge === "แนะนำ" ? "bg-emerald-600/20 text-emerald-300" : m.badge === "Premium" ? "bg-amber-600/20 text-amber-300" : "bg-slate-600/30 text-gray-500")}>{m.badge}</span>}
                        </div>
                        <div className="text-gray-500 text-xs mt-0.5">{m.desc}</div>
                      </div>
                      <div className="text-gray-400 text-xs whitespace-nowrap font-mono hidden sm:block">{m.value.length > 25 ? m.value.slice(0, 22) + "..." : m.value}</div>
                    </div>)}
                </div>}
            </div>;
      })}
      </div>

      {/* ══════ Section 3: Per-Shop AI Assignment ══════ */}
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Icon d={Icons.settings} size={18} /> ตั้งค่า AI ประจำร้านค้า
      </h3>

      {shops.length === 0 ? <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">ยังไม่มีร้านค้า</div> : <div className="space-y-3">
          {shops.map(shop => {
        const prov = shop.ai_provider || "claude";
        const model = shop.ai_model || "";
        const providerData = AI_PROVIDERS.find(x => x.id === prov) || AI_PROVIDERS[0];
        const modelOptions = getModelsForProvider(prov);
        const isSavingThis = saving === shop.id;
        const hasShopKey = !!(shop.ai_key && shop.ai_key !== "");
        const isEditingKey = shopKeyEditing === shop.id;
        return <div key={shop.id} className={"bg-white border rounded-xl p-4 transition " + (isSavingThis ? "border-blue-500/50" : "border-gray-200")}>
                {/* Shop name + status */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={"w-2.5 h-2.5 rounded-full " + (shop.status === "active" ? "bg-emerald-400" : "bg-red-400")} />
                  <span className="text-gray-900 font-medium">{shop.name}</span>
                  {isSavingThis && <span className="text-blue-400 text-xs animate-pulse ml-auto">กำลังบันทึก...</span>}
                </div>
                {/* Provider + Model dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">AI Provider</label>
                    <DropdownSelect value={prov} onChange={v => changeProvider(shop.id, v)} options={AI_PROVIDERS.map(x => ({
                value: x.id,
                label: x.name
              }))} />
                  </div>
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">Model</label>
                    <DropdownSelect value={model} onChange={v => changeModel(shop.id, prov, v)} options={modelOptions} placeholder="เลือก Model" />
                  </div>
                </div>
                {/* Per-shop API Key */}
                <div className="border-t border-gray-200/50 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs">API Key ของร้าน</span>
                      {hasShopKey ? <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-600/20 text-emerald-300">ใช้ Key ของร้าน</span> : <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">ใช้ Key กลาง</span>}
                    </div>
                    {!isEditingKey && <div className="flex gap-1.5">
                        <button onClick={() => {
                  setShopKeyEditing(shop.id);
                  setShopKeyVal("");
                }} className="text-blue-400 hover:text-blue-300 text-xs transition">
                          {hasShopKey ? "เปลี่ยน" : "ใส่ Key"}
                        </button>
                        {hasShopKey && <button onClick={() => clearShopKey(shop.id, prov, model)} className="text-red-400 hover:text-red-300 text-xs transition">ลบ</button>}
                      </div>}
                  </div>
                  {hasShopKey && !isEditingKey && <div className="text-gray-400 text-xs font-mono mt-1">{shop.ai_key}</div>}
                  {isEditingKey && <div className="flex gap-2 mt-2">
                      <input type="text" value={shopKeyVal} onChange={e => setShopKeyVal(e.target.value)} placeholder="ใส่ API Key ของร้านนี้" className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-xs outline-none focus:border-blue-500 font-mono" />
                      <button onClick={() => saveShopKey(shop.id, prov, model)} disabled={!shopKeyVal.trim()} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition">บันทึก</button>
                      <button onClick={() => setShopKeyEditing(null)} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg transition">ยกเลิก</button>
                    </div>}
                </div>
              </div>;
      })}
        </div>}

      {/* ── Info Box ── */}
      <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-blue-300 text-xs space-y-1">
        <div className="font-semibold text-sm mb-1">คำแนะนำการเลือก AI</div>
        <div>• <strong>Claude Sonnet 4</strong> — สมดุลระหว่างความเร็วและความฉลาด เหมาะกับร้านค้าทั่วไป</div>
        <div>• <strong>Typhoon v2 70B</strong> — เข้าใจภาษาไทยดีที่สุด เหมาะกับร้านค้าที่สื่อสารภาษาไทย 100%</div>
        <div>• <strong>GPT-4o Mini / Gemini Flash</strong> — ราคาถูก เหมาะกับร้านค้า Free tier ที่ต้องการประหยัด</div>
        <div>• ร้านค้าที่ใส่ Key ของตัวเองจะถูกคิดค่าใช้จ่ายจาก Key ของร้านนั้นเอง</div>
      </div>
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  SUPER ADMIN — Billing & Payment Page
// ═══════════════════════════════════════════════════════════
