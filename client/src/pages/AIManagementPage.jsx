import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';
import AIKeyInput from './AIKeyInput';

export const AI_PROVIDERS = [{
  id: "claude",
  name: "Claude (Anthropic)",
  color: "from-orange-500 to-amber-600",
  border: "border-orange-500",
  icon: "M12 2a7 7 0 0 0-7 7c0 3 2 5.5 5 7v4h4v-4c3-1.5 5-4 5-7a7 7 0 0 0-7-7z",
  models: [{
    value: "claude-sonnet-4-20250514",
    label: "Claude Sonnet 4",
    desc: "เร็ว คุ้มค่า เหมาะกับงานทั่วไป",
    badge: "แนะนำ"
  }, {
    value: "claude-opus-4-20250514",
    label: "Claude Opus 4",
    desc: "ฉลาดที่สุด เหมาะกับงานซับซ้อน",
    badge: "Premium"
  }, {
    value: "claude-haiku-4-5-20251001",
    label: "Claude Haiku 4.5",
    desc: "เร็วมาก ประหยัดที่สุด",
    badge: "ประหยัด"
  }]
}, {
  id: "openai",
  name: "OpenAI",
  color: "from-emerald-500 to-teal-600",
  border: "border-emerald-500",
  icon: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z M12 8v4l3 3",
  models: [{
    value: "gpt-4o",
    label: "GPT-4o",
    desc: "Multimodal ครบทุกด้าน",
    badge: "แนะนำ"
  }, {
    value: "gpt-4o-mini",
    label: "GPT-4o Mini",
    desc: "เร็ว ราคาถูก เหมาะร้านทั่วไป",
    badge: "ประหยัด"
  }, {
    value: "gpt-4-turbo",
    label: "GPT-4 Turbo",
    desc: "แม่นยำสูง context ยาว"
  }]
}, {
  id: "gemini",
  name: "Gemini (Google)",
  color: "from-blue-500 to-indigo-600",
  border: "border-blue-500",
  icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  models: [{
    value: "gemini-3.5-flash-preview",
    label: "Gemini 3.5 Flash Preview",
    desc: "โมเดลทดสอบล่าสุด เร็วและฉลาด",
    badge: "ใหม่"
  }, {
    value: "gemini-1.5-flash",
    label: "Gemini 1.5 Flash",
    desc: "เสถียร เร็ว ฟรี tier สูง",
    badge: "แนะนำ"
  }, {
    value: "gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    desc: "Context ยาว 1M tokens"
  }, {
    value: "gemini-1.0-pro",
    label: "Gemini 1.0 Pro",
    desc: "เร็ว ราคาถูก",
    badge: "ประหยัด"
  }]
}, {
  id: "typhoon",
  name: "Typhoon (SCB 10X)",
  color: "from-violet-500 to-purple-600",
  border: "border-violet-500",
  icon: "M12 2a2 2 0 0 1 2 2v1h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3V4a2 2 0 0 1 2-2z M9 12h0 M15 12h0 M12 2v2",
  models: [{
    value: "typhoon-v2-70b-instruct",
    label: "Typhoon v2 70B",
    desc: "เก่งภาษาไทยที่สุด",
    badge: "แนะนำ"
  }, {
    value: "typhoon-v2-8b-instruct",
    label: "Typhoon v2 8B",
    desc: "เบา เร็ว เหมาะงานง่าย",
    badge: "ประหยัด"
  }]
}];

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
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 md:mb-0">จัดการ AI</h2>
        <p className="text-gray-500 text-sm">ตั้งค่า API Keys, เลือก Provider และ Model สำหรับร้านค้า</p>
      </div>

      {/* ══════ Section 1: Global API Keys ══════ */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-6 mb-6 shadow-sm">
        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Icon d={Icons.save} size={18} /> API Keys กลาง
        </h3>
        <p className="text-gray-500 text-xs md:text-sm mb-4">Key กลางที่ทุกร้านใช้ร่วมกัน (ร้านที่มี key ของตัวเองจะใช้ key ของร้านแทน)</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-8">
        {AI_PROVIDERS.map(p => {
        const isOpen = expandedProvider === p.id;
        const shopCount = shops.filter(s => s.ai_provider === p.id).length;
        const hasGlobalKey = settings[p.id === "claude" ? "claude_key_set" : p.id === "openai" ? "openai_key_set" : p.id === "gemini" ? "gemini_key_set" : "typhoon_key_set"];
        return <div key={p.id} className={"bg-white border shadow-sm rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md " + p.border}>
              <button onClick={() => setExpandedProvider(isOpen ? null : p.id)} className="w-full text-left">
                <div className={"bg-gradient-to-r p-4 flex items-center gap-3 " + p.color}>
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                    <Icon d={p.icon} size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-900 font-bold flex items-center gap-2 text-sm md:text-base">
                      {p.name}
                      {hasGlobalKey && <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm" title="มี API Key แล้ว" />}
                    </div>
                    <div className="text-white/80 text-xs mt-0.5">{p.models.length} models | ใช้อยู่ {shopCount} ร้าน</div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={"text-white/80 transition-transform " + (isOpen ? "rotate-180" : "")}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </button>
              {isOpen && <div className="p-3 md:p-4 space-y-2 bg-gray-50/50">
                  {p.models.map(m => <div key={m.value} className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-3 shadow-sm hover:shadow-md transition">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gray-900 text-sm font-bold">{m.label}</span>
                          {m.badge && <span className={"text-[10px] px-2 py-0.5 rounded-full font-semibold " + (m.badge === "แนะนำ" ? "bg-emerald-100 text-emerald-700" : m.badge === "Premium" ? "bg-amber-100 text-amber-700" : m.badge === "ใหม่" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600")}>{m.badge}</span>}
                        </div>
                        <div className="text-gray-500 text-xs">{m.desc}</div>
                      </div>
                      <div className="text-gray-400 text-xs font-mono bg-gray-50 px-2 py-1 rounded truncate self-start md:self-auto max-w-full md:max-w-[120px]" title={m.value}>{m.value.length > 25 ? m.value.slice(0, 22) + "..." : m.value}</div>
                    </div>)}
                </div>}
            </div>;
      })}
      </div>

      {/* ══════ Section 3: Per-Shop AI Assignment ══════ */}
      <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Icon d={Icons.settings} size={18} /> ตั้งค่า AI ประจำร้านค้า
      </h3>

      {shops.length === 0 ? <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 shadow-sm">ยังไม่มีร้านค้า</div> : <div className="space-y-4">
          {shops.map(shop => {
        const prov = shop.ai_provider || "claude";
        const model = shop.ai_model || "";
        const providerData = AI_PROVIDERS.find(x => x.id === prov) || AI_PROVIDERS[0];
        const modelOptions = getModelsForProvider(prov);
        const isSavingThis = saving === shop.id;
        const hasShopKey = !!(shop.ai_key && shop.ai_key !== "");
        const isEditingKey = shopKeyEditing === shop.id;
        return <div key={shop.id} className={"bg-white border rounded-2xl p-4 md:p-5 transition duration-300 shadow-sm hover:shadow-md " + (isSavingThis ? "border-blue-500 shadow-blue-100" : "border-gray-200")}>
                {/* Shop name + status */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={"w-2.5 h-2.5 rounded-full shadow-sm " + (shop.status === "active" ? "bg-emerald-500" : "bg-rose-500")} />
                  <span className="text-gray-900 font-bold text-sm md:text-base">{shop.name}</span>
                  {isSavingThis && <span className="text-blue-500 text-xs font-semibold animate-pulse ml-auto bg-blue-50 px-2 py-1 rounded-full">กำลังบันทึก...</span>}
                </div>
                {/* Provider + Model dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-gray-700 font-semibold text-xs mb-1.5">AI Provider</label>
                    <DropdownSelect value={prov} onChange={v => changeProvider(shop.id, v)} options={AI_PROVIDERS.map(x => ({
                value: x.id,
                label: x.name
              }))} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold text-xs mb-1.5">Model</label>
                    <DropdownSelect value={model} onChange={v => changeModel(shop.id, prov, v)} options={modelOptions} placeholder="เลือก Model" />
                  </div>
                </div>
                {/* Per-shop API Key */}
                <div className="border-t border-gray-200/50 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 font-semibold text-xs">API Key ของร้าน</span>
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
      <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 rounded-r-xl p-4 md:p-5 text-blue-900 shadow-sm">
        <div className="font-bold text-sm md:text-base mb-2 flex items-center gap-2">💡 คำแนะนำการเลือก AI</div>
        <div className="space-y-1.5 text-xs md:text-sm">
          <div>• <strong>Claude Sonnet 3.5</strong> — สมดุลระหว่างความเร็วและความฉลาด เหมาะกับร้านค้าทั่วไป</div>
          <div>• <strong>Gemini 3.5 Flash Preview</strong> — รุ่นทดสอบใหม่ล่าสุดจาก Google เร็วและราคาถูก</div>
          <div>• <strong>Typhoon v2 70B</strong> — เข้าใจภาษาไทยดีที่สุด เหมาะกับร้านค้าที่สื่อสารภาษาไทย 100%</div>
          <div>• <strong>GPT-4o Mini</strong> — ราคาถูก เหมาะกับร้านค้า Free tier ที่ต้องการประหยัด</div>
          <div className="mt-2 pt-2 border-t border-blue-200 text-blue-800 font-medium">* ร้านค้าที่ใส่ Key ของตัวเองจะถูกคิดค่าใช้จ่ายจาก Key ของร้านนั้นเอง</div>
        </div>
      </div>
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  SUPER ADMIN — Billing & Payment Page
// ═══════════════════════════════════════════════════════════
