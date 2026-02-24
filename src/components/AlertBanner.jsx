export default function AlertBanner({alerts, onDismiss}) {
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
