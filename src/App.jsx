import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { supabase } from "./supabase";
import { MATERIAS } from "./scheduleData";
import { heartbeat, endSession, getSessionToken, registerSession } from "./lib/sessionGuard";
import { logEvent } from "./lib/logEvent";
import SupportButton from "./components/SupportButton";

const AuthScreen   = lazy(() => import("./components/AuthScreen"));
const Dashboard    = lazy(() => import("./components/Dashboard"));
const ScheduleView = lazy(() => import("./components/ScheduleView"));
const AdminPanel   = lazy(() => import("./components/AdminPanel"));

function LoadingScreen() {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0F172A"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>🩺</div>
        <div style={{fontSize:14,color:"#64748B"}}>Carregando…</div>
      </div>
    </div>
  );
}

export default function App() {
  const [session,    setSession]    = useState(null);
  const [profile,    setProfile]    = useState(null);
  const [view,       setView]       = useState("loading");
  const [selMateria, setSelMateria] = useState(null);
  const [selGrupo,   setSelGrupo]   = useState(null);
  const [kicked,     setKicked]     = useState(false);
  const [resetPw,    setResetPw]    = useState({pass:"",confirm:"",err:"",loading:false,success:false});
  const [showNewPw,  setShowNewPw]  = useState(false);
  const heartbeatRef = useRef(null);

  // Capturar código de afiliado da URL (?ref=CODE)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get("ref");
    if (refCode) {
      localStorage.setItem("referral_code", refCode.toLowerCase().trim());
      // Limpar ?ref= da URL sem afetar outros params
      urlParams.delete("ref");
      const newSearch = urlParams.toString();
      const newUrl = window.location.pathname + (newSearch ? "?" + newSearch : "") + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Session restore + payment fallback
  useEffect(()=>{
    supabase.auth.getSession().then(async ({data:{session}}) => {
      if (session) {
        // Check for password recovery flow (user clicked reset link in email)
        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
          setSession(session);
          setView("reset-password");
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }
        const {data:prof} = await supabase.from("profiles").select("nome,cpf,email,is_vip,is_admin,referred_by").eq("id",session.user.id).single();
        setSession(session); setProfile(prof);

        // Se não tem token de sessão no localStorage, registrar nova sessão
        if (!getSessionToken()) {
          await registerSession(session.user.id);
        }

        // After payment return: wait for webhook to process, then navigate
        // Suporta status=approved (cartão) e status=pending (PIX aguardando confirmação)
        const params = new URLSearchParams(window.location.search);
        const status = params.get("status");
        const extRef = params.get("external_reference");
        if ((status==="approved" || status==="pending") && extRef) {
          const [uid, matId, grp] = extRef.split("|");
          if (uid===session.user.id) {
            window.history.replaceState({},document.title,window.location.pathname);
            const mat = MATERIAS.find(m=>m.id===matId);
            if (mat) {
              // Poll até o webhook processar (max 30s para PIX que pode demorar mais)
              const maxPolls = status === "pending" ? 20 : 10;
              for (let i = 0; i < maxPolls; i++) {
                const {data:ac} = await supabase.from("acessos").select("status").eq("user_id",uid).eq("materia",matId).single();
                if (ac?.status === "aprovado") break;
                await new Promise(r => setTimeout(r, 1500));
              }
              setSelMateria(mat); setSelGrupo(parseInt(grp)); setView("schedule"); return;
            }
          }
        }

        // After subscription return: poll until authorized, then go to dashboard
        const subStatus = params.get("subscription");
        if (subStatus === "pending") {
          window.history.replaceState({}, document.title, window.location.pathname);
          for (let i = 0; i < 20; i++) {
            const {data: sub} = await supabase.from("subscriptions").select("status")
              .eq("user_id", session.user.id).maybeSingle();
            if (sub?.status === "authorized") break;
            await new Promise(r => setTimeout(r, 1500));
          }
        }

        setView("dashboard");
      } else {
        setView("auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === "PASSWORD_RECOVERY") {
        setSession(sess);
        setView("reset-password");
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      if (!sess) { setSession(null); setProfile(null); setView("auth"); }
      else if (event === "TOKEN_REFRESHED") { setSession(sess); }
    });
    return () => subscription.unsubscribe();
  },[]);

  // Heartbeat: verifica a cada 30s se a sessão ainda é válida
  useEffect(()=>{
    if (view === "auth" || view === "loading" || !session) {
      clearInterval(heartbeatRef.current);
      return;
    }

    // Heartbeat imediato ao entrar
    heartbeat(session.user.id).then(result => {
      if (!result.valid) handleKicked();
    });

    heartbeatRef.current = setInterval(async () => {
      const result = await heartbeat(session.user.id);
      if (!result.valid) handleKicked();
    }, 30000);

    return () => clearInterval(heartbeatRef.current);
  },[view, session]);

  async function handleKicked() {
    clearInterval(heartbeatRef.current);
    logEvent("session_kicked");
    setKicked(true);
    await supabase.auth.signOut();
  }

  async function handleLogout() {
    logEvent("logout");
    await endSession();
    await supabase.auth.signOut();
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (resetPw.pass.length < 6) { setResetPw(p=>({...p,err:"A senha deve ter pelo menos 6 caracteres."})); return; }
    if (resetPw.pass !== resetPw.confirm) { setResetPw(p=>({...p,err:"As senhas não conferem."})); return; }
    setResetPw(p=>({...p,loading:true,err:""}));
    const {error} = await supabase.auth.updateUser({password:resetPw.pass});
    if (error) { setResetPw(p=>({...p,loading:false,err:error.message})); return; }
    setResetPw(p=>({...p,loading:false,success:true}));
  }

  if (view==="loading") return <LoadingScreen/>;

  // Tela de sessão expirada
  if (kicked) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0F172A",padding:24}}>
      <div style={{textAlign:"center",maxWidth:400}}>
        <div style={{fontSize:48,marginBottom:16}}>🔒</div>
        <h2 style={{fontSize:20,fontWeight:800,color:"#fff",marginBottom:8}}>Sessão encerrada</h2>
        <p style={{fontSize:14,color:"#94A3B8",lineHeight:1.5,marginBottom:24}}>
          Foi detectado um login em outro dispositivo. Por segurança, sua sessão neste dispositivo foi encerrada.
        </p>
        <button className="btn btn-dark" style={{padding:"12px 32px",fontSize:15}}
          onClick={() => { setKicked(false); setView("auth"); }}>
          Fazer login novamente
        </button>
      </div>
    </div>
  );

  if (view==="reset-password") return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0F172A 0%,#1E3A5F 50%,#0F172A 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:440}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:8}}>🔑</div>
          <h1 style={{fontSize:22,fontWeight:800,color:"#fff"}}>Redefinir sua senha</h1>
          <p style={{fontSize:14,color:"#94A3B8",marginTop:8}}>Digite sua nova senha abaixo.</p>
        </div>
        <div className="auth-box" style={{background:"#fff",borderRadius:20,padding:"32px 28px",boxShadow:"0 25px 50px rgba(0,0,0,0.35)"}}>
          {resetPw.success ? (
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:48,marginBottom:12}}>✅</div>
              <div style={{fontSize:18,fontWeight:800,color:"#0F172A",marginBottom:8}}>Senha redefinida!</div>
              <p style={{fontSize:14,color:"#64748B",marginBottom:20}}>Sua senha foi alterada com sucesso. Faça login com a nova senha.</p>
              <button className="btn btn-dark" style={{width:"100%"}} onClick={async()=>{
                await supabase.auth.signOut();
                setResetPw({pass:"",confirm:"",err:"",loading:false,success:false});
                setShowNewPw(false);
                setView("auth");
              }}>
                Fazer login →
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:"#475569",display:"block",marginBottom:6}}>Nova senha</label>
                <div style={{position:"relative"}}>
                  <input className="input-field" type={showNewPw?"text":"password"} value={resetPw.pass}
                    onChange={e=>setResetPw(p=>({...p,pass:e.target.value,err:""}))}
                    placeholder="Mínimo 6 caracteres" autoFocus autoCapitalize="none" autoCorrect="off"
                    style={{paddingRight:44}}/>
                  <button type="button" onClick={()=>setShowNewPw(s=>!s)}
                    style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#94A3B8",padding:4}}>
                    {showNewPw?"🙈":"👁️"}
                  </button>
                </div>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:"#475569",display:"block",marginBottom:6}}>Confirmar nova senha</label>
                <input className="input-field" type="password" value={resetPw.confirm}
                  onChange={e=>setResetPw(p=>({...p,confirm:e.target.value,err:""}))}
                  placeholder="Repita a nova senha" autoCapitalize="none" autoCorrect="off"/>
              </div>
              {resetPw.confirm && resetPw.confirm!==resetPw.pass && (
                <div style={{fontSize:12,color:"#EF4444"}}>As senhas não conferem.</div>
              )}
              {resetPw.err && <div style={{color:"#EF4444",fontSize:13,background:"#FEF2F2",padding:"10px 14px",borderRadius:8}}>{resetPw.err}</div>}
              <button className="btn btn-dark" style={{width:"100%",marginTop:4}} disabled={resetPw.loading}>
                {resetPw.loading?"Salvando…":"Salvar nova senha →"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Suspense fallback={<LoadingScreen/>}>
        {view==="auth" && (
          <AuthScreen onAuth={(fullSession, prof) => { setSession(fullSession); setProfile(prof); setView("dashboard"); }}/>
        )}
        {view==="dashboard" && (
          <Dashboard
            user={session.user}
            profile={profile}
            session={session}
            onSelect={(mat,grp) => { setSelMateria(mat); setSelGrupo(grp); setView("schedule"); }}
            onLogout={handleLogout}
            onAdmin={() => setView("admin")}
          />
        )}
        {view==="admin" && (
          <AdminPanel onBack={() => setView("dashboard")} />
        )}
        {view==="schedule" && selMateria && (
          <ScheduleView
            user={session.user}
            profile={profile}
            materia={selMateria}
            grupo={selGrupo}
            onBack={() => setView("dashboard")}
            onChangeGrupo={(g) => setSelGrupo(g)}
          />
        )}
      </Suspense>
      {session && !kicked && view !== "auth" && (
        <SupportButton user={session.user} profile={profile} />
      )}
    </>
  );
}
