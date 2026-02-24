import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "./supabase";
import { MATERIAS, GRUPOS, SUPABASE_URL, SUPABASE_ANON_KEY } from "./scheduleData";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DAYS_ORDER = ["2ª","3ª","4ª","5ª","6ª","Sáb"];
const DAY_LABELS  = {"2ª":"Segunda","3ª":"Terça","4ª":"Quarta","5ª":"Quinta","6ª":"Sexta","Sáb":"Sábado"};
const DAY_JS      = {"2ª":1,"3ª":2,"4ª":3,"5ª":4,"6ª":5,"Sáb":6};

const TYPE_STYLE = {
  normal:       {bg:"#F8F8F7",border:"#E7E5E4",accent:"#78716C",pill:"#E7E5E4",pillText:"#57534E",dark:false},
  casa:         {bg:"#1D4ED8",border:"#1E40AF",accent:"#fff",   pill:"#1E3A8A",pillText:"#93C5FD",dark:true},
  horario_verde:{bg:"#15803D",border:"#166534",accent:"#fff",   pill:"#14532D",pillText:"#86EFAC",dark:true},
  verde:        {bg:"#F8F8F7",border:"#E7E5E4",accent:"#78716C",pill:"#E7E5E4",pillText:"#57534E",dark:false},
  ambulatorio:  {bg:"#F0FDFA",border:"#99F6E4",accent:"#0F766E",pill:"#CCFBF1",pillText:"#0D9488",dark:false},
  enfermaria:   {bg:"#FFFBEB",border:"#FCD34D",accent:"#B45309",pill:"#FEF3C7",pillText:"#92400E",dark:false},
  alojamento:   {bg:"#EEF2FF",border:"#C7D2FE",accent:"#4338CA",pill:"#E0E7FF",pillText:"#3730A3",dark:false},
  saude_mental: {bg:"#FDF4FF",border:"#E9D5FF",accent:"#7E22CE",pill:"#F3E8FF",pillText:"#6B21A8",dark:false},
  simulacao:    {bg:"#FFF7ED",border:"#FDBA74",accent:"#C2410C",pill:"#FFEDD5",pillText:"#9A3412",dark:false},
  plantao:      {bg:"#F0F9FF",border:"#7DD3FC",accent:"#0369A1",pill:"#E0F2FE",pillText:"#075985",dark:false},
  destaque:     {bg:"#DC2626",border:"#B91C1C",accent:"#fff",   pill:"#991B1B",pillText:"#FCA5A5",dark:true},
  prova:        {bg:"#DC2626",border:"#B91C1C",accent:"#fff",   pill:"#991B1B",pillText:"#FCA5A5",dark:true},
  feriado:      {bg:"#F9FAFB",border:"#E5E7EB",accent:"#9CA3AF",pill:"#F3F4F6",pillText:"#6B7280",dark:false},
};
const TYPE_ICON = {
  normal:"📋",casa:"🏠",verde:"🌿",horario_verde:"🌿",
  ambulatorio:"🏥",enfermaria:"🛏️",alojamento:"👶",saude_mental:"🧠",
  simulacao:"🎯",plantao:"⚡",feriado:"🏖️",destaque:"📋",prova:"📝",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

// Validação de CPF com dígitos verificadores
function validaCPF(cpf) {
  cpf = cpf.replace(/\D/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(cpf[10]);
}

function formatCPF(v) {
  return v.replace(/\D/g,"").slice(0,11)
    .replace(/(\d{3})(\d)/,"$1.$2")
    .replace(/(\d{3})(\d)/,"$1.$2")
    .replace(/(\d{3})(\d{1,2})$/,"$1-$2");
}
function cleanCPF(v)    { return v.replace(/\D/g,""); }
function fakeMail(cpf)  { return `${cleanCPF(cpf)}@internato.app`; }

// #10 — funções puras que dependem só da hora — memoizadas nos componentes
function getTodayInfo(weekDates) {
  if (!weekDates) return {weekNum:null, dayKey:null};
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const wd    = now.getDay();
  const weekNum = weekDates.find(w => today >= w.start && today <= w.end)?.num ?? null;
  const dayKey  = Object.entries(DAY_JS).find(([,v]) => v === wd)?.[0] ?? null;
  return {weekNum, dayKey};
}

function getUpcomingAlerts(keyEvents) {
  if (!keyEvents) return [];
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return keyEvents
    .filter(e => { const d = Math.ceil((e.date - today) / 86400000); return d >= 0 && d <= 5; })
    .map(e    => ({...e, diff: Math.ceil((e.date - today) / 86400000)}));
}

// Confetti
function launchConfetti() {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999";
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx    = canvas.getContext("2d");
  const colors = ["#22C55E","#3B82F6","#F59E0B","#EF4444","#8B5CF6","#EC4899"];
  const parts  = Array.from({length:150}, () => ({
    x:Math.random()*canvas.width, y:-10-Math.random()*100,
    r:4+Math.random()*6, d:2+Math.random()*3,
    color:colors[Math.floor(Math.random()*colors.length)],
    tilt:0, tiltAngle:0, tiltSpeed:0.05+Math.random()*0.1,
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach(p => {
      const opacity = frame < 126 ? 1 : 1-(frame-126)/54;
      ctx.beginPath(); ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color + Math.round(opacity*255).toString(16).padStart(2,"0");
      ctx.moveTo(p.x+p.tilt+p.r/4, p.y); ctx.lineTo(p.x+p.tilt, p.y+p.tilt+p.r/4);
      ctx.stroke();
      p.y += p.d+(frame*0.02); p.tiltAngle += p.tiltSpeed; p.tilt = Math.sin(p.tiltAngle)*12;
    });
    frame++; if (frame < 180) requestAnimationFrame(draw); else canvas.remove();
  }
  draw();
}

// ─── SUPABASE HELPERS ─────────────────────────────────────────────────────────
async function dbLoadProgress(userId, materia) {
  const {data} = await supabase.from("progresso").select("completed,notes")
    .eq("user_id",userId).eq("materia",materia).single();
  return {completed:data?.completed||{}, notes:data?.notes||{}};
}
async function dbSaveProgress(userId, materia, completed, notes) {
  await supabase.from("progresso").upsert(
    {user_id:userId, materia, completed, notes, updated_at:new Date().toISOString()},
    {onConflict:"user_id,materia"}
  );
}
async function validateAcesso(userId, materiaId) {
  const {data} = await supabase.from("acessos").select("status,grupo")
    .eq("user_id",userId).eq("materia",materiaId).single();
  return data;
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const labelStyle = {fontSize:13, fontWeight:600, color:"#475569", display:"block", marginBottom:6};
function ErroBox({msg}) {
  return <div style={{fontSize:13,color:"#EF4444",background:"#FEF2F2",padding:"10px 14px",borderRadius:8}}>{msg}</div>;
}
function badge(bg, color) {
  return {fontSize:11, fontWeight:700, color, background:bg, padding:"3px 10px", borderRadius:99, display:"inline-block"};
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [tab,      setTab]      = useState("login");
  const [subTab,   setSubTab]   = useState("form"); // "form" | "forgot"
  const [nome,     setNome]     = useState("");
  const [cpf,      setCpf]      = useState("");
  const [email,    setEmail]    = useState(""); // #2 — e-mail real para recuperação
  const [senha,    setSenha]    = useState("");
  const [confirma, setConfirma] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [erro,     setErro]     = useState("");
  const [sucesso,  setSucesso]  = useState("");

  function switchTab(t) { setTab(t); setSubTab("form"); setErro(""); setSucesso(""); }

  // LOGIN
  async function handleLogin(e) {
    e.preventDefault();
    if (!cpf || !senha) return setErro("Preencha todos os campos.");
    setLoading(true); setErro("");
    // #1 — FIX: signInWithPassword retorna a sessão completa (com access_token)
    const {data, error} = await supabase.auth.signInWithPassword({
      email: fakeMail(cpf), password: senha,
    });
    if (error) { setErro("CPF ou senha incorretos."); setLoading(false); return; }
    const {data:prof} = await supabase.from("profiles").select("nome,cpf").eq("id",data.user.id).single();
    // #1 — FIX: passa data.session (objeto completo com access_token), não só data.user
    onAuth(data.session, prof);
  }

  // CADASTRO
  async function handleRegister(e) {
    e.preventDefault();
    if (!nome.trim() || !cpf || !email.trim() || !senha || !confirma) return setErro("Preencha todos os campos.");
    if (!validaCPF(cpf)) return setErro("CPF inválido. Verifique os dígitos.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErro("E-mail inválido.");
    if (senha.length < 6) return setErro("Senha deve ter ao menos 6 caracteres.");
    if (senha !== confirma) return setErro("As senhas não conferem.");
    setLoading(true); setErro("");
    const {data, error} = await supabase.auth.signUp({ email: fakeMail(cpf), password: senha });
    if (error) {
      if (error.message.includes("already")) setErro("CPF já cadastrado. Tente fazer login.");
      else setErro(error.message);
      setLoading(false); return;
    }
    // #14 — Trata erro no insert de profiles
    const {error:profErr} = await supabase.from("profiles").insert({
      id:data.user.id, nome:nome.trim(), cpf:cleanCPF(cpf), email:email.trim().toLowerCase(),
    });
    if (profErr) {
      await supabase.auth.signOut();
      setErro("Erro ao criar perfil. CPF pode já estar em uso.");
      setLoading(false); return;
    }
    // #1 — FIX: passa data.session completa
    onAuth(data.session, {nome:nome.trim(), cpf:cleanCPF(cpf), email:email.trim().toLowerCase()});
  }

  // #2 — FIX: recuperação usa o e-mail real cadastrado na tabela profiles
  async function handleForgot(e) {
    e.preventDefault();
    if (!resetEmail.trim()) return setErro("Informe seu e-mail.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) return setErro("E-mail inválido.");
    setLoading(true); setErro("");
    // Busca o CPF associado ao e-mail para encontrar o auth email fictício
    const {data:prof} = await supabase.from("profiles")
      .select("cpf")
      .eq("email", resetEmail.trim().toLowerCase())
      .single();
    if (!prof) {
      setErro("E-mail não encontrado. Verifique se digitou corretamente.");
      setLoading(false); return;
    }
    const {error} = await supabase.auth.resetPasswordForEmail(fakeMail(prof.cpf), {
      redirectTo: window.location.origin + "?reset=1",
    });
    setLoading(false);
    if (error) { setErro("Erro ao enviar link. Tente novamente."); return; }
    setSucesso("✓ Link enviado! Verifique seu e-mail " + resetEmail.trim().toLowerCase());
  }

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0F172A 0%,#1E3A5F 50%,#0F172A 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:440}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:8}}>🩺</div>
          <h1 style={{fontSize:26,fontWeight:900,color:"#fff",letterSpacing:"-0.5px"}}>Internato HUCAM</h1>
          <p style={{fontSize:14,color:"#94A3B8",marginTop:4}}>Cronograma do Internato · 2026.1</p>
        </div>

        <div style={{background:"#fff",borderRadius:20,padding:"32px 28px",boxShadow:"0 25px 50px rgba(0,0,0,0.35)"}}>
          <div style={{display:"flex",background:"#F1F5F9",borderRadius:10,padding:4,marginBottom:28,gap:4}}>
            {["login","cadastro"].map(t=>(
              <button key={t} className={`tab${tab===t?" active":""}`} style={{flex:1}} onClick={()=>switchTab(t)}>
                {t==="login"?"Entrar":"Criar conta"}
              </button>
            ))}
          </div>

          {/* LOGIN */}
          {tab==="login" && subTab==="form" && (
            <form onSubmit={handleLogin} style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={labelStyle}>CPF</label>
                <input className="input-field" value={cpf} onChange={e=>setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" autoFocus/>
              </div>
              <div>
                <label style={labelStyle}>Senha</label>
                <input className="input-field" type="password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="••••••••"/>
              </div>
              {erro && <ErroBox msg={erro}/>}
              <button className="btn btn-dark" style={{width:"100%",marginTop:4}} disabled={loading}>
                {loading?"Entrando…":"Entrar →"}
              </button>
              <button type="button" onClick={()=>{setSubTab("forgot");setErro("");}}
                style={{background:"none",border:"none",fontSize:12,color:"#64748B",cursor:"pointer",textAlign:"center",textDecoration:"underline"}}>
                Esqueci minha senha
              </button>
            </form>
          )}

          {/* #2 — RECUPERAR SENHA com e-mail real */}
          {tab==="login" && subTab==="forgot" && (
            <form onSubmit={handleForgot} style={{display:"flex",flexDirection:"column",gap:14}}>
              <p style={{fontSize:13,color:"#64748B",lineHeight:1.5}}>
                Informe o e-mail que você cadastrou. Enviaremos um link para redefinir sua senha.
              </p>
              <div>
                <label style={labelStyle}>E-mail cadastrado</label>
                <input className="input-field" type="email" value={resetEmail} onChange={e=>setResetEmail(e.target.value)} placeholder="seu@email.com" autoFocus/>
              </div>
              {erro    && <ErroBox msg={erro}/>}
              {sucesso && <div style={{fontSize:13,color:"#16A34A",background:"#F0FDF4",padding:"10px 14px",borderRadius:8}}>{sucesso}</div>}
              <button className="btn btn-dark" style={{width:"100%"}} disabled={loading}>
                {loading?"Enviando…":"Enviar link →"}
              </button>
              <button type="button" onClick={()=>{setSubTab("form");setErro("");setSucesso("");}}
                style={{background:"none",border:"none",fontSize:12,color:"#64748B",cursor:"pointer",textDecoration:"underline"}}>
                ← Voltar ao login
              </button>
            </form>
          )}

          {/* CADASTRO */}
          {tab==="cadastro" && (
            <form onSubmit={handleRegister} style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={labelStyle}>Nome completo</label>
                <input className="input-field" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Seu nome completo" autoFocus/>
              </div>
              <div>
                <label style={labelStyle}>CPF</label>
                <input className="input-field" value={cpf} onChange={e=>setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00"/>
                {cleanCPF(cpf).length===11 && !validaCPF(cpf) && (
                  <p style={{fontSize:11,color:"#EF4444",marginTop:4}}>CPF inválido</p>
                )}
              </div>
              {/* #2 — campo de e-mail real para recuperação */}
              <div>
                <label style={labelStyle}>E-mail <span style={{fontSize:11,color:"#94A3B8",fontWeight:400}}>(para recuperar a senha)</span></label>
                <input className="input-field" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com"/>
              </div>
              <div>
                <label style={labelStyle}>Senha</label>
                <input className="input-field" type="password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Mínimo 6 caracteres"/>
              </div>
              <div>
                <label style={labelStyle}>Confirmar senha</label>
                <input className={`input-field${confirma&&confirma!==senha?" error":""}`} type="password" value={confirma} onChange={e=>setConfirma(e.target.value)} placeholder="Repita a senha"/>
              </div>
              {erro && <ErroBox msg={erro}/>}
              <button className="btn btn-dark" style={{width:"100%",marginTop:4}} disabled={loading}>
                {loading?"Criando conta…":"Criar conta →"}
              </button>
            </form>
          )}
        </div>

        <p style={{textAlign:"center",fontSize:12,color:"#475569",marginTop:20}}>
          🔒 Seus dados são protegidos. CPF usado apenas para identificação.
        </p>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ user, profile, session, onSelect, onLogout }) {
  const [acessos,         setAcessos]         = useState({});
  const [loadingAcessos,  setLoadingAcessos]  = useState(true);
  const [selectedMateria, setSelectedMateria] = useState(null);
  const [selectedGrupo,   setSelectedGrupo]   = useState(null);
  const [paying,          setPaying]          = useState(false);
  const [payErr,          setPayErr]          = useState("");
  const [cancelingId,     setCancelingId]     = useState(null); // #8

  useEffect(()=>{
    supabase.from("acessos").select("materia,grupo,status").eq("user_id",user.id)
      .then(({data})=>{
        const map = {};
        (data||[]).forEach(a=>{ map[a.materia] = {grupo:a.grupo, status:a.status}; });
        setAcessos(map);
        setLoadingAcessos(false);
      });
  },[user.id]);

  // Pagamento via Edge Function — token nunca sai do servidor
  async function handlePagar() {
    if (!selectedMateria || !selectedGrupo) return;
    setPaying(true); setPayErr("");
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/create-preference`, {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          // #1 — FIX: session agora é o objeto completo, access_token existe
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

  // #8 — Cancela pagamento pendente para liberar nova tentativa
  async function handleCancelarPendente(materiaId) {
    setCancelingId(materiaId);
    await supabase.from("acessos")
      .delete()
      .eq("user_id", user.id)
      .eq("materia", materiaId)
      .eq("status", "pending");
    const {data} = await supabase.from("acessos").select("materia,grupo,status").eq("user_id",user.id);
    const map = {};
    (data||[]).forEach(a=>{ map[a.materia] = {grupo:a.grupo, status:a.status}; });
    setAcessos(map);
    setCancelingId(null);
  }

  return (
    <div style={{minHeight:"100vh",background:"#F8FAFC"}}>
      {/* Header */}
      <div style={{background:"#0F172A",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:22}}>🩺</span>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>Internato HUCAM</div>
            <div style={{fontSize:12,color:"#64748B"}}>2026.1/1</div>
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

        {/* Grid com skeleton */}
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
              const isLocked  = !m.weeks && !hasAccess;
              return (
                <div key={m.id}
                  className={`materia-card${isSelected?" selected":""}${isLocked?" locked":""}`}
                  style={{"--mc":m.color}}
                  onClick={()=>{
                    if (hasAccess)  { onSelect(m, acesso.grupo); return; }
                    if (isPending)  return; // #8 — clique no card pending não faz nada
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
                  {!hasAccess && m.weeks && !isPending && <div style={{fontSize:12,color:"#64748B",marginTop:4}}>10 semanas · Grupos 1–10</div>}
                  {isLocked   && m.disponivelEm && <div style={{fontSize:12,color:"#94A3B8",marginTop:4}}>Previsão: {m.disponivelEm}</div>}

                  {/* #8 — botão de cancelar pagamento pendente */}
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

        {/* Painel de pagamento */}
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

// ─── ALERT BANNER ─────────────────────────────────────────────────────────────
function AlertBanner({alerts, onDismiss}) {
  if (!alerts.length) return null;
  return (
    <div style={{background:"#7C3AED",color:"#fff",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,fontSize:13,fontWeight:600,flexWrap:"wrap"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        🔔 {alerts.map((a,i)=>(
          <span key={i} style={{background:"rgba(255,255,255,0.2)",borderRadius:8,padding:"3px 10px",fontSize:12}}>
            {a.type==="prova"?"📝":"🎯"} {a.label} {a.diff===0?"— HOJE!":a.diff===1?"— AMANHÃ!":`— em ${a.diff} dias`}
          </span>
        ))}
      </div>
      <button onClick={onDismiss} style={{background:"none",border:"none",color:"rgba(255,255,255,0.7)",cursor:"pointer",fontSize:18,lineHeight:1}}>✕</button>
    </div>
  );
}

// ─── ACTIVITY CARD ────────────────────────────────────────────────────────────
function ActivityCard({a, isDone, onToggle, note, onNoteChange, isToday}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const et       = a.effectiveType;
  const s        = TYPE_STYLE[et] || TYPE_STYLE.normal;
  const isFeriado = a.type === "feriado";
  const isCasa    = et === "casa";
  return (
    <div className={`activity-card${isDone?" done":""}${isFeriado?" feriado":""}${isToday?" today-card":""}`}
      style={{background:s.bg, borderColor:isToday?"#F59E0B":s.border}}>
      {isToday && <div style={{fontSize:9,fontWeight:800,color:"#92400E",background:"#FEF3C7",padding:"2px 7px",borderRadius:99,display:"inline-block",marginBottom:6,letterSpacing:"0.06em",textTransform:"uppercase"}}>📍 HOJE</div>}
      {a.time  && <div className="time-pill" style={{background:s.pill,color:s.pillText,marginBottom:7}}>🕐 {a.time}</div>}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:6}} onClick={()=>!isFeriado&&onToggle(a.id)}>
        <span className="card-title" style={{fontSize:12,fontWeight:600,color:s.accent,lineHeight:1.35,flex:1}}>{TYPE_ICON[et]||"📋"} {a.title}</span>
        {!isFeriado && (
          <div className="check-dot" style={{borderColor:isDone?"#22C55E":s.dark?"rgba(255,255,255,0.4)":"#D6D3D1",background:isDone?"#22C55E":"transparent"}}>
            {isDone && <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 4l2 2 4-3.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
          </div>
        )}
      </div>
      {a.sub && <div style={{fontSize:11,color:s.dark?"rgba(255,255,255,0.65)":"#A8A29E",marginTop:4,lineHeight:1.3}}>{a.sub}</div>}
      {a.loc && <div style={{fontSize:10,color:s.dark?"rgba(255,255,255,0.45)":"#C7C3BE",marginTop:3}}>📍 {a.loc}</div>}
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
}

// ─── SCHEDULE VIEW ────────────────────────────────────────────────────────────
function ScheduleView({ user, profile, materia, grupo, onBack }) {
  const WEEKS     = materia.weeks     || [];
  const keyEvents = materia.keyEvents || [];
  const weekDates = materia.weekDates || [];

  // #10 — memoizar todayInfo e alerts (criam objetos Date — custoso se chamado no render)
  const {weekNum:todayWeek, dayKey:todayDay} = useMemo(() => getTodayInfo(weekDates),  [materia.id]);
  const alerts = useMemo(() => getUpcomingAlerts(keyEvents), [materia.id]);

  // #11 — alertDismissed persiste na sessão do browser
  const ALERT_KEY = `alert_dismissed_${materia.id}`;
  const [alertDismissed, setAlertDismissed] = useState(
    () => sessionStorage.getItem(ALERT_KEY) === "1"
  );
  function dismissAlert() {
    sessionStorage.setItem(ALERT_KEY, "1");
    setAlertDismissed(true);
  }

  // #8 — semana atual aberta por padrão
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
    validateAcesso(user.id, materia.id).then(acesso => {
      if (cancelled) return;
      if (!acesso || acesso.status !== "aprovado") {
        setAccessDenied(true); setLoading(false); return;
      }
      dbLoadProgress(user.id, materia.id).then(({completed:c, notes:n}) => {
        if (cancelled) return;
        setCompleted(c); setNotes(n);
        latestData.current = {completed:c, notes:n};
        setLoading(false);
      });
    });
    // #7 — cleanup: cancela requests pendentes e limpa o timer ao desmontar
    return () => {
      cancelled = true;
      clearTimeout(saveTimer.current);
    };
  },[user.id, materia.id]);

  // scheduleSave sempre lê de latestData.current (sem closure stale)
  function scheduleSave(c, n) {
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
  }

  function toggle(id) {
    setCompleted(prev => {
      const next = {...prev, [id]:!prev[id]};
      if (!next[id]) delete next[id];
      scheduleSave(next, latestData.current.notes);
      return next;
    });
  }

  function saveNote(id, text) {
    setNotes(prev => {
      const next = {...prev, [id]:text};
      if (!text) delete next[id];
      scheduleSave(latestData.current.completed, next);
      return next;
    });
  }

  // Confetti ao completar semana
  useEffect(()=>{
    WEEKS.forEach(week => {
      const competable = week.activities.filter(a => a.type !== "feriado");
      const allDone    = competable.length > 0 && competable.every(a => completed[a.id]);
      if (allDone && !prevDoneWeeks.current.has(week.num)) {
        prevDoneWeeks.current.add(week.num); launchConfetti();
      } else if (!allDone) prevDoneWeeks.current.delete(week.num);
    });
  },[completed]);

  // #11 — useMemo para allItems e totalDone
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

      {/* Header sticky */}
      <div style={{background:"#0F172A",borderBottom:"1px solid #1E293B",padding:"14px 20px",position:"sticky",top:0,zIndex:100}}>
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
        </div>
      </div>

      {/* Semanas */}
      <div style={{maxWidth:1200,margin:"0 auto",padding:"20px 16px 40px"}}>
        {WEEKS.map(week=>{
          const competable = week.activities.filter(a => a.type !== "feriado");
          const wDone      = competable.filter(a => completed[a.id]).length;
          const wpct       = competable.length ? Math.round((wDone/competable.length)*100) : 100;
          const allDoneW   = wpct===100 && competable.length>0;
          const isOpen     = !!open[week.num];
          const isCurrent  = week.num === todayWeek;

          // #12 — dayMap vem pré-computado dos dados (scheduleData.js)
          const activeDays = DAYS_ORDER.filter(d => week.dayMap[d].Manhã.length>0 || week.dayMap[d].Tarde.length>0);

          return (
            <div key={week.num} className={isCurrent?"today-week":""}
              style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:14,marginBottom:12,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>

              <div className="week-head" onClick={()=>setOpen(o=>({...o,[week.num]:!o[week.num]}))}>
                <div style={{width:36,height:36,borderRadius:9,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,
                  color:isCurrent&&!allDoneW?"#0F172A":"#fff",
                  background:allDoneW?"#22C55E":isCurrent?materia.color:"#0F172A"}}>
                  {week.num}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:14,fontWeight:700}}>Semana {week.num}</span>
                    <span style={{fontSize:13,color:"#94A3B8",fontWeight:400}}>{week.dates}</span>
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
                        const mItems  = week.dayMap[dayKey].Manhã;
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

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session,    setSession]    = useState(null);
  const [profile,    setProfile]    = useState(null);
  const [view,       setView]       = useState("loading");
  const [selMateria, setSelMateria] = useState(null);
  const [selGrupo,   setSelGrupo]   = useState(null);

  useEffect(()=>{
    supabase.auth.getSession().then(async ({data:{session}}) => {
      if (session) {
        const {data:prof} = await supabase.from("profiles").select("nome,cpf,email").eq("id",session.user.id).single();
        setSession(session); setProfile(prof);

        // Fallback de pagamento ao voltar do MP
        const params = new URLSearchParams(window.location.search);
        const status = params.get("status");
        const extRef = params.get("external_reference");
        if (status==="approved" && extRef) {
          const [uid, matId, grp] = extRef.split("|");
          if (uid===session.user.id) {
            await supabase.from("acessos")
              .update({status:"aprovado"})
              .eq("user_id",uid).eq("materia",matId).eq("status","pending");
            window.history.replaceState({},document.title,window.location.pathname);
            const mat = MATERIAS.find(m=>m.id===matId);
            if (mat) { setSelMateria(mat); setSelGrupo(parseInt(grp)); setView("schedule"); return; }
          }
        }
        setView("dashboard");
      } else {
        setView("auth");
      }
    });

    // #6 — FIX: cancela o listener ao desmontar (evita memory leak)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, sess) => {
      if (!sess) { setSession(null); setProfile(null); setView("auth"); }
    });
    return () => subscription.unsubscribe();
  },[]);

  if (view==="loading") return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0F172A"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>🩺</div>
        <div style={{fontSize:14,color:"#64748B"}}>Carregando…</div>
      </div>
    </div>
  );

  if (view==="auth") return (
    // #1 — FIX: onAuth recebe fullSession (objeto com access_token), não só user
    <AuthScreen onAuth={(fullSession, prof) => { setSession(fullSession); setProfile(prof); setView("dashboard"); }}/>
  );

  if (view==="dashboard") return (
    <Dashboard
      user={session.user}
      profile={profile}
      session={session}
      onSelect={(mat,grp) => { setSelMateria(mat); setSelGrupo(grp); setView("schedule"); }}
      onLogout={() => supabase.auth.signOut()}
    />
  );

  if (view==="schedule" && selMateria) return (
    <ScheduleView
      user={session.user}
      profile={profile}
      materia={selMateria}
      grupo={selGrupo}
      onBack={() => setView("dashboard")}
    />
  );

  return null;
}
