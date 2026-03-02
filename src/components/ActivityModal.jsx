import { useState } from "react";
import ColorPalette from "./ColorPalette";

// Aceita vários formatos e normaliza para HH:MM–HH:MM
// Exemplos aceitos: 0800-1200, 8-12, 8:00-12:00, 08:00–12:00, 8h-12h
function parseTimeRange(raw) {
  if (!raw || !raw.trim()) return { ok: true, value: "" };

  const str = raw.trim()
    .replace(/\s+/g, "")
    .replace(/[–—]/g, "-"); // normaliza traços para hífen simples

  const parts = str.split("-");
  if (parts.length !== 2) return { ok: false };

  function parseHHMM(s) {
    s = s.replace(/h$/i, ""); // remove 'h' final (ex: 8h → 8)
    if (/^\d{3,4}$/.test(s)) {
      // 800 → 08:00 | 1200 → 12:00
      const padded = s.padStart(4, "0");
      return padded.slice(0, 2) + ":" + padded.slice(2);
    }
    if (/^\d{1,2}:\d{2}$/.test(s)) {
      const [h, m] = s.split(":");
      return h.padStart(2, "0") + ":" + m;
    }
    if (/^\d{1,2}$/.test(s)) {
      // 8 → 08:00
      return s.padStart(2, "0") + ":00";
    }
    return null;
  }

  const start = parseHHMM(parts[0]);
  const end   = parseHHMM(parts[1]);
  if (!start || !end) return { ok: false };

  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (sh > 23 || sm > 59 || eh > 23 || em > 59) return { ok: false };

  return { ok: true, value: `${start}–${end}` };
}

const overlay = {position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16};
const card    = {background:"var(--bg-card)",borderRadius:16,padding:24,width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",maxHeight:"90vh",overflowY:"auto"};
const lbl     = {fontSize:12,fontWeight:600,color:"var(--text-secondary)",display:"block",marginBottom:4,marginTop:14};
const inp     = {width:"100%",padding:"10px 12px",borderRadius:10,border:"1px solid var(--border-light)",fontSize:14,outline:"none",boxSizing:"border-box",transition:"border 0.15s",background:"var(--bg-input)",color:"var(--text-primary)"};
const btnBase = {flex:1,padding:"10px 0",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",border:"none",transition:"all 0.12s"};

const RECURRENCE_OPTIONS = [
  { v: "single",    l: "Só esta" },
  { v: "all",       l: "Todas" },
  { v: "from_here", l: "Desta em diante" },
];

export default function ActivityModal({mode, activity, weekNum, day, turno, onSave, onClose, onDelete}) {
  const [title, setTitle]           = useState(activity?.title || "");
  const [time,  setTime]            = useState(activity?.time  || "");
  const [loc,   setLoc]             = useState(activity?.loc   || "");
  const [sub,   setSub]             = useState(activity?.sub   || "");
  const [type,  setType]            = useState(activity?.effectiveType || activity?.type || "normal");
  const [customColor, setCustomColor] = useState(activity?.customColor || null);
  const [recurrence, setRecurrence] = useState("single");
  const [timeErr, setTimeErr]       = useState("");

  // Auto-normaliza ao sair do campo
  function handleTimeBlur() {
    const parsed = parseTimeRange(time);
    if (parsed.ok && parsed.value) {
      setTime(parsed.value);
      setTimeErr("");
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const parsed = parseTimeRange(time);
    if (!parsed.ok) {
      setTimeErr("Ex: 0800-1200, 8-12, 08:00-12:00");
      return;
    }
    setTimeErr("");
    onSave({
      title: title.trim(), time: parsed.value, loc: loc.trim(), sub: sub.trim(),
      type, customColor,
      ...(isAdd ? { recurrence } : {}),
    });
  }

  const isAdd = mode === "add";
  const heading = isAdd ? "Nova atividade" : "Editar atividade";
  const context = isAdd ? `Semana ${weekNum} · ${day} · ${turno}` : `${activity?.day} · ${activity?.turno}`;

  return (
    <div style={overlay} onClick={onClose}>
      <form onClick={e=>e.stopPropagation()} onSubmit={handleSubmit} className="modal-form" style={card}>
        <div style={{fontSize:18,fontWeight:800,color:"var(--text-primary)",marginBottom:2}}>{heading}</div>
        <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:8}}>{context}</div>

        <label style={{...lbl,marginTop:0}}>Título *</label>
        <input value={title} onChange={e=>setTitle(e.target.value)} required
          style={inp} placeholder="Ex: Enfermaria de CM" autoFocus />

        <label style={lbl}>Horário (opcional)</label>
        <input
          value={time}
          onChange={e=>{setTime(e.target.value);setTimeErr("");}}
          onBlur={handleTimeBlur}
          style={{...inp,borderColor:timeErr?"#EF4444":undefined}}
          placeholder="0800-1200 ou 8-12"
          inputMode="numeric"
        />
        {timeErr
          ? <div style={{fontSize:11,color:"#EF4444",marginTop:3}}>{timeErr}</div>
          : <div style={{fontSize:10,color:"var(--text-muted)",marginTop:3}}>Aceita: 0800-1200 · 8-12 · 08:00-12:00 · 8h-12h</div>
        }

        <label style={lbl}>Local (opcional)</label>
        <input value={loc} onChange={e=>setLoc(e.target.value)}
          style={inp} placeholder="Ex: HUV, Sala 2208" />

        <label style={lbl}>Subtítulo (opcional)</label>
        <input value={sub} onChange={e=>setSub(e.target.value)}
          style={inp} placeholder="Ex: Dra. Ana Carolina" />

        <label style={lbl}>Tipo / Cor</label>
        <ColorPalette
          selected={{ type, customColor }}
          onChange={({ type: t, customColor: cc }) => { setType(t); setCustomColor(cc); }}
        />

        {isAdd && (
          <>
            <label style={lbl}>Recorrência</label>
            <div style={{display:"flex",gap:6}}>
              {RECURRENCE_OPTIONS.map(o => (
                <button key={o.v} type="button" onClick={() => setRecurrence(o.v)}
                  style={{
                    flex:1,padding:"8px 0",borderRadius:8,fontSize:12,fontWeight:700,
                    cursor:"pointer",transition:"all 0.12s",
                    border: recurrence===o.v ? "2px solid var(--bg-header)" : "1px solid var(--border-light)",
                    background: recurrence===o.v ? "var(--bg-header)" : "var(--bg-card)",
                    color: recurrence===o.v ? "#fff" : "var(--text-secondary)",
                  }}>
                  {o.l}
                </button>
              ))}
            </div>
          </>
        )}

        <div style={{display:"flex",gap:10,marginTop:22}}>
          <button type="button" onClick={onClose}
            style={{...btnBase,background:"var(--bg-subtle)",color:"var(--text-secondary)"}}>
            Cancelar
          </button>
          <button type="submit"
            style={{...btnBase,background:"var(--bg-header)",color:"#fff"}}>
            {isAdd ? "Adicionar" : "Salvar"}
          </button>
        </div>

        {!isAdd && onDelete && (
          <button type="button" onClick={onDelete}
            style={{width:"100%",marginTop:10,padding:"9px 0",borderRadius:10,
              fontSize:13,fontWeight:700,cursor:"pointer",
              border:"1px solid #FECACA",background:"#FFF1F2",color:"#DC2626",
              transition:"all 0.12s"}}>
            🗑️ Excluir atividade
          </button>
        )}
      </form>
    </div>
  );
}
