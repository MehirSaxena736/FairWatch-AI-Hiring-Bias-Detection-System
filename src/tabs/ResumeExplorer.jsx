import React, { useEffect, useState, useCallback } from 'react'
import { getCandidates, postWhatIf } from '../api'
import { AlertBanner, Badge, ShapBar, Spinner, PageHeader, InfoTooltip } from '../components/UI'

const MALE_NAMES = ['Arjun','Vikram','Rahul','Deepak','Karan','Shubham','Rohit','Sanjay','Amit']
function toMaleName(name) {
  const parts = name.split(' ')
  const male = MALE_NAMES.find(n => !parts[0].startsWith(n)) || 'Arjun'
  return male + ' ' + (parts[1] || '')
}

function Avatar({ name, gender, size = 32 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0,2)
  const isFemale = gender === 'Female'
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.34, fontWeight: 700, flexShrink: 0, background: isFemale ? '#EDE9FE' : '#DBEAFE', color: isFemale ? '#7C3AED' : '#2563EB' }}>
      {initials}
    </div>
  )
}

export default function ResumeExplorer() {
  const [panel,    setPanel]    = useState('hired')
  const [cands,    setCands]    = useState([])
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [listLoad, setListLoad] = useState(false)
  const [error,    setError]    = useState(null)

  // What-if state
  const [wfGender,   setWfGender]   = useState(null)
  const [wfName,     setWfName]     = useState(null)
  const [wfHasGap,   setWfHasGap]   = useState(null)
  const [wfEducation,setWfEducation]= useState(null)
  const [wfExperience,setWfExperience]= useState(null)
  const [wfProjects, setWfProjects] = useState(null)
  const [wfCertification, setWfCertification] = useState(null)
  const [wfRegion,   setWfRegion]   = useState(null)
  const [wfScore,    setWfScore]    = useState(null)
  const [wfDecision, setWfDecision] = useState(null)
  const [wfShap,     setWfShap]     = useState(null)
  const [wfFeedback, setWfFeedback] = useState(null)
  const [fbType,     setFbType]     = useState('neutral')

  const loadPanel = (p) => {
    setPanel(p); setSelected(null); setListLoad(true); setError(null)
    getCandidates(p)
      .then(data => { setCands(data) })
      .catch(() => { setCands([]); setError('Could not load candidates. Please retry.') })
      .finally(() => { setLoading(false); setListLoad(false) })
  }

  useEffect(() => { loadPanel('hired') }, [])

  const selectCandidate = (c) => {
    setSelected(c)
    setWfGender(c.gender); setWfName(c.name)
    setWfEducation(c.education); setWfExperience(c.experience); setWfProjects(c.projects)
    setWfCertification(c.certification); setWfRegion(c.region)
    setWfHasGap(c.has_gap); setWfScore(c.score)
    setWfDecision(c.decision); setWfShap(c.shap)
    setWfFeedback('Click any underlined field to edit. Try changing the name, removing the employment gap, or toggling gender to see the decision flip.')
    setFbType('neutral')
  }

  const callWhatIf = useCallback(async (overrides = {}) => {
    if (!selected || panel !== 'flagged') return
    const body = {
      resume_id: selected.resume_id,
      name: overrides.name ?? wfName,
      gender: overrides.gender ?? wfGender,
      education: overrides.education ?? wfEducation,
      experience: Number(overrides.experience ?? wfExperience),
      projects: Number(overrides.projects ?? wfProjects),
      certification: overrides.certification ?? wfCertification,
      has_gap: overrides.has_gap ?? wfHasGap,
      region: overrides.region ?? wfRegion,
    }
    const res = await postWhatIf(body)
    setWfScore(res.score); setWfDecision(res.decision); setWfShap(res.shap)
    setWfFeedback(res.feedback)
    setFbType(res.hired ? 'good' : 'warn')
  }, [selected, panel, wfGender, wfName, wfHasGap, wfEducation, wfExperience, wfProjects, wfCertification, wfRegion])

  const toggleGender = async (g) => {
    setWfGender(g)
    await callWhatIf({ gender: g })
  }
  const toggleName = async (name) => {
    setWfName(name)
    await callWhatIf({ name })
  }
  const toggleGap = async (hasGap) => {
    setWfHasGap(hasGap)
    await callWhatIf({ has_gap: hasGap })
  }
  const editAndRecalc = async (key, value) => {
    if (key === 'education') setWfEducation(value)
    if (key === 'experience') setWfExperience(value)
    if (key === 'projects') setWfProjects(value)
    if (key === 'certification') setWfCertification(value)
    if (key === 'region') setWfRegion(value)
    await callWhatIf({ [key]: value })
  }

  const fbColors = { neutral: { bg:'#F9FAFB', border:'#E5E7EB', color:'#6B7280' }, warn: { bg:'#FFFBEB', border:'#FDE68A', color:'#92400E' }, good: { bg:'#F0FDF4', border:'#86EFAC', color:'#14532D' } }
  const tabStyles = { hired:'active-hired', rejected:'active-rejected', flagged:'active-flagged' }
  const displayScore = wfScore ?? selected?.score
  const displayDecision = wfDecision ?? selected?.decision
  const displayShap = wfShap ?? selected?.shap ?? []
  const isHired = displayDecision === 'Hire'

  if (loading) return <Spinner />

  return (
    <div className="screen-enter" style={{ padding: 32 }}>
      <PageHeader title="Resume Explorer" subtitle="Three panels: hired, fairly rejected, bias-flagged · Edit flagged resumes to test counterfactuals · SHAP bars update in real time" />

      <AlertBanner color="amber" icon="👤" title="Live What-If Analysis — Flagged Candidates">
        Click any candidate in the <strong>Flagged</strong> panel to open their editable resume. Change their name, remove the employment gap, or toggle gender — and watch the AI decision flip in real time. SHAP bars update on every edit.
      </AlertBanner>

      {/* Panel tabs */}
      <div style={{ display:'flex', border:'1px solid #E5E7EB', borderRadius:10, overflow:'hidden', marginBottom:14 }}>
        {[['hired','✓ Hired'],['rejected','— Fairly Rejected'],['flagged','⚑ Flagged — Bias Suspected']].map(([p,l])=>(
          <button key={p} onClick={()=>loadPanel(p)} style={{ flex:1, padding:'10px 8px', fontSize:11, fontWeight:700, fontFamily:'inherit', border:'none', borderRight:'1px solid #E5E7EB', cursor:'pointer', transition:'all .15s', textAlign:'center', lastChild:{borderRight:'none'},
            background: panel===p ? (p==='hired'?'#F0FDF4':p==='flagged'?'#FFF5F5':'#F9FAFB') : '#fff',
            color: panel===p ? (p==='hired'?'#16A34A':p==='flagged'?'#DC2626':'#111827') : '#9CA3AF'
          }}>{l}</button>
        ))}
      </div>

      <div style={{ marginBottom:14, padding:'11px 16px', background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:10, fontSize:12, color:'#6B7280', lineHeight:1.6 }}>
        <strong style={{ color:'#16A34A' }}>✓ Hired</strong> — approved on merit, no demographic penalty. &nbsp;|&nbsp;
        <strong style={{ color:'#111827' }}>— Fairly Rejected</strong> — genuine qualification gap, not bias. &nbsp;|&nbsp;
        <strong style={{ color:'#DC2626' }}>⚑ Flagged</strong> — rejected but FairWatch attributes it to demographic bias, not qualifications.
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:20 }}>
        {/* List */}
        <div>
          {listLoad ? <Spinner /> : (
            <div style={{ border:'1px solid #E5E7EB', borderRadius:12, overflow:'hidden', maxHeight:560, overflowY:'auto' }}>
              {error && (
                <div style={{ padding:'12px 14px', fontSize:12, color:'#B45309', background:'#FFFBEB', borderBottom:'1px solid #FDE68A' }}>
                  {error}
                </div>
              )}
              {!error && cands.length === 0 && (
                <div style={{ padding:'18px 14px', fontSize:12, color:'#9CA3AF' }}>
                  No candidates available in this panel.
                </div>
              )}
              {cands.map((c, i) => (
                <div key={c.resume_id} onClick={() => selectCandidate(c)} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'11px 14px',
                  borderBottom: i<cands.length-1?'1px solid #F3F4F6':'none',
                  cursor:'pointer', background: selected?.resume_id===c.resume_id ? (panel==='flagged'?'#FFF5F5':'#EFF6FF') : '#fff',
                  borderLeft: panel==='flagged'?'3px solid #DC2626': selected?.resume_id===c.resume_id?'3px solid #2563EB':'3px solid transparent',
                  transition:'background .12s',
                }}>
                  <Avatar name={c.name} gender={c.gender} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#111827', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name}</div>
                    <div style={{ fontSize:10, color:'#9CA3AF', marginTop:1 }}>{c.role} · {c.gender} · {c.experience}yr</div>
                  </div>
                  {panel==='hired' ? <Badge color="green">Hired</Badge> : panel==='flagged' ? <Badge color="red">⚑ Flagged</Badge> : <Badge color="grey">Rejected</Badge>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div>
          {!selected ? (
            <div style={{ padding:'60px 32px', textAlign:'center', color:'#9CA3AF', background:'#fff', border:'1px solid #E5E7EB', borderRadius:16 }}>
              <div style={{ fontSize:40, marginBottom:16 }}>👤</div>
              <div style={{ fontSize:14, fontWeight:600, color:'#6B7280' }}>Select a candidate</div>
              <div style={{ fontSize:12, marginTop:6 }}>Click any name to view their resume and SHAP analysis</div>
            </div>
          ) : (
            <div>
              {/* Resume Paper */}
              <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:16, overflow:'hidden', boxShadow:'0 4px 16px rgba(0,0,0,.08)', marginBottom:16 }}>
                {/* Header */}
                <div style={{ background:'linear-gradient(135deg,#1E293B 0%,#0F172A 100%)', padding:'20px 24px', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <Avatar name={selected.name} gender={wfGender??selected.gender} size={44} />
                    <div>
                      <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:22, color:'#F8FAFC', fontStyle:'italic', lineHeight:1.2 }}>{wfName ?? selected.name}</div>
                      <div style={{ fontSize:11, color:'#94A3B8', marginTop:4 }}>{selected.role} · {wfGender??selected.gender} · {selected.region}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'center', padding:'8px 18px', borderRadius:10, minWidth:100, background: isHired?'rgba(22,163,74,.2)':'rgba(220,38,38,.2)', border:`1px solid ${isHired?'rgba(134,239,172,.4)':'rgba(252,165,165,.4)'}` }}>
                    <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.1em', color:'#94A3B8' }}>AI DECISION</div>
                    <div style={{ fontSize:16, fontWeight:700, marginTop:3, color: isHired?'#4ADE80':'#F87171', transition:'color .3s' }}>{isHired?'Hired':'Rejected'}</div>
                    <div style={{ fontSize:10, color:'#FBBF24', marginTop:2 }}>Score: {displayScore}</div>
                  </div>
                </div>

                {/* Feedback strip */}
                <div style={{ margin:'0 24px 14px', marginTop:14, padding:'10px 14px', borderRadius:8, fontSize:12, lineHeight:1.6, transition:'all .2s', ...fbColors[fbType] }}>
                  {wfFeedback}
                </div>

                {/* Bias reason (flagged only) */}
                {panel === 'flagged' && selected.bias_reason && (
                  <div style={{ margin:'0 24px 14px', padding:'12px 16px', background:'#FFF5F5', border:'1px solid #FECACA', borderRadius:10 }}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#DC2626', marginBottom:5 }}>⚑ Bias Detection Finding</div>
                    <div style={{ fontSize:12, color:'#7F1D1D', lineHeight:1.7 }}>{selected.bias_reason}</div>
                  </div>
                )}

                {/* Counterfactuals */}
                {panel === 'flagged' && selected.counterfactuals?.length > 0 && (
                  <div style={{ margin:'0 24px 14px', padding:'12px 16px', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10 }}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#2563EB', marginBottom:8 }}>Counterfactual Analysis</div>
                    {selected.counterfactuals.map((cf, i) => (
                      <div key={i} style={{ fontSize:11, color:'#1E40AF', marginBottom:5, display:'flex', flexWrap:'wrap', gap:6 }}>
                        <span style={{ fontFamily:'monospace' }}>{cf.change}</span>
                        <span style={{ color:'#9CA3AF' }}>→</span>
                        <span>Score: {cf.new_score}</span>
                        <span style={{ color:'#9CA3AF' }}>→</span>
                        <strong style={{ color: cf.result==='Hire'?'#16A34A':'#DC2626' }}>{cf.result === 'Hire' ? 'Hired ✓' : 'Rejected'}</strong>
                      </div>
                    ))}
                  </div>
                )}

                {/* Fields */}
                <div style={{ padding:'18px 24px' }}>
                  {[
                    { title:'Personal Information', fields:[['Full name', wfName??selected.name, panel==='flagged', 'name'],['Job role',selected.role,false],['Region', wfRegion??selected.region, panel==='flagged', 'region']] },
                    { title:'Qualifications', fields:[['Education', wfEducation??selected.education, panel==='flagged', 'education'],['Experience',`${wfExperience??selected.experience}`,panel==='flagged', 'experience'],['Projects',`${wfProjects??selected.projects}`,panel==='flagged', 'projects'],['Certification', (wfCertification ?? selected.certification) || 'None',panel==='flagged', 'certification']] },
                    { title:'Career History', fields:[['Skills',selected.skills,false],['Employment gap',(wfHasGap??selected.has_gap)?'Career break present':'None',panel==='flagged','gap']] },
                  ].map((sec, si) => (
                    <div key={si} style={{ marginBottom:16 }}>
                      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#9CA3AF', marginBottom:8, paddingBottom:6, borderBottom:'1px solid #F3F4F6' }}>{sec.title}</div>
                      {sec.fields.map(([lbl, val, editable, fieldKey], fi) => (
                        <div key={fi} style={{ display:'flex', gap:12, marginBottom:6 }}>
                          <span style={{ fontSize:11, color:'#9CA3AF', minWidth:120, flexShrink:0, paddingTop:1 }}>{lbl}{editable && <span style={{ fontSize:8, color:'#9CA3AF', background:'#F3F4F6', padding:'1px 5px', borderRadius:4, marginLeft:6 }}>edit</span>}</span>
                          {editable && fieldKey === 'gap' ? (
                            <div style={{ display:'flex', gap:6 }}>
                              <button onClick={()=>toggleGap(true)} style={{ fontSize:10, padding:'3px 10px', borderRadius:5, border:'1.5px solid', fontFamily:'inherit', cursor:'pointer', background: wfHasGap?'#1E293B':'#fff', borderColor: wfHasGap?'#2563EB':'#E5E7EB', color: wfHasGap?'#60A5FA':'#6B7280' }}>Has gap</button>
                              <button onClick={()=>toggleGap(false)} style={{ fontSize:10, padding:'3px 10px', borderRadius:5, border:'1.5px solid', fontFamily:'inherit', cursor:'pointer', background: !wfHasGap?'#1E293B':'#fff', borderColor: !wfHasGap?'#2563EB':'#E5E7EB', color: !wfHasGap?'#60A5FA':'#6B7280' }}>No gap</button>
                            </div>
                          ) : editable && ['name','education','experience','projects','certification','region'].includes(fieldKey) ? (
                            <input
                              value={fieldKey === 'name' ? (wfName ?? selected.name) : fieldKey === 'experience' ? (wfExperience ?? selected.experience) : fieldKey === 'projects' ? (wfProjects ?? selected.projects) : fieldKey === 'education' ? (wfEducation ?? selected.education) : fieldKey === 'certification' ? (wfCertification ?? selected.certification ?? '') : (wfRegion ?? selected.region)}
                              onChange={(e) => {
                                const v = fieldKey === 'experience' || fieldKey === 'projects' ? e.target.value.replace(/[^\d]/g, '') : e.target.value
                                if (fieldKey === 'name') setWfName(v)
                                if (fieldKey === 'education') setWfEducation(v)
                                if (fieldKey === 'experience') setWfExperience(v === '' ? '' : Number(v))
                                if (fieldKey === 'projects') setWfProjects(v === '' ? '' : Number(v))
                                if (fieldKey === 'certification') setWfCertification(v)
                                if (fieldKey === 'region') setWfRegion(v)
                              }}
                              onBlur={() => {
                                const value = fieldKey === 'name'
                                  ? (wfName ?? selected.name)
                                  : fieldKey === 'experience'
                                  ? Number(wfExperience ?? selected.experience)
                                  : fieldKey === 'projects'
                                    ? Number(wfProjects ?? selected.projects)
                                    : fieldKey === 'education'
                                      ? (wfEducation ?? selected.education)
                                      : fieldKey === 'certification'
                                        ? (wfCertification ?? selected.certification ?? '')
                                        : (wfRegion ?? selected.region)
                                if (fieldKey === 'name') {
                                  toggleName(value)
                                } else {
                                  editAndRecalc(fieldKey, value)
                                }
                              }}
                              style={{ fontSize:13, color:'#111827', border:'1px dashed #CBD5E1', borderRadius:6, padding:'4px 8px', minWidth:200, fontFamily:'inherit', background:'#fff' }}
                            />
                          ) : (
                            <span style={{ fontSize:13, color:'#111827', borderBottom: editable?'1.5px dashed #CBD5E1':undefined, paddingBottom: editable?2:undefined }}>{val}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Toggle controls (flagged only) */}
                {panel === 'flagged' && (
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', padding:'14px 24px', background:'#F8FAFC', borderTop:'1px solid #E5E7EB' }}>
                    <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'#9CA3AF' }}>Gender</span>
                    <div style={{ display:'flex', background:'#F3F4F6', borderRadius:8, padding:3, gap:2 }}>
                      {['Female','Male'].map(g=>(
                        <button key={g} onClick={()=>toggleGender(g)} style={{ fontSize:11, fontWeight:600, padding:'5px 14px', borderRadius:6, border:'none', background:(wfGender??selected.gender)===g?'#fff':'transparent', color:(wfGender??selected.gender)===g?'#111827':'#6B7280', cursor:'pointer', fontFamily:'inherit', boxShadow:(wfGender??selected.gender)===g?'0 1px 3px rgba(0,0,0,.1)':undefined, transition:'all .15s' }}>{g}</button>
                      ))}
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'#9CA3AF', marginLeft:12 }}>Name signal</span>
                    <div style={{ display:'flex', background:'#F3F4F6', borderRadius:8, padding:3, gap:2 }}>
                      {[selected.name, toMaleName(selected.name)].map(n=>(
                        <button key={n} onClick={()=>toggleName(n)} style={{ fontSize:11, fontWeight:600, padding:'5px 14px', borderRadius:6, border:'none', background:(wfName??selected.name)===n?'#fff':'transparent', color:(wfName??selected.name)===n?'#111827':'#6B7280', cursor:'pointer', fontFamily:'inherit', boxShadow:(wfName??selected.name)===n?'0 1px 3px rgba(0,0,0,.1)':undefined, transition:'all .15s' }}>{n.split(' ')[0]}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SHAP */}
              <div className="card">
                <div style={{ fontSize:15, fontWeight:700, marginBottom:4, display:'flex', alignItems:'center', gap:6 }}>
                  SHAP Feature Contributions
                  <InfoTooltip technical="SHapley Additive exPlanations — how much each feature pushed the decision toward Hire (green) or Reject (red)." plain="This is the model showing its reasoning. The big red bar is the feature hurting this candidate most." />
                </div>
                <div style={{ fontSize:12, color:'#9CA3AF', marginBottom:16 }}>{panel==='flagged'?'Updates in real time as you edit the resume':'Feature contributions to this decision'}</div>
                {displayShap.map((s, i) => <ShapBar key={i} label={s.feature} value={s.value} positive={s.positive} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
