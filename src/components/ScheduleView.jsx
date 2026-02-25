import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { DAYS_ORDER, DAY_LABELS } from "../constants";
import { GRUPOS } from "../scheduleData";
import { supabase } from "../supabase";
import { dbLoadProgress, dbSaveProgress, validateAcesso } from "../lib/db";
import { getTodayInfo, getUpcomingAlerts, launchConfetti } from "../lib/helpers";
import AlertBanner from "./AlertBanner";
import ActivityCard from "./ActivityCard";

export default function ScheduleView({ user, profile, materia, grupo, onBack, onChangeGrupo }) {
  const WEEKS     = useMemo(() => (materia.weeksByGroup && materia.weeksByGroup[grupo]) || [], [materia.weeksByGroup, grupo]);
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

  const [open, setOpen] = useState(() => {
    const o = {};
    WEEKS.forEach(w => { o[w.num] = w.num === (todayWeek ?? 1); });
    return o;
  });

  const [completed,    setCompleted]    = useState({});
  const [notes,        setNotes]        = useState({});
  const [loading,      setLoading]      = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [syncStatus,   setSyncStatus]   = useState("idle");

  const prevDoneWeeks = useRef(new Set());
  const saveTimer     = useRef(null);
  const latestData    = useRef({completed:{}, notes:{}});

  useEffect(()=>{
    let cancelled = false;
    Promise.all([
      validateAcesso(user.id, materia.id),
      dbLoadProgress(user.id, materia.id),
    ]).then(([acesso, {completed:c, notes:n}]) => {
      if (cancelled) return;
      if (!acesso || acesso.status !== "aprovado") {
        setAccessDenied(true); setLoading(false); return;
      }
      setCompleted(c); setNotes(n);
      latestData.current = {completed:c, notes:n};
      setLoading(false);
    }).catch(() => {
      if (!cancelled) { setAccessDenied(true); setLoading(false); }
    });
    return () => {
      cancelled = true;
      clearTimeout(saveTimer.current);
    };
  },[user.id, materia.id]);

  const scheduleSave = useCallback((c, n) => {
    latestData.current = {completed:c, notes:n};
    setSyncStatus("syncing");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const {completed:lc, notes:ln} = latestData.current;
        await dbSaveProgress(user.id, materia.id, lc, ln);
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

  useEffect(()=>{
    WEEKS.forEach(week => {
      const competable = week.activities.filter(a => a.type !== "feriado");
      const allDone    = competable.length > 0 && competable.every(a => completed[a.id]);
      if (allDone && !prevDoneWeeks.current.has(week.num)) {
        prevDoneWeeks.current.add(week.num); launchConfetti();
      } else if (!allDone) prevDoneWeeks.current.delete(week.num);
    });
  },[completed, WEEKS]);

  const allItems  = useMemo(() => WEEKS.flatMap(w => w.activities).filter(a => a.type !== "feriado"), [WEEKS]);
  const totalDone = useMemo(() => allItems.filter(a => completed[a.id]).length, [allItems, completed]);
  const pct       = allItems.length ? Math.round((totalDone / allItems.length) * 100) : 0;

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"#64748B",fontSize:15,gap:10}}>
      <span style={{fontSize:28}}>{materia.icon}</span> Carregando cronograma…
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
                <div style={{fontSize:12,color:"#64748B"}}>Grupo {grupo} · {profile?.nome?.split(" ")[0]}</div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
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
          <div className="grupo-selector">
            <span style={{fontSize:11,color:"#64748B",fontWeight:600,marginRight:2,flexShrink:0}}>Grupo:</span>
            {GRUPOS.map(g=>(
              <button key={g} onClick={()=>{
                if (g === grupo) return;
                supabase.from("acessos").update({grupo:g}).eq("user_id",user.id).eq("materia",materia.id);
                onChangeGrupo(g);
              }} style={{
                width:30,height:28,borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer",
                border:"none",transition:"all 0.12s",flexShrink:0,
                background:g===grupo?materia.color:"#1E293B",
                color:g===grupo?"#fff":"#64748B",
              }}>{g}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:1200,margin:"0 auto",padding:"20px 16px 40px"}}>
        {WEEKS.map(week=>{
          const competable = week.activities.filter(a => a.type !== "feriado");
          const wDone      = competable.filter(a => completed[a.id]).length;
          const wpct       = competable.length ? Math.round((wDone/competable.length)*100) : 100;
          const allDoneW   = wpct===100 && competable.length>0;
          const isOpen     = !!open[week.num];
          const isCurrent  = week.num === todayWeek;
          const activeDays = DAYS_ORDER.filter(d => week.dayMap[d]["Manhã"].length>0 || week.dayMap[d].Tarde.length>0);

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
                            </div>
                            {mItems.length>0 && (
                              <div className="turno-section">
                                <div className="turno-divider">🌅 Manhã</div>
                                {mItems.map(a=><ActivityCard key={a.id} a={a} isDone={!!completed[a.id]} onToggle={toggle} note={notes[a.id]} onNoteChange={saveNote} isToday={isToday}/>)}
                              </div>
                            )}
                            {tItems.length>0 && (
                              <div className="turno-section">
                                <div className="turno-divider">🌆 Tarde</div>
                                {tItems.map(a=><ActivityCard key={a.id} a={a} isDone={!!completed[a.id]} onToggle={toggle} note={notes[a.id]} onNoteChange={saveNote} isToday={isToday}/>)}
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
          {profile?.nome} · Grupo {grupo} · ☁️ Sincronizado em todos os dispositivos
        </div>
      </div>
    </div>
  );
}
