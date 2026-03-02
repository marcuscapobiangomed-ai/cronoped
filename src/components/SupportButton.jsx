import { useState, useEffect } from "react";
import { supabase } from "../supabase";

const ASSUNTOS = ["Bug / Erro", "Dúvida", "Sugestão", "Pagamento", "Outro"];

export default function SupportButton({ profile }) {
  const [open, setOpen] = useState(false);
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showBalloon, setShowBalloon] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowBalloon(false), 7000);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!assunto || !mensagem.trim()) return;
    setSending(true);
    try {
      await supabase.rpc("submit_support_ticket", {
        p_assunto:  assunto,
        p_mensagem: mensagem.trim(),
        p_nome:     profile?.nome  || "",
        p_email:    profile?.email || "",
      });
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setOpen(false);
        setAssunto("");
        setMensagem("");
      }, 2000);
    } catch {
      // silent
    }
    setSending(false);
  }

  if (sent) return (
    <div style={{position:"fixed",bottom:20,right:20,zIndex:999,background:"#22C55E",color:"#fff",borderRadius:14,padding:"16px 24px",boxShadow:"0 8px 32px rgba(0,0,0,0.18)",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:20}}>&#10003;</span> Enviado! Obrigado.
    </div>
  );

  if (!open) return (
    <>
      {showBalloon && (
        <div style={{position:"fixed",bottom:84,right:20,zIndex:1000}}>
          <div style={{
            background:"var(--bg-card)",
            borderRadius:12,
            padding:"10px 14px 10px 12px",
            boxShadow:"0 4px 24px rgba(0,0,0,0.14)",
            border:"1px solid var(--border-light)",
            display:"flex",alignItems:"center",gap:8,
            whiteSpace:"nowrap",
          }}>
            <span style={{fontSize:15}}>👋</span>
            <span style={{fontSize:12,fontWeight:600,color:"var(--text-primary)"}}>
              Algum problema? Fala aqui!
            </span>
            <button
              onClick={() => setShowBalloon(false)}
              style={{background:"none",border:"none",color:"var(--text-muted)",
                cursor:"pointer",fontSize:12,padding:0,lineHeight:1,marginLeft:2}}
            >✕</button>
          </div>
          {/* seta apontando para o botão */}
          <div style={{
            position:"absolute",bottom:-7,right:20,
            width:0,height:0,
            borderLeft:"7px solid transparent",
            borderRight:"7px solid transparent",
            borderTop:"7px solid var(--border-light)",
          }}/>
          <div style={{
            position:"absolute",bottom:-6,right:20,
            width:0,height:0,
            borderLeft:"7px solid transparent",
            borderRight:"7px solid transparent",
            borderTop:"7px solid var(--bg-card)",
          }}/>
        </div>
      )}
      <button
        onClick={() => { setOpen(true); setShowBalloon(false); }}
        style={{
          position:"fixed",bottom:20,right:20,zIndex:999,
          width:52,height:52,borderRadius:"50%",border:"none",
          background:"#0F172A",color:"#fff",fontSize:24,
          cursor:"pointer",boxShadow:"0 4px 20px rgba(0,0,0,0.25)",
          display:"flex",alignItems:"center",justifyContent:"center",
          transition:"transform 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        title="Suporte"
      >
        💬
      </button>
    </>
  );

  return (
    <div style={{
      position:"fixed",bottom:20,right:20,zIndex:999,
      width:320,maxWidth:"calc(100vw - 40px)",
      background:"var(--bg-card)",borderRadius:16,
      boxShadow:"0 8px 40px rgba(0,0,0,0.18)",
      overflow:"hidden",
    }}>
      {/* Header */}
      <div style={{background:"#0F172A",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:14,fontWeight:700,color:"#fff",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:18}}>💬</span> Suporte
        </div>
        <button onClick={() => { setOpen(false); setAssunto(""); setMensagem(""); }}
          style={{background:"none",border:"none",color:"#94A3B8",fontSize:18,cursor:"pointer",padding:0,lineHeight:1}}>
          ✕
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>
        <div>
          <label style={{fontSize:12,fontWeight:600,color:"var(--text-secondary)",display:"block",marginBottom:6}}>Assunto</label>
          <select
            value={assunto}
            onChange={e => setAssunto(e.target.value)}
            required
            style={{
              width:"100%",padding:"8px 12px",borderRadius:8,
              border:"1px solid var(--border-light)",fontSize:13,color:"var(--text-secondary)",
              backgroundColor:"var(--bg-input)",cursor:"pointer",
            }}
          >
            <option value="">— Selecione —</option>
            {ASSUNTOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div>
          <label style={{fontSize:12,fontWeight:600,color:"var(--text-secondary)",display:"block",marginBottom:6}}>Mensagem</label>
          <textarea
            value={mensagem}
            onChange={e => setMensagem(e.target.value)}
            required
            rows={4}
            placeholder="Descreva o problema ou sugestão..."
            style={{
              width:"100%",padding:"8px 12px",borderRadius:8,
              border:"1px solid var(--border-light)",fontSize:13,color:"var(--text-primary)",
              resize:"vertical",fontFamily:"inherit",
              boxSizing:"border-box",background:"var(--bg-input)",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={sending || !assunto || !mensagem.trim()}
          style={{
            width:"100%",padding:"10px",borderRadius:8,border:"none",
            background:assunto && mensagem.trim() ? "var(--bg-header)" : "var(--border-medium)",
            color:"#fff",fontSize:13,fontWeight:700,
            cursor:assunto && mensagem.trim() ? "pointer" : "not-allowed",
            transition:"all 0.2s",
          }}
        >
          {sending ? "Enviando..." : "Enviar"}
        </button>

        <div style={{fontSize:11,color:"var(--text-muted)",textAlign:"center"}}>
          {profile?.nome?.split(" ")[0]} · {profile?.email}
        </div>
      </form>
    </div>
  );
}
