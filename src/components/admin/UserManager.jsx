import { useState } from "react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../../supabase";

const MATERIAS_LIST = ["ped","cm","go","cc","emg","sim"];
const MATERIA_LABELS = {ped:"Pediatria",cm:"Clínica Médica",go:"GO",cc:"Clínica Cirúrgica",emg:"Emergência",sim:"Simulação"};
const MATERIA_SHORT = {ped:"PED",cm:"CM",go:"GO",cc:"CC",emg:"EMG",sim:"SIM"};
const STATUS_COLORS = {
  aprovado: {bg:"#DCFCE7",color:"#16A34A",label:"Aprovado"},
  trial:    {bg:"#FEF3C7",color:"#92400E",label:"Trial"},
  pending:  {bg:"#FFF7ED",color:"#C2410C",label:"Pendente"},
};

const lbl = {fontSize:11,fontWeight:600,color:"#64748B",display:"block",marginBottom:3};
const inpStyle = {width:"100%",padding:"7px 10px",borderRadius:6,border:"1px solid #E2E8F0",fontSize:12,boxSizing:"border-box"};
const smallBtn = {fontSize:10,fontWeight:700,border:"none",borderRadius:4,padding:"4px 10px",cursor:"pointer",transition:"all 0.12s"};

export default function UserManager({ users: initialUsers, onRefresh, initialSearch = "" }) {
  const [users, setUsers] = useState(initialUsers || []);
  const [search, setSearch] = useState(initialSearch);
  const [expandedId, setExpandedId] = useState(null);
  const [saving, setSaving] = useState(null);
  const [vipSaving, setVipSaving] = useState(null);

  // Editing profile
  const [editProfile, setEditProfile] = useState(null); // {userId, nome, email, cpf}

  // Password management
  const [pwUserId, setPwUserId] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null); // {type:"success"|"error", text}

  // Delete user
  const [deleteConfirm, setDeleteConfirm] = useState(null); // userId or null
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState(null);

  async function reload() {
    const { data } = await supabase.rpc("admin_list_users");
    if (data) setUsers(data);
  }

  async function handleStatusChange(userId, materia, newStatus, grupo = 1) {
    const key = `${userId}-${materia}`;
    setSaving(key);
    try {
      await supabase.rpc("admin_update_acesso", {
        p_user_id: userId, p_materia: materia, p_status: newStatus, p_grupo: grupo,
      });
      await reload();
    } catch (err) {
      console.error("admin_update_acesso:", err.message);
    }
    setSaving(null);
  }

  async function handleGrupoChange(userId, materia, newGrupo, currentStatus) {
    const key = `${userId}-${materia}`;
    setSaving(key);
    try {
      await supabase.rpc("admin_update_acesso", {
        p_user_id: userId, p_materia: materia, p_status: currentStatus, p_grupo: newGrupo,
      });
      await reload();
    } catch (err) {
      console.error("handleGrupoChange:", err.message);
    }
    setSaving(null);
  }

  async function handleSetVip(userId) {
    setVipSaving(userId);
    try {
      await supabase.rpc("admin_set_vip", { p_user_id: userId });
      await reload();
    } catch (err) {
      console.error("admin_set_vip:", err.message);
    }
    setVipSaving(null);
  }

  // Save profile edits
  async function handleSaveProfile() {
    if (!editProfile) return;
    setSaving(`profile-${editProfile.userId}`);
    try {
      await supabase.rpc("admin_update_profile", {
        p_user_id: editProfile.userId,
        p_nome: editProfile.nome || null,
        p_email: editProfile.email || null,
        p_cpf: editProfile.cpf || null,
      });
      await reload();
      setEditProfile(null);
    } catch (err) {
      console.error("admin_update_profile:", err.message);
    }
    setSaving(null);
  }

  // Set password directly via edge function
  async function handleSetPassword(userId) {
    if (newPassword.length < 6) {
      setPwMsg({type:"error",text:"Mínimo 6 caracteres"});
      return;
    }
    setPwSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/admin-reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ userId, newPassword }),
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || `Erro ${resp.status}`);
      }
      setPwMsg({type:"success",text:"Senha alterada com sucesso!"});
      setNewPassword("");
      setShowPw(false);
    } catch (err) {
      setPwMsg({type:"error",text:err.message});
    }
    setPwSaving(false);
    setTimeout(() => setPwMsg(null), 4000);
  }

  // Send reset link
  async function handleSendResetLink(email) {
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "?reset=1",
      });
      if (error) throw error;
      setPwMsg({type:"success",text:"Link de reset enviado para " + email});
    } catch (err) {
      setPwMsg({type:"error",text:err.message});
    }
    setPwSaving(false);
    setTimeout(() => setPwMsg(null), 4000);
  }

  async function handleDeleteUser(userId) {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/admin-delete-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ userId }),
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || `Erro ${resp.status}`);
      }
      setDeleteConfirm(null);
      setExpandedId(null);
      await reload();
      if (onRefresh) await onRefresh();
    } catch (err) {
      setDeleteMsg({ type: "error", text: err.message });
      setTimeout(() => setDeleteMsg(null), 4000);
    }
    setDeleting(false);
  }

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.nome||"").toLowerCase().includes(q) ||
           (u.email||"").toLowerCase().includes(q) ||
           (u.cpf||"").includes(q);
  });

  function getAcesso(user, materia) {
    return (user.acessos || []).find(a => a.materia === materia);
  }

  function isTrialExpired(acesso) {
    if (acesso?.status !== "trial") return false;
    return !acesso.trial_expires_at || new Date(acesso.trial_expires_at) < new Date();
  }

  return (
    <div>
      {/* Search */}
      <div style={{marginBottom:14}}>
        <input
          type="text"
          placeholder="Buscar por nome, email ou CPF..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoComplete="off"
          style={{width:"100%",padding:"10px 14px",borderRadius:8,border:"1px solid #E2E8F0",fontSize:13,boxSizing:"border-box"}}
        />
      </div>

      <div style={{fontSize:11,color:"#64748B",marginBottom:10}}>{filtered.length} de {users.length} usuários</div>

      {/* User list */}
      {filtered.map(user => {
        const expanded = expandedId === user.id;
        const acessos = user.acessos || [];
        const paidCount = acessos.filter(a => a.status === "aprovado").length;
        const trialCount = acessos.filter(a => a.status === "trial" && !isTrialExpired(a)).length;
        const isEditing = editProfile?.userId === user.id;
        const isPwOpen = pwUserId === user.id;

        return (
          <div key={user.id} style={{background:"#fff",borderRadius:10,border:"1px solid #E2E8F0",marginBottom:8,overflow:"hidden"}}>
            {/* Row header */}
            <div
              onClick={() => { setExpandedId(expanded ? null : user.id); setEditProfile(null); setPwUserId(null); }}
              style={{padding:"12px 16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"background 0.15s"}}
            >
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:"#0F172A",marginBottom:2}}>
                  {user.nome || "Sem nome"}
                  {user.is_vip && <span style={{fontSize:9,fontWeight:700,color:"#7C3AED",background:"#F3E8FF",padding:"1px 6px",borderRadius:99,marginLeft:6}}>VIP</span>}
                  {user.referred_by && <span style={{fontSize:9,fontWeight:700,color:"#059669",background:"#F0FDF4",padding:"1px 6px",borderRadius:99,marginLeft:6}} title={`Indicado por: ${user.referred_by}`}>ref: {user.referred_by}</span>}
                </div>
                <div style={{fontSize:11,color:"#64748B"}}>{user.email}</div>
              </div>
              <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0,marginLeft:12}}>
                {MATERIAS_LIST.map(m => {
                  const ac = getAcesso(user, m);
                  const expired = isTrialExpired(ac);
                  const st = ac ? (expired ? null : ac.status) : null;
                  const style = st ? STATUS_COLORS[st] : null;
                  return (
                    <span key={m} title={`${MATERIA_SHORT[m]}: ${st || "sem acesso"}`} style={{
                      width:8,height:8,borderRadius:"50%",display:"inline-block",
                      background: style ? style.color : "#D1D5DB",
                    }}/>
                  );
                })}
                <span style={{fontSize:10,color:"#94A3B8",marginLeft:4,width:50,textAlign:"right"}}>
                  {paidCount > 0 ? `${paidCount} pago` : trialCount > 0 ? `${trialCount} trial` : "—"}
                </span>
                <span style={{fontSize:14,color:"#94A3B8",marginLeft:4}}>{expanded ? "▼" : "▶"}</span>
              </div>
            </div>

            {/* Expanded detail */}
            {expanded && (
              <div onClick={e => e.stopPropagation()} style={{padding:"0 16px 16px",borderTop:"1px solid #F1F5F9"}}>

                {/* === PROFILE SECTION === */}
                <div style={{background:"#F8FAFC",borderRadius:8,padding:14,margin:"12px 0"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#0F172A"}}>👤 Dados do usuário</div>
                    {!isEditing ? (
                      <button onClick={(e) => { e.stopPropagation(); setEditProfile({userId:user.id,nome:user.nome||"",email:user.email||"",cpf:user.cpf||""}); }}
                        style={{...smallBtn,background:"#3B82F6",color:"#fff"}}>
                        ✏️ Editar
                      </button>
                    ) : (
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={handleSaveProfile} disabled={saving===`profile-${user.id}`}
                          style={{...smallBtn,background:"#16A34A",color:"#fff"}}>
                          {saving===`profile-${user.id}` ? "..." : "Salvar"}
                        </button>
                        <button onClick={() => setEditProfile(null)}
                          style={{...smallBtn,background:"#E2E8F0",color:"#475569"}}>
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div style={{display:"grid",gap:8}}>
                      <div>
                        <label style={lbl}>Nome</label>
                        <input style={inpStyle} value={editProfile.nome} onChange={e => setEditProfile(p=>({...p,nome:e.target.value}))} />
                      </div>
                      <div>
                        <label style={lbl}>E-mail</label>
                        <input style={inpStyle} value={editProfile.email} onChange={e => setEditProfile(p=>({...p,email:e.target.value}))} />
                      </div>
                      <div>
                        <label style={lbl}>CPF</label>
                        <input style={inpStyle} value={editProfile.cpf} onChange={e => setEditProfile(p=>({...p,cpf:e.target.value}))} />
                      </div>
                    </div>
                  ) : (
                    <div style={{display:"grid",gap:6,fontSize:12}}>
                      <div><span style={{color:"#94A3B8",width:50,display:"inline-block"}}>Nome:</span> <span style={{color:"#0F172A",fontWeight:600}}>{user.nome || "—"}</span></div>
                      <div><span style={{color:"#94A3B8",width:50,display:"inline-block"}}>Email:</span> <span style={{color:"#0F172A",fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{user.email || "—"}</span></div>
                      <div><span style={{color:"#94A3B8",width:50,display:"inline-block"}}>CPF:</span> <span style={{color:"#0F172A",fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{user.cpf ? user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : "—"}</span></div>
                      <div><span style={{color:"#94A3B8",width:50,display:"inline-block"}}>Desde:</span> <span style={{color:"#0F172A"}}>{new Date(user.created_at).toLocaleDateString("pt-BR")}</span></div>
                      {user.referred_by && (
                        <div><span style={{color:"#94A3B8",width:50,display:"inline-block"}}>Afiliado:</span> <span style={{color:"#059669",fontWeight:700}}>{user.referred_by}</span></div>
                      )}
                      <div><span style={{color:"#94A3B8",width:50,display:"inline-block"}}>ID:</span> <span style={{color:"#94A3B8",fontFamily:"'JetBrains Mono',monospace",fontSize:9}}>{user.id}</span></div>
                    </div>
                  )}
                </div>

                {/* === PASSWORD SECTION === */}
                <div style={{background:"#FFF7ED",borderRadius:8,padding:14,marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#0F172A"}}>🔑 Senha</div>
                    {!isPwOpen && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); setPwUserId(user.id); setNewPassword(""); setPwMsg(null); }}
                        style={{...smallBtn,background:"#F59E0B",color:"#fff"}}>
                        Gerenciar
                      </button>
                    )}
                  </div>
                  <div style={{fontSize:11,color:"#92400E",marginBottom:isPwOpen?10:0}}>
                    Senhas são criptografadas e não podem ser visualizadas.
                  </div>

                  {isPwOpen && (
                    <div style={{borderTop:"1px solid #FED7AA",paddingTop:10}}>
                      <div style={{marginBottom:10}}>
                        <label style={lbl}>Definir nova senha</label>
                        <div style={{display:"flex",gap:6}}>
                          <div style={{position:"relative",flex:1}}>
                            <input
                              type={showPw?"text":"password"}
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                              placeholder="Mínimo 6 caracteres"
                              autoComplete="new-password"
                              style={{...inpStyle,paddingRight:36}}
                            />
                            <button type="button" onClick={()=>setShowPw(s=>!s)}
                              style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#94A3B8",padding:2}}>
                              {showPw?"🙈":"👁️"}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSetPassword(user.id)}
                            disabled={pwSaving || newPassword.length < 6}
                            style={{...smallBtn,background:newPassword.length>=6?"#DC2626":"#E2E8F0",color:newPassword.length>=6?"#fff":"#94A3B8",whiteSpace:"nowrap",padding:"4px 14px"}}
                          >
                            {pwSaving ? "..." : "Definir"}
                          </button>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <button
                          type="button"
                          onClick={() => handleSendResetLink(user.email)}
                          disabled={pwSaving}
                          style={{...smallBtn,background:"#3B82F6",color:"#fff"}}
                        >
                          📧 Enviar link de reset por e-mail
                        </button>
                        <button type="button" onClick={() => { setPwUserId(null); setPwMsg(null); }}
                          style={{...smallBtn,background:"#E2E8F0",color:"#475569"}}>
                          Fechar
                        </button>
                      </div>
                      {pwMsg && (
                        <div style={{marginTop:8,fontSize:11,fontWeight:600,padding:"6px 10px",borderRadius:6,
                          background:pwMsg.type==="success"?"#DCFCE7":"#FEF2F2",
                          color:pwMsg.type==="success"?"#16A34A":"#DC2626"}}>
                          {pwMsg.text}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* === VIP + ACTIONS === */}
                <div style={{display:"flex",gap:6,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
                  <button
                    onClick={() => handleSetVip(user.id)}
                    disabled={vipSaving === user.id}
                    style={{...smallBtn,background:user.is_vip?"#E2E8F0":"#7C3AED",color:user.is_vip?"#475569":"#fff"}}
                  >
                    {vipSaving === user.id ? "..." : user.is_vip ? "Já é VIP ✓" : "⭐ Dar VIP (todas)"}
                  </button>
                  <div style={{marginLeft:"auto"}}>
                    {deleteConfirm === user.id ? (
                      <div style={{display:"flex",gap:4,alignItems:"center",background:"#FEF2F2",borderRadius:6,padding:"4px 10px"}}>
                        <span style={{fontSize:10,color:"#DC2626",fontWeight:600}}>Excluir permanentemente?</span>
                        <button onClick={() => handleDeleteUser(user.id)} disabled={deleting}
                          style={{...smallBtn,background:"#DC2626",color:"#fff"}}>
                          {deleting ? "Excluindo..." : "Confirmar"}
                        </button>
                        <button onClick={() => { setDeleteConfirm(null); setDeleteMsg(null); }}
                          style={{...smallBtn,background:"#E2E8F0",color:"#475569"}}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(user.id)}
                        style={{...smallBtn,background:"#FEF2F2",color:"#DC2626"}}
                      >
                        🗑️ Excluir usuário
                      </button>
                    )}
                  </div>
                  {deleteMsg && deleteConfirm === user.id && (
                    <div style={{width:"100%",fontSize:11,fontWeight:600,padding:"6px 10px",borderRadius:6,marginTop:4,
                      background:deleteMsg.type==="success"?"#DCFCE7":"#FEF2F2",
                      color:deleteMsg.type==="success"?"#16A34A":"#DC2626"}}>
                      {deleteMsg.text}
                    </div>
                  )}
                </div>

                {/* === MATERIAS / ACESSOS === */}
                <div style={{fontSize:12,fontWeight:700,color:"#0F172A",marginBottom:8}}>📚 Matérias e acessos</div>
                <div style={{display:"grid",gap:6}}>
                  {MATERIAS_LIST.map(m => {
                    const ac = getAcesso(user, m);
                    const expired = isTrialExpired(ac);
                    const currentStatus = ac?.status || "nenhum";
                    const key = `${user.id}-${m}`;
                    const isSaving = saving === key;

                    return (
                      <div key={m} style={{
                        display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",
                        padding:"10px 12px",background:"#F8FAFC",borderRadius:8,
                      }}>
                        {/* Matéria name */}
                        <div style={{width:90,flexShrink:0}}>
                          <div style={{fontSize:12,fontWeight:700,color:"#0F172A"}}>{MATERIA_SHORT[m]}</div>
                          <div style={{fontSize:9,color:"#94A3B8"}}>{MATERIA_LABELS[m]}</div>
                        </div>

                        {/* Status badge */}
                        <span style={{
                          fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,flexShrink:0,
                          background: STATUS_COLORS[currentStatus]?.bg || "#F3F4F6",
                          color: STATUS_COLORS[currentStatus]?.color || (expired ? "#DC2626" : "#6B7280"),
                        }}>
                          {expired ? "Expirado" : STATUS_COLORS[currentStatus]?.label || "Sem acesso"}
                        </span>

                        {/* Grupo selector */}
                        {ac && (
                          <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                            <span style={{fontSize:10,color:"#64748B"}}>Grupo:</span>
                            <select
                              value={ac.grupo || 1}
                              onChange={e => handleGrupoChange(user.id, m, parseInt(e.target.value), ac.status)}
                              disabled={isSaving}
                              style={{fontSize:11,padding:"2px 4px",borderRadius:4,border:"1px solid #D1D5DB",cursor:"pointer",background:"#fff"}}
                            >
                              {Array.from({length:10},(_,i)=>i+1).map(g => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Trial info */}
                        {ac?.trial_expires_at && ac.status === "trial" && (
                          <span style={{fontSize:9,color: expired ? "#DC2626" : "#64748B",flexShrink:0}}>
                            {expired ? "expirou" : `até ${new Date(ac.trial_expires_at).toLocaleDateString("pt-BR")}`}
                          </span>
                        )}

                        {/* Action buttons */}
                        <div style={{marginLeft:"auto",display:"flex",gap:4,flexShrink:0}}>
                          {/* Sem acesso → pode Aprovar ou dar Trial */}
                          {!ac && (
                            <>
                              <button onClick={() => handleStatusChange(user.id, m, "aprovado", 1)}
                                disabled={isSaving}
                                style={{...smallBtn,background:"#16A34A",color:"#fff"}}>
                                {isSaving ? "..." : "Aprovar"}
                              </button>
                              <button onClick={() => handleStatusChange(user.id, m, "trial", 1)}
                                disabled={isSaving}
                                style={{...smallBtn,background:"#F59E0B",color:"#fff"}}>
                                {isSaving ? "..." : "Trial 7d"}
                              </button>
                            </>
                          )}
                          {/* Trial ou expirado → pode Aprovar ou Remover */}
                          {ac && currentStatus === "trial" && (
                            <button onClick={() => handleStatusChange(user.id, m, "aprovado", ac.grupo || 1)}
                              disabled={isSaving}
                              style={{...smallBtn,background:"#16A34A",color:"#fff"}}>
                              {isSaving ? "..." : "Aprovar"}
                            </button>
                          )}
                          {/* Aprovado → só pode Remover */}
                          {ac && (
                            <button onClick={() => handleStatusChange(user.id, m, "remover", ac.grupo || 1)}
                              disabled={isSaving}
                              style={{...smallBtn,background:"#EF4444",color:"#fff"}}>
                              {isSaving ? "..." : "Remover"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{textAlign:"center",padding:32,color:"#94A3B8",fontSize:13}}>
          Nenhum usuário encontrado
        </div>
      )}
    </div>
  );
}
