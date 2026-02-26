import { useState } from "react";
import { supabase } from "../supabase";
import { labelStyle } from "../constants";
import ErroBox from "./ErroBox";
import { validaCPF, formatCPF, cleanCPF } from "../lib/helpers";
import { registerSession } from "../lib/sessionGuard";
import { logEvent } from "../lib/logEvent";

export default function AuthScreen({ onAuth }) {
  const [tab,      setTab]      = useState("login");
  const [subTab,   setSubTab]   = useState("form");
  const [nome,     setNome]     = useState("");
  const [cpf,      setCpf]      = useState("");
  const [email,    setEmail]    = useState("");
  const [senha,    setSenha]    = useState("");
  const [confirma, setConfirma] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [erro,     setErro]     = useState("");
  const [sucesso,  setSucesso]  = useState("");
  const [showSenha,setShowSenha]= useState(false);

  function switchTab(t) { setTab(t); setSubTab("form"); setErro(""); setSucesso(""); setShowSenha(false); }

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !senha) return setErro("Preencha todos os campos.");
    setLoading(true); setErro("");
    const {data, error} = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(), password: senha,
    });
    if (error) {
      if (error.message?.toLowerCase().includes("not confirmed")) {
        setErro("E-mail não confirmado. Verifique sua caixa de entrada e a pasta de spam.");
      } else {
        setErro("E-mail ou senha incorretos. Verifique e tente novamente.");
      }
      setLoading(false); return;
    }
    const {data:prof} = await supabase.from("profiles").select("nome,cpf,email,is_vip,is_admin,referred_by").eq("id",data.user.id).single();
    await registerSession(data.user.id);
    logEvent("login");
    onAuth(data.session, prof);
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!nome.trim() || !cpf || !email.trim() || !senha || !confirma) return setErro("Preencha todos os campos.");
    if (!validaCPF(cpf)) return setErro("CPF inválido. Verifique os dígitos.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErro("E-mail inválido.");
    if (senha.length < 6) return setErro("Senha deve ter ao menos 6 caracteres.");
    if (senha !== confirma) return setErro("As senhas não conferem.");
    setLoading(true); setErro("");
    // Verificar se CPF já está cadastrado (evita criar auth user órfão)
    const { data: cpfDisponivel } = await supabase.rpc("check_cpf_disponivel", { p_cpf: cleanCPF(cpf) });
    if (cpfDisponivel === false) {
      setErro("Este CPF já está cadastrado. Tente fazer login.");
      setLoading(false); return;
    }
    const {data, error} = await supabase.auth.signUp({
      email: email.trim().toLowerCase(), password: senha,
    });
    if (error) {
      if (error.message.includes("already")) setErro("E-mail já cadastrado. Tente fazer login.");
      else setErro(error.message);
      setLoading(false); return;
    }
    const {error:profErr} = await supabase.from("profiles").insert({
      id:data.user.id, nome:nome.trim(), cpf:cleanCPF(cpf), email:email.trim().toLowerCase(),
    });
    if (profErr) {
      await supabase.auth.signOut();
      setErro("Erro ao criar perfil. CPF ou e-mail pode já estar em uso.");
      setLoading(false); return;
    }
    await registerSession(data.user.id);
    // Aplicar código de afiliado se veio de um link de referral
    const storedRef = localStorage.getItem("referral_code");
    if (storedRef) {
      await supabase.rpc("apply_referral", { p_code: storedRef }).catch(() => {});
      localStorage.removeItem("referral_code");
    }
    logEvent("signup", { referred_by: storedRef || null });
    onAuth(data.session, {nome:nome.trim(), cpf:cleanCPF(cpf), email:email.trim().toLowerCase()});
  }

  async function handleForgot(e) {
    e.preventDefault();
    if (!resetEmail.trim()) return setErro("Informe seu e-mail.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) return setErro("E-mail inválido.");
    setLoading(true); setErro("");
    const {error} = await supabase.auth.resetPasswordForEmail(resetEmail.trim().toLowerCase(), {
      redirectTo: window.location.origin + "?reset=1",
    });
    setLoading(false);
    if (error) { setErro("Erro ao enviar link. Tente novamente."); return; }
    setSucesso("✓ Link de recuperação enviado para " + resetEmail.trim().toLowerCase());
  }

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0F172A 0%,#1E3A5F 50%,#0F172A 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:440}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:8}}>🩺</div>
          <h1 style={{fontSize:26,fontWeight:900,color:"#fff",letterSpacing:"-0.5px"}}>Cronograma Internato Módulo 1</h1>
          <p style={{fontSize:14,color:"#94A3B8",marginTop:4}}>Internato Médico · 2026</p>
        </div>

        <div className="auth-box" style={{background:"#fff",borderRadius:20,padding:"32px 28px",boxShadow:"0 25px 50px rgba(0,0,0,0.35)"}}>
          <div style={{display:"flex",background:"#F1F5F9",borderRadius:10,padding:4,marginBottom:28,gap:4}}>
            {["login","cadastro"].map(t=>(
              <button key={t} className={`tab${tab===t?" active":""}`} style={{flex:1}} onClick={()=>switchTab(t)}>
                {t==="login"?"Entrar":"Criar conta"}
              </button>
            ))}
          </div>

          {tab==="login" && subTab==="form" && (
            <form onSubmit={handleLogin} style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={labelStyle}>E-mail</label>
                <input className="input-field" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" autoFocus/>
              </div>
              <div>
                <label style={labelStyle}>Senha</label>
                <div style={{position:"relative"}}>
                  <input className="input-field" type={showSenha?"text":"password"} value={senha} onChange={e=>setSenha(e.target.value)} placeholder="••••••••" autoCapitalize="none" autoCorrect="off" style={{paddingRight:44}}/>
                  <button type="button" onClick={()=>setShowSenha(s=>!s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#94A3B8",padding:4}}>{showSenha?"🙈":"👁️"}</button>
                </div>
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
              <div>
                <label style={labelStyle}>E-mail <span style={{fontSize:11,color:"#94A3B8",fontWeight:400}}>(para login e recuperação de senha)</span></label>
                <input className="input-field" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com"/>
              </div>
              <div>
                <label style={labelStyle}>Senha</label>
                <div style={{position:"relative"}}>
                  <input className="input-field" type={showSenha?"text":"password"} value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" autoCapitalize="none" autoCorrect="off" style={{paddingRight:44}}/>
                  <button type="button" onClick={()=>setShowSenha(s=>!s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#94A3B8",padding:4}}>{showSenha?"🙈":"👁️"}</button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Confirmar senha</label>
                <input className={`input-field${confirma&&confirma!==senha?" error":""}`} type="password" value={confirma} onChange={e=>setConfirma(e.target.value)} placeholder="Repita a senha" autoCapitalize="none" autoCorrect="off"/>
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
