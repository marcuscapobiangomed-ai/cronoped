import { useState, useEffect } from "react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../supabase";
import { MATERIAS, GRUPOS } from "../scheduleData";
import { badge, FREE_EMAILS } from "../constants";
import ErroBox from "./ErroBox";
import { cleanCPF } from "../lib/helpers";
import { logEvent } from "../lib/logEvent";

export default function Dashboard({ user, profile, session, onSelect, onLogout, onAdmin }) {
  const [acessos,         setAcessos]         = useState({});
  const [loadingAcessos,  setLoadingAcessos]  = useState(true);
  const [cardStates,      setCardStates]      = useState({}); // {[materiaId]: {expandido, grupoSelecionado}}
  const [payingCard,      setPayingCard]      = useState(null); // materiaId being paid
  const [cardErrors,      setCardErrors]      = useState({}); // {[materiaId]: errorMsg}
  const [cancelingId,     setCancelingId]     = useState(null);

  useEffect(()=>{
    supabase.from("acessos").select("materia,grupo,status,trial_expires_at").eq("user_id",user.id)
      .then(({data, error})=>{
        if (error) { console.error("loadAcessos:", error.message); }
        const map = {};
        (data||[]).forEach(a=>{ map[a.materia] = {grupo:a.grupo, status:a.status, trial_expires_at:a.trial_expires_at}; });
        setAcessos(map);
        setLoadingAcessos(false);
      });
  },[user.id]);

  function toggleCardExpand(materiaId) {
    setCardStates(prev => ({
      ...prev,
      [materiaId]: {
        ...prev[materiaId],
        expandido: !prev[materiaId]?.expandido,
        grupoSelecionado: !prev[materiaId]?.expandido ? null : prev[materiaId]?.grupoSelecionado
      }
    }));
    setCardErrors(prev => ({ ...prev, [materiaId]: null }));
  }

  function handleGrupoChange(materiaId, grupo) {
    setCardStates(prev => ({
      ...prev,
      [materiaId]: {...prev[materiaId], grupoSelecionado: grupo}
    }));
  }

  async function handleAbrirCronograma(materia, grupo) {
    onSelect(materia, grupo);
  }

  async function handlePagarCard(materia, grupo) {
    if (!grupo) return;
    setPayingCard(materia.id);
    setCardErrors(prev => ({ ...prev, [materia.id]: null }));
    logEvent("payment_attempt", { materia: materia.id, grupo });
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/create-preference`, {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "Authorization":`Bearer ${session.access_token}`,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          materiaId:    materia.id,
          materiaLabel: materia.label,
          grupo:        grupo,
        }),
      });
      const data = await resp.json();
      if (data.error) {
        logEvent("payment_failure", { materia: materia.id, grupo, error: data.error });
        setCardErrors(prev => ({ ...prev, [materia.id]: data.error }));
        setPayingCard(null);
        return;
      }
      window.location.href = data.init_point;
    } catch (err) {
      logEvent("payment_failure", { materia: materia.id, grupo, error: err.message });
      setCardErrors(prev => ({ ...prev, [materia.id]: "Erro de conexão. Tente novamente." }));
      setPayingCard(null);
    }
  }

  async function handleCancelarPendente(materiaId) {
    setCancelingId(materiaId);
    try {
      // Verificar se ainda tem trial válido (trial_expires_at foi preservado pelo upsert)
      const { data: row } = await supabase.from("acessos")
        .select("trial_expires_at")
        .eq("user_id", user.id)
        .eq("materia", materiaId)
        .single();

      const trialAindaValido = row?.trial_expires_at && new Date(row.trial_expires_at) > new Date();

      if (trialAindaValido) {
        // Restaurar para trial em vez de deletar — usuario não perde o trial
        await supabase.from("acessos")
          .update({ status: "trial" })
          .eq("user_id", user.id)
          .eq("materia", materiaId)
          .eq("status", "pending");
      } else {
        // Trial expirado ou inexistente: deletar o pending
        await supabase.from("acessos")
          .delete()
          .eq("user_id", user.id)
          .eq("materia", materiaId)
          .eq("status", "pending");
      }

      const {data} = await supabase.from("acessos").select("materia,grupo,status,trial_expires_at").eq("user_id",user.id);
      const map = {};
      (data||[]).forEach(a=>{ map[a.materia] = {grupo:a.grupo, status:a.status, trial_expires_at:a.trial_expires_at}; });
      setAcessos(map);
    } catch (err) {
      console.error("cancelarPendente:", err.message);
    }
    setCancelingId(null);
  }

  return (
    <div style={{minHeight:"100vh",background:"#F8FAFC"}}>
      <div className="dash-header" style={{background:"#0F172A",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
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
          {profile?.email === "marcuscapobiangomed@gmail.com" && (
            <button onClick={onAdmin} style={{background:"#7C3AED",border:"none",color:"#fff",fontSize:11,borderRadius:8,padding:"6px 10px",cursor:"pointer",fontWeight:700}}>
              🔧 Admin
            </button>
          )}
          <button onClick={onLogout} style={{background:"#1E293B",border:"none",color:"#94A3B8",fontSize:12,borderRadius:8,padding:"6px 12px",cursor:"pointer"}}>
            Sair
          </button>
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"32px 20px"}}>
        <h2 style={{fontSize:22,fontWeight:800,color:"#0F172A",marginBottom:6}}>Escolha sua matéria</h2>
        <p style={{fontSize:14,color:"#64748B",marginBottom:28}}>7 dias grátis em todas as matérias. Depois, acesso a apenas R$ 9,90</p>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14,marginBottom:28}}>
          {loadingAcessos ? (
            Array.from({length:6}).map((_,i) => (
              <div key={i} className="skeleton" style={{height:110,borderRadius:14}}/>
            ))
          ) : (
            MATERIAS.map(m=>{
              const acesso    = acessos[m.id];
              const now = new Date();
              const isVIP     = FREE_EMAILS.includes(profile?.email);
              const trialAtivo = acesso?.status === 'trial' && acesso?.trial_expires_at && new Date(acesso.trial_expires_at) > now;
              const diasRestantes = trialAtivo ? Math.ceil((new Date(acesso.trial_expires_at) - now) / (1000 * 60 * 60 * 24)) : 0;
              const isPaid    = acesso?.status === "aprovado";
              const hasAccess = isPaid || trialAtivo || isVIP;
              const isPending = acesso?.status === "pending";
              const isLocked  = !m.hasData && !hasAccess;
              // Paid non-VIP users are locked to their grupo — no selector
              const isLockedGrupo = isPaid && !isVIP;
              const expandido = cardStates[m.id]?.expandido || false;
              const grupoSelecionado = cardStates[m.id]?.grupoSelecionado;

              return (
                <div key={m.id}
                  style={{
                    background:"#fff",
                    borderRadius:14,
                    border:`2px solid ${m.color}20`,
                    boxShadow:"0 2px 8px rgba(0,0,0,0.06)",
                    padding:"20px",
                    cursor: !isLocked && !isPending ? "pointer" : "default",
                    transition:"all 0.2s",
                  }}
                >
                  {/* Header: icon + badge */}
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
                    <span style={{fontSize:28}}>{m.icon}</span>
                    {hasAccess ? (
                      trialAtivo && !isVIP ? (
                        <span style={badge("#FEF3C7","#92400E")}>🎁 Trial: {diasRestantes}d</span>
                      ) : isVIP ? (
                        <span style={badge("#DCFCE7","#16A34A")}>✓ Acesso livre</span>
                      ) : (
                        <span style={badge("#DCFCE7","#16A34A")}>✓ Acesso ativo</span>
                      )
                    ) : isPending ? (
                      <span style={badge("#FEF3C7","#92400E")}>⏳ Aguardando</span>
                    ) : isLocked ? (
                      <span style={badge("#F3F4F6","#6B7280")}>Em breve</span>
                    ) : (
                      <span style={badge(m.color,"#fff")}>R$ 9,90</span>
                    )}
                  </div>

                  {/* Title */}
                  <div style={{fontSize:16,fontWeight:700,color:"#0F172A",marginBottom:12}}>{m.label}</div>

                  {/* Paid non-VIP: locked grupo, direct open button */}
                  {isLockedGrupo && (
                    <>
                      <div style={{fontSize:12,color:"#64748B",marginBottom:12}}>
                        Grupo {m.grupoLabels?.[acesso.grupo] ?? acesso.grupo}
                      </div>
                      <button
                        onClick={() => handleAbrirCronograma(m, acesso.grupo)}
                        style={{
                          width:"100%", padding:"10px 14px", borderRadius:8, border:"none",
                          background:m.color, color:"#fff", fontSize:13, fontWeight:700,
                          cursor:"pointer", transition:"all 0.2s",
                        }}
                      >
                        ▶ Abrir Cronograma
                      </button>
                    </>
                  )}

                  {/* VIP or trial: show grupo info + expand for selection */}
                  {hasAccess && !isLockedGrupo && !expandido && acesso?.grupo && (
                    <div style={{fontSize:12,color:"#64748B",marginBottom:12}}>
                      Grupo {m.grupoLabels?.[acesso.grupo] ?? acesso.grupo}
                    </div>
                  )}

                  {/* Expandable section for trial, VIP, and unpaid */}
                  {!isLocked && !isPending && !isLockedGrupo && (
                    <>
                      {expandido && (
                        <div style={{marginBottom:14}}>
                          {/* Grupo Selector */}
                          <div style={{marginBottom:14}}>
                            <label style={{fontSize:12,fontWeight:600,color:"#475569",display:"block",marginBottom:8}}>Seu grupo:</label>
                            <select
                              value={grupoSelecionado || ""}
                              onChange={(e) => handleGrupoChange(m.id, e.target.value ? parseInt(e.target.value) : null)}
                              style={{
                                width:"100%",
                                padding:"8px 12px",
                                borderRadius:8,
                                border:`1px solid #E2E8F0`,
                                fontSize:14,
                                color:"#475569",
                                cursor:"pointer",
                                backgroundColor:"#fff",
                              }}
                            >
                              <option value="">— Escolha um grupo —</option>
                              {(m.grupos || GRUPOS).map(g => (
                                <option key={g} value={g}>
                                  {m.grupoLabels?.[g] ?? g}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Summary */}
                          {grupoSelecionado && (
                            <div style={{background: hasAccess ? "#F8FAFC" : "#FFF7ED",borderRadius:10,padding:"12px 14px",marginBottom:14,border: hasAccess ? "none" : "1px solid #FED7AA"}}>
                              <div style={{fontSize:12,color:"#64748B",marginBottom:3}}>{hasAccess ? "Resumo" : "Você está comprando"}</div>
                              <div style={{fontSize:14,fontWeight:700,color:"#0F172A"}}>
                                {m.label} · Grupo {m.grupoLabels?.[grupoSelecionado] ?? grupoSelecionado}
                              </div>
                              {!hasAccess && (
                                <div style={{fontSize:12,color:"#92400E",marginTop:4}}>
                                  Acesso ao cronograma de {m.label}, Grupo {m.grupoLabels?.[grupoSelecionado] ?? grupoSelecionado} · R$ 9,90
                                </div>
                              )}
                            </div>
                          )}

                          {/* Error message */}
                          {cardErrors[m.id] && (
                            <div style={{marginBottom:12}}><ErroBox msg={cardErrors[m.id]}/></div>
                          )}

                          {/* Action button */}
                          <button
                            disabled={!grupoSelecionado || payingCard === m.id}
                            onClick={() => {
                              if (hasAccess) {
                                handleAbrirCronograma(m, grupoSelecionado);
                              } else {
                                handlePagarCard(m, grupoSelecionado);
                              }
                            }}
                            style={{
                              width:"100%",
                              padding:"10px 14px",
                              borderRadius:8,
                              border:"none",
                              background:grupoSelecionado ? m.color : "#CBD5E1",
                              color:"#fff",
                              fontSize:13,
                              fontWeight:700,
                              cursor:grupoSelecionado ? "pointer" : "not-allowed",
                              transition:"all 0.2s",
                            }}
                          >
                            {payingCard === m.id ? "Redirecionando…" : (hasAccess ? "▶ Abrir Cronograma" : "💳 Pagar R$ 9,90")}
                          </button>
                        </div>
                      )}

                      {/* Expand/Collapse button */}
                      <button
                        onClick={() => toggleCardExpand(m.id)}
                        style={{
                          width:"100%",
                          padding:"10px 14px",
                          borderRadius:8,
                          border:`1px solid ${m.color}40`,
                          background:expandido ? `${m.color}10` : "#F8FAFC",
                          color:m.color,
                          fontSize:13,
                          fontWeight:600,
                          cursor:"pointer",
                          transition:"all 0.2s",
                        }}
                      >
                        {expandido ? "▼ Fechar" : "▶ Selecionar grupo"}
                      </button>
                    </>
                  )}

                  {/* Pending payment */}
                  {isPending && (
                    <div style={{marginTop:12}} onClick={e=>e.stopPropagation()}>
                      <div style={{fontSize:11,color:"#92400E",marginBottom:8}}>Pagamento em aberto. Não recebeu o acesso?</div>
                      <button
                        onClick={()=>handleCancelarPendente(m.id)}
                        disabled={cancelingId===m.id}
                        style={{fontSize:11,fontWeight:700,color:"#EF4444",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:6,padding:"4px 10px",cursor:"pointer"}}
                      >
                        {cancelingId===m.id ? "Cancelando…" : "Cancelar e tentar novamente"}
                      </button>
                    </div>
                  )}

                  {/* Locked coming soon */}
                  {isLocked && m.disponivelEm && (
                    <div style={{fontSize:12,color:"#94A3B8"}}>Previsão: {m.disponivelEm}</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
