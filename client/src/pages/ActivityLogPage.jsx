import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  SUPER ADMIN — Activity Log Page
// ═══════════════════════════════════════════════════════════
function ActivityLogPage() {
  const [logs] = useState([{
    time: "2026-04-26 14:32",
    shop: "ร้าน ABC",
    platform: "LINE",
    message: "สนใจสินค้า A ราคาเท่าไหร่",
    response: "สินค้า A ราคา 350 บาท ครับ มีโปรลด 10% ถึงสิ้นเดือน"
  }, {
    time: "2026-04-26 14:28",
    shop: "ร้าน XYZ",
    platform: "LINE",
    message: "จองคิวนวดวันเสาร์",
    response: "รับจองคิวนวดวันเสาร์ เวลา 10:00 ครับ กรุณายืนยันนัด"
  }, {
    time: "2026-04-26 13:55",
    shop: "คลินิกสวย",
    platform: "Facebook",
    message: "มีโปรโมชั่นอะไรบ้าง",
    response: "ตอนนี้มีโปรเลเซอร์หน้าใส ลด 30% ถึง 30 เม.ย. ค่ะ"
  }, {
    time: "2026-04-26 13:40",
    shop: "ร้าน ABC",
    platform: "LINE",
    message: "สั่งซื้อสินค้า B 2 ชิ้น",
    response: "รับออเดอร์แล้วครับ สินค้า B x2 = 700 บาท กรุณาโอนที่ PromptPay"
  }, {
    time: "2026-04-26 12:15",
    shop: "ร้านกาแฟ",
    platform: "LINE",
    message: "เปิดกี่โมง",
    response: "ร้านเปิดทุกวัน 8:00-18:00 ครับ ยินดีต้อนรับครับ"
  }]);
  return <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Log กิจกรรม</h2>
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4 text-amber-300 text-xs">
        ข้อมูลจะแสดงเมื่อเชื่อมต่อกับ Google Sheet แล้ว — ตัวอย่างด้านล่างเป็นข้อมูลจำลอง
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm" style={{
        minWidth: "700px"
      }}>
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-xs">
              <th className="text-left px-4 py-3">เวลา</th>
              <th className="text-left px-4 py-3">ร้าน</th>
              <th className="text-left px-4 py-3">Platform</th>
              <th className="text-left px-4 py-3">ข้อความ</th>
              <th className="text-left px-4 py-3">AI Response</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => <tr key={i} className="border-b border-gray-200/50 hover:bg-gray-100/20">
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{log.time}</td>
                <td className="px-4 py-3 text-gray-900 text-xs">{log.shop}</td>
                <td className="px-4 py-3">
                  <span className={"text-xs px-2 py-0.5 rounded-full " + (log.platform === "LINE" ? "bg-emerald-600/20 text-emerald-300" : "bg-blue-600/20 text-blue-300")}>
                    {log.platform}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700 text-xs max-w-xs truncate">{log.message}</td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{log.response}</td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  ONBOARDING WIZARD — นำทางร้านค้าใหม่ตั้งค่าระบบ
// ═══════════════════════════════════════════════════════════
