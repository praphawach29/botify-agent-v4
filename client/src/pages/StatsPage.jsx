import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Icon, Icons, api, Loader } from '../components/Shared';
import SmoothAreaChart from './SmoothAreaChart';

/* ── Scroll-reveal hook ─────────────────────────────── */
function useReveal(delay = 0) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const ob = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVis(true); },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );
    if (ref.current) ob.observe(ref.current);
    return () => ob.disconnect();
  }, []);
  return [ref, vis, delay];
}

/* ── Animated number ────────────────────────────────── */
function AnimNumber({ target, unit = '' }) {
  const [cur, setCur] = useState(0);
  useEffect(() => {
    const n = Number(target) || 0;
    if (n === 0) { setCur(0); return; }
    const step = Math.max(1, Math.ceil(n / 30));
    let val = 0;
    const t = setInterval(() => {
      val = Math.min(val + step, n);
      setCur(val);
      if (val >= n) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, [target]);
  return <>{cur.toLocaleString()}<span style={{ fontSize: '0.55em', fontWeight: 700, marginLeft: 2 }}>{unit}</span></>;
}

/* ── KPI Card ───────────────────────────────────────── */
function KpiCard({ label, value, unit, note, color, gradient, icon, nav, onNavigate, delay }) {
  const [ref, vis] = useReveal(delay);
  return (
    <div ref={ref} onClick={() => nav && onNavigate && onNavigate(nav)}
      style={{
        background: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        cursor: nav ? 'pointer' : 'default',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.04)',
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.55s var(--ease-out) ${delay}ms, transform 0.55s var(--ease-out) ${delay}ms, box-shadow 0.2s ease`,
      }}
      className="group hover:shadow-xl hover:-translate-y-1"
    >
      {/* Top gradient bar */}
      <div style={{ height: 4, background: gradient }} />
      <div style={{ padding: 'clamp(12px,3vw,18px) clamp(12px,3vw,20px) clamp(14px,3vw,20px)' }}>
        {/* Icon + link icon */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: color + '12', color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon d={icon} size={18} />
          </div>
          {nav && (
            <div style={{ opacity: 0, transition: 'opacity 0.2s' }} className="group-hover:opacity-100">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          )}
        </div>

        {/* Number */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(22px, 5vw, 32px)',
          fontWeight: 900,
          color: '#0f172a',
          lineHeight: 1,
          marginBottom: 6,
          letterSpacing: '-0.02em',
        }}>
          <AnimNumber target={value} unit={unit} />
        </div>

        {/* Label */}
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{note}</div>
      </div>
    </div>
  );
}

/* ── Section header ─────────────────────────────────── */
function SectionHeader({ icon, title, sub, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
          <Icon d={icon} size={15} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{title}</div>
          {sub && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
      {action && (
        <button onClick={onAction}
          style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff', border: 'none', padding: '5px 12px', borderRadius: 99, cursor: 'pointer' }}>
          {action} →
        </button>
      )}
    </div>
  );
}

/* ── Mobile-responsive styles ─────────────────────────── */
const HERO_STYLE = `
  @keyframes heroFadeIn {
    from { opacity: 0; transform: translateY(-16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .stats-hero { animation: heroFadeIn 0.6s cubic-bezier(0.16,1,0.3,1) both; }

  /* KPI grid: 2 cols on mobile, 4 on desktop */
  .kpi-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  @media (min-width: 640px) {
    .kpi-grid { grid-template-columns: repeat(4, 1fr); gap: 14px; }
  }

  /* Hero content: stack on mobile */
  .hero-inner {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  @media (min-width: 500px) {
    .hero-inner {
      flex-direction: row;
      align-items: flex-start;
      justify-content: space-between;
    }
  }
  .hero-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
  @media (max-width: 499px) {
    .hero-actions { width: 100%; }
    .hero-actions button { flex: 1; justify-content: center; }
    .stats-hero { padding: 16px 16px 20px !important; }
  }

  /* Bottom grid: 1 col on mobile */
  .bottom-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
  }
  @media (min-width: 768px) {
    .bottom-grid { grid-template-columns: 1fr 1fr; }
  }
`;

/* ── Main Component ─────────────────────────────────── */
export default function StatsPage({ onNavigate }) {
  const [stats, setStats]           = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentChats, setRecentChats]   = useState([]);
  const [chartPeriod, setChartPeriod]   = useState('รายเดือน');
  const [chartData, setChartData]       = useState(null);

  const loadChart = useCallback(() => {
    api(`/api/analytics/chart?period=${encodeURIComponent(chartPeriod)}`)
      .then(d => setChartData(d)).catch(() => setChartData(null));
  }, [chartPeriod]);

  useEffect(() => { loadChart(); }, [loadChart]);

  const load = () => {
    setRefreshing(true);
    Promise.all([
      api('/api/stats').catch(() => null),
      api('/api/orders?limit=5').catch(() => ({ orders: [] })),
      api('/api/chats?limit=5').catch(() => ({ chats: [] })),
    ]).then(([s, o, c]) => {
      setStats(s || { totalOrders: 0, pendingOrders: 0, todayMsgs: 0, activeBots: 0, orderStats: {} });
      setRecentOrders((o?.orders || []).map(r => ({
        id: r.orderId || `#${r.rowIndex}`,
        customer: (r.platform || 'LINE') + ': ' + (r.name || 'ลูกค้า'),
        item: r.product || 'สินค้า',
        amount: r.qty ? `${r.qty} ชิ้น` : '-',
        status: r.status || 'รอยืนยัน',
        sc: r.status === 'จัดส่งแล้ว' ? '#059669' : r.status === 'ยกเลิก' ? '#dc2626' : '#d97706',
      })));
      setRecentChats((c?.chats || []).map(ch => {
        const diffMs = Date.now() - new Date(ch.created_at).getTime();
        const diffM  = Math.floor(diffMs / 60000);
        return { name: ch.user_name || 'ไม่ระบุชื่อ', msg: ch.message || '', time: diffM < 60 ? `${diffM}m` : `${Math.floor(diffM/60)}h`, via: ch.platform === 'facebook' ? 'FB' : 'LINE', replied: ch.direction === 'out' };
      }));
      setRefreshing(false);
    }).catch(() => setRefreshing(false));
  };

  useEffect(() => { load(); }, []);

  if (!stats) return <Loader />;

  const aiRes = Math.min(100, Math.max(0, 100 - (stats.pendingOrders || 0)));

  const kpis = [
    { label: 'ออเดอร์ทั้งหมด',  value: stats.totalOrders ?? 0,   unit: '',  note: 'รวมทุกช่องทาง',    color: '#2563eb', gradient: 'linear-gradient(90deg,#2563eb,#60a5fa)', icon: Icons.cart,    nav: 'orders',  delay: 0   },
    { label: 'การสนทนาวันนี้',  value: stats.todayMsgs ?? 0,     unit: '',  note: 'เข้ามาใหม่วันนี้',  color: '#7c3aed', gradient: 'linear-gradient(90deg,#7c3aed,#a78bfa)', icon: Icons.chat,    nav: 'chats',   delay: 80  },
    { label: 'รอยืนยันออเดอร์', value: stats.pendingOrders ?? 0, unit: '',  note: 'ต้องดำเนินการ',    color: '#d97706', gradient: 'linear-gradient(90deg,#d97706,#fbbf24)', icon: Icons.box,     nav: 'orders',  delay: 160 },
    { label: 'AI Resolution',   value: stats.aiResolution ?? aiRes, unit: '%', note: 'ประสิทธิภาพบอท', color: '#059669', gradient: 'linear-gradient(90deg,#059669,#34d399)', icon: Icons.bot,     nav: null,      delay: 240 },
  ];

  const orderStatusBars = [
    { l: 'ส่งแล้ว',  v: stats.totalOrders ? Math.round((stats.orderStats?.['ส่งแล้ว']||0)/stats.totalOrders*100) : 0, c: '#059669' },
    { l: 'จัดส่ง',  v: stats.totalOrders ? Math.round((stats.orderStats?.['จัดส่ง']||0)/stats.totalOrders*100)  : 0, c: '#2563eb' },
    { l: 'รอ',      v: stats.totalOrders ? Math.round((stats.orderStats?.['รอ']||0)/stats.totalOrders*100)      : 0, c: '#d97706' },
    { l: 'ยกเลิก',  v: stats.totalOrders ? Math.round((stats.orderStats?.['ยกเลิก']||0)/stats.totalOrders*100) : 0, c: '#dc2626' },
  ];

  const CARD = { background: '#fff', borderRadius: 20, padding: '22px 24px', boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.04)' };

  return (
    <div style={{ fontFamily: 'var(--font-body)', minHeight: '100vh' }}>
      <style>{HERO_STYLE}</style>

      {/* ── Hero Header ────────────────────────────────── */}
      <div className="stats-hero" style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #1e40af 50%, #312e81 100%)',
        borderRadius: 24, padding: '22px 28px 26px', marginBottom: 20,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position:'absolute', top:-40, right:-40, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }} />
        <div style={{ position:'absolute', bottom:-60, right:80, width:240, height:240, borderRadius:'50%', background:'rgba(255,255,255,0.03)' }} />
        <div style={{ position:'absolute', top:20, right:140, width:80, height:80, borderRadius:'50%', background:'rgba(96,165,250,0.15)' }} />

        <div className="hero-inner" style={{ position:'relative', zIndex:1 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2}>
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z M12 8v4l3 3"/>
                </svg>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {[{ label:'LINE', ok:true }, { label:'Facebook', ok:true }, { label:'Bot', ok:true }].map(s => (
                  <span key={s.label} style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background: s.ok ? 'rgba(52,211,153,0.25)' : 'rgba(239,68,68,0.25)', color: s.ok ? '#6ee7b7' : '#fca5a5', border: `1px solid ${s.ok ? 'rgba(52,211,153,0.4)' : 'rgba(239,68,68,0.4)'}` }}>
                    {s.label} {s.ok ? '✓' : '✗'}
                  </span>
                ))}
              </div>
            </div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(20px,3vw,26px)', fontWeight:900, color:'#fff', margin:0, lineHeight:1.1, letterSpacing:'-0.02em' }}>
              ภาพรวมระบบ
            </h1>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.6)', margin:'6px 0 0', fontWeight:500 }}>
              สรุปสถิติยอดขาย · ออเดอร์ · ประสิทธิภาพ AI Bot
            </p>
          </div>
          <div className="hero-actions">
            <button onClick={load} disabled={refreshing}
              style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', fontSize:12, fontWeight:700, padding:'8px 16px', borderRadius:12, cursor:'pointer', backdropFilter:'blur(8px)', transition:'all 0.2s' }}>
              <Icon d={Icons.refresh} size={13} /> {refreshing ? '...' : 'รีเฟรช'}
            </button>
            <button onClick={() => onNavigate && onNavigate('orders')}
              style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', color:'#1e40af', fontSize:12, fontWeight:800, padding:'8px 18px', borderRadius:12, cursor:'pointer', border:'none', transition:'all 0.2s' }}>
              <Icon d={Icons.cart} size={13} /> จัดการออเดอร์
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Grid — 2×2 mobile / 4 desktop ────────── */}
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        {kpis.map((k, i) => <KpiCard key={k.label} {...k} onNavigate={onNavigate} />)}
      </div>

      {/* ── Chart ──────────────────────────────────────── */}
      <ChartCard chartData={chartData} chartPeriod={chartPeriod} setChartPeriod={setChartPeriod} />

      {/* ── Bottom Row ─────────────────────────────────── */}
      <div className="bottom-grid" style={{ paddingBottom: 40, marginTop: 16 }}>

        {/* Recent Orders */}
        <div style={CARD}>
          <SectionHeader icon={Icons.cart} title="ออเดอร์ล่าสุด" sub="5 รายการล่าสุด" action="ดูทั้งหมด" onAction={() => onNavigate && onNavigate('orders')} />
          {recentOrders.length > 0 ? recentOrders.map((o, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom: i < recentOrders.length-1 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ width:38, height:38, borderRadius:12, background:'#f8fafc', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ fontSize:9, fontWeight:900, color:'#64748b' }}>{o.id}</span>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.customer}</div>
                <div style={{ fontSize:11, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.item}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:12, fontWeight:800, color:'#0f172a' }}>{o.amount}</div>
                <span style={{ display:'inline-block', marginTop:3, fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:99, color:o.sc, background:o.sc+'18' }}>{o.status}</span>
              </div>
            </div>
          )) : <Empty label="ยังไม่มีรายการออเดอร์" />}
        </div>

        {/* Recent Chats + Order Status */}
        <div style={CARD}>
          <SectionHeader icon={Icons.chat} title="การสนทนาล่าสุด" sub="Bot ตอบอัตโนมัติ" action="ดูทั้งหมด" onAction={() => onNavigate && onNavigate('chats')} />

          {/* Order status mini bars */}
          {stats.totalOrders > 0 && (
            <div style={{ background:'#f8fafc', borderRadius:12, padding:'12px 14px', marginBottom:14, display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 }}>
              {orderStatusBars.map(s => (
                <div key={s.l}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:9, color:'#64748b', fontWeight:600 }}>{s.l}</span>
                    <span style={{ fontSize:9, fontWeight:800, color:s.c }}>{s.v}%</span>
                  </div>
                  <div style={{ height:4, borderRadius:99, background:'#e2e8f0' }}>
                    <div style={{ height:'100%', borderRadius:99, background:s.c, width:s.v+'%', transition:'width 1s var(--ease-out)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {recentChats.length > 0 ? recentChats.map((c, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom: i < recentChats.length-1 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ width:34, height:34, borderRadius:99, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'#fff', background: c.via==='LINE' ? '#06c755' : '#1877f2' }}>
                {c.via==='LINE' ? 'L' : 'F'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:4 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</span>
                  <span style={{ fontSize:9, color:'#cbd5e1', flexShrink:0 }}>{c.time} ago</span>
                </div>
                <div style={{ fontSize:11, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.msg}</div>
              </div>
              <span style={{ flexShrink:0, fontSize:9, fontWeight:800, padding:'3px 8px', borderRadius:99, color: c.replied ? '#059669' : '#d97706', background: c.replied ? '#ecfdf5' : '#fffbeb' }}>
                {c.replied ? 'Bot ตอบ' : 'รอตอบ'}
              </span>
            </div>
          )) : <Empty label="ยังไม่มีการสนทนา" />}
        </div>

      </div>
    </div>
  );
}

/* ── Chart Card ─────────────────────────────────────── */
function ChartCard({ chartData, chartPeriod, setChartPeriod }) {
  const [ref, vis] = useReveal(0);
  const PERIODS = ['รายสัปดาห์','รายเดือน','รายปี'];
  const LEGEND = [{ l:'ปริมาณแชท', c:'#f59e0b' }, { l:'Bot จัดการ', c:'#06b6d4' }, { l:'ออเดอร์', c:'#7c3aed' }];
  return (
    <div ref={ref} style={{
      background:'#fff', borderRadius:20, padding:'22px 24px 18px',
      boxShadow:'0 1px 3px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.04)',
      opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(20px)',
      transition:'opacity 0.6s var(--ease-out) 0.1s, transform 0.6s var(--ease-out) 0.1s',
    }}>
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:18 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:'#0f172a', letterSpacing:'-0.01em' }}>ปริมาณแชทและออเดอร์</div>
          <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>จำนวนการสนทนา · ยอดสั่งซื้อ</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          {LEGEND.map(item => (
            <div key={item.l} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:8, height:8, borderRadius:99, background:item.c }} />
              <span style={{ fontSize:10, color:'#64748b', fontWeight:600 }}>{item.l}</span>
            </div>
          ))}
          <div style={{ display:'flex', background:'#f1f5f9', borderRadius:10, padding:3, gap:2 }}>
            {PERIODS.map(p => (
              <button key={p} onClick={() => setChartPeriod(p)}
                style={{ fontSize:10, fontWeight:700, padding:'4px 10px', borderRadius:8, border:'none', cursor:'pointer', transition:'all 0.2s',
                  background: chartPeriod===p ? '#fff' : 'transparent',
                  color: chartPeriod===p ? '#1e40af' : '#64748b',
                  boxShadow: chartPeriod===p ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
      <SmoothAreaChart chartData={chartData} />
    </div>
  );
}

/* ── Empty state ────────────────────────────────────── */
function Empty({ label }) {
  return (
    <div style={{ textAlign:'center', padding:'28px 0' }}>
      <div style={{ fontSize:28, marginBottom:8 }}>📭</div>
      <div style={{ fontSize:12, color:'#94a3b8', fontWeight:600 }}>{label}</div>
    </div>
  );
}
