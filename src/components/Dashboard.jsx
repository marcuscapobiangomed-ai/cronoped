import { useState, useEffect } from "react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../supabase";
import { MATERIAS, GRUPOS } from "../scheduleData";
import { badge } from "../constants";
import ErroBox from "./ErroBox";
import { cleanCPF } from "../lib/helpers";

export default function Dashboard({ user, profile, session, onSelect, onLogout }) {
  const [acessos,         setAcessos]         = useState({});
  const [loadingAcessos,  setLoadingAcessos]  = useState(true);
  const [selectedMateria, setSelectedMateria] = useState(null);
  const [selectedGrupo,   setSelectedGrupo]   = useState(null);
  const [paying,          setPaying]          = useState(false);
  const [payErr,          setPayErr]          = useState("");
  const [cancelingId,     setCancelingId]     = useState(null);

  useEffect(()=>{
    supabase.from("acessos").select("materia,grupo,status").eq("user_id",user.id)
      .then(({data, error})=>{
        if (error) { console.error("loadAcessos:", error.message); }
        const map = {};
        (data||[]).forEach(a=>{ map[a.materia] = {grupo:a.grupo, status:a.status}; });
        setAcessos(map);
        setLoadingAcessos(false);
      });
  },[user.id]);

  async function handlePagar() {
    if (!selectedMateria || !selectedGrupo) return;
    setPaying(true); setPayErr("");
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/create-preference`, {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "Authorization":`Bearer ${session.access_token}`,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          materiaId:    selectedMateria.id,
          materiaLabel: selectedMateria.label,
          grupo:        selectedGrupo,
        }),
      });
      const data = await resp.json();
      if (data.error) { setPayErr(data.error); setPaying(false); return; }
      window.location.href = data.init_point;
    } catch {
      setPayErr("Erro de conexão. Tente novamente.");
      setPaying(false);
    }
  }

  async function handleCancelarPendente(materiaId) {
    setCancelingId(materiaId);
    try {
      await supabase.from("acessos")
        .delete()
        .eq("user_id", user.id)
        .eq("materia", materiaId)
        .eq("status", "pending");
      const {data} = await supabase.from("acessos").select("materia,grupo,status").eq("user_id",user.id);
      const map = {};
      (data||[]).forEach(a=>{ map[a.materia] = {grupo:a.grupo, status:a.status}; });
      setAcessos(map);
    } catch (err) {
      console.error("cancelarPendente:", err.message);
    }
    setCancelingId(null);
  }

  return (
    <div style={{minHeight:"100vh",background:"#F8FAFC"}}>
      <div style={{background:"#0F172A",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:22}}>🩺</span>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>Cronograma Internato Módulo 1</div>
            <div style={{fontSize:12,color:"#64748B"}}>Internato Médico · 2026</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{profile?.nome?.split(" ")[0]}</div>
            <div style={{fontSize:11,color:"#64748B",fontFamily:"'JetBrains Mono',monospace"}}>
              {cleanCPF(profile?.cpf||"").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
            </div>
          </div>
          <button onClick={onLogout} style={{background:"#1E293B",border:"none",color:"#94A3B8",fontSize:12,borderRadius:8,padding:"6px 12px",cursor:"pointer"}}>
            Sair
          </button>
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"32px 20px"}}>
        <h2 style={{fontSize:22,fontWeight:800,color:"#0F172A",marginBottom:6}}>Escolha sua matéria</h2>
        <p style={{fontSize:14,color:"#64748B",marginBottom:28}}>Cada matéria tem acesso individual por R$ 9,90</p>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14,marginBottom:28}}>
          {loadingAcessos ? (
            Array.from({length:6}).map((_,i) => (
              <div key={i} className="skeleton" style={{height:110,borderRadius:14}}/>
            ))
          ) : (
            MATERIAS.map(m=>{
              const acesso    = acessos[m.id];
              const hasAccess = acesso?.status === "aprovado";
              const isPending = acesso?.status === "pending";
              const isSelected= selectedMateria?.id === m.id;
              const isLocked  = !m.weeksByGroup && !hasAccess;
              return (
                <div key={m.id}
                  className={`materia-card${isSelected?" selected":""}${isLocked?" locked":""}`}
                  style={{"--mc":m.color}}
                  onClick={()=>{
                    if (hasAccess)  { onSelect(m, acesso.grupo); return; }
                    if (isPending)  return;
                    if (isLocked)   return;
                    setSelectedMateria(isSelected ? null : m);
                    setSelectedGrupo(null);
                    setPayErr("");
                  }}
                >
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
                    <span style={{fontSize:28}}>{m.icon}</span>
                    {hasAccess ? (
                      <span style={badge("#DCFCE7","#16A34A")}>✓ Acesso ativo</span>
                    ) : isPending ? (
                      <span style={badge("#FEF3C7","#92400E")}>⏳ Aguardando</span>
                    ) : isLocked ? (
                      <span style={badge("#F3F4F6","#6B7280")}>Em breve</span>
                    ) : (
                      <span style={badge(m.color,"#fff")}>R$ 9,90</span>
                    )}
                  </div>
                  <div style={{fontSize:16,fontWeight:700,color:"#0F172A"}}>{m.label}</div>
                  {hasAccess  && <div style={{fontSize:12,color:"#64748B",marginTop:4}}>Grupo {acesso.grupo} · Clique para abrir</div>}
                  {!hasAccess && m.weeksByGroup && !isPending && <div style={{fontSize:12,color:"#64748B",marginTop:4}}>10 semanas · Grupos 1–10</div>}
                  {isLocked   && m.disponivelEm && <div style={{fontSize:12,color:"#94A3B8",marginTop:4}}>Previsão: {m.disponivelEm}</div>}

                  {isPending && (
                    <div style={{marginTop:10}} onClick={e=>e.stopPropagation()}>
                      <div style={{fontSize:11,color:"#92400E",marginBottom:6}}>Pagamento em aberto. Não recebeu o acesso?</div>
                      <button
                        onClick={()=>handleCancelarPendente(m.id)}
                        disabled={cancelingId===m.id}
                        style={{fontSize:11,fontWeight:700,color:"#EF4444",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:6,padding:"4px 10px",cursor:"pointer"}}
                      >
                        {cancelingId===m.id ? "Cancelando…" : "Cancelar e tentar novamente"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {selectedMateria && !acessos[selectedMateria.id]?.status && (
          <div style={{background:"#fff",borderRadius:16,padding:"24px 22px",border:"2px solid "+selectedMateria.color,boxShadow:"0 4px 20px rgba(0,0,0,0.06)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
              <span style={{fontSize:24}}>{selectedMateria.icon}</span>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:"#0F172A"}}>{selectedMateria.label}</div>
                <div style={{fontSize:13,color:"#64748B"}}>Selecione seu grupo para continuar</div>
              </div>
            </div>

            <div style={{marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:600,color:"#475569",marginBottom:10}}>Meu grupo:</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {GRUPOS.map(g=>(
                  <button key={g} onClick={()=>setSelectedGrupo(g)} style={{
                    width:44,height:44,borderRadius:10,fontWeight:700,fontSize:15,cursor:"pointer",transition:"all 0.12s",
                    border:`2px solid ${selectedGrupo===g?selectedMateria.color:"#E2E8F0"}`,
                    background:selectedGrupo===g?selectedMateria.color:"#fff",
                    color:selectedGrupo===g?"#fff":"#475569",
                  }}>{g}</button>
                ))}
              </div>
            </div>

            {selectedGrupo && (
              <div style={{background:"#F8FAFC",borderRadius:12,padding:"16px 18px",marginBottom:16}}>
                <div style={{fontSize:13,color:"#64748B",marginBottom:4}}>Resumo do pedido</div>
                <div style={{fontSize:15,fontWeight:700,color:"#0F172A"}}>{selectedMateria.label} · Grupo {selectedGrupo}</div>
                <div style={{fontSize:22,fontWeight:900,color:selectedMateria.color,marginTop:4}}>R$ 9,90</div>
                <div style={{fontSize:12,color:"#94A3B8",marginTop:2}}>Acesso completo ao cronograma do módulo</div>
              </div>
            )}

            {payErr && <div style={{marginBottom:12}}><ErroBox msg={payErr}/></div>}
            <button className="btn btn-dark"
              style={{width:"100%",background:selectedGrupo?selectedMateria.color:"#CBD5E1",fontSize:16,padding:"14px"}}
              disabled={!selectedGrupo||paying} onClick={handlePagar}>
              {paying?"Redirecionando…":"💳 Pagar R$ 9,90 com Mercado Pago"}
            </button>
            <p style={{fontSize:11,color:"#94A3B8",textAlign:"center",marginTop:10}}>
              🔒 Pagamento seguro · Acesso liberado automaticamente após confirmação
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
