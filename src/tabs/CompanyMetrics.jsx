import React, { useEffect, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { getOverview, getMonthlyMetrics, getThresholds } from '../api'
import { MetricTile, AlertBanner, Badge, SectionLabel, Spinner, PageHeader, InfoTooltip } from '../components/UI'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function CompanyMetrics() {
  const [overview, setOverview]     = useState(null)
  const [monthly,  setMonthly]      = useState([])
  const [thresholds, setThresholds] = useState(null)
  const [loading,  setLoading]      = useState(true)

  useEffect(() => {
    Promise.all([getOverview(), getMonthlyMetrics(), getThresholds()])
      .then(([ov, mm, th]) => { setOverview(ov); setMonthly(mm); setThresholds(th) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const volData = {
    labels: MONTHS,
    datasets: [{
      data: monthly.map(m => m.n_decisions),
      backgroundColor: 'rgba(37,99,235,0.7)',
      borderColor: '#2563EB', borderWidth: 1, borderRadius: 4,
    }]
  }

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 600 },
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#fff', borderColor: '#E5E7EB', borderWidth: 1, titleColor: '#111827', bodyColor: '#6B7280', padding: 10, cornerRadius: 8 } },
    scales: {
      x: { ticks: { color: '#9CA3AF', font: { size: 10 } }, grid: { color: '#F3F4F6' } },
      y: { ticks: { color: '#9CA3AF', font: { size: 10 } }, grid: { color: '#F3F4F6' } },
    }
  }

  const statusBadge = (s) => s === 'active' ? <Badge color="green">Active</Badge> : s === 'violated' ? <Badge color="red">Violated</Badge> : <Badge color="amber">Triggered</Badge>

  return (
    <div className="screen-enter" style={{ padding: 32 }}>
      <PageHeader title="Company Decision Model Overview" subtitle="Automated hiring system · TechCorp India · Jan–Dec 2024 · 1,000 candidate evaluations" />

      {overview?.disparate_impact < 0.8 && (
        <AlertBanner color="red" icon="⚠️" title="Bias Drift Detected" badge={<Badge color="red">Critical</Badge>}
          link="View Detection Details">
          Significant hiring disparity between demographic groups detected.
          Disparate Impact ratio <strong>{overview.disparate_impact}</strong> — below the legal 0.80 threshold.
          {overview.flagged_count} decisions may have been influenced by demographic bias.
        </AlertBanner>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        <MetricTile icon="📋" value={overview?.total_decisions?.toLocaleString()} label="Total Decisions" sub="Jan–Dec 2024" color="blue"
          tooltip={{ technical: 'Total number of hiring decisions made by the automated AI model since deployment.', plain: 'How many people the AI has judged so far.' }} />
        <MetricTile icon="📈" value={`${overview?.hire_rate}%`} label="Overall Hire Rate" sub={`${overview?.hired_count} hired / ${overview?.total_decisions - overview?.hired_count} rejected`} color="amber"
          tooltip={{ technical: 'Percentage of all applicants who received a positive decision. Monitor across demographic groups for disparity.', plain: 'About 6 in 10 applicants were hired — but this hides who is and isn\'t being hired.' }} />
        <MetricTile icon="🚨" value={overview?.flagged_count} label="Decisions Flagged" sub={`${((overview?.flagged_count/overview?.total_decisions)*100).toFixed(1)}% of all decisions`} color="red"
          tooltip={{ technical: 'Decisions identified by FairWatch as potentially influenced by demographic bias rather than qualifications.', plain: '151 people may have been rejected because of who they are, not what they know.' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div>
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Monthly Decision Volume</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>Number of candidates evaluated per month</div>
            <div style={{ height: 130 }}><Bar data={volData} options={chartOpts} /></div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              Feature Influence Analysis <InfoTooltip technical="Features that actually influence hiring decisions. Green = intended by company. Red = unintended demographic signals the model learned." plain="Skills and experience should matter. Gender signals should not." />
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>Intended vs unintended feature weights</div>
            {thresholds?.intended_features?.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                <div style={{ fontSize: 12, fontWeight: 500, width: 140, flexShrink: 0 }}>{f.name}</div>
                <div style={{ flex: 1, height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, width: `${f.weight * 100}%`, background: f.type === 'intended' ? '#16A34A' : '#DC2626' }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, width: 36, textAlign: 'right', color: '#6B7280' }}>{f.weight.toFixed(2)}</div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: f.type === 'intended' ? '#DCFCE7' : '#FEE2E2', color: f.type === 'intended' ? '#16A34A' : '#DC2626' }}>
                  {f.type === 'intended' ? 'Intended' : f.type === 'proxy' ? 'Proxy bias' : 'Unintended'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              Selection Rules & Thresholds <InfoTooltip technical="Rules the company configured for AI decision-making. FairWatch monitors whether these rules are applied equally." plain="The company told the AI what standards to use. FairWatch checks if those standards are applied fairly." />
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>Company-configured decision criteria</div>
            {thresholds?.rules?.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 16px', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{r.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{r.value}</div>
                </div>
                {statusBadge(r.status)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          The Hidden Problem — Accuracy Is Not Enough
          <InfoTooltip technical="A model can be 91% accurate while systematically discriminating against a protected group. This table shows Month 4." plain="Conventional checks said everything was fine. FairWatch already saw the warning sign." />
        </div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>Month 4 comparison — what different monitoring approaches see</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F9FAFB' }}>
              {['Monitoring Approach','Overall Accuracy','Hire Rate','Disparity','Alert Fired?'].map(h => (
                <th key={h} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#9CA3AF', padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Basic accuracy check','91.2%','61.4%','Not measured', <Badge color="grey">No alert</Badge>],
              ['Simple hire rate check','91.2%','61.4%','Not measured', <Badge color="grey">No alert</Badge>],
            ].map(([method,...rest],i) => (
              <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '10px 14px' }}>{method}</td>
                {rest.map((v,j) => <td key={j} style={{ padding: '10px 14px', fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{v}</td>)}
              </tr>
            ))}
            <tr style={{ background: '#EFF6FF' }}>
              <td style={{ padding: '10px 14px', fontWeight: 700, color: '#2563EB' }}>FairWatch</td>
              <td style={{ padding: '10px 14px', fontSize: 12, color: '#2563EB', fontVariantNumeric: 'tabular-nums' }}>91.2%</td>
              <td style={{ padding: '10px 14px', fontSize: 12, color: '#2563EB', fontVariantNumeric: 'tabular-nums' }}>61.4%</td>
              <td style={{ padding: '10px 14px', fontSize: 12, color: '#2563EB', fontVariantNumeric: 'tabular-nums' }}>SPD +0.147</td>
              <td style={{ padding: '10px 14px' }}><Badge color="amber">⚠ WATCH Alert</Badge></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
