import { useState } from "react";
import { TYPE_ICON } from "../constants";

const ACTIVITY_TYPES = [
  {value:"normal",       label:"Normal",          icon:TYPE_ICON.normal},
  {value:"ambulatorio",  label:"Ambulatório",     icon:TYPE_ICON.ambulatorio},
  {value:"enfermaria",   label:"Enfermaria",      icon:TYPE_ICON.enfermaria},
  {value:"alojamento",   label:"Alojamento",      icon:TYPE_ICON.alojamento},
  {value:"saude_mental", label:"Saúde Mental",    icon:TYPE_ICON.saude_mental},
  {value:"simulacao",    label:"Simulação",       icon:TYPE_ICON.simulacao},
  {value:"plantao",      label:"Plantão",         icon:TYPE_ICON.plantao},
  {value:"casa",         label:"Estudo em Casa",  icon:TYPE_ICON.casa},
  {value:"horario_verde",label:"Horário Verde",   icon:TYPE_ICON.horario_verde},
];

const TIME_RE = /^\d{2}:\d{2}[–\-]\d{2}:\d{2}$/;

const overlay = {position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16};
const card    = {background:"#fff",borderRadius:16,padding:24,width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"};
const lbl     = {fontSize:12,fontWeight:600,color:"#475569",display:"block",marginBottom:4,marginTop:14};
const inp     = {width:"100%",padding:"10px 12px",borderRadius:10,border:"1px solid #E2E8F0",fontSize:14,outline:"none",boxSizing:"border-box",transition:"border 0.15s"};
const btnBase = {flex:1,padding:"10px 0",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",border:"none",transition:"all 0.12s"};

export default function ActivityModal({mode, activity, weekNum, day, turno, onSave, onClose}) {
  const [title, setTitle] = useState(activity?.title || "");
  const [time,  setTime]  = useState(activity?.time  || "");
  const [loc,   setLoc]   = useState(activity?.loc   || "");
  const [sub,   setSub]   = useState(activity?.sub   || "");
  const [type,  setType]  = useState(activity?.type  || "normal");
  const [timeErr, setTimeErr] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const t = time.trim();
    if (t && !TIME_RE.test(t)) {
      setTimeErr("Formato: HH:MM–HH:MM (ex: 08:00–12:00)");
      return;
    }
    setTimeErr("");
    onSave({title:title.trim(), time:t, loc:loc.trim(), sub:sub.trim(), type});
  }

  const isAdd = mode === "add";
  const heading = isAdd ? "Nova atividade" : "Editar atividade";
  const context = isAdd ? `Semana ${weekNum} · ${day} · ${turno}` : `${activity?.day} · ${activity?.turno}`;

  return (
    <div style={overlay} onClick={onClose}>
      <form onClick={e=>e.stopPropagation()} onSubmit={handleSubmit} className="modal-form" style={card}>
        <div style={{fontSize:18,fontWeight:800,color:"#0F172A",marginBottom:2}}>{heading}</div>
        <div style={{fontSize:12,color:"#94A3B8",marginBottom:8}}>{context}</div>

        <label style={{...lbl,marginTop:0}}>Título *</label>
        <input value={title} onChange={e=>setTitle(e.target.value)} required
          style={inp} placeholder="Ex: Enfermaria de CM" autoFocus />

        <label style={lbl}>Horário *</label>
        <input value={time} onChange={e=>{setTime(e.target.value);setTimeErr("");}}
          style={{...inp,borderColor:timeErr?"#EF4444":undefined}} placeholder="08:00–12:00" />
        {timeErr && <div style={{fontSize:11,color:"#EF4444",marginTop:3}}>{timeErr}</div>}

        <label style={lbl}>Local (opcional)</label>
        <input value={loc} onChange={e=>setLoc(e.target.value)}
          style={inp} placeholder="Ex: HUV, Sala 2208" />

        <label style={lbl}>Subtítulo (opcional)</label>
        <input value={sub} onChange={e=>setSub(e.target.value)}
          style={inp} placeholder="Ex: Dra. Ana Carolina" />

        {isAdd && (
          <>
            <label style={lbl}>Tipo</label>
            <select value={type} onChange={e=>setType(e.target.value)}
              style={{...inp,cursor:"pointer",appearance:"auto"}}>
              {ACTIVITY_TYPES.map(t=>(
                <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
              ))}
            </select>
          </>
        )}

        <div style={{display:"flex",gap:10,marginTop:22}}>
          <button type="button" onClick={onClose}
            style={{...btnBase,background:"#F1F5F9",color:"#475569"}}>
            Cancelar
          </button>
          <button type="submit"
            style={{...btnBase,background:"#0F172A",color:"#fff"}}>
            {isAdd ? "Adicionar" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
