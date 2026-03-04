import { useState, useEffect } from "react";

// ── Promoção: ajuste a data de término aqui ──
const PROMO_END = new Date("2026-03-10T23:59:59-03:00");
const PROMO_PRICE = "9,90";
const ORIGINAL_PRICE = "19,90";

function useCountdown(target) {
  const [left, setLeft] = useState(() => Math.max(0, target - Date.now()));
  useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => {
      const remaining = Math.max(0, target - Date.now());
      setLeft(remaining);
      if (remaining <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [target]);
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return { d, h, m, s, expired: left <= 0 };
}

const MATERIAS = [
  { icon: "👶", label: "Pediatria" },
  { icon: "🩺", label: "Clínica Médica" },
  { icon: "🤰", label: "GO" },
  { icon: "🔪", label: "Clínica Cirúrgica" },
  { icon: "🚑", label: "Emergência" },
  { icon: "🏥", label: "Atenção Básica" },
  { icon: "🎯", label: "APS Simulação" },
];

const FEATURES = [
  { icon: "📋", title: "Cronograma completo", desc: "10 semanas de atividades por grupo, com turnos, horários e locais." },
  { icon: "✏️", title: "Personalizável", desc: "Edite cores, adicione atividades e organize do seu jeito." },
  { icon: "✅", title: "Marque progresso", desc: "Acompanhe o que já fez e o que falta em cada semana." },
  { icon: "☁️", title: "Sincronizado", desc: "Acesse de qualquer dispositivo. Seus dados sempre salvos." },
];

function TimerBlock({ value, label }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        background: "#1E293B", borderRadius: 10, padding: "10px 0",
        minWidth: 56, fontSize: 28, fontWeight: 900, color: "#fff",
        fontFamily: "'JetBrains Mono', monospace",
      }}>{String(value).padStart(2, "0")}</div>
      <div style={{ fontSize: 10, color: "#64748B", marginTop: 4, fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

export default function LandingPage({ onNavigateAuth }) {
  const countdown = useCountdown(PROMO_END.getTime());

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", color: "#fff", overflowX: "hidden" }}>

      {/* ═══ HERO ═══ */}
      <section style={{
        padding: "80px 24px 60px", textAlign: "center",
        background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #0F172A 100%)",
        position: "relative",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🩺</div>
          <h1 style={{
            fontSize: "clamp(28px, 6vw, 44px)", fontWeight: 900,
            lineHeight: 1.15, letterSpacing: "-0.5px", marginBottom: 16,
          }}>
            Seu cronograma de internato.<br />
            <span style={{ color: "#38BDF8" }}>Organizado. No bolso.</span>
          </h1>
          <p style={{
            fontSize: "clamp(15px, 3.5vw, 18px)", color: "#94A3B8",
            lineHeight: 1.6, maxWidth: 480, margin: "0 auto 32px",
          }}>
            Acompanhe atividades, provas e plantões em tempo real.
            Personalize, marque progresso e nunca perca um compromisso.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onNavigateAuth} style={{
              background: "#22C55E", color: "#fff", border: "none", borderRadius: 12,
              padding: "15px 32px", fontSize: 16, fontWeight: 800, cursor: "pointer",
              fontFamily: "'Outfit', sans-serif", transition: "transform 0.12s",
            }}>
              Testar gratis por 3 dias
            </button>
            <a href="#promo" style={{
              background: "rgba(255,255,255,0.1)", color: "#fff", borderRadius: 12,
              padding: "15px 28px", fontSize: 16, fontWeight: 700, textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.15)", display: "inline-block",
            }}>
              Ver promocao ↓
            </a>
          </div>
          <p style={{ fontSize: 12, color: "#475569", marginTop: 16 }}>
            Sem cartao de credito. Cancele quando quiser.
          </p>
        </div>
      </section>

      {/* ═══ MATÉRIAS ═══ */}
      <section style={{ padding: "48px 24px", background: "#0F172A" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "#38BDF8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
            7 materias incluidas
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {MATERIAS.map(m => (
              <div key={m.label} style={{
                background: "#1E293B", borderRadius: 10, padding: "10px 16px",
                fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
                border: "1px solid #334155",
              }}>
                <span style={{ fontSize: 18 }}>{m.icon}</span> {m.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section style={{ padding: "56px 24px", background: "#020617" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: 900, textAlign: "center", marginBottom: 36 }}>
            Tudo que voce precisa
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                background: "#0F172A", border: "1px solid #1E293B", borderRadius: 16,
                padding: "24px 20px",
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: "#94A3B8", lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COMO FUNCIONA ═══ */}
      <section style={{ padding: "56px 24px", background: "#0F172A" }}>
        <div style={{ maxWidth: 540, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: 900, marginBottom: 36 }}>
            Como funciona
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {[
              { n: "1", title: "Crie sua conta", desc: "Cadastro rapido com nome, CPF e e-mail." },
              { n: "2", title: "Escolha sua materia e grupo", desc: "Selecione entre 7 materias e veja o cronograma do seu grupo." },
              { n: "3", title: "Acompanhe tudo", desc: "Marque atividades concluidas, adicione anotacoes e personalize." },
            ].map(step => (
              <div key={step.n} style={{ display: "flex", alignItems: "flex-start", gap: 16, textAlign: "left" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, background: "#1E293B",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 900, color: "#38BDF8", flexShrink: 0,
                  border: "1px solid #334155",
                }}>{step.n}</div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: "#94A3B8", lineHeight: 1.5 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SCREENSHOTS PLACEHOLDER ═══ */}
      <section style={{ padding: "48px 24px", background: "#020617" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: 900, marginBottom: 12 }}>
            Veja na pratica
          </h2>
          <p style={{ fontSize: 14, color: "#64748B", marginBottom: 24 }}>
            Interface limpa e intuitiva, feita para o dia a dia do internato.
          </p>
          {/* Placeholder para screenshots - substituir por imagens reais */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12,
          }}>
            {["Cronograma semanal", "Painel de materias", "Atividades personalizadas"].map(label => (
              <div key={label} style={{
                background: "#1E293B", borderRadius: 16, padding: "60px 20px",
                border: "1px dashed #334155", color: "#475569", fontSize: 13, fontWeight: 600,
              }}>
                📸 {label}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "#334155", marginTop: 12 }}>
            Adicione screenshots reais do app aqui
          </p>
        </div>
      </section>

      {/* ═══ PROMOÇÃO ═══ */}
      <section id="promo" style={{
        padding: "64px 24px", textAlign: "center",
        background: "linear-gradient(180deg, #0F172A 0%, #1a0a2e 100%)",
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{
            background: "#DC2626", color: "#fff", display: "inline-block",
            padding: "4px 16px", borderRadius: 99, fontSize: 12, fontWeight: 800,
            textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16,
          }}>
            Promocao de lancamento
          </div>

          <h2 style={{ fontSize: "clamp(28px, 6vw, 40px)", fontWeight: 900, marginBottom: 8 }}>
            Acesso completo
          </h2>
          <p style={{ fontSize: 15, color: "#94A3B8", marginBottom: 24 }}>
            Todas as 7 materias. 10 semanas. Sem limites.
          </p>

          {/* Preço */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 16, color: "#64748B", textDecoration: "line-through", marginBottom: 4 }}>
              R$ {ORIGINAL_PRICE}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
              <span style={{ fontSize: 20, fontWeight: 600, color: "#94A3B8" }}>R$</span>
              <span style={{ fontSize: 56, fontWeight: 900, color: "#22C55E", lineHeight: 1 }}>{PROMO_PRICE}</span>
            </div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>pagamento unico via PIX</div>
          </div>

          {/* Timer */}
          {!countdown.expired && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, color: "#F59E0B", fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Oferta expira em:
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <TimerBlock value={countdown.d} label="dias" />
                <TimerBlock value={countdown.h} label="horas" />
                <TimerBlock value={countdown.m} label="min" />
                <TimerBlock value={countdown.s} label="seg" />
              </div>
            </div>
          )}

          {/* Checklist */}
          <div style={{ textAlign: "left", maxWidth: 300, margin: "0 auto 28px" }}>
            {[
              "7 materias incluidas",
              "Cronograma por grupo",
              "Personalizacao total",
              "Sincronizacao na nuvem",
              "Acesso ate fim do modulo",
            ].map(item => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", fontSize: 14 }}>
                <span style={{ color: "#22C55E", fontSize: 16 }}>✓</span>
                <span style={{ color: "#CBD5E1" }}>{item}</span>
              </div>
            ))}
          </div>

          <button onClick={onNavigateAuth} style={{
            background: "linear-gradient(135deg, #22C55E, #16A34A)", color: "#fff",
            border: "none", borderRadius: 14, padding: "18px 48px", fontSize: 18,
            fontWeight: 800, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
            boxShadow: "0 4px 24px rgba(34,197,94,0.3)", transition: "transform 0.12s",
            width: "100%", maxWidth: 340,
          }}>
            Garantir por R$ {PROMO_PRICE}
          </button>
        </div>
      </section>

      {/* ═══ TRIAL CTA ═══ */}
      <section style={{ padding: "48px 24px", background: "#0F172A", textAlign: "center" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{
            background: "#1E293B", borderRadius: 20, padding: "32px 24px",
            border: "1px solid #334155",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎁</div>
            <h3 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
              Ainda nao tem certeza?
            </h3>
            <p style={{ fontSize: 15, color: "#94A3B8", lineHeight: 1.6, marginBottom: 24 }}>
              Teste gratis por <strong style={{ color: "#fff" }}>3 dias</strong>. Sem cartao de credito. Sem compromisso.
              Explore o cronograma completo e decida depois.
            </p>
            <button onClick={onNavigateAuth} style={{
              background: "#fff", color: "#0F172A", border: "none", borderRadius: 12,
              padding: "15px 36px", fontSize: 16, fontWeight: 800, cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
            }}>
              Comecar teste gratis →
            </button>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        padding: "24px", textAlign: "center", borderTop: "1px solid #1E293B",
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
