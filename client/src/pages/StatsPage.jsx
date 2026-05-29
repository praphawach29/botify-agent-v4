import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default function StatsPage({
  onNavigate
}) {
  const [stats, setStats] = React.useState(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [recentOrders, setRecentOrders] = React.useState([]);
  const [recentChats, setRecentChats] = React.useState([]);
  const [chartPeriod, setChartPeriod] = React.useState('รายเดือน');
  const [chartData, setChartData] = React.useState(null);
  const loadChart = React.useCallback(() => {
    api(`/api/analytics/chart?period=${encodeURIComponent(chartPeriod)}`).then(d => {
      setChartData(d);
    }).catch(() => setChartData(null));
  }, [chartPeriod]);
  useEffect(() => {
    loadChart();
  }, [loadChart]);
  const load = () => {
    setRefreshing(true);
    Promise.all([api("/api/stats").catch(() => null), api("/api/orders?limit=5").catch(() => ({
      orders: []
    })), api("/api/chats?limit=5").catch(() => ({
      chats: []
    }))]).then(([s, o, c]) => {
      if (s) {
        setStats(s);
      } else {
        setStats({
          totalOrders: 0,
          pendingOrders: 0,
          todayMsgs: 0,
          activeBots: 0,
          orderStats: {}
        });
      }
      setRecentOrders((o?.orders || []).map(r => ({
        id: r.orderId || `#${r.rowIndex}`,
        customer: (r.platform || 'LINE') + ': ' + (r.name || 'ลูกค้า'),
        item: r.product || 'สินค้า',
        amount: r.qty ? `${r.qty} ชิ้น` : '-',
        status: r.status || 'รอยืนยัน',
        sc: r.status === 'รอยืนยัน' ? '#f59e0b' : r.status === 'จัดส่งแล้ว' ? '#10b981' : '#3b82f6'
      })));
      setRecentChats((c?.chats || []).map(ch => {
        const diffMs = Date.now() - new Date(ch.created_at).getTime();
        const diffM = Math.floor(diffMs / 60000);
        return {
          name: ch.user_name || 'ไม่ระบุชื่อ',
          msg: ch.message || '',
          time: diffM < 60 ? `${diffM}m` : `${Math.floor(diffM / 60)}h`,
          via: ch.platform === 'facebook' ? 'Facebook' : 'LINE',
          replied: ch.direction === 'out'
        };
      }));
      setRefreshing(false);
    }).catch(() => setRefreshing(false));
  };
  useEffect(() => {
    load();
  }, []);
  if (!stats) return <Loader />;
  const C = {
    card: '#fff',
    border: '#e5e7eb',
    bg: '#f3f4f6',
    text: '#111827',
    sub: '#6b7280',
    muted: '#9ca3af'
  };
  const cardStyle = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  };

  // คำนวณ AI Resolution แกล้งๆ จาก pending orders
  const aiRes = Math.min(100, Math.max(0, 100 - (stats.pendingOrders || 0)));
  const kpis = [{
    label: 'ออเดอร์ทั้งหมด',
    value: String(stats.totalOrders ?? 0),
    unit: '',
    trend: '-',
    up: true,
    note: 'รวบรวมข้อมูลใหม่',
    color: '#3b82f6',
    icon: Icons.cart,
    nav: 'orders'
  }, {
    label: 'การสนทนาวันนี้',
    value: String(stats.todayMsgs ?? 0),
    unit: '',
    trend: '-',
    up: true,
    note: 'รวบรวมข้อมูลใหม่',
    color: '#8b5cf6',
    icon: Icons.chat,
    nav: 'chats'
  }, {
    label: 'รอยืนยันออเดอร์',
    value: String(stats.pendingOrders ?? 0),
    unit: '',
    trend: '-',
    up: false,
    note: 'ต้องจัดการ',
    color: '#f59e0b',
    icon: Icons.box,
    nav: 'orders'
  }, {
    label: 'AI Resolution',
    value: String(stats.aiResolution ?? aiRes),
    unit: '%',
    trend: '-',
    up: true,
    note: 'ประสิทธิภาพ',
    color: '#10b981',
    icon: Icons.bot,
    nav: null
  }];
  return <div className="w-full flex flex-col font-sans min-h-[100vh]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex flex-col">
          <h1 className="text-base md:text-xl font-black text-slate-900 leading-tight whitespace-nowrap">ภาพรวมระบบ</h1>
          <p className="text-[10px] text-gray-400 leading-none mt-0.5 hidden sm:block">สรุปสถิติ ยอดขาย ออเดอร์ และประสิทธิภาพบอท</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={load} disabled={refreshing} className="flex items-center justify-center gap-1.5 bg-white text-slate-700 border border-gray-200 hover:bg-gray-50 text-xs font-bold px-3.5 py-2.5 rounded-xl transition shadow-sm disabled:opacity-50">
            <Icon d={Icons.refresh} size={13} />
            <span>{refreshing ? 'โหลด...' : 'รีเฟรช'}</span>
          </button>
          <button onClick={() => onNavigate && onNavigate('orders')} className="flex items-center justify-center gap-1.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold px-3.5 py-2.5 rounded-xl transition shadow-md shadow-slate-900/10">
            <Icon d={Icons.cart} size={13} />
            <span className="hidden sm:inline">จัดการออเดอร์</span><span className="sm:hidden">ออเดอร์</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {kpis.map(k => <div key={k.label} onClick={() => k.nav && onNavigate && onNavigate(k.nav)} style={{
        ...cardStyle,
        cursor: k.nav ? 'pointer' : 'default',
        transition: 'all 0.2s ease'
      }} className="hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{
            background: k.color + '15',
            color: k.color
          }}>
                <Icon d={k.icon} size={16} />
              </div>
              {k.nav && <Icon d={Icons.link} size={13} className="text-gray-400" />}
            </div>
            <div className="text-[10px] sm:text-xs font-semibold text-gray-500 mb-1">{k.label}</div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-none mb-2">
              {k.value}<span className="text-sm font-bold ml-0.5">{k.unit}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{
            color: k.trend === '-' ? '#6b7280' : k.up ? '#10b981' : '#ef4444',
            background: k.trend === '-' ? '#f3f4f6' : k.up ? '#f0fdf4' : '#fef2f2'
          }}>
                {k.trend === '-' ? '' : k.up ? '↑ ' : '↓ '}{k.trend}
              </span>
              <span className="text-[9px] text-gray-400 whitespace-nowrap">{k.note}</span>
            </div>
          </div>)}
      </div>

      {/* Main Chart */}
      <div style={cardStyle} className="mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-[13px] sm:text-[15px] font-bold text-gray-900">ปริมาณแชทและออเดอร์</div>
            <div className="text-[10px] sm:text-[12px] text-gray-400 mt-0.5">จำนวนการสนทนา · ยอดสั่งซื้อ</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {[{
            l: 'ปริมาณแชท',
            c: '#f59e0b'
          }, {
            l: 'Bot จัดการ',
            c: '#06b6d4'
          }, {
            l: 'ออเดอร์',
            c: '#8b5cf6'
          }].map(item => <div key={item.l} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{
              background: item.c
            }} />
                <span className="text-[9px] sm:text-[11px] text-gray-500">{item.l}</span>
              </div>)}
            <button onClick={() => setChartPeriod(chartPeriod === 'รายเดือน' ? 'รายสัปดาห์' : 'รายเดือน')} className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[10px] sm:text-xs text-gray-500 transition-colors hover:bg-gray-100 ml-auto sm:ml-0">
              {chartPeriod} ▾
            </button>
          </div>
        </div>
        <SmoothAreaChart chartData={chartData} />
      </div>

      {/* Bottom Row: Recent Orders + Recent Chats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-10">
        
        {/* Recent Orders */}
        <div style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
                <Icon d={Icons.cart} size={14} />
              </div>
              <span className="text-xs sm:text-sm font-bold text-gray-900">ออเดอร์ล่าสุด</span>
            </div>
            <button onClick={() => onNavigate && onNavigate('orders')} className="text-[10px] sm:text-xs text-blue-500 font-bold hover:underline">ดูทั้งหมด →</button>
          </div>
          {recentOrders.length > 0 ? recentOrders.map((o, i) => <div key={o.id} className="flex items-center gap-2.5 py-2.5 border-b border-gray-100 last:border-0">
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                <span className="text-[9px] font-black text-gray-500">{o.id}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] sm:text-xs font-bold text-gray-900 truncate">{o.customer}</div>
                <div className="text-[10px] text-gray-500 truncate">{o.item}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs sm:text-[13px] font-bold text-gray-900">{o.amount}</div>
                <span className="inline-block mt-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{
              color: o.sc,
              background: o.sc + '15'
            }}>{o.status}</span>
              </div>
            </div>) : <div className="text-center py-6 text-xs text-gray-400">ไม่มีรายการสั่งซื้อล่าสุด</div>}
        </div>

        {/* Recent Chats */}
        <div style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center">
                <Icon d={Icons.chat} size={14} />
              </div>
              <span className="text-xs sm:text-sm font-bold text-gray-900">การสนทนาล่าสุด</span>
            </div>
            <button onClick={() => onNavigate && onNavigate('chats')} className="text-[10px] sm:text-xs text-blue-500 font-bold hover:underline">ดูทั้งหมด →</button>
          </div>
          
          {/* Order status mini bar */}
          {stats?.orderStats && stats.totalOrders > 0 && <div className="bg-gray-50 rounded-xl p-2.5 mb-3 flex gap-2">
              {[{
            l: 'ส่งแล้ว',
            v: Math.round((stats.orderStats['ส่งแล้ว'] || 0) / stats.totalOrders * 100),
            c: '#10b981'
          }, {
            l: 'จัดส่ง',
            v: Math.round((stats.orderStats['จัดส่ง'] || 0) / stats.totalOrders * 100),
            c: '#3b82f6'
          }, {
            l: 'รอ',
            v: Math.round((stats.orderStats['รอ'] || 0) / stats.totalOrders * 100),
            c: '#f59e0b'
          }, {
            l: 'ยกเลิก',
            v: Math.round((stats.orderStats['ยกเลิก'] || 0) / stats.totalOrders * 100),
            c: '#ef4444'
          }].map(s => <div key={s.l} className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-[8px] sm:text-[9px] text-gray-500">{s.l}</span>
                    <span className="text-[8px] sm:text-[9px] font-bold text-gray-900">{s.v}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-gray-200">
                    <div className="h-full rounded-full" style={{
                width: s.v + '%',
                background: s.c
              }} />
                  </div>
                </div>)}
            </div>}
          
          {recentChats.length > 0 ? recentChats.map((c, i) => <div key={i} className="flex items-center gap-2.5 py-2.5 border-b border-gray-100 last:border-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0" style={{
            background: c.via === 'LINE' ? '#06c755' : '#1877f2'
          }}>
                {c.via === 'LINE' ? 'L' : 'F'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-bold text-gray-900 truncate">{c.name}</span>
                  <span className="text-[9px] text-gray-400 shrink-0">{c.time} ago</span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-gray-500 truncate">{c.msg}</div>
              </div>
              <span className="shrink-0 text-[8px] sm:text-[9px] font-bold px-2 py-0.5 rounded-full" style={{
            color: c.replied ? '#10b981' : '#f59e0b',
            background: c.replied ? '#f0fdf4' : '#fffbeb'
          }}>
                {c.replied ? 'Bot ตอบ' : 'รอตอบ'}
              </span>
            </div>) : <div className="text-center py-6 text-xs text-gray-400">ไม่มีการสนทนาล่าสุด</div>}
        </div>
      </div>
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  SHOP SETTINGS
// ═══════════════════════════════════════════════════════════
