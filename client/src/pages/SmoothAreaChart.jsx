import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  STATS PAGE — Full Analytics Dashboard
// ═══════════════════════════════════════════════════════════
//  STATS PAGE — Clean Professional Dashboard
// ═══════════════════════════════════════════════════════════

// ── Smooth Bezier Area Chart (ภาษาไทย) ──
function SmoothAreaChart({
  chartData
}) {
  if (!chartData || !chartData.labels) {
    return <div className="w-full h-[200px] flex items-center justify-center text-gray-400 text-xs">กำลังโหลดกราฟ...</div>;
  }
  const labels = chartData.labels;
  const ds = [{
    id: 'chat',
    label: 'ปริมาณแชท',
    color: '#f59e0b',
    fill: 'rgba(245,158,11,0.08)',
    data: chartData.chatData
  }, {
    id: 'bot',
    label: 'Bot จัดการ',
    color: '#06b6d4',
    fill: 'rgba(6,182,212,0.08)',
    data: chartData.botData
  }, {
    id: 'order',
    label: 'ออเดอร์',
    color: '#8b5cf6',
    fill: 'rgba(139,92,246,0.07)',
    data: chartData.orderData
  }];
  const W = 800,
    H = 200,
    PL = 48,
    PR = 20,
    PT = 16,
    PB = 32;
  const cW = W - PL - PR,
    cH = H - PT - PB;
  const allVals = ds.flatMap(d => d.data);
  const minV = 0,
    maxV = Math.max(10, Math.max(...allVals) * 1.08);
  const toX = i => PL + i / (labels.length - 1) * cW;
  const toY = v => PT + cH - (v - minV) / (maxV - minV) * cH;
  const smooth = pts => {
    if (pts.length < 2) return `M${pts[0][0]},${pts[0][1]}`;
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const cpx = (pts[i][0] + pts[i + 1][0]) / 2;
      d += ` C${cpx},${pts[i][1]} ${cpx},${pts[i + 1][1]} ${pts[i + 1][0]},${pts[i + 1][1]}`;
    }
    return d;
  };
  const fmtVal = v => v >= 1000 ? (v / 1000).toFixed(1).replace(/\.0$/, '') + 'พัน' : String(v);
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: toY(minV + f * (maxV - minV)),
    label: fmtVal(Math.round(minV + f * (maxV - minV)))
  }));
  const [hover, setHover] = React.useState(null);
  return <div style={{
    position: 'relative'
  }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{
      overflow: 'visible',
      display: 'block'
    }}>
        <defs>
          {ds.map(d => <linearGradient key={d.id} id={`fill_${d.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={d.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={d.color} stopOpacity="0" />
            </linearGradient>)}
        </defs>
        {/* เส้นตาราง */}
        {gridLines.map((g, gi) => <g key={gi}>
            <line x1={PL} y1={g.y} x2={W - PR} y2={g.y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={PL - 6} y={g.y + 4} textAnchor="end" fontSize="9" fill="#d1d5db">{g.label}</text>
          </g>)}
        {/* พื้นที่ใต้เส้น */}
        {ds.map(d => {
        const pts = d.data.map((v, i) => [toX(i), toY(v)]);
        const line = smooth(pts);
        const area = line + ` L${toX(11)},${toY(0)} L${toX(0)},${toY(0)} Z`;
        return <path key={d.id + "a"} d={area} fill={`url(#fill_${d.id})`} />;
      })}
        {/* เส้นกราฟ */}
        {ds.map(d => {
        const pts = d.data.map((v, i) => [toX(i), toY(v)]);
        return <path key={d.id + "l"} d={smooth(pts)} fill="none" stroke={d.color} strokeWidth="2" strokeLinejoin="round" />;
      })}
        {/* เส้นแนวตั้งเมื่อ hover */}
        {hover !== null && <>
            <line x1={toX(hover)} y1={PT} x2={toX(hover)} y2={PT + cH} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 3" />
            {ds.map(d => <circle key={d.id} cx={toX(hover)} cy={toY(d.data[hover])} r="4" fill={d.color} stroke="#fff" strokeWidth="2" />)}
          </>}
        {/* แกน X */}
        {labels.map((m, i) => <text key={m} x={toX(i)} y={H - 6} textAnchor="middle" fontSize="9.5" fill="#9ca3af">{m}</text>)}
        {/* พื้นที่โปร่งสำหรับ hover */}
        {labels.map((m, i) => <rect key={m + "h"} x={toX(i) - cW / (labels.length - 1) / 2} y={PT} width={cW / (labels.length - 1)} height={cH} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />)}
      </svg>
      {/* Tooltip เมื่อ hover */}
      {hover !== null && <div style={{
      position: 'absolute',
      top: 10,
      left: Math.min(toX(hover) / W * 100, 75) + '%',
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
      pointerEvents: 'none',
      minWidth: 170,
      transform: 'translateX(-50%)'
    }}>
          <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: '#374151',
        marginBottom: 6
      }}>ช่วง: {labels[hover]}</div>
          {ds.map(d => <div key={d.id} style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 3
      }}>
              <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: d.color
        }} />
              <span style={{
          fontSize: 11,
          color: '#6b7280'
        }}>{d.label}:</span>
              <span style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#111827',
          marginLeft: 'auto'
        }}>{d.data[hover].toLocaleString()} ครั้ง</span>
            </div>)}
          <div style={{
        marginTop: 6,
        paddingTop: 6,
        borderTop: '1px solid #f3f4f6',
        fontSize: 10,
        color: '#9ca3af'
      }}>จากข้อมูลจริง</div>
        </div>}
    </div>;
}
