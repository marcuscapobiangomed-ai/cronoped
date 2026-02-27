import { useState, useEffect } from "react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../supabase";
import { MATERIAS, GRUPOS } from "../scheduleData";
import { badge, MODULE_END_DATE } from "../constants";
import ErroBox from "./ErroBox";
import { cleanCPF } from "../lib/helpers";
import { logEvent } from "../lib/logEvent";
import { activateTrial } from "../lib/db";

export default function Dashboard({ user, profile, session, onSelect, onLogout, onAdmin }) {
  const [acessos,         setAcessos]         = useState({});
  const [loadingAcessos,  setLoadingAcessos]  = useState(true);
  const [cardStates,      setCardStates]      = useState({}); // {[materiaId]: {expandido, grupoSelecionado}}
  const [payingCard,      setPayingCard]      = useState(null); // materiaId being paid
  const [cardErrors,      setCardErrors]      = useState({}); // {[materiaId]: errorMsg}
  const [cancelingId,     setCancelingId]     = useState(null);
  const [payMethod,       setPayMethod]       = useState({}); // {[materiaId]: "pix"|"card"}
  const [showOnboarding,  setShowOnboarding]  = useState(false);
  const [trialConfirm,    setTrialConfirm]    = useState(null); // {materia, grupo} or null
  const [activatingTrial,setActivatingTrial]  = useState(false);
  const [showAffiliate,   setShowAffiliate]   = useState(false);
  const [affCode,         setAffCode]         = useState("");
  const [affStats,        setAffStats]        = useState(null);
  const [affLoading,      setAffLoading]      = useState(false);
  const [affError,        setAffError]        = useState("");
  const [affCopied,       setAffCopied]       = useState(false);
  const [showTutorial,    setShowTutorial]    = useState(false);
  const [tutorialStep,    setTutorialStep]    = useState(0);

  const now = new Date();
  const isVIP = !!profile?.is_vip;
  const moduleExpired = !isVIP && now > MODULE_END_DATE;

  // Derived: does user have ANY active trial?
  const hasActiveTrial = Object.values(acessos).some(
    a => a.status === "trial" && a.trial_expires_at && new Date(a.trial_expires_at) > now
  );
  // Derived: has user ever used a trial? (has any trial record, active or expired)
  const hasUsedTrial = Object.values(acessos).some(a => a.status === "trial");
  // Derived: does user have any active access at all? (trial, paid, or VIP)
  const hasAnyAccess = isVIP || Object.values(acessos).some(a => {
    if (a.status === "aprovado") return true;
    if (a.status === "trial" && a.trial_expires_at && new Date(a.trial_expires_at) > now) return true;
    return false;
  });

  useEffect(()=>{
    supabase.from("acessos").select("materia,grupo,status,trial_expires_at").eq("user_id",user.id)
      .then(({data, error})=>{
        if (error) { console.error("loadAcessos:", error.message); }
        const map = {};
        (data||[]).forEach(a=>{ map[a.materia] = {grupo:a.grupo, status:a.status, trial_expires_at:a.trial_expires_at}; });
        setAcessos(map);
        setLoadingAcessos(false);

        // Show onboarding if user has no active access and isn't VIP
        const anyActive = (data||[]).some(a => {
          if (a.status === "aprovado") return true;
          if (a.status === "trial" && a.trial_expires_at && new Date(a.trial_expires_at) > new Date()) return true;
          return false;
        });
        if (!anyActive && !profile?.is_vip) {
          setShowOnboarding(true);
        }
        // Show tutorial for returning users who haven't seen it (and don't need onboarding)
        const needsOnboarding = !anyActive && !profile?.is_vip;
        if (!localStorage.getItem("tutorial_seen") && !needsOnboarding) {
          setTimeout(() => { setShowTutorial(true); setTutorialStep(0); }, 500);
        }
      });
  },[user.id]);

  async function reloadAcessos() {
    const {data} = await supabase.from("acessos").select("materia,grupo,status,trial_expires_at").eq("user_id",user.id);
    const map = {};
    (data||[]).forEach(a=>{ map[a.materia] = {grupo:a.grupo, status:a.status, trial_expires_at:a.trial_expires_at}; });
    setAcessos(map);
  }

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

  async function handleConfirmTrial() {
    if (!trialConfirm) return;
    setActivatingTrial(true);
    try {
      await activateTrial(trialConfirm.materia.id, trialConfirm.grupo);
      logEvent("trial_activated", { materia: trialConfirm.materia.id, grupo: trialConfirm.grupo });
      await reloadAcessos();
      const mat = trialConfirm.materia;
      const grp = trialConfirm.grupo;
      setTrialConfirm(null);
      setActivatingTrial(false);
      onSelect(mat, grp);
    } catch (err) {
      setCardErrors(prev => ({ ...prev, [trialConfirm.materia.id]: err.message || "Erro ao ativar trial." }));
      setTrialConfirm(null);
      setActivatingTrial(false);
    }
  }

  async function callCreatePreference(token, materia, grupo, method) {
    return fetch(`${SUPABASE_URL}/functions/v1/create-preference`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        materiaId: materia.id,
        materiaLabel: materia.label,
        grupo,
        paymentMethod: method,
      }),
    });
  }

  async function handlePagarCard(materia, grupo) {
    if (!grupo) return;
    const method = payMethod[materia.id] || "pix";
    setPayingCard(materia.id);
    setCardErrors(prev => ({ ...prev, [materia.id]: null }));
    logEvent("payment_attempt", { materia: materia.id, grupo, method });
    try {
      // 1. Use cached token first (instant, no network call)
      const { data: { session: sess } } = await supabase.auth.getSession();
      let token = sess?.access_token;
      if (!token) {
        setCardErrors(prev => ({ ...prev, [materia.id]: "Sessão expirada. Faça login novamente." }));
        setPayingCard(null);
        return;
      }

      // 2. Call edge function (--no-verify-jwt: relay won't block)
      let resp = await callCreatePreference(token, materia, grupo, method);

      // 3. If 401 (expired token), refresh and retry once
      if (resp.status === 401) {
        const { data: refreshData } = await supabase.auth.refreshSession();
        token = refreshData?.session?.access_token;
        if (!token) {
          setCardErrors(prev => ({ ...prev, [materia.id]: "Sessão expirada. Faça login novamente." }));
          setPayingCard(null);
          return;
        }
        resp = await callCreatePreference(token, materia, grupo, method);
      }

      // 4. Handle non-OK responses
      if (!resp.ok) {
        let errMsg = `Erro ${resp.status}`;
        try {
          const errData = await resp.json();
          errMsg = errData.error || errData.msg || errMsg;
        } catch (_) {}
        logEvent("payment_failure", { materia: materia.id, grupo, error: errMsg, status: resp.status });
        setCardErrors(prev => ({ ...prev, [materia.id]: errMsg }));
        setPayingCard(null);
        return;
      }

      const data = await resp.json();
      if (data.error) {
        logEvent("payment_failure", { materia: materia.id, grupo, error: data.error });
        setCardErrors(prev => ({ ...prev, [materia.id]: data.error }));
        setPayingCard(null);
        return;
      }
      if (!data.init_point) {
        logEvent("payment_failure", { materia: materia.id, grupo, error: "no_init_point" });
        setCardErrors(prev => ({ ...prev, [materia.id]: "Erro ao criar link de pagamento. Tente novamente." }));
        setPayingCard(null);
        return;
      }
      window.location.href = data.init_point;
    } catch (err) {
      console.error("handlePagarCard error:", err);
      logEvent("payment_failure", { materia: materia.id, grupo, error: err.message });
      setCardErrors(prev => ({ ...prev, [materia.id]: "Erro de conexão. Tente novamente." }));
      setPayingCard(null);
    }
  }

  async function handleCancelarPendente(materiaId) {
    setCancelingId(materiaId);
    try {
      const { data: row } = await supabase.from("acessos")
        .select("trial_expires_at")
        .eq("user_id", user.id)
        .eq("materia", materiaId)
        .single();

      const trialAindaValido = row?.trial_expires_at && new Date(row.trial_expires_at) > new Date();

      if (trialAindaValido) {
        await supabase.from("acessos")
          .update({ status: "trial" })
          .eq("user_id", user.id)
          .eq("materia", materiaId)
          .eq("status", "pending");
      } else {
        await supabase.from("acessos")
          .delete()
          .eq("user_id", user.id)
          .eq("materia", materiaId)
          .eq("status", "pending");
      }

      await reloadAcessos();
    } catch (err) {
      console.error("cancelarPendente:", err.message);
    }
    setCancelingId(null);
  }

  // Affiliate functions
  async function loadAffiliateStats() {
    setAffLoading(true); setAffError("");
    try {
      const { data, error } = await supabase.rpc("get_referral_stats");
      if (error) throw error;
      setAffStats(data);
      if (data?.code) setAffCode(data.code);
    } catch (err) {
      setAffError(err.message || "Erro ao carregar dados.");
    }
    setAffLoading(false);
  }

  async function handleSetReferralCode() {
    if (!affCode.trim()) return setAffError("Digite um código.");
    setAffLoading(true); setAffError("");
    try {
      const { error } = await supabase.rpc("set_referral_code", { p_code: affCode.trim() });
      if (error) throw error;
      await loadAffiliateStats();
    } catch (err) {
      setAffError(err.message || "Erro ao salvar código.");
      setAffLoading(false);
    }
  }

  function copyAffiliateLink() {
    const link = `https://plannerinternato.modulo1.workers.dev?ref=${affStats?.code}`;
    navigator.clipboard.writeText(link).then(() => {
      setAffCopied(true);
      setTimeout(() => setAffCopied(false), 2000);
    });
  }

  // Overlay modal style
  const overlayStyle = {
    position:"fixed",top:0,left:0,right:0,bottom:0,
    background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",
    zIndex:9999,padding:24,
  };

  function closeTutorial() {
    setShowTutorial(false);
    setTutorialStep(0);
    localStorage.setItem("tutorial_seen", "1");
  }

  const TUTORIAL_STEPS = [
    {
      icon: "📋",
      title: "Vamos configurar seu cronograma!",
      text: "Este guia rápido vai te ajudar a escolher corretamente sua matéria e seu grupo para visualizar o cronograma certo.",
      highlight: "Leva menos de 1 minuto!",
    },
    {
      icon: "📚",
      title: "Passo 1: Escolha sua matéria",
      text: "A matéria corresponde à disciplina que você está cursando AGORA no internato. Exemplo: se você está no rodízio de Pediatria, escolha Pediatria.",
      highlight: "Cada matéria tem seu próprio cronograma com atividades, locais e professores diferentes.",
    },
    {
      icon: "👥",
      title: "Passo 2: Escolha seu grupo CORRETO",
      text: "O grupo é a turma/divisão que a faculdade atribuiu a você. Esse número define em quais dias e horários você tem cada atividade.",
      highlight: "Confira seu grupo na secretaria, no e-mail da coordenação ou com colegas da sua turma. Se não souber, NÃO chute!",
    },
    {
      icon: "⚠️",
      title: "ATENÇÃO: Grupo errado = Cronograma errado!",
      text: "Se você escolher o grupo errado, vai ver horários, locais e professores que NÃO são os seus. Isso pode causar faltas e confusão.",
      highlight: "Após o pagamento, o grupo fica fixo. Escolha com certeza antes de pagar!",
      isWarning: true,
    },
    {
      icon: "✅",
      title: "Pronto! Agora é com você",
      text: "Clique em \"Selecionar grupo\" na matéria desejada, escolha seu grupo com cuidado e aproveite seu cronograma personalizado.",
      highlight: "Você pode rever este tutorial a qualquer momento clicando no botão \"?\" no topo da página.",
    },
  ];

  return (
    <div style={{minHeight:"100vh",background:"#F8FAFC"}}>
      {/* === TUTORIAL PASSO A PASSO === */}
      {showTutorial && (
        <div style={overlayStyle} onClick={closeTutorial}>
          <div onClick={e => e.stopPropagation()} className="modal-body" style={{background:"#fff",borderRadius:20,padding:"32px 28px",maxWidth:420,width:"100%",boxShadow:"0 25px 50px rgba(0,0,0,0.3)"}}>
            {(() => {
              const step = TUTORIAL_STEPS[tutorialStep];
              return (
                <>
                  {/* Progress dots */}
                  <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:20}}>
                    {TUTORIAL_STEPS.map((_, i) => (
                      <div key={i} style={{
                        width: i === tutorialStep ? 24 : 8, height:8, borderRadius:4,
                        background: i === tutorialStep ? (step.isWarning ? "#DC2626" : "#059669") : i < tutorialStep ? "#BBF7D0" : "#E2E8F0",
                        transition:"all 0.3s",
                      }}/>
                    ))}
                  </div>

                  {/* Icon */}
                  <div style={{textAlign:"center",marginBottom:16}}>
                    <div style={{fontSize:52,marginBottom:8}}>{step.icon}</div>
                    <h2 style={{fontSize:20,fontWeight:800,color: step.isWarning ? "#DC2626" : "#0F172A",marginBottom:0,lineHeight:1.3}}>{step.title}</h2>
                  </div>

                  {/* Content */}
                  <div style={{fontSize:14,color:"#475569",lineHeight:1.7,marginBottom:16,textAlign:"center"}}>
                    {step.text}
                  </div>

                  {/* Highlight box */}
                  <div style={{
                    background: step.isWarning ? "#FEF2F2" : "#F0FDF4",
                    border: `1px solid ${step.isWarning ? "#FECACA" : "#BBF7D0"}`,
                    borderRadius:10, padding:"12px 16px", marginBottom:24, textAlign:"center",
                  }}>
                    <div style={{fontSize:13,fontWeight:700,color: step.isWarning ? "#DC2626" : "#059669",lineHeight:1.5}}>
                      {step.highlight}
                    </div>
                  </div>

                  {/* Navigation buttons */}
                  <div style={{display:"flex",gap:10}}>
                    {tutorialStep > 0 && (
                      <button
                        onClick={() => setTutorialStep(s => s - 1)}
                        style={{flex:1,padding:"12px",borderRadius:10,border:"1px solid #E2E8F0",background:"#fff",color:"#475569",fontSize:14,fontWeight:600,cursor:"pointer"}}
                      >
                        Voltar
                      </button>
                    )}
                    {tutorialStep === 0 && (
                      <button
                        onClick={closeTutorial}
                        style={{padding:"12px 16px",borderRadius:10,border:"1px solid #E2E8F0",background:"#fff",color:"#94A3B8",fontSize:13,cursor:"pointer"}}
                      >
                        Pular
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (tutorialStep < TUTORIAL_STEPS.length - 1) {
                          setTutorialStep(s => s + 1);
                        } else {
                          closeTutorial();
                        }
                      }}
                      style={{
                        flex:1, padding:"12px", borderRadius:10, border:"none",
                        background: step.isWarning ? "#DC2626" : "#0F172A",
                        color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer",
                      }}
                    >
                      {tutorialStep < TUTORIAL_STEPS.length - 1
                        ? `Próximo (${tutorialStep + 1}/${TUTORIAL_STEPS.length})`
                        : "Entendi, vamos lá!"}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* === ONBOARDING MODAL === */}
      {showOnboarding && (
        <div style={overlayStyle} onClick={() => setShowOnboarding(false)}>
          <div onClick={e => e.stopPropagation()} className="modal-body" style={{background:"#fff",borderRadius:20,padding:"32px 28px",maxWidth:420,width:"100%",boxShadow:"0 25px 50px rgba(0,0,0,0.3)"}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:48,marginBottom:8}}>🎁</div>
              <h2 style={{fontSize:22,fontWeight:800,color:"#0F172A",marginBottom:8}}>Bem-vindo ao Cronograma Internato!</h2>
            </div>
            <div style={{fontSize:14,color:"#475569",lineHeight:1.6,marginBottom:20}}>
              <p style={{marginBottom:12}}>Veja como funciona:</p>
              <div style={{background:"#F0FDF4",borderRadius:10,padding:"14px 16px",marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:700,color:"#059669",marginBottom:6}}>3 dias grátis para experimentar</div>
                <div style={{fontSize:12,color:"#475569"}}>
                  Escolha <strong>1 matéria</strong> e <strong>1 grupo</strong> para testar gratuitamente por 3 dias.
                </div>
              </div>
              <div style={{background:"#F8FAFC",borderRadius:10,padding:"14px 16px",marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:700,color:"#0F172A",marginBottom:6}}>Acesso por módulo</div>
                <div style={{fontSize:12,color:"#475569"}}>
                  Cada matéria é vendida separadamente. O acesso vale até <strong>08/05/2026</strong>.
                </div>
              </div>
              <div style={{background:"#F0FDF4",borderRadius:10,padding:"14px 16px"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#059669",marginBottom:6}}>PIX a partir de R$ {profile?.referred_by ? "16,90" : "19,90"}</div>
                <div style={{fontSize:12,color:"#475569"}}>
                  {profile?.referred_by
                    ? "Desconto de afiliado aplicado! Economize R$ 4,00 via PIX."
                    : "Pague via PIX e economize R$ 1,00 em cada matéria!"}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setShowOnboarding(false);
                if (!localStorage.getItem("tutorial_seen")) {
                  setTimeout(() => { setShowTutorial(true); setTutorialStep(0); }, 300);
                }
              }}
              style={{width:"100%",padding:"12px 14px",borderRadius:10,border:"none",background:"#0F172A",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}
            >
              Entendi!
            </button>
          </div>
        </div>
      )}

      {/* === TRIAL CONFIRMATION MODAL === */}
      {trialConfirm && (
        <div style={overlayStyle} onClick={() => !activatingTrial && setTrialConfirm(null)}>
          <div onClick={e => e.stopPropagation()} className="modal-body" style={{background:"#fff",borderRadius:20,padding:"28px 24px",maxWidth:380,width:"100%",boxShadow:"0 25px 50px rgba(0,0,0,0.3)"}}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:40,marginBottom:8}}>🎁</div>
              <h3 style={{fontSize:18,fontWeight:800,color:"#0F172A",marginBottom:4}}>Ativar trial gratuito?</h3>
              <p style={{fontSize:13,color:"#64748B"}}>3 dias grátis para experimentar</p>
            </div>
            <div style={{background:"#F0FDF4",borderRadius:10,padding:"14px 16px",marginBottom:16,textAlign:"center"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#0F172A"}}>
                {trialConfirm.materia.icon} {trialConfirm.materia.label}
              </div>
              <div style={{fontSize:13,color:"#059669",fontWeight:600}}>
                Grupo {trialConfirm.materia.grupoLabels?.[trialConfirm.grupo] ?? trialConfirm.grupo}
              </div>
            </div>
            <div style={{fontSize:12,color:"#92400E",background:"#FEF3C7",borderRadius:8,padding:"10px 12px",marginBottom:16,textAlign:"center"}}>
              Você só pode testar <strong>1 matéria</strong> durante o trial. Escolha com atenção!
            </div>
            <div style={{display:"flex",gap:10}}>
              <button
                onClick={() => setTrialConfirm(null)}
                disabled={activatingTrial}
                style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid #E2E8F0",background:"#fff",color:"#475569",fontSize:13,fontWeight:600,cursor:"pointer"}}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmTrial}
                disabled={activatingTrial}
                style={{flex:1,padding:"10px",borderRadius:8,border:"none",background:"#059669",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}
              >
                {activatingTrial ? "Ativando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === HEADER === */}
      <div className="dash-header" style={{background:"#0F172A",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:22}}>🩺</span>
          <div>
            <div className="dash-title" style={{fontSize:15,fontWeight:700,color:"#fff"}}>Cronograma Internato Módulo 1</div>
            <div className="dash-subtitle" style={{fontSize:12,color:"#64748B"}}>Internato Médico · 2026</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{profile?.nome?.split(" ")[0]}</div>
            <div className="user-cpf" style={{fontSize:11,color:"#64748B",fontFamily:"'JetBrains Mono',monospace"}}>
              {cleanCPF(profile?.cpf||"").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
            </div>
          </div>
          <button onClick={() => { setShowTutorial(true); setTutorialStep(0); }} style={{background:"#334155",border:"none",color:"#fff",fontSize:12,borderRadius:8,width:28,height:28,cursor:"pointer",fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}} title="Como escolher matéria e grupo">
            ?
          </button>
          <button onClick={() => { setShowAffiliate(true); loadAffiliateStats(); }} style={{background:"#059669",border:"none",color:"#fff",fontSize:11,borderRadius:8,padding:"6px 10px",cursor:"pointer",fontWeight:700}}>
            🔗 Afiliado
          </button>
          {profile?.is_admin && (
            <button onClick={onAdmin} style={{background:"#7C3AED",border:"none",color:"#fff",fontSize:11,borderRadius:8,padding:"6px 10px",cursor:"pointer",fontWeight:700}}>
              🔧 Admin
            </button>
          )}
          <button onClick={onLogout} style={{background:"#1E293B",border:"none",color:"#94A3B8",fontSize:12,borderRadius:8,padding:"6px 12px",cursor:"pointer"}}>
            Sair
          </button>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"16px 20px"}}>
        {/* Banner Promoção PIX */}
        <div style={{background:"linear-gradient(135deg,#059669 0%,#10B981 100%)",borderRadius:14,padding:"12px 18px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:"#fff",marginBottom:4}}>
              Promoção PIX: R$ 16,90 <span style={{fontSize:12,fontWeight:600,opacity:0.9}}>(economia de R$ 4,00!)</span>
            </div>
            <div style={{fontSize:12,color:"#D1FAE5"}}>
              Acesso por módulo · Válido até 08/05/2026
            </div>
          </div>
          <div style={{background:"#fff",borderRadius:8,padding:"6px 14px",display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:18}}>💰</span>
            <div>
              <div style={{fontSize:11,color:"#64748B",lineHeight:1}}>no PIX</div>
              <div style={{fontSize:16,fontWeight:800,color:"#059669"}}>R$ 16,90</div>
            </div>
          </div>
        </div>

        {/* Banner módulo expirado */}
        {moduleExpired && (
          <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:14,padding:"18px 22px",marginBottom:24,textAlign:"center"}}>
            <div style={{fontSize:15,fontWeight:800,color:"#DC2626",marginBottom:4}}>
              Módulo 1 encerrado
            </div>
            <div style={{fontSize:13,color:"#991B1B"}}>
              O acesso ao Módulo 1 expirou em 08/05/2026. Aguarde informações sobre o próximo módulo.
            </div>
          </div>
        )}

        <h2 style={{fontSize:18,fontWeight:800,color:"#0F172A",marginBottom:4}}>Escolha sua matéria</h2>
        <p style={{fontSize:13,color:"#64748B",marginBottom:12}}>
          {!hasActiveTrial && !hasUsedTrial && !isVIP
            ? "3 dias grátis para 1 matéria · Depois, a partir de R$ 16,90 no PIX · Válido até 08/05/2026"
            : "A partir de R$ 16,90 no PIX · Acesso por módulo · Válido até 08/05/2026"
          }
        </p>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12,marginBottom:16}}>
          {loadingAcessos ? (
            Array.from({length:6}).map((_,i) => (
              <div key={i} className="skeleton" style={{height:110,borderRadius:14}}/>
            ))
          ) : (
            MATERIAS.map(m=>{
              const acesso    = acessos[m.id];
              const testPayment = new URLSearchParams(window.location.search).get("test_payment") === "true";
              const effectiveVIP = !testPayment && isVIP;
              const trialAtivo = acesso?.status === 'trial' && acesso?.trial_expires_at && new Date(acesso.trial_expires_at) > now;
              const diasRestantes = trialAtivo ? Math.ceil((new Date(acesso.trial_expires_at) - now) / (1000 * 60 * 60 * 24)) : 0;
              const isPaid    = acesso?.status === "aprovado" && !testPayment;
              const hasAccess = m.hasData && (isPaid || trialAtivo || effectiveVIP) && !moduleExpired;
              const isPending = acesso?.status === "pending";
              const isLocked  = !m.hasData;
              const isLockedGrupo = isPaid && !effectiveVIP;
              const expandido = cardStates[m.id]?.expandido || false;
              const grupoSelecionado = cardStates[m.id]?.grupoSelecionado;

              // Can this user activate trial on this card?
              // Only if: no active trial anywhere, not paid, not VIP, not pending, has data
              const canActivateTrial = !hasActiveTrial && !hasUsedTrial && !isPaid && !effectiveVIP && !isPending && m.hasData;

              return (
                <div key={m.id}
                  style={{
                    background:"#fff",
                    borderRadius:14,
                    border:`2px solid ${m.color}20`,
                    boxShadow:"0 2px 8px rgba(0,0,0,0.06)",
                    padding:"14px",
                    cursor: !isLocked && !isPending ? "pointer" : "default",
                    transition:"all 0.2s",
                  }}
                >
                  {/* Header: icon + badge */}
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontSize:22}}>{m.icon}</span>
                    {hasAccess ? (
                      trialAtivo && !effectiveVIP ? (
                        <span style={badge("#FEF3C7","#92400E")}>🎁 Trial: {diasRestantes}d</span>
                      ) : effectiveVIP ? (
                        <span style={badge("#DCFCE7","#16A34A")}>✓ Acesso livre</span>
                      ) : (
                        <span style={badge("#DCFCE7","#16A34A")}>✓ Acesso ativo</span>
                      )
                    ) : isPending ? (
                      <span style={badge("#FEF3C7","#92400E")}>⏳ Aguardando</span>
                    ) : isLocked ? (
                      <span style={badge("#F3F4F6","#6B7280")}>Em breve</span>
                    ) : canActivateTrial ? (
                      <span style={badge("#DCFCE7","#059669")}>3 dias grátis</span>
                    ) : (
                      <span style={badge(m.color,"#fff")}>R$ 16,90</span>
                    )}
                  </div>

                  {/* Title */}
                  <div style={{fontSize:14,fontWeight:700,color:"#0F172A",marginBottom:8}}>{m.label}</div>

                  {/* Paid non-VIP: locked grupo, direct open button */}
                  {isLockedGrupo && (
                    <>
                      <div style={{fontSize:12,color:"#64748B",marginBottom:8}}>
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

                  {/* Trial active: show grupo + open button */}
                  {trialAtivo && !effectiveVIP && (
                    <>
                      <div style={{fontSize:12,color:"#64748B",marginBottom:8}}>
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

                  {/* VIP: show grupo info + expand for selection */}
                  {effectiveVIP && !expandido && acesso?.grupo && (
                    <div style={{fontSize:12,color:"#64748B",marginBottom:8}}>
                      Grupo {m.grupoLabels?.[acesso.grupo] ?? acesso.grupo}
                    </div>
                  )}

                  {/* Expandable section: VIP, trial activation, and payment */}
                  {!isLocked && !isPending && !isLockedGrupo && !trialAtivo && (
                    <>
                      {expandido && (
                        <div style={{marginBottom:14}}>
                          {/* Grupo Selector */}
                          <div style={{marginBottom:14}}>
                            <label style={{fontSize:12,fontWeight:600,color:"#475569",display:"block",marginBottom:6}}>Seu grupo:</label>
                            <div style={{background:"#FEF3C7",borderRadius:8,padding:"8px 10px",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                              <span style={{fontSize:14}}>⚠️</span>
                              <span style={{fontSize:11,color:"#92400E",lineHeight:1.4}}>
                                Confira seu grupo na secretaria ou com a coordenação. <strong>Grupo errado = cronograma errado.</strong>
                              </span>
                            </div>
                            <select
                              value={grupoSelecionado || ""}
                              onChange={(e) => handleGrupoChange(m.id, e.target.value ? parseInt(e.target.value) : null)}
                              style={{
                                width:"100%",
                                padding:"10px 12px",
                                borderRadius:8,
                                border:"2px solid #E2E8F0",
                                fontSize:14,
                                color: grupoSelecionado ? "#0F172A" : "#94A3B8",
                                fontWeight: grupoSelecionado ? 700 : 400,
                                cursor:"pointer",
                                backgroundColor:"#fff",
                              }}
                            >
                              <option value="">— Selecione seu grupo com cuidado —</option>
                              {(m.grupos || GRUPOS).map(g => (
                                <option key={g} value={g}>
                                  Grupo {m.grupoLabels?.[g] ?? g}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Trial activation button (if eligible) */}
                          {grupoSelecionado && canActivateTrial && (
                            <>
                              <div style={{background:"#F0FDF4",borderRadius:10,padding:"12px 14px",marginBottom:14,border:"1px solid #BBF7D0"}}>
                                <div style={{fontSize:12,color:"#059669",fontWeight:600,marginBottom:3}}>Trial gratuito</div>
                                <div style={{fontSize:14,fontWeight:700,color:"#0F172A"}}>
                                  {m.label} · Grupo {m.grupoLabels?.[grupoSelecionado] ?? grupoSelecionado}
                                </div>
                                <div style={{fontSize:12,color:"#059669",marginTop:4}}>
                                  3 dias grátis · Apenas esta matéria
                                </div>
                              </div>

                              {cardErrors[m.id] && (
                                <div style={{marginBottom:12}}><ErroBox msg={cardErrors[m.id]}/></div>
                              )}

                              <button
                                onClick={() => setTrialConfirm({ materia: m, grupo: grupoSelecionado })}
                                style={{
                                  width:"100%",padding:"8px 12px",borderRadius:8,border:"none",
                                  background:"#059669",color:"#fff",fontSize:13,fontWeight:700,
                                  cursor:"pointer",transition:"all 0.2s",marginBottom:10,
                                }}
                              >
                                🎁 Ativar Trial Gratuito (3 dias)
                              </button>

                              <div style={{fontSize:11,color:"#64748B",textAlign:"center"}}>
                                ou pague agora:
                              </div>
                            </>
                          )}

                          {/* Payment method selector (for users who must pay) */}
                          {grupoSelecionado && !canActivateTrial && !hasAccess && (() => {
                            const method = payMethod[m.id] || "pix";
                            return (
                              <div style={{marginBottom:14}}>
                                <label style={{fontSize:12,fontWeight:600,color:"#475569",display:"block",marginBottom:8}}>Forma de pagamento:</label>
                                <div style={{display:"flex",gap:8}}>
                                  <button type="button" onClick={()=>setPayMethod(p=>({...p,[m.id]:"pix"}))}
                                    style={{flex:1,padding:"10px 8px",borderRadius:10,border: method==="pix" ? "2px solid #059669" : "2px solid #E2E8F0",
                                      background: method==="pix" ? "#F0FDF4" : "#fff",cursor:"pointer",transition:"all 0.2s",textAlign:"center"}}>
                                    <div style={{fontSize:16,marginBottom:2}}>💰</div>
                                    <div style={{fontSize:13,fontWeight:700,color: method==="pix" ? "#059669" : "#475569"}}>PIX</div>
                                    <div style={{fontSize:15,fontWeight:800,color: method==="pix" ? "#059669" : "#0F172A"}}>R$ 16,90</div>
                                    <div style={{fontSize:10,fontWeight:700,color:"#fff",background:"#059669",borderRadius:99,padding:"2px 8px",display:"inline-block",marginTop:4}}>PROMO</div>
                                  </button>
                                  <button type="button" onClick={()=>setPayMethod(p=>({...p,[m.id]:"card"}))}
                                    style={{flex:1,padding:"10px 8px",borderRadius:10,border: method==="card" ? "2px solid #6366F1" : "2px solid #E2E8F0",
                                      background: method==="card" ? "#EEF2FF" : "#fff",cursor:"pointer",transition:"all 0.2s",textAlign:"center"}}>
                                    <div style={{fontSize:16,marginBottom:2}}>💳</div>
                                    <div style={{fontSize:13,fontWeight:700,color: method==="card" ? "#6366F1" : "#475569"}}>Cartão</div>
                                    <div style={{fontSize:15,fontWeight:800,color: method==="card" ? "#6366F1" : "#0F172A"}}>R$ 20,90</div>
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Payment section for users who can also activate trial (below trial button) */}
                          {grupoSelecionado && canActivateTrial && (() => {
                            const method = payMethod[m.id] || "pix";
                            return (
                              <div style={{marginTop:10,marginBottom:14}}>
                                <div style={{display:"flex",gap:8}}>
                                  <button type="button" onClick={()=>setPayMethod(p=>({...p,[m.id]:"pix"}))}
                                    style={{flex:1,padding:"8px 6px",borderRadius:8,border: method==="pix" ? "2px solid #059669" : "2px solid #E2E8F0",
                                      background: method==="pix" ? "#F0FDF4" : "#fff",cursor:"pointer",transition:"all 0.2s",textAlign:"center"}}>
                                    <div style={{fontSize:12,fontWeight:700,color: method==="pix" ? "#059669" : "#475569"}}>💰 PIX R$ {profile?.referred_by ? "16,90" : "19,90"}</div>
                                    {profile?.referred_by && <div style={{fontSize:9,color:"#059669",fontWeight:600,marginTop:2}}>Desconto afiliado -R$3</div>}
                                  </button>
                                  <button type="button" onClick={()=>setPayMethod(p=>({...p,[m.id]:"card"}))}
                                    style={{flex:1,padding:"8px 6px",borderRadius:8,border: method==="card" ? "2px solid #6366F1" : "2px solid #E2E8F0",
                                      background: method==="card" ? "#EEF2FF" : "#fff",cursor:"pointer",transition:"all 0.2s",textAlign:"center"}}>
                                    <div style={{fontSize:12,fontWeight:700,color: method==="card" ? "#6366F1" : "#475569"}}>💳 Cartão R$ 20,90</div>
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Summary + Pay button (for payment flow) */}
                          {grupoSelecionado && !hasAccess && (() => {
                            const method = payMethod[m.id] || "pix";
                            const price = method === "pix" ? (profile?.referred_by ? "16,90" : "19,90") : "20,90";
                            const methodLabel = method === "pix" ? "PIX" : "Cartão";
                            return (
                              <>
                                {!canActivateTrial && (
                                  <div style={{background:"#FFF7ED",borderRadius:10,padding:"12px 14px",marginBottom:14,border:"1px solid #FED7AA"}}>
                                    <div style={{fontSize:12,color:"#64748B",marginBottom:3}}>Você está comprando</div>
                                    <div style={{fontSize:14,fontWeight:700,color:"#0F172A"}}>
                                      {m.label} · Grupo {m.grupoLabels?.[grupoSelecionado] ?? grupoSelecionado}
                                    </div>
                                    <div style={{fontSize:12,color:"#92400E",marginTop:4}}>
                                      Acesso ao cronograma · R$ {price}
                                      {method === "pix" && <span style={{marginLeft:6,fontSize:10,fontWeight:700,color:"#059669"}}>PIX</span>}
                                    </div>
                                    <div style={{fontSize:11,color:"#64748B",marginTop:4}}>
                                      Acesso por módulo · Válido até 08/05/2026
                                    </div>
                                  </div>
                                )}

                                {!canActivateTrial && cardErrors[m.id] && (
                                  <div style={{marginBottom:12}}><ErroBox msg={cardErrors[m.id]}/></div>
                                )}

                                <button
                                  type="button"
                                  disabled={payingCard === m.id}
                                  onClick={() => handlePagarCard(m, grupoSelecionado)}
                                  style={{
                                    width:"100%",
                                    padding:"10px 14px",
                                    borderRadius:8,
                                    border:"none",
                                    background: method === "pix" ? "#059669" : m.color,
                                    color:"#fff",
                                    fontSize:13,
                                    fontWeight:700,
                                    cursor:"pointer",
                                    transition:"all 0.2s",
                                  }}
                                >
                                  {payingCard === m.id ? "Redirecionando…" : `${method === "pix" ? "💰" : "💳"} Pagar R$ ${price} (${methodLabel})`}
                                </button>
                              </>
                            );
                          })()}

                          {/* VIP: summary + open button */}
                          {grupoSelecionado && hasAccess && (
                            <>
                              <div style={{background:"#F8FAFC",borderRadius:10,padding:"12px 14px",marginBottom:14}}>
                                <div style={{fontSize:12,color:"#64748B",marginBottom:3}}>Resumo</div>
                                <div style={{fontSize:14,fontWeight:700,color:"#0F172A"}}>
                                  {m.label} · Grupo {m.grupoLabels?.[grupoSelecionado] ?? grupoSelecionado}
                                </div>
                              </div>
                              <button
                                onClick={() => handleAbrirCronograma(m, grupoSelecionado)}
                                style={{
                                  width:"100%",padding:"8px 12px",borderRadius:8,border:"none",
                                  background:m.color,color:"#fff",fontSize:13,fontWeight:700,
                                  cursor:"pointer",transition:"all 0.2s",
                                }}
                              >
                                ▶ Abrir Cronograma
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Expand/Collapse button (non-VIP only) */}
                      {!effectiveVIP && (
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
                      )}
                    </>
                  )}

                  {/* VIP: Abrir Cronograma (quando tem grupo) */}
                  {effectiveVIP && !isLocked && !expandido && acesso?.grupo && (
                    <button
                      onClick={() => handleAbrirCronograma(m, acesso.grupo)}
                      style={{
                        width:"100%",padding:"8px 12px",borderRadius:8,border:"none",
                        background:m.color,color:"#fff",fontSize:13,fontWeight:700,
                        cursor:"pointer",transition:"all 0.2s",marginBottom:8,
                      }}
                    >
                      ▶ Abrir Cronograma
                    </button>
                  )}
                  {/* VIP expand/collapse */}
                  {effectiveVIP && !isLocked && (
                    <button
                      onClick={() => toggleCardExpand(m.id)}
                      style={{
                        width:"100%",padding:"8px 12px",borderRadius:8,
                        border:`1px solid ${m.color}40`,
                        background:expandido ? `${m.color}10` : "#F8FAFC",
                        color:m.color,fontSize:13,fontWeight:600,cursor:"pointer",
                        transition:"all 0.2s",
                      }}
                    >
                      {expandido ? "▼ Fechar" : acesso?.grupo ? "▶ Trocar grupo" : "▶ Selecionar grupo"}
                    </button>
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

      {/* === AFFILIATE MODAL === */}
      {showAffiliate && (
        <div style={overlayStyle} onClick={() => setShowAffiliate(false)}>
          <div onClick={e => e.stopPropagation()} className="modal-body" style={{background:"#fff",borderRadius:20,padding:"28px 24px",maxWidth:420,width:"100%",boxShadow:"0 25px 50px rgba(0,0,0,0.3)",maxHeight:"80vh",overflow:"auto"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <div style={{fontSize:18,fontWeight:800,color:"#0F172A"}}>🔗 Programa de Afiliados</div>
              <button onClick={() => setShowAffiliate(false)} style={{background:"#F1F5F9",border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",fontSize:14,color:"#64748B",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>

            {affLoading && !affStats ? (
              <div style={{textAlign:"center",padding:20,color:"#64748B",fontSize:13}}>Carregando...</div>
            ) : !affStats?.code ? (
              /* Criar código de afiliado */
              <>
                <div style={{background:"#F0FDF4",borderRadius:12,padding:"16px",marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#059669",marginBottom:6}}>Como funciona</div>
                  <div style={{fontSize:12,color:"#475569",lineHeight:1.6}}>
                    1. Crie seu código personalizado<br/>
                    2. Compartilhe seu link com amigos<br/>
                    3. Ganhe <strong>comissão progressiva</strong> em cada venda (10% a 40%)<br/>
                  </div>
                </div>

                <div style={{marginBottom:16}}>
                  <label style={{fontSize:12,fontWeight:600,color:"#475569",display:"block",marginBottom:6}}>Escolha seu código:</label>
                  <input
                    value={affCode}
                    onChange={e => { setAffCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setAffError(""); }}
                    placeholder="ex: marcos, medunb, turma42"
                    maxLength={20}
                    style={{width:"100%",padding:"10px 14px",borderRadius:8,border:"1px solid #E2E8F0",fontSize:14,color:"#0F172A",boxSizing:"border-box"}}
                  />
                  <div style={{fontSize:11,color:"#94A3B8",marginTop:4}}>3-20 caracteres: letras, números e hífen</div>
                </div>

                {affCode.length >= 3 && (
                  <div style={{background:"#F8FAFC",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#475569"}}>
                    Seu link: <strong style={{color:"#059669"}}>plannerinternato.modulo1.workers.dev?ref={affCode}</strong>
                  </div>
                )}

                {affError && (
                  <div style={{color:"#EF4444",fontSize:12,background:"#FEF2F2",padding:"10px 14px",borderRadius:8,marginBottom:16}}>{affError}</div>
                )}

                <button
                  onClick={handleSetReferralCode}
                  disabled={affLoading || affCode.length < 3}
                  style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:"#059669",color:"#fff",fontSize:14,fontWeight:700,cursor:affCode.length >= 3 ? "pointer" : "not-allowed",opacity:affCode.length >= 3 ? 1 : 0.5}}
                >
                  {affLoading ? "Salvando..." : "Criar meu link de afiliado"}
                </button>
              </>
            ) : (
              /* Stats do afiliado */
              <>
                <div style={{background:"#F0FDF4",borderRadius:12,padding:"16px",marginBottom:16}}>
                  <div style={{fontSize:11,color:"#059669",fontWeight:600,marginBottom:4}}>Seu link de afiliado</div>
                  <div style={{fontSize:13,fontWeight:700,color:"#0F172A",wordBreak:"break-all",marginBottom:10}}>
                    plannerinternato.modulo1.workers.dev?ref={affStats.code}
                  </div>
                  <button
                    onClick={copyAffiliateLink}
                    style={{width:"100%",padding:"8px",borderRadius:8,border:"1px solid #BBF7D0",background:affCopied ? "#059669" : "#fff",color:affCopied ? "#fff" : "#059669",fontSize:12,fontWeight:700,cursor:"pointer",transition:"all 0.2s"}}
                  >
                    {affCopied ? "✓ Copiado!" : "📋 Copiar link"}
                  </button>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                  <div style={{background:"#F8FAFC",borderRadius:10,padding:"14px",textAlign:"center"}}>
                    <div style={{fontSize:24,fontWeight:800,color:"#0F172A"}}>{affStats.total_indicados || 0}</div>
                    <div style={{fontSize:11,color:"#64748B",fontWeight:600}}>Indicados</div>
                  </div>
                  <div style={{background:"#F8FAFC",borderRadius:10,padding:"14px",textAlign:"center"}}>
                    <div style={{fontSize:24,fontWeight:800,color:"#059669"}}>{affStats.total_pagantes || 0}</div>
                    <div style={{fontSize:11,color:"#64748B",fontWeight:600}}>Pagantes</div>
                  </div>
                  <div style={{background:"#F8FAFC",borderRadius:10,padding:"14px",textAlign:"center"}}>
                    <div style={{fontSize:24,fontWeight:800,color:"#0F172A"}}>R$ {Number(affStats.comissao_total || 0).toFixed(2)}</div>
                    <div style={{fontSize:11,color:"#64748B",fontWeight:600}}>Comissão total</div>
                  </div>
                  <div style={{background:"#FEF3C7",borderRadius:10,padding:"14px",textAlign:"center"}}>
                    <div style={{fontSize:24,fontWeight:800,color:"#92400E"}}>R$ {Number(affStats.comissao_pendente || 0).toFixed(2)}</div>
                    <div style={{fontSize:11,color:"#64748B",fontWeight:600}}>Pendente</div>
                  </div>
                </div>

                {/* Faixa de comissão progressiva */}
                {(() => {
                  const tp = affStats.total_pagantes || 0;
                  // Faixas: 1-5: 10%, 6-20: 20%, 21-40: 30%, 41+: 40%
                  const currentPct = tp <= 5 ? 10 : tp <= 20 ? 20 : tp <= 40 ? 30 : 40;
                  const nextPct = currentPct === 10 ? 20 : currentPct === 20 ? 30 : currentPct === 30 ? 40 : null;
                  const nextAt = currentPct === 10 ? 6 : currentPct === 20 ? 21 : currentPct === 30 ? 41 : null;
                  const faltam = nextAt ? nextAt - tp : 0;
                  return (
                    <div style={{background:"#F0FDF4",borderRadius:10,padding:"12px 14px",marginBottom:8}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#059669",marginBottom:6}}>Sua faixa: {currentPct}% de comissão</div>
                      <div style={{display:"flex",gap:4,marginBottom:6}}>
                        {[{pct:10,label:"1-5"},{pct:20,label:"6-20"},{pct:30,label:"21-40"},{pct:40,label:"41+"}].map(tier => (
                          <div key={tier.pct} style={{
                            flex:1,padding:"4px 0",borderRadius:4,textAlign:"center",fontSize:10,fontWeight:700,
                            background: tier.pct === currentPct ? "#059669" : tier.pct < currentPct ? "#BBF7D0" : "#E2E8F0",
                            color: tier.pct === currentPct ? "#fff" : tier.pct < currentPct ? "#059669" : "#94A3B8",
                          }}>
                            {tier.pct}%
                          </div>
                        ))}
                      </div>
                      {nextPct && faltam > 0 && (
                        <div style={{fontSize:10,color:"#64748B",textAlign:"center"}}>
                          Faltam <strong>{faltam}</strong> pagante{faltam !== 1 ? "s" : ""} para {nextPct}%
                        </div>
                      )}
                      {!nextPct && (
                        <div style={{fontSize:10,color:"#059669",textAlign:"center",fontWeight:600}}>
                          Nivel maximo atingido!
                        </div>
                      )}
                    </div>
                  );
                })()}
                <div style={{fontSize:11,color:"#64748B",textAlign:"center",lineHeight:1.5}}>
                  Compartilhe seu link e ganhe comissão progressiva em cada venda.
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
