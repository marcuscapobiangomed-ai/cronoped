import { useState, memo } from "react";
import { TYPE_STYLE, TYPE_ICON } from "../constants";

const editBtn = {width:22,height:22,borderRadius:6,border:"none",background:"rgba(0,0,0,0.06)",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",padding:0,flexShrink:0,transition:"background 0.12s"};

const ActivityCard = memo(function ActivityCard({a, isDone, onToggle, note, onNoteChange, isToday, canEdit, onEdit}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const et       = a.effectiveType;
  const s        = TYPE_STYLE[et] || TYPE_STYLE.normal;
  const isFeriado = a.type === "feriado";
  const isCasa    = et === "casa";
  return (
    <div className={`activity-card${isDone?" done":""}${isFeriado?" feriado":""}${isToday?" today-card":""}`}
      style={{background:s.bg, borderColor:isToday?"#F59E0B":s.border, position:"relative"}}>
      {isToday && <div style={{fontSize:9,fontWeight:800,color:"#92400E",background:"#FEF3C7",padding:"2px 7px",borderRadius:99,display:"inline-block",marginBottom:6,letterSpacing:"0.06em",textTransform:"uppercase"}}>📍 HOJE</div>}
      {a.time  && <div className="time-pill" style={{background:s.pill,color:s.pillText,marginBottom:7}}>🕐 {a.time}</div>}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:6}} onClick={()=>!isFeriado&&onToggle(a.id)}>
        <span className="card-title" style={{fontSize:12,fontWeight:600,color:s.accent,lineHeight:1.35,flex:1}}>{TYPE_ICON[et]||"📋"} {a.title}</span>
        <div className="edit-actions" style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          {canEdit && !isFeriado && (
            <button onClick={e=>{e.stopPropagation();onEdit();}} style={{...editBtn,background:s.dark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.06)"}} title="Editar">✏️</button>
          )}
          {!isFeriado && (
            <div className="check-dot" style={{borderColor:isDone?"#22C55E":s.dark?"rgba(255,255,255,0.4)":"#D6D3D1",background:isDone?"#22C55E":"transparent"}}>
              {isDone && <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 4l2 2 4-3.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
            </div>
          )}
        </div>
      </div>
      {a.sub && <div style={{fontSize:11,color:s.dark?"rgba(255,255,255,0.65)":"#A8A29E",marginTop:4,lineHeight:1.3}}>{a.sub}</div>}
      {a.loc && <div style={{fontSize:10,color:s.dark?"rgba(255,255,255,0.45)":"#C7C3BE",marginTop:3}}>📍 {a.loc}</div>}
      {(a._edited || a._custom) && (
        <div style={{fontSize:9,color:a._custom?"#3B82F6":"#F59E0B",marginTop:4,fontWeight:600}}>
          {a._custom ? "✦ personalizado" : "✦ editado"}
        </div>
      )}
      {isCasa && (
        <div style={{marginTop:8}} onClick={e=>e.stopPropagation()}>
          <button onClick={()=>setNoteOpen(o=>!o)} style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.75)",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:6,padding:"3px 8px",cursor:"pointer"}}>
            📝 {note?"Ver anotação":"Adicionar nota"} {noteOpen?"▲":"▼"}
          </button>
          {noteOpen && (
            <textarea value={note||""} onChange={e=>onNoteChange(a.id,e.target.value)}
              placeholder="O que foi estudado / revisado…"
              style={{marginTop:6,width:"100%",minHeight:72,padding:"8px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.12)",color:"#fff",fontSize:11,resize:"vertical",outline:"none"}}/>
          )}
        </div>
      )}
    </div>
  );
});

export default ActivityCard;
