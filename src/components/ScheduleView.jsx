import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { DAYS_ORDER, DAY_LABELS, MODULE_END_DATE } from "../constants";
import { GRUPOS, loadMateriaData } from "../scheduleData";
import { supabase } from "../supabase";
import { dbLoadProgress, dbSaveProgress, validateAcesso } from "../lib/db";
import { getTodayInfo, getUpcomingAlerts, launchConfetti } from "../lib/helpers";
import { applyCustomizations, generateCustomId } from "../lib/customizations";
import AlertBanner from "./AlertBanner";
import ActivityCard from "./ActivityCard";
import ActivityModal from "./ActivityModal";

const DAY_OFFSET = {"2ª":0,"3ª":1,"4ª":2,"5ª":3,"6ª":4,"Sáb":5};
function getWeekDayDate(datesStr, dayKey) {
  const startStr = (datesStr || "").split("–")[0].trim(); // "23/2"
  const parts = startStr.split("/");
  if (parts.length < 2) return "";
  const d = parseInt(parts[0], 10), m = parseInt(parts[1], 10);
  const base = new Date(2026, m - 1, d);
  base.setDate(base.getDate() + (DAY_OFFSET[dayKey] ?? 0));
  return `${base.getDate()}/${base.getMonth()+1}`;
}

export default function ScheduleView({ user, profile, materia, grupo, onBack, onChangeGrupo }) {
  const [weeksByGroup, setWeeksByGroup] = useState(null);
  const WEEKS     = useMemo(() => (weeksByGroup && weeksByGroup[grupo]) || [], [weeksByGroup, grupo]);
  const keyEvents = useMemo(() => materia.keyEvents || [], [materia.keyEvents]);
  const weekDates = useMemo(() => materia.weekDates || [], [materia.weekDates]);

  const {weekNum:todayWeek, dayKey:todayDay} = useMemo(() => getTodayInfo(weekDates),  [weekDates]);
  const alerts = useMemo(() => getUpcomingAlerts(keyEvents), [keyEvents]);

  const ALERT_KEY = `alert_dismissed_${materia.id}`;
  const [alertDismissed, setAlertDismissed] = useState(
    () => sessionStorage.getItem(ALERT_KEY) === "1"
  );
  function dismissAlert() {
    sessionStorage.setItem(ALERT_KEY, "1");
    setAlertDismissed(true);
  }

  const [open, setOpen] = useState({});

  // Auto-open current week when data loads
  useEffect(() => {
    if (WEEKS.length > 0) {
      const o = {};
      WEEKS.forEach(w => { o[w.num] = w.num === (todayWeek ?? 1); });
      setOpen(o);
    }
  }, [WEEKS, todayWeek]);

  const [completed,      setCompleted]      = useState({});
  const [notes,          setNotes]          = useState({});
  const [customizations, setCustomizations] = useState({});
  const [loading,        setLoading]        = useState(true);
  const [accessDenied,   setAccessDenied]   = useState(false);
  const [syncStatus,     setSyncStatus]     = useState("idle");
  const [accessStatus,   setAccessStatus]   = useState(null); // "aprovado", "trial", etc
  const [trialExpiresAt, setTrialExpiresAt] = useState(null);
  const [editModal,      setEditModal]      = useState(null); // null | {mode, activity?, weekNum?, day?, turno?}
  const [deleteConfirm,  setDeleteConfirm]  = useState(null); // null | {id, label, isReset}
  const [showScheduleTutorial, setShowScheduleTutorial] = useState(false);


  const isVIP = !!profile?.is_vip;
  const moduleExpired = !isVIP && new Date() > MODULE_END_DATE;
  const canSwitchGrupo = isVIP || accessStatus === "trial";
  const canEdit = isVIP || accessStatus === "aprovado";

  // Tutorial: mostrar na 1ª visita se pode trocar grupo
  useEffect(() => {
    if (!loading && canSwitchGrupo && !localStorage.getItem("schedule_tutorial_seen")) {
      const t = setTimeout(() => setShowScheduleTutorial(true), 800);
      return () => clearTimeout(t);
    }
  }, [loading, canSwitchGrupo]);

  function closeScheduleTutorial() {
    setShowScheduleTutorial(false);
    localStorage.setItem("schedule_tutorial_seen", "1");
  }

  const mergedWeeks = useMemo(() => applyCustomizations(WEEKS, customizations), [WEEKS, customizations]);
  const hasCustomizations = !!(customizations.edits?.length || customizations.deletes?.length || customizations.adds?.length);

  const prevDoneWeeks = useRef(new Set());
  const saveTimer     = useRef(null);
  const latestData    = useRef({completed:{}, notes:{}, customizations:{}});

  useEffect(()=>{
    let cancelled = false;
    Promise.all([
      validateAcesso(user.id, materia.id, !!profile?.is_vip),
      dbLoadProgress(user.id, materia.id),
      loadMateriaData(materia.id),
    ]).then(([acesso, {completed:c, notes:n, customizations:cust}, wbg]) => {
      if (cancelled) return;
      if (!acesso && !isVIP) {
        setAccessDenied(true); setLoading(false); return;
      }
      if (acesso) {
        setAccessStatus(acesso.status);
        if (acesso.trial_expires_at) setTrialExpiresAt(new Date(acesso.trial_expires_at));
      }
      setWeeksByGroup(wbg);
      setCompleted(c); setNotes(n); setCustomizations(cust || {});
      latestData.current = {completed:c, notes:n, customizations:cust||{}};
      setLoading(false);
    }).catch(() => {
      if (!cancelled) { setAccessDenied(true); setLoading(false); }
    });
    return () => {
      cancelled = true;
      clearTimeout(saveTimer.current);
    };
  },[user.id, materia.id]);

  const scheduleSave = useCallback((c, n, cust) => {
    latestData.current = {completed:c, notes:n, customizations:cust ?? latestData.current.customizations};
    setSyncStatus("syncing");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const {completed:lc, notes:ln, customizations:lcust} = latestData.current;
        await dbSaveProgress(user.id, materia.id, lc, ln, lcust);
        setSyncStatus("saved");
        setTimeout(() => setSyncStatus("idle"), 2000);
      } catch {
        setSyncStatus("offline");
      }
    }, 1200);
  }, [user.id, materia.id]);

  const toggle = useCallback((id) => {
    setCompleted(prev => {
      const next = {...prev, [id]:!prev[id]};
      if (!next[id]) delete next[id];
      scheduleSave(next, latestData.current.notes);
      return next;
    });
  }, [scheduleSave]);

  const saveNote = useCallback((id, text) => {
    setNotes(prev => {
      const next = {...prev, [id]:text};
      if (!text) delete next[id];
      scheduleSave(latestData.current.completed, next);
      return next;
    });
  }, [scheduleSave]);

  const handleEditActivity = useCallback((id, changes) => {
    setCustomizations(prev => {
      const next = {...prev, edits: [...(prev.edits || [])]};
      const idx = next.edits.findIndex(e => e.id === id);
      if (idx >= 0) next.edits[idx] = {...next.edits[idx], ...changes, id};
      else next.edits.push({id, ...changes});
      scheduleSave(latestData.current.completed, latestData.current.notes, next);
      return next;
    });
  }, [scheduleSave]);

  const handleDeleteActivity = useCallback((id) => {
    // Find activity label for the confirm modal
    const activity = mergedWeeks.flatMap(w => w.activities).find(a => a.id === id);
    setDeleteConfirm({ id, label: activity?.title || "esta atividade", isReset: false });
  }, [mergedWeeks]);

  const confirmDelete = useCallback(() => {
    if (!deleteConfirm || deleteConfirm.isReset) return;
    const id = deleteConfirm.id;
    setCustomizations(prev => {
      const next = {...prev};
      if (id.startsWith("custom_")) {
        next.adds = (next.adds || []).filter(a => a.id !== id);
      } else {
        next.deletes = [...new Set([...(next.deletes || []), id])];
      }
      next.edits = (next.edits || []).filter(e => e.id !== id);
      scheduleSave(latestData.current.completed, latestData.current.notes, next);
      return next;
    });
    setCompleted(prev => { const n = {...prev}; delete n[id]; return n; });
    setNotes(prev => { const n = {...prev}; delete n[id]; return n; });
    setDeleteConfirm(null);
  }, [deleteConfirm, scheduleSave]);

  const handleAddActivity = useCallback((weekNum, day, turno, data) => {
    setCustomizations(prev => {
      const next = {...prev};
      next.adds = [...(next.adds || []), {id:generateCustomId(), weekNum, day, turno, ...data}];
      scheduleSave(latestData.current.completed, latestData.current.notes, next);
      return next;
    });
  }, [scheduleSave]);

  const handleResetCustomizations = useCallback(() => {
    setDeleteConfirm({ id: null, label: "todas as edições", isReset: true });
  }, []);

  const confirmReset = useCallback(() => {
    const empty = {};
    setCustomizations(empty);
    scheduleSave(latestData.current.completed, latestData.current.notes, empty);
    setDeleteConfirm(null);
  }, [scheduleSave]);

  useEffect(()=>{
    mergedWeeks.forEach(week => {
      const competable = week.activities.filter(a => a.type !== "feriado");
      const allDone    = competable.length > 0 && competable.every(a => completed[a.id]);
      if (allDone && !prevDoneWeeks.current.has(week.num)) {
        prevDoneWeeks.current.add(week.num); launchConfetti();
      } else if (!allDone) prevDoneWeeks.current.delete(week.num);
    });
  },[completed, mergedWeeks]);

  const allItems  = useMemo(() => mergedWeeks.flatMap(w => w.activities).filter(a => a.type !== "feriado"), [mergedWeeks]);
  const totalDone = useMemo(() => allItems.filter(a => completed[a.id]).length, [allItems, completed]);
  const pct       = allItems.length ? Math.round((totalDone / allItems.length) * 100) : 0;

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"#64748B",fontSize:15,gap:10}}>
      <span style={{fontSize:28}}>{materia.icon}</span> Carregando cronograma…
    </div>
  );

  if (moduleExpired) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",gap:16,color:"#64748B",textAlign:"center",padding:24}}>
      <span style={{fontSize:48}}>📅</span>
      <div style={{fontSize:18,fontWeight:700,color:"#DC2626"}}>Módulo 1 encerrado</div>
      <div style={{fontSize:14}}>O acesso ao Módulo 1 expirou em 08/05/2026.</div>
      <div style={{fontSize:13,color:"#94A3B8"}}>Aguarde informações sobre o próximo módulo.</div>
      <button className="btn btn-dark" onClick={onBack}>← Voltar ao painel</button>
    </div>
  );

  if (accessDenied) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",gap:16,color:"#64748B",textAlign:"center",padding:24}}>
      <span style={{fontSize:48}}>🔒</span>
      <div style={{fontSize:18,fontWeight:700,color:"#0F172A"}}>Acesso não autorizado</div>
      <div style={{fontSize:14}}>Seu acesso a esta matéria não está ativo.</div>
      <button className="btn btn-dark" onClick={onBack}>← Voltar ao painel</button>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#F8FAFC",color:"#0F172A"}}>
      {!alertDismissed && <AlertBanner alerts={alerts} onDismiss={dismissAlert}/>}

      <div className="schedule-header" style={{background:"#0F172A",borderBottom:"1px solid #1E293B",padding:"14px 20px",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:1200,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <button onClick={onBack} style={{background:"#1E293B",border:"none",color:"#94A3B8",width:32,height:32,borderRadius:8,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>{materia.icon} {materia.label}</div>
                <div style={{fontSize:12,color:"#64748B"}}>Grupo {materia.grupoLabels?.[grupo] ?? grupo} · {profile?.nome?.split(" ")[0]}</div>
              </div>
            </div>
            <div className="header-right" style={{display:"flex",alignItems:"center",gap:14}}>
              {canEdit && hasCustomizations && (
                <button className="restore-btn" onClick={handleResetCustomizations} style={{fontSize:10,fontWeight:600,color:"#F59E0B",background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:7,padding:"3px 10px",cursor:"pointer",whiteSpace:"nowrap"}}>
                  Restaurar original
                </button>
              )}
              {syncStatus==="syncing" && <span style={{fontSize:11,color:"#F59E0B"}}>⟳ Salvando…</span>}
              {syncStatus==="saved"   && <span style={{fontSize:11,color:"#22C55E"}}>✓ Salvo</span>}
              {syncStatus==="offline" && <span style={{fontSize:11,color:"#EF4444"}}>⚠ Offline</span>}
              <div className="hstats">
                {[
                  {label:"Feitas",    val:totalDone,                 color:"#22C55E"},
                  {label:"Pendentes", val:allItems.length-totalDone, color:"#EF4444"},
                  {label:"Total",     val:`${pct}%`,                 color:pct===100?"#22C55E":"#fff"},
                ].map(s=>(
                  <div key={s.label} style={{textAlign:"right"}}>
                    <div style={{fontSize:17,fontWeight:800,color:s.color,lineHeight:1}}>{s.val}</div>
                    <div style={{fontSize:10,color:"#64748B",marginTop:2}}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{height:5,background:"#1E293B",borderRadius:99,overflow:"hidden"}}>
            <div className="pfill" style={{width:`${pct}%`,background:pct===100?"#22C55E":materia.color}}/>
          </div>
          {canSwitchGrupo ? (
            <div className={`grupo-selector${showScheduleTutorial ? " grupo-tutorial-glow" : ""}`}>
              <span style={{fontSize:11,color:"#64748B",fontWeight:600,marginRight:2,flexShrink:0}}>Grupo:</span>
              {(materia.grupos || GRUPOS).map(g=>(
                <button key={g} onClick={()=>{
                  if (g === grupo) return;
                  supabase.rpc("update_grupo", {p_materia: materia.id, p_grupo: g});
                  onChangeGrupo(g);
                }} style={{
                  minWidth:30,height:28,borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer",
                  border:"none",transition:"all 0.12s",flexShrink:0,padding:"0 6px",
                  background:g===grupo?materia.color:"#1E293B",
                  color:g===grupo?"#fff":"#64748B",
                }}>{materia.grupoLabels?.[g] ?? g}</button>
              ))}
            </div>
          ) : (
            <div style={{fontSize:11,color:"#64748B",fontWeight:600,marginTop:6}}>
              Grupo {materia.grupoLabels?.[grupo] ?? grupo} · 🔒
            </div>
          )}
        </div>
      </div>

      <div style={{maxWidth:1200,margin:"0 auto",padding:"20px 16px 40px"}}>
        {/* Trial banner */}
        {accessStatus === "trial" && trialExpiresAt && (() => {
          const horasRestantes = Math.max(0, (trialExpiresAt - new Date()) / (1000 * 60 * 60));
          const diasRestantes = Math.ceil(horasRestantes / 24);
          const urgente = horasRestantes < 24;
          return (
            <div style={{
              background: urgente ? "#FEF2F2" : "#FEF3C7",
              border: `1px solid ${urgente ? "#FECACA" : "#FDE68A"}`,
              borderRadius: 10, padding: "10px 16px", marginBottom: 16,
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
            }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: urgente ? "#DC2626" : "#92400E" }}>
                  {urgente ? "⚠️ Último dia de trial!" : `🎁 Trial gratuito: ${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""} restante${diasRestantes !== 1 ? "s" : ""}`}
                </span>
                <span style={{ fontSize: 12, color: urgente ? "#991B1B" : "#78350F", marginLeft: 8 }}>
                  Expira em {trialExpiresAt.toLocaleDateString("pt-BR")} às {trialExpiresAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div style={{ fontSize: 11, color: urgente ? "#DC2626" : "#92400E", fontWeight: 600 }}>
                Após o trial: R$ 16,90 no PIX
              </div>
            </div>
          );
        })()}
        {mergedWeeks.map(week=>{
          const competable = week.activities.filter(a => a.type !== "feriado");
          const wDone      = competable.filter(a => completed[a.id]).length;
          const wpct       = competable.length ? Math.round((wDone/competable.length)*100) : 100;
          const allDoneW   = wpct===100 && competable.length>0;
          const isOpen     = !!open[week.num];
          const isCurrent  = week.num === todayWeek;
          const activeDays = canEdit ? DAYS_ORDER : DAYS_ORDER.filter(d => week.dayMap[d]["Manhã"].length>0 || week.dayMap[d].Tarde.length>0);

          return (
            <div key={week.num} className={isCurrent?"today-week":""}
              style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:14,marginBottom:12,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>

              <div className="week-head" onClick={()=>setOpen(o=>({...o,[week.num]:!o[week.num]}))}>
                <div className="week-num" style={{width:36,height:36,borderRadius:9,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,
                  color:isCurrent&&!allDoneW?"#0F172A":"#fff",
                  background:allDoneW?"#22C55E":isCurrent?materia.color:"#0F172A"}}>
                  {week.num}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span className="week-title" style={{fontSize:14,fontWeight:700}}>Semana {week.num}</span>
                    <span className="week-dates" style={{fontSize:13,color:"#94A3B8",fontWeight:400}}>{week.dates}</span>
                    {isCurrent&&!allDoneW && <span style={{fontSize:10,fontWeight:700,color:"#92400E",background:"#FEF3C7",padding:"2px 8px",borderRadius:99}}>📍 SEMANA ATUAL</span>}
                    {allDoneW            && <span style={{fontSize:10,fontWeight:700,color:"#16A34A",background:"#DCFCE7",padding:"2px 8px",borderRadius:99}}>✓ CONCLUÍDA</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}>
                    <div style={{flex:1,maxWidth:220,height:4,background:"#F1F5F9",borderRadius:99,overflow:"hidden"}}>
                      <div className="pfill" style={{width:`${wpct}%`,background:allDoneW?"#22C55E":materia.color}}/>
                    </div>
                    <span style={{fontSize:11,color:"#94A3B8"}}>{wDone}/{competable.length}</span>
                  </div>
                </div>
                <div className="day-pills-row" style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"flex-end"}}>
                  {activeDays.map(d=>(
                    <span key={d} style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:5,
                      color:isCurrent&&d===todayDay?"#92400E":"#64748B",
                      background:isCurrent&&d===todayDay?"#FEF3C7":"#F1F5F9"}}>
                      {d}
                    </span>
                  ))}
                </div>
                <span style={{color:"#CBD5E1",fontSize:11,marginLeft:4}}>{isOpen?"▲":"▼"}</span>
              </div>

              {isOpen && (
                <div style={{borderTop:"1px solid #F1F5F9"}}>
                  <div className="scroll-x">
                    <div className="day-grid" style={{display:"flex",gap:10,paddingTop:14,minWidth:activeDays.length*170}}>
                      {activeDays.map(dayKey=>{
                        const isToday = isCurrent && dayKey===todayDay;
                        const mItems  = week.dayMap[dayKey]["Manhã"];
                        const tItems  = week.dayMap[dayKey].Tarde;
                        return (
                          <div key={dayKey} className="day-col" style={{flex:1,minWidth:160,display:"flex",flexDirection:"column",gap:6}}>
                            <div style={{textAlign:"center",padding:"8px 10px 7px",background:isToday?materia.color:"#0F172A",borderRadius:8,marginBottom:2}}>
                              <div style={{fontSize:18,fontWeight:800,color:"#fff",lineHeight:1}}>{dayKey}</div>
                              <div style={{fontSize:10,color:isToday?"rgba(255,255,255,0.8)":"#64748B",marginTop:2,fontWeight:500}}>{DAY_LABELS[dayKey]}</div>
                              <div style={{fontSize:9,color:isToday?"rgba(255,255,255,0.6)":"#475569",marginTop:1,fontWeight:500}}>{getWeekDayDate(week.dates, dayKey)}</div>
                            </div>
                            {mItems.length>0 && (
                              <div className="turno-section">
                                <div className="turno-divider">🌅 Manhã</div>
                                {mItems.map(a=><ActivityCard key={a.id} a={a} isDone={!!completed[a.id]} onToggle={toggle} note={notes[a.id]} onNoteChange={saveNote} isToday={isToday} canEdit={canEdit} onEdit={()=>setEditModal({mode:"edit",activity:a})} onDelete={()=>handleDeleteActivity(a.id)}/>)}
                                {canEdit && <button onClick={()=>setEditModal({mode:"add",weekNum:week.num,day:dayKey,turno:"Manhã"})} style={{width:"100%",padding:"6px 0",border:"1px dashed #CBD5E1",borderRadius:8,background:"transparent",color:"#94A3B8",fontSize:11,fontWeight:600,cursor:"pointer",marginTop:4,transition:"all 0.12s"}}>＋ Adicionar</button>}
                              </div>
                            )}
                            {tItems.length>0 && (
                              <div className="turno-section">
                                <div className="turno-divider">🌆 Tarde</div>
                                {tItems.map(a=><ActivityCard key={a.id} a={a} isDone={!!completed[a.id]} onToggle={toggle} note={notes[a.id]} onNoteChange={saveNote} isToday={isToday} canEdit={canEdit} onEdit={()=>setEditModal({mode:"edit",activity:a})} onDelete={()=>handleDeleteActivity(a.id)}/>)}
                                {canEdit && <button onClick={()=>setEditModal({mode:"add",weekNum:week.num,day:dayKey,turno:"Tarde"})} style={{width:"100%",padding:"6px 0",border:"1px dashed #CBD5E1",borderRadius:8,background:"transparent",color:"#94A3B8",fontSize:11,fontWeight:600,cursor:"pointer",marginTop:4,transition:"all 0.12s"}}>＋ Adicionar</button>}
                              </div>
                            )}
                            {canEdit && mItems.length===0 && tItems.length===0 && (
                              <div style={{display:"flex",flexDirection:"column",gap:4,padding:"4px 0"}}>
                                <button onClick={()=>setEditModal({mode:"add",weekNum:week.num,day:dayKey,turno:"Manhã"})} style={{width:"100%",padding:"6px 0",border:"1px dashed #CBD5E1",borderRadius:8,background:"transparent",color:"#94A3B8",fontSize:11,fontWeight:600,cursor:"pointer"}}>＋ Manhã</button>
                                <button onClick={()=>setEditModal({mode:"add",weekNum:week.num,day:dayKey,turno:"Tarde"})} style={{width:"100%",padding:"6px 0",border:"1px dashed #CBD5E1",borderRadius:8,background:"transparent",color:"#94A3B8",fontSize:11,fontWeight:600,cursor:"pointer"}}>＋ Tarde</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div style={{padding:"14px 18px",borderRadius:10,background:"#fff",border:"1px solid #E2E8F0",marginTop:4,fontSize:11,color:"#94A3B8"}}>
          {profile?.nome} · Grupo {materia.grupoLabels?.[grupo] ?? grupo} · ☁️ Sincronizado em todos os dispositivos
        </div>
      </div>

      {/* === TUTORIAL: TROCA DE GRUPO === */}
      {showScheduleTutorial && canSwitchGrupo && (
        <>
          <div onClick={closeScheduleTutorial} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.65)",zIndex:99}}/>
          <div style={{position:"fixed",top:0,left:0,right:0,zIndex:101,display:"flex",justifyContent:"center",pointerEvents:"none"}}>
            <div style={{width:"100%",maxWidth:380,padding:"0 16px",marginTop:148,pointerEvents:"auto"}}>
              <div style={{width:0,height:0,borderLeft:"12px solid transparent",borderRight:"12px solid transparent",borderBottom:"12px solid #fff",margin:"0 auto"}}/>
              <div style={{background:"#fff",borderRadius:16,padding:"24px 20px",boxShadow:"0 20px 40px rgba(0,0,0,0.3)",textAlign:"center"}}>
                <div style={{fontSize:40,marginBottom:10}}>👥</div>
                <h3 style={{fontSize:18,fontWeight:800,color:"#0F172A",margin:"0 0 8px"}}>Troque de grupo aqui!</h3>
                <p style={{fontSize:14,color:"#475569",lineHeight:1.6,margin:"0 0 16px"}}>
                  Use os <strong>botões numéricos</strong> destacados acima para visualizar o cronograma de outros grupos.
                </p>
                <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:10,padding:"10px 14px",marginBottom:20}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#059669"}}>
                    Toque no número do grupo desejado para trocar instantaneamente!
                  </div>
                </div>
                <button onClick={closeScheduleTutorial} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:"#0F172A",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                  Entendi!
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* === CONFIRM DELETE/RESET MODAL === */}
      {deleteConfirm && (
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:24}}
          onClick={() => setDeleteConfirm(null)}>
          <div onClick={e => e.stopPropagation()} className="modal-body" style={{background:"#fff",borderRadius:20,padding:"28px 24px",maxWidth:360,width:"100%",boxShadow:"0 25px 50px rgba(0,0,0,0.3)"}}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:40,marginBottom:8}}>{deleteConfirm.isReset ? "🔄" : "🗑️"}</div>
              <h3 style={{fontSize:18,fontWeight:800,color:"#0F172A",marginBottom:6}}>
                {deleteConfirm.isReset ? "Restaurar cronograma?" : "Excluir atividade?"}
              </h3>
              <p style={{fontSize:13,color:"#64748B",lineHeight:1.5}}>
                {deleteConfirm.isReset
                  ? "Todas as suas edições, exclusões e atividades adicionadas serão removidas."
                  : <>Tem certeza que deseja excluir <strong>{deleteConfirm.label}</strong> do seu cronograma?</>
                }
              </p>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={() => setDeleteConfirm(null)}
                style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid #E2E8F0",background:"#fff",color:"#475569",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                Cancelar
              </button>
              <button onClick={deleteConfirm.isReset ? confirmReset : confirmDelete}
                style={{flex:1,padding:"10px",borderRadius:8,border:"none",background:"#DC2626",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                {deleteConfirm.isReset ? "Restaurar" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <ActivityModal
          mode={editModal.mode}
          activity={editModal.activity}
          weekNum={editModal.weekNum}
          day={editModal.day}
          turno={editModal.turno}
          onSave={(data) => {
            if (editModal.mode === "edit") handleEditActivity(editModal.activity.id, data);
            else handleAddActivity(editModal.weekNum, editModal.day, editModal.turno, data);
            setEditModal(null);
          }}
          onClose={() => setEditModal(null)}
        />
      )}
    </div>
  );
}
