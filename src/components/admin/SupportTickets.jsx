const STATUS_BADGE = {
  aberto:    { bg: "#FEF3C7", color: "#92400E", label: "Aberto" },
  resolvido: { bg: "#DCFCE7", color: "#16A34A", label: "Resolvido" },
};

const ASSUNTO_COLOR = {
  "Bug / Erro":  "#DC2626",
  "Pagamento":   "#F59E0B",
  "Dúvida":      "#2563EB",
  "Sugestão":    "#16A34A",
  "Outro":       "#64748B",
};

export default function SupportTickets({ tickets }) {
  if (!tickets || tickets.length === 0) {
    return <div style={{ padding: 20, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Nenhum ticket de suporte</div>;
  }

  return (
    <div>
      {tickets.map(t => {
        const badge = STATUS_BADGE[t.status] || STATUS_BADGE.aberto;
        const assuntoColor = ASSUNTO_COLOR[t.assunto] || "#64748B";
        const date = new Date(t.created_at);
        const timeStr = `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

        return (
          <div key={t.id} style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: assuntoColor, background: `${assuntoColor}15`, padding: "2px 8px", borderRadius: 4 }}>
                  {t.assunto}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: badge.color, background: badge.bg, padding: "2px 8px", borderRadius: 4 }}>
                  {badge.label}
                </span>
              </div>
              <span style={{ fontSize: 10, color: "#94A3B8" }}>#{t.id} · {timeStr}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", marginBottom: 2 }}>
              {t.nome || "Sem nome"} <span style={{ fontWeight: 400, color: "#64748B" }}>({t.email || "?"})</span>
            </div>
            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {t.mensagem}
            </div>
          </div>
        );
      })}
    </div>
  );
}
