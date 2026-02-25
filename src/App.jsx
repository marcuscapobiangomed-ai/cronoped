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
  const heartbeatRef = useRef(null);

  // Session restore + payment fallback
  useEffect(()=>{
    supabase.auth.getSession().then(async ({data:{session}}) => {
      if (session) {
        const {data:prof} = await supabase.from("profiles").select("nome,cpf,email").eq("id",session.user.id).single();
        setSession(session); setProfile(prof);

        // Se não tem token de sessão no localStorage, registrar nova sessão
        if (!getSessionToken()) {
          await registerSession(session.user.id);
        }

        // After payment return: wait for webhook to process, then navigate
        const params = new URLSearchParams(window.location.search);
        const status = params.get("status");
        const extRef = params.get("external_reference");
        if (status==="approved" && extRef) {
          const [uid, matId, grp] = extRef.split("|");
          if (uid===session.user.id) {
            window.history.replaceState({},document.title,window.location.pathname);
            const mat = MATERIAS.find(m=>m.id===matId);
            if (mat) {
              // Poll até o webhook processar (max 15s)
              for (let i = 0; i < 10; i++) {
                const {data:ac} = await supabase.from("acessos").select("status").eq("user_id",uid).eq("materia",matId).single();
                if (ac?.status === "aprovado") break;
                await new Promise(r => setTimeout(r, 1500));
              }
              setSelMateria(mat); setSelGrupo(parseInt(grp)); setView("schedule"); return;
            }
          }
        }
        setView("dashboard");
      } else {
        setView("auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, sess) => {
      if (!sess) { setSession(null); setProfile(null); setView("auth"); }
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
    await endSession();
    await supabase.auth.signOut();
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
