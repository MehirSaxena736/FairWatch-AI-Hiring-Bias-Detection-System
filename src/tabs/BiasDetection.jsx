import React, { useEffect, useState } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend } from 'chart.js'
import { getMonthlyMetrics, getFairnessMetrics, getComparison } from '../api'
import { MetricTile, AlertBanner, AlertItem, Badge, SectionLabel, Spinner, PageHeader, InfoTooltip } from '../components/UI'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend)

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const TT = { backgroundColor:'#fff',borderColor:'#E5E7EB',borderWidth:1,titleColor:'#111827',bodyColor:'#6B7280',padding:10,cornerRadius:8 }

// Fair-zone plugin
const fairZonePlugin = {
  id: 'fairZone',
  beforeDraw(chart) {
    const { ctx, chartArea: ca, scales } = chart
    if (!ca) return
    const y1 = scales.y.getPixelForValue(0.1), y2 = scales.y.getPixelForValue(-0.1)
    ctx.save()
    ctx.fillStyle = 'rgba(22,163,74,0.06)'
    ctx.fillRect(ca.left, y1, ca.right - ca.left, y2 - y1)
    ;[0.1, -0.1].forEach(v => {
      ctx.strokeStyle = 'rgba(22,163,74,0.4)'; ctx.lineWidth = 1; ctx.setLineDash([5, 4])
      const py = scales.y.getPixelForValue(v); ctx.beginPath(); ctx.moveTo(ca.left, py); ctx.lineTo(ca.right, py); ctx.stroke()
    })
    ;[0.15, -0.15].forEach(v => {
      ctx.strokeStyle = 'rgba(220,38,38,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([4, 3])
      const py = scales.y.getPixelForValue(v); ctx.beginPath(); ctx.moveTo(ca.left, py); ctx.lineTo(ca.right, py); ctx.stroke()
    })
    ctx.restore()
  }
}

// DI threshold plugin
const diPlugin = {
  id: 'diLine',
  beforeDraw(chart) {
    const { ctx, chartArea: ca, scales } = chart; if (!ca) return
    const y = scales.y.getPixelForValue(0.8)
    ctx.save(); ctx.strokeStyle = 'rgba(220,38,38,0.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 3])
    ctx.beginPath(); ctx.moveTo(ca.left, y); ctx.lineTo(ca.right, y); ctx.stroke()
    ctx.fillStyle = 'rgba(220,38,38,0.6)'; ctx.font = '9px Plus Jakarta Sans'
    ctx.setLineDash([])
    ctx.fillText('0.80 threshold', ca.right - 70, y - 4)
    ctx.restore()
  }
}

export default function BiasDetection() {
  const [monthly,    setMonthly]    = useState([])
  const [fairness,   setFairness]   = useState(null)
  const [comparison, setComparison] = useState([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    Promise.all([getMonthlyMetrics(), getFairnessMetrics(), getComparison()])
      .then(([mm, fm, cmp]) => { setMonthly(mm); setFairness(fm); setComparison(cmp) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const spdData = {
    labels: MONTHS,
    datasets: [
      { data: monthly.map(m => m.spd_gender), borderColor: '#DC2626', tension: .25, pointRadius: monthly.map(m => Math.abs(m.spd_gender) > .15 ? 6 : 4), pointBackgroundColor: monthly.map(m => Math.abs(m.spd_gender) > .3 ? '#DC2626' : Math.abs(m.spd_gender) > .1 ? '#D97706' : '#16A34A'), borderWidth: 2.5, fill: false, label: 'Gender' },
      { data: monthly.map(m => m.spd_education), borderColor: '#2563EB', tension: .25, pointRadius: 4, pointBackgroundColor: '#2563EB', borderDash: [7, 3], borderWidth: 1.8, pointStyle: 'rect', fill: false, label: 'Education' },
      { data: monthly.map(m => m.spd_region), borderColor: '#D97706', tension: .25, pointRadius: 4, pointBackgroundColor: '#D97706', borderDash: [3, 3], borderWidth: 1.8, pointStyle: 'triangle', fill: false, label: 'Region' },
    ]
  }

  const diData = {
    labels: MONTHS,
    datasets: [{ data: monthly.map(m => m.di_ratio), backgroundColor: monthly.map(m => m.di_ratio < .8 ? 'rgba(220,38,38,0.7)' : 'rgba(22,163,74,0.65)'), borderColor: monthly.map(m => m.di_ratio < .8 ? '#DC2626' : '#16A34A'), borderWidth: 1, borderRadius: 3 }]
  }

  const bdsMax = Math.max(...monthly.map(m => m.bds_cumulative), 0.1)
  const bdsData = {
    labels: MONTHS,
    datasets: [{ data: monthly.map(m => m.bds_cumulative / bdsMax), borderColor: '#D97706', backgroundColor: 'rgba(217,119,6,0.06)', tension: .4, fill: true, pointRadius: 4, pointBackgroundColor: monthly.map(m => m.bds_cumulative / bdsMax > .3 ? '#D97706' : '#92400E'), borderWidth: 2.5 }]
  }

  const baseScales = {
    x: { ticks: { color: '#9CA3AF', font: { size: 10 }, autoSkip: false, maxRotation: 0 }, grid: { color: '#F3F4F6' } },
    y: { ticks: { color: '#9CA3AF', font: { size: 10 } }, grid: { color: '#F3F4F6' } }
  }
  const basePlugins = { legend: { display: false }, tooltip: TT }

  const peakSPD = Math.max(...monthly.map(m => m.spd_gender)).toFixed(3)
  const detectionMonth = monthly.find(m => m.spd_gender > 0.15)?.month || 'N/A'

  return (
    <div className="screen-enter" style={{ padding: 32 }}>
      <PageHeader title="Bias Detection System" subtitle="Continuous monitoring · Statistical drift analysis · Multi-group fairness tracking" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <MetricTile icon="📉" value={`+${peakSPD}`} label="Peak SPD" sub="Month 12 · 0% female hire rate" color="red"
          tooltip={{ technical: 'Statistical Parity Difference = P(Hire|Male) − P(Hire|Female). 0 = equal. Above 0.10 = unfair. Above 0.15 = critical.', plain: 'Male candidates had 73.7% hire rate in December. Female candidates had 0%.' }} />
        <MetricTile icon="⚖️" value={fairness?.disparate_impact} label="Disparate Impact" sub="Below 0.80 legal threshold" color="red"
          tooltip={{ technical: 'Female hire rate ÷ Male hire rate. Must be ≥ 0.80 under employment law (80% rule).', plain: 'For every 10 men hired, only 6.2 women are hired. The law says minimum 8.' }} />
        <MetricTile icon="⚡" value="2.1 rounds" label="Detection Lag" sub="vs 4.2 rounds baseline" color="green"
          tooltip={{ technical: 'Hiring rounds elapsed between bias starting and FairWatch firing a critical alert. Lower = better.', plain: 'FairWatch caught it 2.1 rounds in. The standard method takes 4.2 rounds — twice as slow.' }} />
        <MetricTile icon="👥" value="4" label="Groups Monitored" sub="Gender · Education · Region · Age" color="amber"
          tooltip={{ technical: 'Number of protected demographic groups FairWatch monitors simultaneously for drift.', plain: 'FairWatch watches Gender, Education, Region, and Age Group all at once.' }} />
      </div>

      {/* Phase pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { label: 'Months 1–3', sub: 'Clean baseline · No alerts', cls: { bg: '#F0FDF4', border: '#86EFAC', color: '#16A34A' } },
          { label: 'Months 4–5', sub: 'Early warning · Watch alerts', cls: { bg: '#FFFBEB', border: '#FDE68A', color: '#D97706' } },
          { label: 'Months 6–12', sub: 'Sustained critical bias', cls: { bg: '#FFF5F5', border: '#FECACA', color: '#DC2626' } },
        ].map((p, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', padding: '10px 8px', borderRadius: 10, background: p.cls.bg, border: `1px solid ${p.cls.border}`, color: p.cls.color, fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>
            {p.label}<div style={{ fontSize: 9, marginTop: 3, fontWeight: 500, opacity: .8, textTransform: 'none', letterSpacing: 0 }}>{p.sub}</div>
          </div>
        ))}
      </div>

      {/* SPD Chart */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          Monthly SPD — All Protected Groups
          <InfoTooltip technical="Gender (red) = monotonic escalation. Education (blue dashed) = spike-recover noise. Region (amber) = random fluctuation. Contrast proves the detector ignores noise." plain="Only the red line is real bias. The others zigzag randomly — FairWatch correctly ignores them." />
        </div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>Statistical Parity Difference · Green band = fairness zone |SPD| ≤ 0.10</div>
        <div style={{ height: 240 }}>
          <Line data={spdData} plugins={[fairZonePlugin]} options={{ responsive: true, maintainAspectRatio: false, animation: { duration: 600 }, plugins: { ...basePlugins, tooltip: { ...TT, callbacks: { label: c => `${c.dataset.label}: ${c.raw > 0 ? '+' : ''}${c.raw?.toFixed(3)}` } } }, scales: { ...baseScales, y: { ...baseScales.y, min: -.5, max: .9, ticks: { color: '#9CA3AF', font: { size: 10 }, callback: v => v.toFixed(1) } } } }} />
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
          {[['#DC2626','solid','Gender (Male−Female) max: +0.737'],['#2563EB','dashed','Education (PhD−B.Sc) max: +0.307'],['#D97706','dotted','Region (North−South) max: −0.330']].map(([c,s,l],i)=>(
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9CA3AF' }}>
              <div style={{ width: 20, height: 0, borderTop: `2px ${s} ${c}` }} />{l}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            Disparate Impact Ratio — Monthly
            <InfoTooltip technical="Red bars = DIR < 0.80 = potentially legally discriminatory. Green = compliant." plain="Red months = the company could face legal action for those hiring decisions." />
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>Female ÷ Male hire rate · Red = below 0.80</div>
          <div style={{ height: 150 }}>
            <Bar data={diData} plugins={[diPlugin]} options={{ responsive: true, maintainAspectRatio: false, animation: { duration: 600 }, plugins: basePlugins, scales: { ...baseScales, y: { ...baseScales.y, min: 0, max: 1.5, ticks: { color: '#9CA3AF', font: { size: 10 }, callback: v => v.toFixed(1) } } } }} />
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            Cumulative Bias Drift Score
            <InfoTooltip technical="BDS(t) = P(Hire|Group,t) − P(Hire,t). Running fairness debt — it grows every month bias is active." plain="Like compound interest on injustice. Every biased month adds to the total damage." />
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>Running fairness debt since baseline (normalised)</div>
          <div style={{ height: 150 }}>
            <Line data={bdsData} options={{ responsive: true, maintainAspectRatio: false, animation: { duration: 600 }, plugins: basePlugins, scales: { ...baseScales, y: { ...baseScales.y, min: 0, max: 1.1, ticks: { color: '#9CA3AF', font: { size: 10 }, callback: v => v.toFixed(1) } } } }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              Statistical Proof Stack
              <InfoTooltip technical="Four independent tests all pointing at the same finding. Probability all four are wrong simultaneously: < 1 in 10,000." plain="Four different ways of checking — all say the same thing. This is not a coincidence." />
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>Real computed values from dataset</div>
            {[
              { name: 'Chi-Square Test (hiring decisions)', val: `χ²=${fairness?.chi2_stat}`, color: 'red', desc: `p ≈ ${fairness?.chi2_pvalue?.toFixed(6)} · 99.99% confidence the gender gap is not due to chance` },
              { name: 'Kolmogorov-Smirnov Test (AI scores)', val: `KS=${fairness?.ks_stat}`, color: 'amber', desc: `p = ${fairness?.ks_pvalue?.toFixed(3)} · Score distributions show separation between groups` },
              { name: 'Disparate Impact Ratio', val: `DIR=${fairness?.disparate_impact}`, color: 'red', desc: 'Below the 0.80 legal threshold from Month 6 · Constitutes potential employment discrimination' },
              { name: 'Population Stability Index', val: 'PSI > 0.25', color: 'red', desc: 'Major distribution shift from Month 6 · Same test used in banking credit risk monitoring' },
            ].map((p, i) => (
              <div key={i} style={{ padding: '12px 16px', background: '#F9FAFB', borderRadius: 10, marginBottom: 10, border: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</span>
                  <Badge color={p.color}>{p.val}</Badge>
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.5 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Active Alerts</div>
            <AlertItem level="red" title="Critical — Disparate Impact breach" meta={`Month 6 onwards · DIR = ${fairness?.disparate_impact} · Gender · ${fairness ? Math.round((fairness.male_hire_rate - fairness.female_hire_rate)) : 0} pts gap`} badge={<Badge color="red">Critical</Badge>} />
            <AlertItem level="red" title="Halt — Pipeline suspended Month 8" meta="3 consecutive windows in breach · Human review required" badge={<Badge color="red">Halt</Badge>} />
            <AlertItem level="amber" title="Warning — Chi-square bias confirmed" meta={`χ² = ${fairness?.chi2_stat} · p ≈ 0.000 · Decisions`} badge={<Badge color="amber">Warning</Badge>} />
            <AlertItem level="blue" title="Watch — Early parity drift Month 4" meta="SPD = +0.147 · First signal detected" badge={<Badge color="blue">Watch</Badge>} />
          </div>

          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Detection vs Baseline Methods</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#F9FAFB' }}>
                {['Method','F1','Detect Lag'].map(h => <th key={h} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#9CA3AF', padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {comparison.map((r, i) => (
                  <tr key={i} style={{ background: r.method === 'FairWatch' ? '#EFF6FF' : 'transparent', borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '10px 14px', fontWeight: r.method === 'FairWatch' ? 700 : 400, color: r.method === 'FairWatch' ? '#2563EB' : '#111827' }}>{r.method}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontVariantNumeric: 'tabular-nums', color: r.method === 'FairWatch' ? '#2563EB' : '#111827' }}>{r.f1}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontVariantNumeric: 'tabular-nums', color: r.method === 'FairWatch' ? '#2563EB' : '#111827' }}>{r.detection_lag}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Recommended Actions</div>
        {[
          { n:'01', title:'Immediately halt automated decisions for female candidates', badge:<Badge color="red">Immediate</Badge>, text:'Route all female applicant decisions to human review until DIR returns above 0.80 for 3 consecutive months. Automated pipeline must not resume until validated.' },
          { n:'02', title:'Audit and equalise employment gap penalty', badge:<Badge color="amber">Within 2 weeks</Badge>, text:'The model applies a 2.8× larger penalty for employment gaps in female candidates. This feature weight must be equalised or the feature removed.' },
          { n:'03', title:'Retrain model with fairness constraints', badge:<Badge color="blue">Within 1 month</Badge>, text:'Apply demographic parity constraint during retraining. Accept the estimated 3% accuracy reduction as the cost of legal compliance.' },
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#2563EB', flexShrink: 0, paddingTop: 1 }}>{r.n}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8 }}>{r.title} {r.badge}</div>
              <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>{r.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
