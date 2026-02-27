import { useState } from "react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../../supabase";

const MATERIAS_LIST = ["ped","cm","go","cc","emg","sim"];
const MATERIA_LABELS = {ped:"Pediatria",cm:"Clínica Médica",go:"GO",cc:"Clínica Cirúrgica",emg:"Emergência",sim:"Simulação"};
const MATERIA_SHORT  = {ped:"PED",cm:"CM",go:"GO",cc:"CC",emg:"EMG",sim:"SIM"};
const MATERIA_ICONS  = {ped:"👶",cm:"🩺",go:"🤰",cc:"🔪",emg:"🚑",sim:"🎯"};
const STATUS_COLORS  = {
  aprovado:{bg:"#DCFCE7",color:"#16A34A",label:"Pago"},
  trial:   {bg:"#FEF3C7",color:"#92400E",label:"Trial"},
  pending: {bg:"#FFF7ED",color:"#C2410C",label:"Pend."},
};
const PAGE_SIZE = 10;

const lbl      = {fontSize:11,fontWeight:600,color:"#64748B",display:"block",marginBottom:3};
const inpStyle = {width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid #E2E8F0",fontSize:12,boxSizing:"border-box"};
const smallBtn = {fontSize:10,fontWeight:700,border:"none",borderRadius:4,padding:"3px 8px",cursor:"pointer",transition:"all 0.12s"};

export default function UserManager({ users: initialUsers, onRefresh, initialSearch = "" }) {
  const [users,        setUsers]        = useState(initialUsers || []);
  const [search,       setSearch]       = useState(initialSearch);
  const [filter,       setFilter]       = useState("all"); // all|vip|pago|trial|none
  const [sortBy,       setSortBy]       = useState("data");
  const [page,         setPage]         = useState(1);
  const [expandedId,   setExpandedId]   = useState(null);
  const [saving,       setSaving]       = useState(null);
  const [vipSaving,    setVipSaving]    = useState(null);
  const [editProfile,  setEditProfile]  = useState(null);
  const [pwUserId,     setPwUserId]     = useState(null);
  const [newPassword,  setNewPassword]  = useState("");
  const [showPw,       setShowPw]       = useState(false);
  const [pwSaving,     setPwSaving]     = useState(false);
  const [pwMsg,        setPwMsg]        = useState(null);
  const [deleteConfirm,setDeleteConfirm]= useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [deleteMsg,    setDeleteMsg]    = useState(null);
  const [copiedId,     setCopiedId]     = useState(null);

  async function reload() {
    const { data } = await supabase.rpc("admin_list_users");
    if (data) setUsers(data);
  }

  function isTrialExpired(ac) {
    if (ac?.status !== "trial") return false;
    return !ac.trial_expires_at || new Date(ac.trial_expires_at) < new Date();
  }

  function getAcesso(user, materia) {
    return (user.acessos || []).find(a => a.materia === materia);
  }

  function copyEmail(email) {
    navigator.clipboard?.writeText(email);
    setCopiedId(email);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function handleStatusChange(userId, materia, newStatus, grupo = 1) {
    const key = `${userId}-${materia}`;
    setSaving(key);
    try {
      await supabase.rpc("admin_update_acesso", { p_user_id:userId, p_materia:materia, p_status:newStatus, p_grupo:grupo });
      await reload();
    } catch(err) { console.error(err.message); }
    setSaving(null);
  }

  async function handleGrupoChange(userId, materia, newGrupo, currentStatus) {
    const key = `${userId}-${materia}`;
    setSaving(key);
    try {
      await supabase.rpc("admin_update_acesso", { p_user_id:userId, p_materia:materia, p_status:currentStatus, p_grupo:newGrupo });
      await reload();
    } catch(err) { console.error(err.message); }
    setSaving(null);
  }

  async function handleSetVip(userId) {
    setVipSaving(userId);
    try {
      await supabase.rpc("admin_set_vip", { p_user_id: userId });
      await reload();
    } catch(err) { console.error(err.message); }
    setVipSaving(null);
  }

  async function handleSaveProfile() {
    if (!editProfile) return;
    setSaving(`profile-${editProfile.userId}`);
    try {
      await supabase.rpc("admin_update_profile", {
        p_user_id:editProfile.userId, p_nome:editProfile.nome||null,
        p_email:editProfile.email||null, p_cpf:editProfile.cpf||null,
      });
      await reload();
      setEditProfile(null);
    } catch(err) { console.error(err.message); }
    setSaving(null);
  }

  async function handleSetPassword(userId) {
    if (newPassword.length < 6) { setPwMsg({type:"error",text:"Mínimo 6 caracteres"}); return; }
    setPwSaving(true);
    try {
      const { data:{ session } } = await supabase.auth.getSession();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/admin-reset-password`, {
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${session?.access_token}`,"apikey":SUPABASE_ANON_KEY},
        body: JSON.stringify({ userId, newPassword }),
      });
      if (!resp.ok) { const d = await resp.json(); throw new Error(d.error || `Erro ${resp.status}`); }
      setPwMsg({type:"success",text:"Senha alterada!"});
      setNewPassword(""); setShowPw(false);
    } catch(err) { setPwMsg({type:"error",text:err.message}); }
    setPwSaving(false);
    setTimeout(() => setPwMsg(null), 4000);
  }

  async function handleSendResetLink(email) {
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin+"?reset=1" });
      if (error) throw error;
      setPwMsg({type:"success",text:"Link enviado para "+email});
    } catch(err) { setPwMsg({type:"error",text:err.message}); }
    setPwSaving(false);
    setTimeout(() => setPwMsg(null), 4000);
  }

  async function handleDeleteUser(userId) {
    setDeleting(true);
    try {
      const { data:{ session } } = await supabase.auth.getSession();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/admin-delete-user`, {
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${session?.access_token}`,"apikey":SUPABASE_ANON_KEY},
        body: JSON.stringify({ userId }),
      });
      if (!resp.ok) { const d = await resp.json(); throw new Error(d.error || `Erro ${resp.status}`); }
      setDeleteConfirm(null); setExpandedId(null);
      await reload();
      if (onRefresh) await onRefresh();
    } catch(err) { setDeleteMsg({type:"error",text:err.message}); setTimeout(() => setDeleteMsg(null), 4000); }
    setDeleting(false);
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  function userMatchesFilter(u, f) {
    const acessos = u.acessos || [];
    const paidCount  = acessos.filter(a => a.status === "aprovado").length;
    const trialCount = acessos.filter(a => a.status === "trial" && !isTrialExpired(a)).length;
    if (f === "vip")   return u.is_vip;
    if (f === "pago")  return paidCount > 0 && !u.is_vip;
    if (f === "trial") return trialCount > 0 && !u.is_vip;
    if (f === "none")  return !u.is_vip && paidCount === 0 && trialCount === 0;
    return true;
  }

  const allFiltered = users
    .filter(u => {
      if (search) {
        const q = search.toLowerCase();
        if (!((u.nome||"").toLowerCase().includes(q) || (u.email||"").toLowerCase().includes(q) || (u.cpf||"").includes(q))) return false;
      }
      return userMatchesFilter(u, filter);
    })
    .sort((a, b) => {
      if (sortBy === "nome")    return (a.nome||"").localeCompare(b.nome||"", "pt");
      if (sortBy === "acessos") return (b.acessos?.filter(ac=>ac.status==="aprovado").length||0) - (a.acessos?.filter(ac=>ac.status==="aprovado").length||0);
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const totalPages = Math.ceil(allFiltered.length / PAGE_SIZE);
  const filtered   = allFiltered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  function filterCount(f) {
    return users.filter(u => {
      if (search) {
        const q = search.toLowerCase();
        if (!((u.nome||"").toLowerCase().includes(q)||(u.email||"").toLowerCase().includes(q)||(u.cpf||"").includes(q))) return false;
      }
      return userMatchesFilter(u, f);
    }).length;
  }

  function handleFilterChange(f) { setFilter(f); setPage(1); }
  function handleSearch(v)        { setSearch(v); setPage(1); }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Search + Sort */}
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        <input
          type="text"
          placeholder="Buscar por nome, email ou CPF..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          autoComplete="off"
          style={{flex:1,padding:"8px 12px",borderRadius:8,border:"1px solid #E2E8F0",fontSize:12,boxSizing:"border-box"}}
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{padding:"6px 10px",borderRadius:8,border:"1px solid #E2E8F0",fontSize:11,fontWeight:600,color:"#475569",cursor:"pointer",background:"#fff"}}
        >
          <option value="data">↓ Mais recentes</option>
          <option value="nome">A–Z Nome</option>
          <option value="acessos">↓ Mais pagantes</option>
        </select>
      </div>

      {/* Filter chips */}
      <div style={{display:"flex",gap:5,marginBottom:10,flexWrap:"wrap"}}>
        {[
          {key:"all",   label:"Todos"},
          {key:"vip",   label:"VIP"},
          {key:"pago",  label:"Pagante"},
          {key:"trial", label:"Trial"},
          {key:"none",  label:"Sem acesso"},
        ].map(f => {
          const cnt = filterCount(f.key);
          const active = filter === f.key;
          return (
            <button key={f.key} onClick={() => handleFilterChange(f.key)} style={{
              fontSize:10, fontWeight:700, border:"none", borderRadius:99, padding:"4px 10px",
              cursor:"pointer", transition:"all 0.12s",
              background: active ? "#0F172A" : "#F1F5F9",
              color: active ? "#fff" : "#64748B",
            }}>
              {f.label} <span style={{opacity:0.7}}>({cnt})</span>
            </button>
          );
        })}
        <span style={{fontSize:11,color:"#94A3B8",marginLeft:"auto",alignSelf:"center"}}>
          {allFiltered.length} usuário{allFiltered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* User list */}
      {filtered.map(user => {
        const expanded = expandedId === user.id;
        const acessos  = user.acessos || [];
        const paidCount  = acessos.filter(a => a.status === "aprovado").length;
        const trialCount = acessos.filter(a => a.status === "trial" && !isTrialExpired(a)).length;
        const isEditing  = editProfile?.userId === user.id;
        const isPwOpen   = pwUserId === user.id;
        const daysSince  = Math.floor((Date.now() - new Date(user.created_at)) / 86400000);

        return (
          <div key={user.id} style={{background:"#fff",borderRadius:10,border:"1px solid #E2E8F0",marginBottom:6,overflow:"hidden"}}>
            {/* Row */}
            <div
              onClick={() => { setExpandedId(expanded ? null : user.id); setEditProfile(null); setPwUserId(null); }}
              style={{padding:"9px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"background 0.1s"}}
              onMouseEnter={e => e.currentTarget.style.background="#F8FAFC"}
              onMouseLeave={e => e.currentTarget.style.background="#fff"}
            >
              {/* Avatar initial */}
              <div style={{
                width:30,height:30,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",
                background: user.is_vip ? "#F3E8FF" : "#F1F5F9",
                fontSize:12,fontWeight:800,color: user.is_vip ? "#7C3AED" : "#475569",
              }}>
                {(user.nome||user.email||"?")[0].toUpperCase()}
              </div>

              {/* Name + email */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:"#0F172A",display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                  {user.nome || <span style={{color:"#94A3B8",fontStyle:"italic"}}>Sem nome</span>}
                  {user.is_vip && <span style={{fontSize:9,fontWeight:700,color:"#7C3AED",background:"#F3E8FF",padding:"1px 6px",borderRadius:99}}>VIP</span>}
                  {user.referred_by && <span style={{fontSize:9,fontWeight:700,color:"#059669",background:"#F0FDF4",padding:"1px 6px",borderRadius:99}} title={`via ${user.referred_by}`}>ref</span>}
                </div>
                <div style={{fontSize:10,color:"#94A3B8",display:"flex",alignItems:"center",gap:6}}>
                  <span>{user.email}</span>
                  <button
                    onClick={e => { e.stopPropagation(); copyEmail(user.email); }}
                    style={{background:"none",border:"none",cursor:"pointer",color:"#CBD5E1",fontSize:10,padding:0}}
                    title="Copiar email"
                  >
                    {copiedId === user.email ? "✓" : "⎘"}
                  </button>
                </div>
              </div>

              {/* Access dots */}
              <div style={{display:"flex",gap:3,flexShrink:0}}>
                {MATERIAS_LIST.map(m => {
                  const ac = getAcesso(user, m);
                  const expired = isTrialExpired(ac);
                  const st = ac ? (expired ? null : ac.status) : null;
                  return (
                    <span key={m} title={`${MATERIA_SHORT[m]}: ${st || "sem acesso"}`} style={{
                      width:9,height:9,borderRadius:"50%",display:"inline-block",
                      background: STATUS_COLORS[st]?.color || "#D1D5DB",
                    }}/>
                  );
                })}
              </div>

              {/* Summary + date + arrow */}
              <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                <span style={{
                  fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99,
                  background: user.is_vip ? "#F3E8FF" : paidCount>0 ? "#DCFCE7" : trialCount>0 ? "#FEF3C7" : "#F1F5F9",
                  color: user.is_vip ? "#7C3AED" : paidCount>0 ? "#16A34A" : trialCount>0 ? "#92400E" : "#94A3B8",
                }}>
                  {user.is_vip ? "VIP" : paidCount>0 ? `${paidCount} pago` : trialCount>0 ? `${trialCount} trial` : "free"}
                </span>
                <span style={{fontSize:9,color:"#CBD5E1",whiteSpace:"nowrap"}}>
                  {daysSince === 0 ? "hoje" : daysSince === 1 ? "1d" : `${daysSince}d`}
                </span>
                <span style={{fontSize:12,color:"#CBD5E1"}}>{expanded ? "▼" : "▶"}</span>
              </div>
            </div>

            {/* Expanded */}
            {expanded && (
              <div onClick={e => e.stopPropagation()} style={{padding:"0 14px 14px",borderTop:"1px solid #F1F5F9"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1.6fr",gap:12,marginTop:12}}>

                  {/* ── LEFT: Profile + Actions ── */}
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>

                    {/* Profile */}
                    <div style={{background:"#F8FAFC",borderRadius:8,padding:10}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                        <span style={{fontSize:11,fontWeight:700,color:"#0F172A"}}>👤 Dados</span>
                        {!isEditing ? (
                          <button onClick={() => setEditProfile({userId:user.id,nome:user.nome||"",email:user.email||"",cpf:user.cpf||""})}
                            style={{...smallBtn,background:"#3B82F6",color:"#fff"}}>✏️ Editar</button>
                        ) : (
                          <div style={{display:"flex",gap:4}}>
                            <button onClick={handleSaveProfile} disabled={saving===`profile-${user.id}`}
                              style={{...smallBtn,background:"#16A34A",color:"#fff"}}>
                              {saving===`profile-${user.id}` ? "…" : "Salvar"}
                            </button>
                            <button onClick={() => setEditProfile(null)}
                              style={{...smallBtn,background:"#E2E8F0",color:"#475569"}}>✕</button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div style={{display:"grid",gap:6}}>
                          <div><label style={lbl}>Nome</label><input style={inpStyle} value={editProfile.nome} onChange={e=>setEditProfile(p=>({...p,nome:e.target.value}))} /></div>
                          <div><label style={lbl}>E-mail</label><input style={inpStyle} value={editProfile.email} onChange={e=>setEditProfile(p=>({...p,email:e.target.value}))} /></div>
                          <div><label style={lbl}>CPF</label><input style={inpStyle} value={editProfile.cpf} onChange={e=>setEditProfile(p=>({...p,cpf:e.target.value}))} /></div>
                        </div>
                      ) : (
                        <div style={{fontSize:11,display:"grid",gap:4}}>
                          <div style={{display:"flex",gap:4}}><span style={{color:"#94A3B8",width:44,flexShrink:0}}>Nome</span><span style={{fontWeight:600,color:"#0F172A"}}>{user.nome||"—"}</span></div>
                          <div style={{display:"flex",gap:4}}><span style={{color:"#94A3B8",width:44,flexShrink:0}}>Email</span><span style={{color:"#0F172A",wordBreak:"break-all",fontSize:10}}>{user.email||"—"}</span></div>
                          <div style={{display:"flex",gap:4}}><span style={{color:"#94A3B8",width:44,flexShrink:0}}>CPF</span><span style={{fontFamily:"monospace",color:"#0F172A",fontSize:10}}>{user.cpf ? user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,"$1.$2.$3-$4") : "—"}</span></div>
                          <div style={{display:"flex",gap:4}}><span style={{color:"#94A3B8",width:44,flexShrink:0}}>Desde</span><span style={{color:"#0F172A"}}>{new Date(user.created_at).toLocaleDateString("pt-BR")}</span></div>
                          {user.referred_by && <div style={{display:"flex",gap:4}}><span style={{color:"#94A3B8",width:44,flexShrink:0}}>Afil.</span><span style={{color:"#059669",fontWeight:700}}>{user.referred_by}</span></div>}
                          <div style={{display:"flex",gap:4}}><span style={{color:"#94A3B8",width:44,flexShrink:0}}>ID</span><span style={{color:"#CBD5E1",fontFamily:"monospace",fontSize:9,wordBreak:"break-all"}}>{user.id}</span></div>
                        </div>
                      )}
                    </div>

                    {/* Password */}
                    <div style={{background:"#FFF7ED",borderRadius:8,padding:10}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom: isPwOpen?8:0}}>
                        <span style={{fontSize:11,fontWeight:700,color:"#0F172A"}}>🔑 Senha</span>
                        {!isPwOpen ? (
                          <button onClick={() => { setPwUserId(user.id); setNewPassword(""); setPwMsg(null); }}
                            style={{...smallBtn,background:"#F59E0B",color:"#fff"}}>Gerenciar</button>
                        ) : (
                          <button onClick={() => { setPwUserId(null); setPwMsg(null); }}
                            style={{...smallBtn,background:"#E2E8F0",color:"#475569"}}>✕</button>
                        )}
                      </div>
                      {isPwOpen && (
                        <div>
                          <div style={{display:"flex",gap:6,marginBottom:6}}>
                            <div style={{position:"relative",flex:1}}>
                              <input type={showPw?"text":"password"} value={newPassword} onChange={e=>setNewPassword(e.target.value)}
                                placeholder="Nova senha (min 6)" autoComplete="new-password" style={{...inpStyle,paddingRight:30}} />
                              <button type="button" onClick={()=>setShowPw(s=>!s)}
                                style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#94A3B8",padding:0}}>
                                {showPw?"🙈":"👁️"}
                              </button>
                            </div>
                            <button type="button" onClick={() => handleSetPassword(user.id)} disabled={pwSaving||newPassword.length<6}
                              style={{...smallBtn,background:newPassword.length>=6?"#DC2626":"#E2E8F0",color:newPassword.length>=6?"#fff":"#94A3B8",padding:"3px 10px"}}>
                              {pwSaving?"…":"Definir"}
                            </button>
                          </div>
                          <button type="button" onClick={() => handleSendResetLink(user.email)} disabled={pwSaving}
                            style={{...smallBtn,background:"#3B82F6",color:"#fff",fontSize:10}}>
                            📧 Enviar link de reset
                          </button>
                          {pwMsg && (
                            <div style={{marginTop:6,fontSize:10,fontWeight:600,padding:"4px 8px",borderRadius:5,
                              background:pwMsg.type==="success"?"#DCFCE7":"#FEF2F2",color:pwMsg.type==="success"?"#16A34A":"#DC2626"}}>
                              {pwMsg.text}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* VIP + Delete */}
                    <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                      <button onClick={() => handleSetVip(user.id)} disabled={vipSaving===user.id}
                        style={{...smallBtn,background:user.is_vip?"#E2E8F0":"#7C3AED",color:user.is_vip?"#475569":"#fff",padding:"4px 10px"}}>
                        {vipSaving===user.id ? "…" : user.is_vip ? "✓ VIP" : "⭐ Dar VIP"}
                      </button>
                      <div style={{marginLeft:"auto"}}>
                        {deleteConfirm === user.id ? (
                          <div style={{display:"flex",gap:4,alignItems:"center",background:"#FEF2F2",borderRadius:6,padding:"4px 8px"}}>
                            <span style={{fontSize:10,color:"#DC2626",fontWeight:600}}>Confirmar exclusão?</span>
                            <button onClick={() => handleDeleteUser(user.id)} disabled={deleting}
                              style={{...smallBtn,background:"#DC2626",color:"#fff"}}>
                              {deleting?"…":"Excluir"}
                            </button>
                            <button onClick={() => {setDeleteConfirm(null);setDeleteMsg(null);}}
                              style={{...smallBtn,background:"#E2E8F0",color:"#475569"}}>✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(user.id)}
                            style={{...smallBtn,background:"#FEF2F2",color:"#DC2626",padding:"4px 10px"}}>
                            🗑️ Excluir
                          </button>
                        )}
                      </div>
                      {deleteMsg && (
                        <div style={{width:"100%",fontSize:10,fontWeight:600,padding:"4px 8px",borderRadius:5,marginTop:2,
                          background:"#FEF2F2",color:"#DC2626"}}>{deleteMsg.text}</div>
                      )}
                    </div>
                  </div>

                  {/* ── RIGHT: Matérias grid ── */}
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:"#0F172A",marginBottom:8}}>📚 Matérias e acessos</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                      {MATERIAS_LIST.map(m => {
                        const ac      = getAcesso(user, m);
                        const expired = isTrialExpired(ac);
                        const st      = ac ? (expired ? null : ac.status) : null;
                        const key     = `${user.id}-${m}`;
                        const isSaving= saving === key;
                        const stColor = STATUS_COLORS[st];

                        return (
                          <div key={m} style={{background:"#F8FAFC",borderRadius:7,padding:"8px 10px",border:"1px solid #E2E8F0"}}>
                            {/* Header */}
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                              <span style={{fontSize:11,fontWeight:700,color:"#0F172A"}}>
                                {MATERIA_ICONS[m]} {MATERIA_SHORT[m]}
                              </span>
                              <span style={{
                                fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:99,
                                background: stColor?.bg || "#F3F4F6",
                                color: stColor?.color || (expired?"#DC2626":"#6B7280"),
                              }}>
                                {expired ? "Exp." : stColor?.label || "–"}
                              </span>
                            </div>

                            {/* Grupo + trial date */}
                            {ac && (
                              <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:5}}>
                                <span style={{fontSize:9,color:"#94A3B8"}}>G:</span>
                                <select value={ac.grupo||1} onChange={e=>handleGrupoChange(user.id,m,parseInt(e.target.value),ac.status)}
                                  disabled={isSaving}
                                  style={{fontSize:10,padding:"1px 3px",borderRadius:4,border:"1px solid #D1D5DB",cursor:"pointer",background:"#fff"}}>
                                  {Array.from({length:10},(_,i)=>i+1).map(g=><option key={g} value={g}>{g}</option>)}
                                </select>
                                {ac.trial_expires_at && ac.status==="trial" && (
                                  <span style={{fontSize:9,color:expired?"#DC2626":"#64748B",marginLeft:2}}>
                                    {expired?"exp.": `até ${new Date(ac.trial_expires_at).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}`}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Actions */}
                            <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                              {!ac && <>
                                <button onClick={()=>handleStatusChange(user.id,m,"aprovado",1)} disabled={isSaving}
                                  style={{...smallBtn,background:"#16A34A",color:"#fff",padding:"2px 6px",fontSize:9}}>
                                  {isSaving?"…":"✓ Aprovar"}
                                </button>
                                <button onClick={()=>handleStatusChange(user.id,m,"trial",1)} disabled={isSaving}
                                  style={{...smallBtn,background:"#F59E0B",color:"#fff",padding:"2px 6px",fontSize:9}}>
                                  {isSaving?"…":"Trial 7d"}
                                </button>
                              </>}
                              {ac && st==="trial" && (
                                <button onClick={()=>handleStatusChange(user.id,m,"aprovado",ac.grupo||1)} disabled={isSaving}
                                  style={{...smallBtn,background:"#16A34A",color:"#fff",padding:"2px 6px",fontSize:9}}>
                                  {isSaving?"…":"✓ Aprovar"}
                                </button>
                              )}
                              {ac && (
                                <button onClick={()=>handleStatusChange(user.id,m,"remover",ac.grupo||1)} disabled={isSaving}
                                  style={{...smallBtn,background:"#FEF2F2",color:"#DC2626",padding:"2px 6px",fontSize:9}}>
                                  {isSaving?"…":"Remover"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{textAlign:"center",padding:28,color:"#94A3B8",fontSize:12}}>
          Nenhum usuário encontrado
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:10}}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
            style={{...smallBtn,background:page===1?"#F1F5F9":"#0F172A",color:page===1?"#94A3B8":"#fff",padding:"4px 10px"}}>
            ← Ant.
          </button>
          {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
            <button key={p} onClick={()=>setPage(p)}
              style={{...smallBtn,background:page===p?"#0F172A":"#F1F5F9",color:page===p?"#fff":"#64748B",padding:"4px 8px",
                fontWeight:page===p?800:600,minWidth:28}}>
              {p}
            </button>
          ))}
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
            style={{...smallBtn,background:page===totalPages?"#F1F5F9":"#0F172A",color:page===totalPages?"#94A3B8":"#fff",padding:"4px 10px"}}>
            Próx. →
          </button>
        </div>
      )}
    </div>
  );
}
