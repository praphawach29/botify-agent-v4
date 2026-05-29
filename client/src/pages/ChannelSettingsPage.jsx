import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  🔌 CHANNEL SETTINGS — เชื่อมต่อ LINE / Facebook / Google Sheet
// ═══════════════════════════════════════════════════════════
function ChannelSettingsPage({
  toast
}) {
  const [channels, setChannels] = useState({
    line_token: "",
    line_bot_id: "",
    owner_line_id: "",
    fb_token: "",
    fb_page_id: "",
    sheet_id: ""
  });
  const [connected, setConnected] = useState({
    line: false,
    facebook: false,
    sheet: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [botInfo, setBotInfo] = useState(null);
  useEffect(() => {
    api("/api/channels").then(r => {
      if (r.success) {
        setChannels(r.channels);
        setConnected(r.connected);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  const save = async () => {
    setSaving(true);
    try {
      const r = await api("/api/channels", "PUT", channels);
      if (r.success) {
        toast("บันทึกการเชื่อมต่อสำเร็จ — ระบบอัพเดทแล้ว", "success");
      } else toast(r.error || "บันทึกไม่สำเร็จ", "error");
    } catch (e) {
      toast(e.message, "error");
    }
    setSaving(false);
  };
  const testLine = async () => {
    const token = channels.line_token;
    if (!token || token.includes("•")) return toast("กรุณาใส่ LINE Token ใหม่ก่อนทดสอบ", "error");
    setTesting(true);
    setBotInfo(null);
    try {
      const r = await api("/api/channels/test-line", "POST", {
        token
      });
      if (r.success) {
        setBotInfo(r.bot);
        // Auto-fill Bot ID
        if (r.bot.userId) setChannels(c => ({
          ...c,
          line_bot_id: r.bot.userId
        }));
        toast("เชื่อมต่อ LINE สำเร็จ — " + r.bot.displayName, "success");
      } else toast(r.error, "error");
    } catch (e) {
      toast(e.message, "error");
    }
    setTesting(false);
  };
  const StatusBadge = ({
    ok,
    label
  }) => <span className={"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium " + (ok ? "bg-green-500/20 text-green-400" : "bg-slate-600/30 text-gray-500")}>
      <span className={"w-2 h-2 rounded-full " + (ok ? "bg-green-400" : "bg-slate-500")} />
      {ok ? "เชื่อมต่อแล้ว" : "ยังไม่เชื่อมต่อ"}
    </span>;
  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  return <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex flex-col">
          <h1 className="text-base md:text-xl font-black text-slate-900 leading-tight whitespace-nowrap">เชื่อมต่อช่องทาง</h1>
          <p className="text-[10px] text-gray-400 leading-none mt-0.5 hidden sm:block">เชื่อมโยงร้านค้าของคุณเข้ากับ LINE, Facebook และ Google Sheet</p>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition shadow-md shadow-blue-500/10 disabled:opacity-50">
          <Icon d={Icons.save} size={14} /> {saving ? "กำลังบันทึก..." : "บันทึกทั้งหมด"}
        </button>
      </div>

      <div className="space-y-4">
        {/* LINE */}
        <div className="bg-white rounded-xl border border-gray-200/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center text-white font-bold text-lg">L</div>
              <div>
                <div className="text-gray-900 font-semibold">LINE Messaging API</div>
                <div className="text-gray-500 text-xs">เชื่อมต่อบอทกับ LINE OA ของร้าน</div>
              </div>
            </div>
            <StatusBadge ok={connected.line} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Field label="Channel Access Token" field="line_token" placeholder="ใส่ token จาก LINE Developers Console" type="password" />
              <button onClick={testLine} disabled={testing} className="mt-2 px-3 py-1.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded text-xs font-medium disabled:opacity-50">
                {testing ? "กำลังทดสอบ..." : "🔍 ทดสอบ Token"}
              </button>
            </div>
            <Field label="Bot User ID" field="line_bot_id" placeholder="Uxxxxxxx (ได้จากการทดสอบ)" />
            <Field label="Owner LINE User ID" field="owner_line_id" placeholder="LINE User ID เจ้าของร้าน (รับแจ้งเตือน)" />
          </div>
          {botInfo && <div className="mt-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20 flex items-center gap-3">
              {botInfo.pictureUrl && <img src={botInfo.pictureUrl} className="w-10 h-10 rounded-full" />}
              <div>
                <div className="text-green-400 text-sm font-medium">{botInfo.displayName}</div>
                <div className="text-gray-500 text-xs font-mono">{botInfo.userId}</div>
              </div>
            </div>}
        </div>

        {/* Facebook */}
        <div className="bg-white rounded-xl border border-gray-200/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg">f</div>
              <div>
                <div className="text-gray-900 font-semibold">Facebook Messenger</div>
                <div className="text-gray-500 text-xs">เชื่อมต่อบอทกับ Facebook Page</div>
              </div>
            </div>
            <StatusBadge ok={connected.facebook} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Page Access Token" field="fb_token" placeholder="ใส่ token จาก Meta Developer Console" type="password" />
            <Field label="Page ID" field="fb_page_id" placeholder="Facebook Page ID" />
          </div>
          <p className="text-amber-400/70 text-xs mt-2">* ต้อง App Review จาก Meta ก่อนจึงจะใช้งานจริงได้</p>
        </div>

        {/* Google Sheet */}
        <div className="bg-white rounded-xl border border-gray-200/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg">G</div>
              <div>
                <div className="text-gray-900 font-semibold">Google Sheets</div>
                <div className="text-gray-500 text-xs">เชื่อมต่อ Google Sheet เก็บข้อมูลสินค้า / ออเดอร์</div>
              </div>
            </div>
            <StatusBadge ok={connected.sheet} />
          </div>
          <Field label="Google Sheet ID" field="sheet_id" placeholder="ใส่ ID จาก URL ของ Google Sheet" />
          <p className="text-gray-500 text-xs mt-2">Sheet ID อยู่ใน URL: docs.google.com/spreadsheets/d/<span className="text-amber-400">SHEET_ID_ตรงนี้</span>/edit</p>
        </div>
      </div>
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  🔔 NOTIFICATION SETTINGS — ตั้งค่าแจ้งเตือน LINE
// ═══════════════════════════════════════════════════════════
