import React, { useState, useEffect } from 'react'
import CompanyMetrics    from './tabs/CompanyMetrics'
import BiasDetection     from './tabs/BiasDetection'
import FairnessValidation from './tabs/FairnessValidation'
import ResumeExplorer    from './tabs/ResumeExplorer'
import InjectionLab      from './tabs/InjectionLab'

const TABS = [
  { id: 0, num: '01', icon: '📊', label: 'Company Metrics',     component: CompanyMetrics },
  { id: 1, num: '02', icon: '🔍', label: 'Bias Detection',      component: BiasDetection },
  { id: 2, num: '03', icon: '⚖️', label: 'Fairness Validation', component: FairnessValidation },
  { id: 3, num: '04', icon: '👤', label: 'Resume Explorer',     component: ResumeExplorer },
  { id: 4, num: '05', icon: '🧪', label: 'Injection Lab',       component: InjectionLab },
]

export default function App() {
  const [active, setActive] = useState(0)
  const [status, setStatus] = useState({ text: 'Bias Detected', ok: false })

  const ActiveTab = TABS[active].component

  return (
    <div style={{ display: 'grid', gridTemplateRows: '60px 1fr', height: '100vh' }}>

      {/* Top nav */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 8, position: 'sticky', top: 0, zIndex: 200 }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 24 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>FW</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1 }}>FairWatch</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Hiring Fairness System</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8, border: 'none',
                background: active === tab.id ? '#111827' : 'none',
                color: active === tab.id ? '#fff' : '#6B7280',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: 14 }}>{tab.icon}</span>
              <span style={{ fontSize: 9, opacity: .6 }}>{tab.num}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status chip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 20,
          background: status.ok ? '#DCFCE7' : '#FEE2E2',
          color: status.ok ? '#16A34A' : '#DC2626',
          border: `1px solid ${status.ok ? '#86EFAC' : '#FECACA'}`,
          marginLeft: 'auto',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: status.ok ? '#16A34A' : '#DC2626', animation: status.ok ? 'none' : 'blink 2s infinite' }} />
          {status.text}
          <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
        </div>
      </nav>

      {/* Page body */}
      <div style={{ overflow: 'hidden auto', background: '#F8F9FA' }} key={active}>
        <ActiveTab />
      </div>
    </div>
  )
}
