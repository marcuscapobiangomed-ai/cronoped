import { useState, useEffect } from "react";

// ── Promoção: ajuste a data de término aqui ──
const PROMO_END = new Date("2026-03-10T23:59:59-03:00");
const PROMO_PRICE = "9,90";
const ORIGINAL_PRICE = "19,90";

// Ciclo curto de urgência quando a promo real expira (2h loop)
const URGENCY_CYCLE_MS = 2 * 60 * 60 * 1000;

function useCountdown(target) {
  function calcLeft() {
    const real = target - Date.now();
    if (real > 0) return real;
    // Promo expirou → ciclo curto recorrente pra manter urgência
    const elapsed = Date.now() - target;
    return URGENCY_CYCLE_MS - (elapsed % URGENCY_CYCLE_MS);
  }
  const [left, setLeft] = useState(calcLeft);
  useEffect(() => {
    const id = setInterval(() => setLeft(calcLeft()), 1000);
    return () => clearInterval(id);
  }, [target]);
  const realExpired = target - Date.now() <= 0;
  const d = realExpired ? 0 : Math.floor(left / 86400000);
  const h = realExpired ? Math.floor(left / 3600000) : Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return { d, h, m, s, urgent: realExpired };
}

function TimerBlock({ value, label }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        background: "#1E293B", borderRadius: 10, padding: "10px 0",
        minWidth: 52, fontSize: 26, fontWeight: 900, color: "#fff",
        fontFamily: "'JetBrains Mono', monospace",
      }}>{String(value).padStart(2, "0")}</div>
      <div style={{ fontSize: 9, color: "#64748B", marginTop: 4, fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

// ── Mockup: Tela de cronograma semanal ──
function MockSchedule() {
  const days = [
    { day: "2a", label: "Seg", activities: [
      { title: "Ambulatorio HUV", time: "08:00-12:00", color: "#F0FDFA", border: "#99F6E4", text: "#0F766E" },
      { title: "Consolidacao", time: "14:00-18:00", color: "#1D4ED8", border: "#1E40AF", text: "#fff" },
    ]},
    { day: "3a", label: "Ter", activities: [
      { title: "C. de Simulacoes", time: "08:00-11:00", color: "#FFF7ED", border: "#FDBA74", text: "#C2410C" },
      { title: "Horario Verde", time: "", color: "#F8F8F7", border: "#E7E5E4", text: "#78716C" },
    ]},
    { day: "4a", label: "Qua", activities: [
      { title: "Enfermaria", time: "08:00-12:00", color: "#FFFBEB", border: "#FCD34D", text: "#B45309" },
      { title: "Ambulatorio HUV", time: "14:00-17:00", color: "#F0FDFA", border: "#99F6E4", text: "#0F766E" },
    ]},
  ];
  return (
    <div style={{ background: "#0F172A", borderRadius: 20, overflow: "hidden", border: "1px solid #1E293B", maxWidth: 340, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: "#0F172A", padding: "14px 16px 10px", borderBottom: "1px solid #1E293B" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>👶 Pediatria</div>
            <div style={{ fontSize: 10, color: "#64748B" }}>Grupo 6</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#22C55E" }}>45%</div>
            <div style={{ fontSize: 9, color: "#64748B" }}>Total</div>
          </div>
        </div>
        <div style={{ height: 4, background: "#1E293B", borderRadius: 99, marginTop: 8, overflow: "hidden" }}>
          <div style={{ width: "45%", height: "100%", background: "#0EA5E9", borderRadius: 99 }} />
        </div>
      </div>
      {/* Week header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "#0F172A" }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "#0EA5E9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#fff" }}>3</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Semana 3</div>
          <div style={{ fontSize: 10, color: "#64748B" }}>09/3 - 14/3</div>
        </div>
      </div>
      {/* Days grid */}
      <div style={{ display: "flex", gap: 6, padding: "6px 12px 16px", overflowX: "auto" }}>
        {days.map(d => (
          <div key={d.day} style={{ flex: 1, minWidth: 90 }}>
            <div style={{ textAlign: "center", padding: "6px 0", background: "#1E293B", borderRadius: 6, marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{d.day}</div>
              <div style={{ fontSize: 9, color: "#64748B" }}>{d.label}</div>
            </div>
            {d.activities.map((a, i) => (
              <div key={i} style={{ background: a.color, border: `1.5px solid ${a.border}`, borderRadius: 8, padding: "6px 8px", marginBottom: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: a.text, lineHeight: 1.3 }}>{a.title}</div>
                {a.time && <div style={{ fontSize: 9, color: a.text, opacity: 0.7, marginTop: 2 }}>{a.time}</div>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mockup: Dashboard com cards de matérias ──
function MockDashboard() {
  const cards = [
    { icon: "👶", label: "Pediatria", color: "#0EA5E9", pct: 45 },
    { icon: "🩺", label: "Clinica Medica", color: "#10B981", pct: 20 },
    { icon: "🤰", label: "GO", color: "#EC4899", pct: 0 },
    { icon: "🔪", label: "Clinica Cirurgica", color: "#F59E0B", pct: 0 },
  ];
  return (
    <div style={{ background: "#0F172A", borderRadius: 20, overflow: "hidden", border: "1px solid #1E293B", maxWidth: 340, margin: "0 auto" }}>
      <div style={{ background: "#0F172A", padding: "14px 16px 10px", borderBottom: "1px solid #1E293B" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>🩺 Cronograma Internato</div>
        <div style={{ fontSize: 10, color: "#64748B" }}>Modulo 1 - 2026</div>
      </div>
      <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", border: "2px solid #E2E8F0", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 24 }}>{c.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{c.label}</div>
              <div style={{ height: 3, background: "#F1F5F9", borderRadius: 99, marginTop: 4, overflow: "hidden" }}>
                <div style={{ width: `${c.pct}%`, height: "100%", background: c.color, borderRadius: 99 }} />
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: c.pct > 0 ? c.color : "#CBD5E1" }}>{c.pct}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mockup: Atividade com check ──
function MockActivity() {
  return (
    <div style={{ background: "#0F172A", borderRadius: 20, overflow: "hidden", border: "1px solid #1E293B", maxWidth: 340, margin: "0 auto" }}>
      <div style={{ background: "#0F172A", padding: "14px 16px 8px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>Atividade concluida</div>
      </div>
      <div style={{ padding: "8px 12px 16px" }}>
        {/* Done activity */}
        <div style={{ background: "#F0FDFA", border: "1.5px solid #99F6E4", borderRadius: 10, padding: "10px 12px", marginBottom: 8, opacity: 0.4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#0F766E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff" }}>✓</div>
            <div style={{ textDecoration: "line-through", fontSize: 12, fontWeight: 700, color: "#0F766E" }}>Ambulatorio HUV</div>
          </div>
          <div style={{ fontSize: 10, color: "#0F766E", marginTop: 4, marginLeft: 24, opacity: 0.7 }}>08:00-12:00 · Dra. Ana Carolina</div>
        </div>
        {/* Pending activity */}
        <div style={{ background: "#FFFBEB", border: "1.5px solid #FCD34D", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", border: "1.5px solid #B45309" }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: "#B45309" }}>Enfermaria</div>
          </div>
          <div style={{ fontSize: 10, color: "#B45309", marginTop: 4, marginLeft: 24, opacity: 0.7 }}>14:00-17:00</div>
        </div>
        {/* Custom color activity */}
        <div style={{ background: "#EEF2FF", border: "1.5px solid #C7D2FE", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", border: "1.5px solid #4338CA" }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: "#4338CA" }}>Alojamento Conjunto</div>
          </div>
          <div style={{ fontSize: 10, color: "#4338CA", marginTop: 4, marginLeft: 24, opacity: 0.7 }}>08:00-12:00 · Sessao Clinica</div>
        </div>
      </div>
    </div>
  );
}

const MATERIAS = [
  { icon: "👶", label: "Pediatria" },
  { icon: "🩺", label: "Clinica Medica" },
  { icon: "🤰", label: "GO" },
  { icon: "🔪", label: "Clinica Cirurgica" },
  { icon: "🚑", label: "Emergencia" },
  { icon: "🏥", label: "Atencao Basica" },
  { icon: "🎯", label: "APS Simulacao" },
];

export default function LandingPage({ onNavigateAuth }) {
  const countdown = useCountdown(PROMO_END.getTime());

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", color: "#fff", overflowX: "hidden" }}>

      {/* ═══ NAV BAR ═══ */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px", maxWidth: 900, margin: "0 auto",
      }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>🩺 CronoPed</div>
        <button onClick={onNavigateAuth} style={{
          background: "transparent", border: "1px solid #475569", borderRadius: 8,
          color: "#CBD5E1", padding: "8px 18px", fontSize: 13, fontWeight: 600,
          cursor: "pointer", fontFamily: "'Outfit', sans-serif",
        }}>
          Entrar
        </button>
      </nav>

      {/* ═══ HERO: FOCO NA PROMOÇÃO ═══ */}
      <section style={{
        padding: "clamp(32px, 8vw, 60px) 20px clamp(32px, 6vw, 48px)", textAlign: "center",
        background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #0F172A 100%)",
      }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={{
            background: "#DC2626", color: "#fff", display: "inline-block",
            padding: "5px 18px", borderRadius: 99, fontSize: 12, fontWeight: 800,
            textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20,
            animation: "pulse 2s infinite",
          }}>
            Promocao de lancamento
          </div>

          <h1 style={{
            fontSize: "clamp(26px, 6vw, 40px)", fontWeight: 900,
            lineHeight: 1.15, letterSpacing: "-0.5px", marginBottom: 12,
          }}>
            Cronograma do Internato<br />
            <span style={{ color: "#22C55E" }}>por apenas R$ {PROMO_PRICE}</span>
          </h1>

          <p style={{
            fontSize: "clamp(14px, 3.5vw, 17px)", color: "#94A3B8",
            lineHeight: 1.6, maxWidth: 420, margin: "0 auto 24px",
          }}>
            Todas as 7 materias. 10 semanas. Cronograma completo do seu grupo, personalizado e sincronizado.
          </p>

          {/* Preço destacado */}
          <div style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 16, color: "#64748B", textDecoration: "line-through", marginRight: 12 }}>R$ {ORIGINAL_PRICE}</span>
            <span style={{ fontSize: 42, fontWeight: 900, color: "#22C55E" }}>R$ {PROMO_PRICE}</span>
          </div>

          {/* Timer */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: countdown.urgent ? "#EF4444" : "#F59E0B", fontWeight: 700, marginBottom: 10, textTransform: "uppercase", animation: countdown.urgent ? "pulse 1.5s ease-in-out infinite" : "none" }}>
              {countdown.urgent ? "⚡ Últimas horas com desconto!" : "Oferta expira em:"}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              {!countdown.urgent && <TimerBlock value={countdown.d} label="dias" />}
              <TimerBlock value={countdown.h} label="horas" />
              <TimerBlock value={countdown.m} label="min" />
              <TimerBlock value={countdown.s} label="seg" />
            </div>
          </div>

          <button onClick={onNavigateAuth} style={{
            background: "linear-gradient(135deg, #22C55E, #16A34A)", color: "#fff",
            border: "none", borderRadius: 14, padding: "16px 40px", fontSize: 17,
            fontWeight: 800, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
            boxShadow: "0 4px 24px rgba(34,197,94,0.35)", width: "100%", maxWidth: 320,
          }}>
            Garantir por R$ {PROMO_PRICE} →
          </button>

          <p style={{ fontSize: 12, color: "#475569", marginTop: 12 }}>
            ou <button onClick={onNavigateAuth} style={{ background: "none", border: "none", color: "#38BDF8", cursor: "pointer", fontSize: 12, fontFamily: "'Outfit',sans-serif", textDecoration: "underline", fontWeight: 600 }}>teste gratis por 3 dias</button>
          </p>
        </div>
      </section>

      {/* ═══ MATÉRIAS INCLUÍDAS ═══ */}
      <section style={{ padding: "36px 24px", background: "#020617" }}>
        <div style={{ maxWidth: 580, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: "#38BDF8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>
            Inclui todas as materias
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {MATERIAS.map(m => (
              <div key={m.label} style={{
                background: "#0F172A", borderRadius: 10, padding: "8px 14px",
                fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
                border: "1px solid #1E293B",
              }}>
                <span style={{ fontSize: 16 }}>{m.icon}</span> {m.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ VEJA NA PRÁTICA (MOCKUPS) ═══ */}
      <section style={{ padding: "56px 24px", background: "#0F172A" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: 900, textAlign: "center", marginBottom: 8 }}>
            Veja na pratica
          </h2>
          <p style={{ fontSize: 14, color: "#64748B", textAlign: "center", marginBottom: 36 }}>
            Interface feita para o dia a dia do internato
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, alignItems: "start" }}>
            <div>
              <MockDashboard />
              <p style={{ fontSize: 12, color: "#64748B", textAlign: "center", marginTop: 10, fontWeight: 600 }}>Painel com todas as materias</p>
            </div>
            <div>
              <MockSchedule />
              <p style={{ fontSize: 12, color: "#64748B", textAlign: "center", marginTop: 10, fontWeight: 600 }}>Cronograma semanal por grupo</p>
            </div>
            <div>
              <MockActivity />
              <p style={{ fontSize: 12, color: "#64748B", textAlign: "center", marginTop: 10, fontWeight: 600 }}>Marque progresso e personalize</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FUNCIONALIDADES ═══ */}
      <section style={{ padding: "48px 24px", background: "#020617" }}>
        <div style={{ maxWidth: 580, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 900, textAlign: "center", marginBottom: 28 }}>
            O que voce ganha
          </h2>
          <div className="landing-features-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { icon: "📋", text: "Cronograma completo de 10 semanas" },
              { icon: "👥", text: "Separado por grupo" },
              { icon: "✏️", text: "Edite cores e atividades" },
              { icon: "✅", text: "Marque progresso" },
              { icon: "📝", text: "Adicione anotacoes" },
              { icon: "☁️", text: "Sincronizado na nuvem" },
              { icon: "📱", text: "Funciona no celular" },
              { icon: "🔒", text: "Acesso ate fim do modulo" },
            ].map(f => (
              <div key={f.text} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                background: "#0F172A", borderRadius: 10, border: "1px solid #1E293B",
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{f.icon}</span>
                <span style={{ fontSize: 13, color: "#CBD5E1", fontWeight: 500 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COMO FUNCIONA ═══ */}
      <section style={{ padding: "48px 24px", background: "#0F172A" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 900, marginBottom: 28 }}>
            Comece em 2 minutos
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[
              { n: "1", title: "Crie sua conta", desc: "Cadastro rapido com nome, CPF e e-mail." },
              { n: "2", title: "Escolha sua materia", desc: "Selecione entre 7 materias e seu grupo." },
              { n: "3", title: "Pronto!", desc: "Acompanhe tudo no celular ou computador." },
            ].map(step => (
              <div key={step.n} style={{ display: "flex", alignItems: "center", gap: 16, textAlign: "left" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: "#22C55E",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 900, color: "#fff", flexShrink: 0,
                }}>{step.n}</div>
                <div>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>{step.title}</span>
                  <span style={{ fontSize: 13, color: "#94A3B8", marginLeft: 6 }}>{step.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL: PROMOÇÃO + TRIAL ═══ */}
      <section style={{
        padding: "56px 24px", textAlign: "center",
        background: "linear-gradient(180deg, #020617 0%, #1a0a2e 50%, #0F172A 100%)",
      }}>
        <div style={{ maxWidth: 420, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(24px, 5vw, 34px)", fontWeight: 900, marginBottom: 8 }}>
            Nao perca essa oferta
          </h2>
          <p style={{ fontSize: 14, color: "#94A3B8", marginBottom: 24 }}>
            Acesso completo a todas as materias por um preco que cabe no bolso do universitario.
          </p>

          {/* Preço */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, color: "#64748B", textDecoration: "line-through", marginBottom: 2 }}>R$ {ORIGINAL_PRICE}</div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 600, color: "#94A3B8" }}>R$</span>
              <span style={{ fontSize: 52, fontWeight: 900, color: "#22C55E", lineHeight: 1 }}>{PROMO_PRICE}</span>
            </div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>pagamento unico via PIX</div>
          </div>

          {/* Timer mini */}
          <div style={{ marginBottom: 24 }}>
            {countdown.urgent && (
              <div style={{ fontSize: 11, color: "#EF4444", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", animation: "pulse 1.5s ease-in-out infinite" }}>
                ⚡ Últimas horas!
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              {!countdown.urgent && <TimerBlock value={countdown.d} label="dias" />}
              <TimerBlock value={countdown.h} label="horas" />
              <TimerBlock value={countdown.m} label="min" />
              <TimerBlock value={countdown.s} label="seg" />
            </div>
          </div>

          {/* Checklist */}
          <div style={{ textAlign: "left", maxWidth: 280, margin: "0 auto 24px" }}>
            {[
              "7 materias incluidas",
              "Cronograma por grupo",
              "Personalizacao total",
              "Sincronizacao na nuvem",
              "Acesso ate fim do modulo",
            ].map(item => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13 }}>
                <span style={{ color: "#22C55E", fontWeight: 900 }}>✓</span>
                <span style={{ color: "#CBD5E1" }}>{item}</span>
              </div>
            ))}
          </div>

          <button onClick={onNavigateAuth} style={{
            background: "linear-gradient(135deg, #22C55E, #16A34A)", color: "#fff",
            border: "none", borderRadius: 14, padding: "18px 40px", fontSize: 18,
            fontWeight: 800, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
            boxShadow: "0 4px 24px rgba(34,197,94,0.35)", width: "100%", maxWidth: 320,
          }}>
            Garantir por R$ {PROMO_PRICE} →
          </button>

          {/* Trial como opção secundária */}
          <div style={{
            marginTop: 24, padding: "16px 20px", background: "#1E293B",
            borderRadius: 14, border: "1px solid #334155",
          }}>
            <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 10 }}>
              Quer testar antes? <strong style={{ color: "#fff" }}>3 dias gratis</strong>, sem cartao.
            </p>
            <button onClick={onNavigateAuth} style={{
              background: "transparent", color: "#38BDF8", border: "1px solid #38BDF8",
              borderRadius: 10, padding: "10px 28px", fontSize: 14,
              fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
            }}>
              Comecar teste gratis
            </button>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        padding: "20px 24px", textAlign: "center", borderTop: "1px solid #1E293B",
        background: "#020617",
      }}>
        <p style={{ fontSize: 12, color: "#475569" }}>
          CronoPed · Cronograma Internato Modulo 1 · 2026
        </p>
        <p style={{ fontSize: 11, color: "#334155", marginTop: 4 }}>
          Dados protegidos. CPF usado apenas para identificacao.
        </p>
      </footer>
    </div>
  );
}
