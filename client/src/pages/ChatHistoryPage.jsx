import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  💬 CHAT HISTORY — ประวัติแชทลูกค้า
// ═══════════════════════════════════════════════════════════
function ChatHistoryPage({
  toast
}) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");

  // โหลดรายชื่อผู้ใช้ที่เคยแชท
  useEffect(() => {
    api("/api/chats/users").then(r => {
      if (r.users) setUsers(r.users);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // โหลดแชทของ user ที่เลือก
  const loadChat = async (userId, platform) => {
    setSelectedUser({
      userId,
      platform
    });
    setLoadingMsgs(true);
    try {
      const r = await api(`/api/chats/${encodeURIComponent(userId)}?platform=${platform}&limit=100`);
      if (r.messages) setMessages(r.messages);
    } catch {}
    setLoadingMsgs(false);
  };
  const filteredUsers = users.filter(u => {
    if (platformFilter !== "all" && u.platform !== platformFilter) return false;
    if (search && !u.user_id.includes(search) && !(u.user_name || "").includes(search)) return false;
    return true;
  });
  const formatTime = ts => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short"
    });
  };
  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  return <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex flex-col">
          <h1 className="text-base md:text-xl font-black text-slate-900 leading-tight whitespace-nowrap">ประวัติแชทลูกค้า</h1>
          <p className="text-[10px] text-gray-400 leading-none mt-0.5 hidden sm:block">ดูประวัติรายการสนทนาและการตอบกลับย้อนหลังของบอทกับลูกค้า</p>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-4" style={{
      minHeight: "60vh"
    }}>
        {/* Left: User List */}
        <div className="w-full lg:w-80 bg-white rounded-xl border border-gray-200/50 flex flex-col" style={{
        maxHeight: "70vh"
      }}>
          <div className="p-3 border-b border-gray-200/30 space-y-2">
            <div className="relative">
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={Icons.search} /></svg>
              <input type="text" placeholder="ค้นหา User ID / ชื่อ..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-slate-500 focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {["all", "LINE", "Facebook"].map(p => <button key={p} onClick={() => setPlatformFilter(p)} className={"whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold transition border " + (platformFilter === p ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10" : "bg-white border-gray-200 text-slate-600 hover:bg-gray-50 hover:border-gray-300")}>
                  {p === "all" ? "ทั้งหมด" : p}
                </button>)}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredUsers.length === 0 ? <div className="p-4 text-center text-gray-400 text-sm">ไม่พบรายการแชท</div> : filteredUsers.map(u => <div key={u.user_id + u.platform} onClick={() => loadChat(u.user_id, u.platform)} className={"flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-200/20 transition hover:bg-gray-100/30 " + (selectedUser?.userId === u.user_id && selectedUser?.platform === u.platform ? "bg-blue-600/10 border-l-2 border-l-blue-500" : "")}>
                <div className={"w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold " + (u.platform === "LINE" ? "bg-green-600" : "bg-blue-600")}>
                  {u.platform === "LINE" ? "L" : "F"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 text-sm font-medium truncate">{u.user_name || u.user_id.slice(0, 12) + "..."}</div>
                  <div className="text-gray-400 text-xs truncate">{u.message_count ? `${u.message_count} ข้อความ` : ""}</div>
                </div>
                <div className="text-gray-400 text-xs whitespace-nowrap">{formatTime(u.last_message_at)}</div>
              </div>)}
          </div>
        </div>

        {/* Right: Chat Messages */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200/50 flex flex-col" style={{
        maxHeight: "70vh"
      }}>
          {!selectedUser ? <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={Icons.chat} /></svg>
                <p className="text-sm">เลือกรายชื่อลูกค้าทางซ้ายเพื่อดูประวัติแชท</p>
              </div>
            </div> : <>
              <div className="px-4 py-3 border-b border-gray-200/30 flex items-center gap-3">
                <button onClick={() => {
              setSelectedUser(null);
              setMessages([]);
            }} className="lg:hidden text-gray-500 hover:text-gray-900">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                </button>
                <div className={"w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold " + (selectedUser.platform === "LINE" ? "bg-green-600" : "bg-blue-600")}>
                  {selectedUser.platform === "LINE" ? "L" : "F"}
                </div>
                <div>
                  <div className="text-gray-900 text-sm font-medium">{selectedUser.userId.slice(0, 20)}{selectedUser.userId.length > 20 ? "..." : ""}</div>
                  <div className="text-gray-500 text-xs">{selectedUser.platform}</div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMsgs ? <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div> : messages.length === 0 ? <div className="text-center text-gray-400 text-sm py-10">ไม่พบข้อความ</div> : messages.map((m, i) => <div key={i} className={"flex " + (m.direction === "in" ? "justify-start" : "justify-end")}>
                    <div className={"max-w-xs lg:max-w-md px-3 py-2 rounded-xl text-sm whitespace-pre-wrap " + (m.direction === "in" ? "bg-gray-100 text-white rounded-bl-none" : "bg-blue-600 text-white rounded-br-none")}>
                      {m.message_type === "image" ? <span className="text-gray-700 italic">[รูปภาพ]</span> : m.message}
                      <div className={"text-xs mt-1 " + (m.direction === "in" ? "text-gray-500" : "text-blue-200")}>
                        {formatTime(m.created_at)}
                      </div>
                    </div>
                  </div>)}
              </div>
            </>}
        </div>
      </div>
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  SHOP MANAGEMENT (Super Admin — สร้าง/จัดการร้านค้า)
// ═══════════════════════════════════════════════════════════
