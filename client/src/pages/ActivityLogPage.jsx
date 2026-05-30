import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  SUPER ADMIN — Activity Log Page
// ═══════════════════════════════════════════════════════════
function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api("/api/admin/chat-logs");
        if (res.success) {
          setLogs(res.logs);
        }
      } catch (err) {
        console.error("Error fetching logs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Log กิจกรรม</h2>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">กำลังโหลดข้อมูล...</div>
        ) : (
          <table className="w-full text-sm" style={{ minWidth: "700px" }}>
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 text-xs bg-gray-50/50">
                <th className="text-left px-4 py-3">เวลา</th>
                <th className="text-left px-4 py-3">ร้าน</th>
                <th className="text-left px-4 py-3">Platform</th>
                <th className="text-left px-4 py-3">ผู้ส่ง</th>
                <th className="text-left px-4 py-3">ข้อความ</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500 text-sm">ไม่มีประวัติกิจกรรม</td>
                </tr>
              ) : logs.map((log, i) => <tr key={i} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{log.time}</td>
                  <td className="px-4 py-3 text-gray-900 text-xs font-semibold">{log.shop}</td>
                  <td className="px-4 py-3">
                    <span className={"text-[11px] font-bold px-2 py-0.5 rounded-full " + (log.platform === "LINE" ? "bg-emerald-100 text-emerald-700" : (log.platform === "Facebook" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"))}>
                      {log.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={"text-[11px] font-bold px-2 py-0.5 rounded-full " + (log.direction === "in" ? "bg-slate-100 text-slate-700" : "bg-indigo-100 text-indigo-700")}>
                      {log.direction === "in" ? `👤 ${log.user_name || 'ลูกค้า'}` : "🤖 บอท/แอดมิน"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-xs max-w-md truncate" title={log.message}>{log.message}</td>
                </tr>)}
            </tbody>
          </table>
        )}
      </div>
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  ONBOARDING WIZARD — นำทางร้านค้าใหม่ตั้งค่าระบบ
// ═══════════════════════════════════════════════════════════
