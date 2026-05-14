import React, { useRef, useState, useEffect } from 'react';

// ─── Konversi "dd/mm" atau "YYYY-MM-DD" → nama hari ────────────────
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const toHariLabel = (str) => {
  if (!str) return '';
  try {
    let date;
    if (str.includes('-')) {
      date = new Date(str);
    } else {
      const [dd, mm] = str.split('/');
      date = new Date(`${new Date().getFullYear()}-${mm}-${dd}`);
    }
    if (!isNaN(date.getTime())) return HARI[date.getDay()];
  } catch (_) {}
  return str;
};

const buildYTicks = (maxVal) => {
  const minSteps = 5;
  const rawStep = Math.max(maxVal / minSteps, 10);
  const step = Math.pow(10, Math.floor(Math.log10(rawStep))) * Math.ceil(rawStep / Math.pow(10, Math.floor(Math.log10(rawStep))));
  const ceiling = step * minSteps;
  
  const ticks = [];
  for (let t = 0; t <= ceiling; t += step) ticks.push(t);
  return { ticks, ceiling };
};

const formatCurrencyTick = (val) => {
  if (val === 0) return '0';
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
  if (val >= 1000) return (val / 1000).toFixed(0) + 'K';
  return val;
};

export default function LineChart({ data }) {
  const svgRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);
  const [tooltip,  setTooltip]  = useState({ x: 0, y: 0, value: null, label: '' });
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Slight delay to trigger CSS transition on mount
    const timer = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(timer);
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div style={{
        height: 300, display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#9ca3af', fontSize: 14,
        background: '#ffffff', borderRadius: 16, border: '1px dashed #e2e8f0',
      }}>
        Tidak ada data untuk ditampilkan
      </div>
    );
  }

  const values = data.map((d) => d.value ?? d.pesanan ?? d.total ?? 0);
  const labels = data.map((d) => toHariLabel(d.tanggal ?? d.label ?? d.date ?? ''));

  const maxVal             = Math.max(...values, 0);
  const { ticks, ceiling } = buildYTicks(maxVal);
  const range              = ceiling || 1;

  const W     = 900;
  const H     = 340; // Increased height slightly for better breathing room
  const padL  = 50;
  const padR  = 20;
  const padT  = 40;
  const padB  = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const toX = (i)   => padL + (i + 0.5) * (plotW / Math.max(values.length, 1));
  const toY = (val) => padT + plotH - (val / range) * plotH;

  const barWidth = Math.min(plotW / Math.max(values.length, 1) * 0.45, 40);

  const points = values.map((v, i) => [toX(i), toY(v)]);

  const handleMove = (e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scale = W / rect.width;
    const px    = (e.clientX - rect.left) * scale;
    const best  = points.reduce((b, [x], idx) => {
      const d = Math.abs(x - px);
      return d < b.d ? { d, idx } : b;
    }, { d: Infinity, idx: 0 });
    
    // Only show tooltip if we are somewhat close to a bar horizontally
    if (best.d > barWidth * 2) {
      handleLeave();
      return;
    }
    
    const [x, y] = points[best.idx];
    setHoverIdx(best.idx);
    setTooltip({ x, y, value: values[best.idx], label: labels[best.idx] });
  };
  const handleLeave = () => { setHoverIdx(null); setTooltip({ value: null }); };

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', fontFamily: '"Inter", "Segoe UI", sans-serif', cursor: 'crosshair', display: 'block', overflow: 'visible' }}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>
          <linearGradient id="barGradientHover" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#ef4444" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Y-axis gridlines + labels */}
        {ticks.map((tick) => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line
                x1={padL} x2={W - padR} y1={y} y2={y}
                stroke="#f1f5f9" strokeWidth="1.5" strokeDasharray="6 6"
              />
              <text
                x={padL - 15} y={y}
                fontSize="12" fill="#94a3b8" fontWeight="600"
                textAnchor="end" dominantBaseline="middle"
              >
                {formatCurrencyTick(tick)}
              </text>
            </g>
          );
        })}

        {/* X-axis labels nama hari */}
        {points.map(([x], i) => (
          <text
            key={i}
            x={x} y={H - 12}
            fontSize="13"
            fill={hoverIdx === i ? '#0f172a' : '#64748b'}
            textAnchor="middle"
            fontWeight={hoverIdx === i ? '700' : '600'}
            style={{ transition: 'all 0.2s ease' }}
          >
            {labels[i]}
          </text>
        ))}

        {/* Active Line indicator (sleek vertical line behind bars) */}
        {hoverIdx !== null && (
          <line
            x1={tooltip.x} x2={tooltip.x} y1={padT} y2={padT + plotH}
            stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 4"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Batang / Bar Chart */}
        {points.map(([x, y], i) => {
          const valH = padT + plotH - y;
          const isHover = hoverIdx === i;
          
          // Animate logic
          const currentY = animate ? y : padT + plotH;
          const currentH = animate ? Math.max(valH, 0) : 0;
          
          return (
            <g key={i}>
              <rect
                x={x - barWidth / 2}
                y={currentY}
                width={barWidth}
                height={currentH}
                fill={isHover ? "url(#barGradientHover)" : "url(#barGradient)"}
                rx={6} // More rounded modern corners
                filter={isHover ? "url(#shadow)" : ""}
                style={{
                  transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transformOrigin: 'bottom',
                  opacity: animate ? 1 : 0
                }}
              />
            </g>
          );
        })}
      </svg>

      {/* HTML Tooltip for better glassmorphism/shadow effects */}
      {hoverIdx !== null && tooltip.value !== null && (
        <div style={{
          position: 'absolute',
          left: `calc(${(tooltip.x / W) * 100}%)`,
          top: `calc(${(tooltip.y / H) * 100}%)`,
          transform: 'translate(-50%, calc(-100% - 15px))',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '12px 18px',
          borderRadius: '14px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255,255,255,0.5)',
          pointerEvents: 'none',
          zIndex: 10,
          minWidth: '130px',
          textAlign: 'center',
          transition: 'left 0.15s ease-out, top 0.15s ease-out, opacity 0.2s ease',
          opacity: 1
        }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {tooltip.label}
          </div>
          <div style={{ fontSize: '16px', color: '#0f172a', fontWeight: '800' }}>
            Rp {tooltip.value.toLocaleString('id-ID')}
          </div>
          {/* Tooltip arrow */}
          <div style={{
            position: 'absolute',
            bottom: '-5px',
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: '10px',
            height: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(12px)',
            boxShadow: '4px 4px 5px -2px rgba(0,0,0,0.05)',
            borderRight: '1px solid rgba(255,255,255,0.5)',
            borderBottom: '1px solid rgba(255,255,255,0.5)',
          }}></div>
        </div>
      )}
    </div>
  );
}
