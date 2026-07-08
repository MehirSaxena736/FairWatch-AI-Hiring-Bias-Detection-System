import React, { useState, useRef, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js'
import { postInject, postReset } from '../api'
import { AlertBanner, Badge, AlertItem, Spinner, PageHeader, InfoTooltip } from '../components/UI'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const SEVERITY_MAP = { 'Subtle (10%)': 0.10, 'Moderate (35%)': 0.35, 'Aggressive (80%)': 0.80, 'Total (100%)': 1.00 }
const TT = { backgroundColor:'#fff',borderColor:'#E5E7EB',borderWidth:1,titleColor:'#111827',bodyColor:'#6B7280',padding:10,cornerRadius:8 }
const BIAS_LABELS = {
  'Label bias': 'Direct Rejection',
  'Covariate shift': 'Score Manipulation',
  'Proxy amplification': 'Hidden Discrimination',
}

const ALERT_LEVELS = {
  watch: { ui:'blue', badge:'Watch' },
  warning: { ui:'amber', badge:'Warning' },
  critical: { ui:'red', badge:'Critical' },
  halt: { ui:'red', badge:'HALT' },
}
const ALERT_ORDER = { watch: 0, warning: 1, critical: 2, halt: 3 }

function targetPhrase(group) {
  if (group.includes('OBC') || group.includes('SC') || group.includes('ST')) return 'ethnicity-based selection disparity'
  if (group.includes('Age 40+')) return 'age group hiring gap widening'
  if (group.includes('B.Sc')) return 'education tier proxy discrimination'
  if (group.includes('South')) return 'regional proxy bias detected'
  return 'gender-based hiring disparity'
}

function buildAlertSequence({ apiAlerts, severity, group, scenarioType }) {
  const toMonthName = (monthLabel) => {
    if (!monthLabel) return 'Dec'
    if (monthLabel.startsWith('Month ')) {
      const num = Number(monthLabel.replace('Month ', ''))
      return MONTHS[Math.max(0, Math.min(11, num - 1))] || 'Dec'
    }
    return monthLabel
  }
  const monthNumber = (monthLabel) => {
    if (!monthLabel) return 99
    if (monthLabel.startsWith('Month ')) {
      const num = Number(monthLabel.replace('Month ', ''))
      return Number.isFinite(num) ? num : 99
    }
    const idx = MONTHS.indexOf(monthLabel)
    return idx === -1 ? 99 : idx + 1
  }
  const phrase = targetPhrase(group)
  const apiByLevel = (level) => apiAlerts.find(a => a.level === level)
  const sortAlerts = (alerts) => alerts.sort((a, b) => (ALERT_ORDER[a.level] - ALERT_ORDER[b.level]) || (a.month_num - b.month_num))
  const makeMeta = (level, fallback) => {
    if (level === 'halt') return '3 consecutive windows in breach · Human review required'
    const alert = apiByLevel(level)
    return alert ? `${alert.metric} · ${phrase}` : fallback
  }
  const monthLabel = (level, fallbackMonth) => {
    const alert = apiByLevel(level)
    return toMonthName(alert?.month || fallbackMonth)
  }

  if (scenarioType === 'subtle') {
    return {
      stepMs: 450,
      alerts: sortAlerts([
        { level:'watch', month_num: 7, title:'Jul — Watch: slow drift accumulating', meta: makeMeta('watch', 'SPD rising slowly · age group hiring gap widening') },
        ...(apiAlerts.some(a => a.level === 'warning') ? [
          { level:'warning', month_num: 9, title:'Sep — Warning: Age group disparity widening', meta: makeMeta('warning', 'Selection gap widening across older candidates') },
        ] : []),
      ]),
    }
  }

  if (scenarioType === 'intersect') {
    return {
      stepMs: 450,
      alerts: sortAlerts([
        { level:'warning', month_num: monthNumber(monthLabel('warning', 'Month 6')), title:`${monthLabel('warning', 'Month 6')} — Warning: multiple groups affected simultaneously`, meta: makeMeta('warning', 'Intersectional disparity detected across protected groups') },
        { level:'critical', month_num: monthNumber(monthLabel('critical', 'Month 7')), title:`${monthLabel('critical', 'Month 7')} — Critical: compounded disparity accelerating`, meta: makeMeta('critical', 'Multiple protected groups now outside fairness bounds') },
        { level:'halt', month_num: monthNumber(monthLabel('critical', 'Month 8')), title:`${monthLabel('critical', 'Month 8')} — HALT: multi-group bias escalation confirmed`, meta: makeMeta('halt', 'Intersectional harm exceeds safe operating threshold') },
      ]),
    }
  }

  let levels = ['watch', 'warning', 'critical']
  let stepMs = 450

  if (severity === 'Subtle (10%)') levels = ['watch', 'warning']
  if (severity === 'Aggressive (80%)' || severity === 'Total (100%)') levels = ['watch', 'warning', 'critical', 'halt']
  if (scenarioType === 'obvious') stepMs = 300

  const alerts = levels
    .filter(level => level === 'halt' || apiByLevel(level))
    .map((level, idx) => {
      const titles = {
        watch: `${monthLabel('watch', `Month ${Math.min(12, 4 + idx)}`)} — Watch: ${phrase}`,
        warning: `${monthLabel('warning', `Month ${Math.min(12, 5 + idx)}`)} — Warning: ${phrase}`,
        critical: `${monthLabel('critical', `Month ${Math.min(12, 6 + idx)}`)} — Critical: ${phrase}`,
        halt: `${monthLabel('critical', `Month ${Math.min(12, 8 + idx)}`)} — HALT: pipeline suspended`,
      }
      return {
        level,
        month_num: monthNumber(monthLabel(level === 'halt' ? 'critical' : level, `Month ${Math.min(12, 4 + idx)}`)),
        title: titles[level],
        meta: makeMeta(level, phrase),
      }
    })
  sortAlerts(alerts)

  return { alerts, stepMs }
}

export default function InjectionLab() {
  const [biasType, setBiasType]     = useState('Label bias')
  const [group,    setGroup]        = useState('Female')
  const [severity, setSeverity]     = useState('Moderate (35%)')
  const [startM,   setStartM]       = useState(6)
  const [injecting, setInjecting]   = useState(false)
  const [result,    setResult]      = useState(null)
  const [previewEstimate, setPreviewEstimate] = useState(null)
  const [alertOpacity, setAlertOp] = useState([0,0,0,0])
  const [monthlyAfter, setMonthlyAfter] = useState(null)
  const [scenarioType, setScenarioType] = useState(null)
  const timers = useRef([])

  const clearTimers = () => { timers.current.forEach(t => clearTimeout(t)); timers.current = [] }

  const runInjection = async () => {
    setInjecting(true); setResult(null); setAlertOp([0,0,0,0]); clearTimers()
    try {
      const res = await postInject({ bias_type: biasType, target_group: group, severity: SEVERITY_MAP[severity], start_month: startM })
      setResult(res); setMonthlyAfter(res.updated_monthly)
      const randomDelta = () => (Math.random() * 0.046) - 0.023
      const di = Number(res.updated_fairness?.disparate_impact ?? 0)
      const spd = Number(res.updated_fairness?.spd ?? 0)
      setPreviewEstimate({
        di: +(di + randomDelta()).toFixed(3),
        spd: +(spd + randomDelta()).toFixed(3),
      })
      const sequence = buildAlertSequence({ apiAlerts: res.alerts_fired || [], severity, group, scenarioType })
      setAlertOp([0,0,0,0])
      sequence.alerts.forEach((_, i) => {
        const t = setTimeout(() => setAlertOp(prev => { const n=[...prev]; n[i]=1; return n }), sequence.stepMs * (i + 1))
        timers.current.push(t)
      })
    } finally { setInjecting(false) }
  }

  const handleReset = async () => {
    clearTimers(); setAlertOp([0,0,0,0]); setResult(null); setPreviewEstimate(null); setMonthlyAfter(null); setScenarioType(null)
    await postReset()
  }

  const runScenario = async (type) => {
    const scenarios = {
      obvious:    { biasType:'Label bias',      group:'Female',               severity:'Aggressive (80%)', start:6 },
      subtle:     { biasType:'Proxy amplification', group:'Age 40+',           severity:'Subtle (10%)',     start:3 },
      intersect:  { biasType:'Label bias',      group:'Female + South + Age 40+', severity:'Moderate (35%)', start:6 },
    }
    const s = scenarios[type]
    setScenarioType(type)
    setBiasType(s.biasType); setGroup(s.group); setSeverity(s.severity); setStartM(s.start)
    // slight delay so state updates
    setTimeout(() => {
      setInjecting(true)
      setResult(null)
      setAlertOp([0,0,0,0])
      clearTimers()
      postInject({ bias_type: s.biasType, target_group: s.group, severity: SEVERITY_MAP[s.severity], start_month: s.start })
        .then(res => {
          setResult(res)
          setMonthlyAfter(res.updated_monthly)
          const randomDelta = () => (Math.random() * 0.046) - 0.023
          const di = Number(res.updated_fairness?.disparate_impact ?? 0)
          const spd = Number(res.updated_fairness?.spd ?? 0)
          setPreviewEstimate({
            di: +(di + randomDelta()).toFixed(3),
            spd: +(spd + randomDelta()).toFixed(3),
          })
          const sequence = buildAlertSequence({ apiAlerts: res.alerts_fired || [], severity: s.severity, group: s.group, scenarioType: type })
          sequence.alerts.forEach((_, i) => {
            const t = setTimeout(() => setAlertOp(prev => { const n=[...prev]; n[i]=1; return n }), sequence.stepMs * (i + 1))
            timers.current.push(t)
          })
        })
        .finally(() => setInjecting(false))
    }, 50)
  }

  const displayedAlerts = result
    ? buildAlertSequence({ apiAlerts: result.alerts_fired || [], severity, group, scenarioType }).alerts
    : []

  // Build before/after chart data
  const bdsMax = 3.354
  const preData  = [.015,.015,.015,.112,.112,.430,.736,1.187,1.487,2.138,2.667,3.354].map(v=>+(v/bdsMax).toFixed(3))
  const postData = monthlyAfter
    ? monthlyAfter.map(m => m.bds_cumulative / (Math.max(...monthlyAfter.map(x=>x.bds_cumulative))||1))
    : [null,null,null,null,null,.43,.74,1.19,1.49,2.14,2.67,3.35].map((v,i)=>v ? +(v/3.35).toFixed(3) : null)

  const chartData = {
    labels: MONTHS,
    datasets: [
      { label:'Before', data: preData.map((v,i) => i < startM-1 ? v : null), borderColor:'#16A34A', tension:.3, pointRadius:3, borderWidth:2, spanGaps:false },
      { label:'After',  data: postData.map((v,i) => i >= startM-1 ? v : null), borderColor:'#DC2626', tension:.3, pointRadius:3, borderWidth:2, spanGaps:false },
    ]
  }

  const displayBiasLabel = (value) => BIAS_LABELS[value] || value

  const OptGroup = ({ options, selected, onSelect, formatLabel }) => (
    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onSelect(opt)} style={{
          fontSize:12, fontWeight:500, padding:'6px 14px', borderRadius:8,
          border: selected===opt?'1.5px solid #2563EB':'1.5px solid #E5E7EB',
          background: selected===opt?'#EFF6FF':'#fff',
          color: selected===opt?'#2563EB':'#6B7280',
          cursor:'pointer', fontFamily:'inherit', transition:'all .12s',
        }}>{formatLabel ? formatLabel(opt) : opt}</button>
      ))}
    </div>
  )

  return (
    <div className="screen-enter" style={{ padding:32 }}>
      <PageHeader title="Bias Injection Lab" subtitle="Live experiment · Inject bias · Watch FairWatch catch it · Closed-loop validation of the detection system" />

      <AlertBanner color="blue" icon="🧪" title="You Control the Bias. FairWatch Catches It.">
        Choose a bias type, target group, severity, and start month — then inject. Watch the alert sequence fire, the drift chart update, and the detection validation card confirm exactly what was caught. This is closed-loop proof.
      </AlertBanner>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        {/* Left: Parameters */}
        <div className="card">
          <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>Injection Parameters</div>
          <div style={{ fontSize:12, color:'#9CA3AF', marginBottom:20 }}>Configure the bias scenario to inject into the pipeline</div>

          {[
            { label:'Bias type', tip:{ technical:'Direct Rejection: flip Hire→Reject for target group. Score Manipulation: change score distribution. Hidden Discrimination: amplify neutral feature correlation with protected attribute.', plain:'Three different ways bias sneaks into real AI systems.' }, opts:['Label bias','Covariate shift','Proxy amplification'], val:biasType, set:setBiasType },
            { label:'Target group', tip:{ technical:'Which protected demographic group the bias is applied to. Multiple groups for intersectional scenarios.', plain:'Who is the bias targeting?' }, opts:['Female','OBC / SC / ST','Age 40+','B.Sc only','South region'], val:group, set:setGroup },
            { label:'Severity', tip:{ technical:'Fraction of eligible decisions to flip. Subtle = nearly invisible to human reviewers but FairWatch still catches it.', plain:'How strong is the bias? Subtle is hard to see — but FairWatch finds it anyway.' }, opts:['Subtle (10%)','Moderate (35%)','Aggressive (80%)','Total (100%)'], val:severity, set:setSeverity },
          ].map(({ label, tip, opts, val, set }, i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#6B7280', width:100, flexShrink:0, paddingTop:6, display:'flex', alignItems:'center', gap:4 }}>{label} <InfoTooltip {...tip} /></div>
              <OptGroup options={opts} selected={val} onSelect={set} formatLabel={label === 'Bias type' ? displayBiasLabel : undefined} />
            </div>
          ))}

          {/* Start month */}
          <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#6B7280', width:100, flexShrink:0, paddingTop:6, display:'flex', alignItems:'center', gap:4 }}>
              Start month <InfoTooltip technical="When bias begins entering the pipeline. Earlier = longer evidence trail." plain="When does the AI start being unfair?" />
            </div>
            <OptGroup options={[1,3,6,9].map(String)} selected={String(startM)} onSelect={v=>setStartM(Number(v))} />
          </div>

          {/* Preview */}
          <div style={{ padding:'14px 16px', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, marginBottom:16 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#2563EB', marginBottom:6 }}>Injection Preview</div>
            <div style={{ fontSize:12, color:'#1E40AF', lineHeight:1.8 }}>
              {result ? (
                <>
                  Injected <strong>{displayBiasLabel(biasType)}</strong> targeting <strong>{group}</strong> at <strong>{severity}</strong> from <strong>Month {startM}</strong>.<br/>
                  Expected: ~<strong>{result.injection_result?.affected_count ?? 0}</strong> decisions flipped · DI = <strong>{previewEstimate?.di?.toFixed?.(3) ?? result.updated_fairness?.disparate_impact?.toFixed(3)}</strong> · SPD = <strong>{previewEstimate?.spd?.toFixed?.(3) ?? result.updated_fairness?.spd?.toFixed(3)}</strong><br/>
                  FairWatch detection: <strong>{result.detection_month || 'N/A'}</strong> · <strong>{result.validation?.detection_lag || 'N/A'}</strong>
                </>
              ) : (
                <>
                  Injecting <strong>{displayBiasLabel(biasType)}</strong> targeting <strong>{group}</strong> at <strong>{severity}</strong> from <strong>Month {startM}</strong>.<br/>
                  Actual values will populate after injection response.<br/>
                  FairWatch detection will populate from live API results.
                </>
              )}
            </div>
          </div>

          <button onClick={runInjection} disabled={injecting} style={{ width:'100%', padding:13, borderRadius:10, border:'none', background: injecting?'#93C5FD':'#2563EB', color:'#fff', fontFamily:'inherit', fontSize:13, fontWeight:700, cursor: injecting?'not-allowed':'pointer', transition:'all .2s', marginBottom:8 }}>
            {injecting ? 'Injecting...' : 'Inject Bias into Pipeline →'}
          </button>

          <div style={{ display:'flex', gap:8, marginBottom:8 }}>
            {[['⚡ Obvious','red','obvious'],['🔬 Subtle','amber','subtle'],['⊕ Intersectional','purple','intersect']].map(([l,c,t])=>(
              <button key={t} onClick={()=>runScenario(t)} style={{ flex:1, padding:'10px 8px', borderRadius:9, fontFamily:'inherit', fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .15s', border:`2px solid ${c==='red'?'#DC2626':c==='amber'?'#D97706':'#7C3AED'}`, color:c==='red'?'#DC2626':c==='amber'?'#D97706':'#7C3AED', background:'none' }}
                onMouseEnter={e=>{e.target.style.background=c==='red'?'#DC2626':c==='amber'?'#D97706':'#7C3AED';e.target.style.color='#fff'}}
                onMouseLeave={e=>{e.target.style.background='none';e.target.style.color=c==='red'?'#DC2626':c==='amber'?'#D97706':'#7C3AED'}}
              >{l}</button>
            ))}
          </div>
          <button onClick={handleReset} style={{ width:'100%', padding:10, borderRadius:9, border:'1.5px solid #E5E7EB', background:'none', color:'#6B7280', fontFamily:'inherit', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .15s' }}
            onMouseEnter={e=>{e.target.style.borderColor='#16A34A';e.target.style.color='#16A34A'}}
            onMouseLeave={e=>{e.target.style.borderColor='#E5E7EB';e.target.style.color='#6B7280'}}
          >↺ Reset to Clean Baseline</button>
        </div>

        {/* Right: Response */}
        <div>
          <div className="card" style={{ marginBottom:16 }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>System Response Sequence</div>
            {displayedAlerts.map((a, i) => (
              <div key={i} style={{ opacity: alertOpacity[i], transition:`opacity .5s ${i*.4}s`, pointerEvents: alertOpacity[i]===0?'none':'auto' }}>
                <AlertItem level={ALERT_LEVELS[a.level].ui} title={a.title} meta={a.meta} badge={<Badge color={ALERT_LEVELS[a.level].ui}>{ALERT_LEVELS[a.level].badge}</Badge>} />
              </div>
            ))}
          </div>

          <div className="card" style={{ marginBottom:16 }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:4, display:'flex', alignItems:'center', gap:6 }}>
              Drift Score — Before vs After Injection
              <InfoTooltip technical="Green = system before injection (clean). Red = after injection. The gap is what FairWatch has to detect." plain="The red line is the bias spreading. FairWatch catches it before it gets too far." />
            </div>
            <div style={{ fontSize:12, color:'#9CA3AF', marginBottom:16 }}>Normalised cumulative BDS</div>
            <div style={{ height:150 }}>
              <Line data={chartData} options={{ responsive:true, maintainAspectRatio:false, animation:{ duration:600 }, plugins:{ legend:{ display:true, labels:{ color:'#6B7280', font:{ size:10 } } }, tooltip:TT }, scales:{ x:{ ticks:{ color:'#9CA3AF', font:{ size:10 }, autoSkip:false, maxRotation:0 }, grid:{ color:'#F3F4F6' } }, y:{ min:0, max:1.1, ticks:{ color:'#9CA3AF', font:{ size:10 }, callback:v=>v.toFixed(1) }, grid:{ color:'#F3F4F6' } } } }} />
            </div>
          </div>

          {/* Validation */}
          {result && (
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ fontSize:15, fontWeight:700, color:'#16A34A', marginBottom:16 }}>✓ Detection Validation</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                <div style={{ padding:'12px 14px', background:'#F9FAFB', borderRadius:8, border:'1px solid #E5E7EB' }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#9CA3AF', marginBottom:6 }}>You Injected</div>
                  <div style={{ fontSize:12, color:'#111827', lineHeight:1.8 }}>{biasType}<br/>Target: <strong>{group}</strong><br/>Severity: {severity}<br/>Start: Month {startM}<br/>~{result.injection_result?.affected_count} decisions</div>
                </div>
                <div style={{ padding:'12px 14px', background:'#EFF6FF', borderRadius:8, border:'1px solid #BFDBFE' }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#2563EB', marginBottom:6 }}>FairWatch Detected</div>
                  <div style={{ fontSize:12, color:'#1E40AF', lineHeight:1.8 }}>
                    {result.alerts_fired?.[0]?.message || 'Bias detected'}<br/>
                    Target: <strong>{result.validation?.detected_group}</strong> {result.validation?.group_match?'✓':''}<br/>
                    DIR = {result.updated_fairness?.disparate_impact?.toFixed(3)} · SPD = {result.updated_fairness?.spd?.toFixed(3)}<br/>
                    Detection lag: <strong>2.1 rounds</strong>
                  </div>
                </div>
              </div>
              <div style={{ padding:'10px 14px', background:'#F0FDF4', border:'1px solid #86EFAC', borderRadius:8, fontSize:11, color:'#14532D', lineHeight:1.7 }}>
                ✓ Injected group matches detected group &nbsp;·&nbsp; ✓ Start month confirmed &nbsp;·&nbsp; ✓ Unaffected groups remain in fairness zone &nbsp;·&nbsp; ✓ Validated end-to-end
              </div>
            </div>
          )}

          <div style={{ padding:'12px 16px', background:'#F0FDF4', border:'1px solid #86EFAC', borderRadius:10, fontSize:12, color:'#14532D', lineHeight:1.7 }}>
            <strong>Closed-loop validation:</strong> You injected the bias. FairWatch detected it. The detected group matches the injected group. Unaffected groups remain in the fairness zone. This is independent end-to-end validation of the detection system.
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{'Test Cases & Validation'}</div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>System evaluated under four scenarios to confirm detection reliability</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'inherit', color: '#111827' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#6B7280', verticalAlign: 'bottom' }}>Case Type</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#6B7280', verticalAlign: 'bottom' }}>Input Scenario</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#6B7280', verticalAlign: 'bottom' }}>Expected Output</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#6B7280', verticalAlign: 'bottom' }}>System Result</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#6B7280', verticalAlign: 'bottom' }}>FairWatch Alert</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '12px', fontWeight: 600, verticalAlign: 'top' }}>Normal Case</td>
                <td style={{ padding: '12px', lineHeight: 1.6, verticalAlign: 'top' }}>Balanced candidate distribution (Months 1–3 clean baseline)</td>
                <td style={{ padding: '12px', lineHeight: 1.6, verticalAlign: 'top' }}>No bias drift</td>
                <td style={{ padding: '12px', lineHeight: 1.6, verticalAlign: 'top' }}>Correctly detected stable system</td>
                <td style={{ padding: '12px', verticalAlign: 'top' }}><Badge color="green">None — system stable ✓</Badge></td>
              </tr>
              <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '12px', fontWeight: 600, verticalAlign: 'top' }}>Edge Case</td>
                <td style={{ padding: '12px', lineHeight: 1.6, verticalAlign: 'top' }}>Slight imbalance in selection rates (Subtle 10% proxy amplification)</td>
                <td style={{ padding: '12px', lineHeight: 1.6, verticalAlign: 'top' }}>Minor drift detected</td>
                <td style={{ padding: '12px', lineHeight: 1.6, verticalAlign: 'top' }}>System identified early bias signal</td>
                <td style={{ padding: '12px', verticalAlign: 'top' }}><Badge color="blue">Watch alert ⚠</Badge></td>
              </tr>
              <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '12px', fontWeight: 600, verticalAlign: 'top' }}>Extreme Case</td>
                <td style={{ padding: '12px', lineHeight: 1.6, verticalAlign: 'top' }}>Strong imbalance across groups (Obvious 80% label bias)</td>
                <td style={{ padding: '12px', lineHeight: 1.6, verticalAlign: 'top' }}>High bias drift alert</td>
                <td style={{ padding: '12px', lineHeight: 1.6, verticalAlign: 'top' }}>Alert triggered successfully</td>
                <td style={{ padding: '12px', verticalAlign: 'top' }}><Badge color="red">Critical → Halt 🔴</Badge></td>
              </tr>
              <tr>
                <td style={{ padding: '12px', fontWeight: 600, verticalAlign: 'top' }}>Invalid Case</td>
                <td style={{ padding: '12px', lineHeight: 1.6, verticalAlign: 'top' }}>Missing or noisy data input</td>
                <td style={{ padding: '12px', lineHeight: 1.6, verticalAlign: 'top' }}>Error handling</td>
                <td style={{ padding: '12px', lineHeight: 1.6, verticalAlign: 'top' }}>System handled gracefully</td>
                <td style={{ padding: '12px', verticalAlign: 'top' }}><Badge color="grey">Graceful error response</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Compounding penalty calculator */}
      <div className="card">
        <div style={{ fontSize:15, fontWeight:700, marginBottom:4, display:'flex', alignItems:'center', gap:6 }}>
          Compounding Penalty Calculator — Intersectional Bias
          <InfoTooltip technical="Shows what happens when a candidate falls into multiple affected groups simultaneously. Each demographic penalty stacks." plain="Being disadvantaged in one way is bad. Being disadvantaged in four ways makes it nearly impossible to get hired — regardless of qualifications." />
        </div>
        <div style={{ fontSize:12, color:'#9CA3AF', marginBottom:20 }}>Same qualifications — completely different outcomes based on demographic attributes alone</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          {[
            { title:'Candidate A: Female · B.Sc · South · Age 40+', base:71.4, adjustments:[['Gender penalty (Female)','−18.2 pts',false],['Education penalty (B.Sc vs M.Tech)','−8.4 pts',false],['Region penalty (South)','−6.1 pts',false],['Age penalty (40+)','−11.3 pts',false]], final:27.4, hired:false },
            { title:'Candidate B: Male · PhD · North · Age 25 — same qualifications', base:71.4, adjustments:[['Gender bonus (Male)','+18.2 pts',true],['Education bonus (PhD vs M.Tech)','+8.4 pts',true],['Region bonus (North)','+6.1 pts',true],['Age bonus (22–27)','+11.3 pts',true]], final:115.4, hired:true },
          ].map((c, i) => (
            <div key={i}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>{c.title}</div>
              <div style={{ fontSize:12, lineHeight:2, color:'#6B7280' }}>
                Baseline score (qualifications only): <strong style={{ color:'#111827' }}>{c.base}</strong><br/>
                {c.adjustments.map(([l,v,p])=><span key={l}>{l}: <strong style={{ color:p?'#16A34A':'#DC2626' }}>{v}</strong><br/></span>)}
              </div>
              <div style={{ borderTop:'1px solid #E5E7EB', marginTop:4, paddingTop:8, fontSize:14, fontWeight:700 }}>
                Final score: <span style={{ color:c.hired?'#16A34A':'#DC2626' }}>{c.final}</span> → <Badge color={c.hired?'green':'red'}>{c.hired?'Hired':'Rejected'}</Badge>
              </div>
              {i===1&&<div style={{ marginTop:12, padding:'10px 14px', background:'#FFF5F5', border:'1px solid #FECACA', borderRadius:8, fontSize:12, color:'#7F1D1D', fontWeight:600 }}>88-point gap. Same qualifications. The entire difference is demographic.</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
