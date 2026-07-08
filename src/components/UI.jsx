import React, { useState } from 'react'

// ── InfoTooltip ──────────────────────────────────────────────────────
export function InfoTooltip({ technical, plain }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-flex" style={{ verticalAlign: 'middle' }}>
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16, borderRadius: '50%',
          border: '1.5px solid #D1D5DB', color: '#9CA3AF',
          fontSize: 9, cursor: 'pointer', fontStyle: 'italic',
          fontFamily: 'Georgia,serif', fontWeight: 'bold',
          background: 'none', transition: 'all .15s', flexShrink: 0,
        }}
      >i</button>
      {show && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
          transform: 'translateX(-50%)',
          background: '#111827', borderRadius: 10, padding: '12px 14px',
          width: 240, fontSize: 11, color: '#F9FAFB', lineHeight: 1.6,
          zIndex: 999, textAlign: 'left', fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontWeight: 400, fontStyle: 'normal',
          boxShadow: '0 4px 16px rgba(0,0,0,.2)',
          pointerEvents: 'none',
        }}>
          <div>{technical}</div>
          {plain && (
            <div style={{ color: '#6EE7B7', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,.15)' }}>
              {plain}
            </div>
          )}
          <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderWidth: 5, borderStyle: 'solid', borderColor: 'transparent', borderTopColor: '#111827' }} />
        </div>
      )}
    </span>
  )
}

// ── Badge ────────────────────────────────────────────────────────────
const badgeStyles = {
  red:    { background: '#FEE2E2', color: '#DC2626' },
  amber:  { background: '#FEF3C7', color: '#D97706' },
  green:  { background: '#DCFCE7', color: '#16A34A' },
  blue:   { background: '#DBEAFE', color: '#2563EB' },
  grey:   { background: '#F3F4F6', color: '#6B7280' },
  purple: { background: '#EDE9FE', color: '#7C3AED' },
}
export function Badge({ color = 'grey', children }) {
  const s = badgeStyles[color] || badgeStyles.grey
  return (
    <span style={{
      ...s, fontSize: 10, fontWeight: 700, padding: '3px 10px',
      borderRadius: 20, letterSpacing: '.03em', display: 'inline-flex', alignItems: 'center',
    }}>{children}</span>
  )
}

// ── MetricTile ───────────────────────────────────────────────────────
const iconBgs = { blue: '#DBEAFE', green: '#DCFCE7', amber: '#FEF3C7', red: '#FEE2E2', purple: '#EDE9FE' }
export function MetricTile({ icon, value, label, sub, color = 'blue', tooltip }) {
  const valColors = { blue: '#2563EB', green: '#16A34A', amber: '#D97706', red: '#DC2626', purple: '#7C3AED', black: '#111827' }
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: iconBgs[color] || '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: valColors[color] || '#111827', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          {label} {tooltip && <InfoTooltip {...tooltip} />}
        </div>
        {sub && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── AlertBanner ──────────────────────────────────────────────────────
const bannerStyles = {
  red:   { bg: '#FFF5F5', border: '#FECACA', left: '#DC2626', titleColor: '#DC2626' },
  amber: { bg: '#FFFBEB', border: '#FDE68A', left: '#D97706', titleColor: '#D97706' },
  blue:  { bg: '#EFF6FF', border: '#BFDBFE', left: '#2563EB', titleColor: '#2563EB' },
  green: { bg: '#F0FDF4', border: '#86EFAC', left: '#16A34A', titleColor: '#16A34A' },
}
export function AlertBanner({ color = 'blue', icon, title, badge, children, link, onLink }) {
  const s = bannerStyles[color] || bannerStyles.blue
  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`,
      borderLeft: `4px solid ${s.left}`,
      borderRadius: 12, padding: '16px 20px',
      display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20,
    }}>
      <div style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: s.titleColor, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          {title} {badge}
        </div>
        <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>{children}</div>
        {link && <button onClick={onLink} style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', marginTop: 6, padding: 0 }}>{link} →</button>}
      </div>
    </div>
  )
}

// ── SectionLabel ─────────────────────────────────────────────────────
export function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
      {children}
    </div>
  )
}

// ── ShapBar ──────────────────────────────────────────────────────────
export function ShapBar({ label, value, positive }) {
  const pct  = Math.round(Math.abs(value) * 100)
  const sign = positive ? '+' : '−'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
      <div style={{ fontSize: 11, color: '#6B7280', textAlign: 'right', width: 120, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
        <div className="shap-fill" style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: positive ? '#16A34A' : '#DC2626' }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, width: 44, textAlign: 'right', color: positive ? '#16A34A' : '#DC2626' }}>
        {sign}{Math.abs(value).toFixed(2)}
      </div>
    </div>
  )
}

// ── AlertItem ────────────────────────────────────────────────────────
const dotColors = { red: '#DC2626', amber: '#D97706', blue: '#2563EB', green: '#16A34A' }
export function AlertItem({ level, title, meta, badge }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 16px', background: '#fff', border: '1px solid #E5E7EB',
      borderLeft: `3px solid ${dotColors[level] || '#E5E7EB'}`,
      borderRadius: 10, marginBottom: 8,
      boxShadow: '0 1px 2px rgba(0,0,0,.04)',
    }}>
      <div style={{ width: 9, height: 9, borderRadius: '50%', background: dotColors[level], marginTop: 4, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 11, color: '#9CA3AF' }}>{meta}</div>
      </div>
      {badge}
    </div>
  )
}

// ── LoadingSpinner ───────────────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── PageHeader ───────────────────────────────────────────────────────
export function PageHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 28, fontStyle: 'italic', color: '#111827', marginBottom: 4, letterSpacing: '-.02em', lineHeight: 1.2 }}>{title}</h1>
      <p style={{ fontSize: 13, color: '#9CA3AF' }}>{subtitle}</p>
    </div>
  )
}
