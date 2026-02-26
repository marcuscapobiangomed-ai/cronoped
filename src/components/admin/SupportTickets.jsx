import { useState } from "react";
import { supabase } from "../../supabase";

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

const smallBtn = {fontSize:10,fontWeight:700,border:"none",borderRadius:4,padding:"4px 10px",cursor:"pointer",transition:"all 0.12s"};

export default function SupportTickets({ tickets, onRefresh }) {
  const [actionLoading, setActionLoading] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filter, setFilter] = useState("todos"); // "todos" | "aberto" | "resolvido"

  if (!tickets || tickets.length === 0) {
    return <div style={{ padding: 20, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Nenhum ticket de suporte</div>;
  }

  async function handleToggleStatus(ticketId, currentStatus) {
    const newStatus = currentStatus === "aberto" ? "resolvido" : "aberto";
    setActionLoading(`status-${ticketId}`);
    try {
      await supabase.rpc("admin_update_ticket_status", {
        p_ticket_id: ticketId,
        p_status: newStatus,
      });
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("toggle ticket status:", err.message);
    }
    setActionLoading(null);
  }

  async function handleDelete(ticketId) {
    setActionLoading(`delete-${ticketId}`);
    try {
      await supabase.rpc("admin_delete_ticket", { p_ticket_id: ticketId });
      setDeleteConfirm(null);
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("delete ticket:", err.message);
    }
    setActionLoading(null);
  }

  function handleEmail(email, assunto, mensagem) {
    const subject = encodeURIComponent(`Re: ${assunto} - Cronograma Internato`);
    const body = encodeURIComponent(
      `Olá!\n\nSobre seu ticket "${assunto}":\n"${mensagem.substring(0, 200)}${mensagem.length > 200 ? "..." : ""}"\n\n---\nEquipe Cronograma Internato`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
  }

  const filtered = filter === "todos" ? tickets : tickets.filter(t => t.status === filter);

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ padding: "10px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", gap: 6 }}>
        {[
          { key: "todos", label: "Todos", count: tickets.length },
          { key: "aberto", label: "Abertos", count: tickets.filter(t => t.status === "aberto").length },
          { key: "resolvido", label: "Resolvidos", count: tickets.filter(t => t.status === "resolvido").length },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{
              fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer",
              background: filter === f.key ? "#0F172A" : "#F1F5F9",
              color: filter === f.key ? "#fff" : "#64748B",
              transition: "all 0.15s",
            }}>
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: 20, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
          Nenhum ticket {filter === "aberto" ? "aberto" : filter === "resolvido" ? "resolvido" : ""}
        </div>
      )}

      {filtered.map(t => {
        const badge = STATUS_BADGE[t.status] || STATUS_BADGE.aberto;
        const assuntoColor = ASSUNTO_COLOR[t.assunto] || "#64748B";
        const date = new Date(t.created_at);
        const timeStr = `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
        const isDeleting = deleteConfirm === t.id;

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
            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, whiteSpace: "pre-wrap", marginBottom: 10 }}>
              {t.mensagem}
            </div>

            {/* Action buttons */}
            {isDeleting ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FEF2F2", borderRadius: 6, padding: "8px 12px" }}>
                <span style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>Excluir ticket #{t.id}?</span>
                <button onClick={() => handleDelete(t.id)} disabled={actionLoading === `delete-${t.id}`}
                  style={{ ...smallBtn, background: "#DC2626", color: "#fff" }}>
                  {actionLoading === `delete-${t.id}` ? "..." : "Confirmar"}
                </button>
                <button onClick={() => setDeleteConfirm(null)}
                  style={{ ...smallBtn, background: "#E2E8F0", color: "#475569" }}>
                  Cancelar
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => handleToggleStatus(t.id, t.status)}
                  disabled={actionLoading === `status-${t.id}`}
                  style={{
                    ...smallBtn,
                    background: t.status === "aberto" ? "#16A34A" : "#F59E0B",
                    color: "#fff",
                  }}>
                  {actionLoading === `status-${t.id}` ? "..." : t.status === "aberto" ? "Resolver" : "Reabrir"}
                </button>
                {t.email && (
                  <button
                    onClick={() => handleEmail(t.email, t.assunto, t.mensagem)}
                    style={{ ...smallBtn, background: "#3B82F6", color: "#fff" }}>
                    Enviar e-mail
                  </button>
                )}
                <button
                  onClick={() => setDeleteConfirm(t.id)}
                  style={{ ...smallBtn, background: "#FEF2F2", color: "#DC2626" }}>
                  Excluir
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
