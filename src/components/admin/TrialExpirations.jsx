import { useState } from "react";
import { MATERIAS } from "../../scheduleData";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../../supabase";

const COUPON_PRICE = 16.90;

export default function TrialExpirations({ trials }) {
  const [couponLoading, setCouponLoading] = useState(null);
  const [couponMsg, setCouponMsg] = useState(null);

  if (!trials || trials.length === 0) {
    return <div style={{ color: "var(--text-muted)", fontSize: 12, padding: 12 }}>Nenhum trial ativo ou expirado.</div>;
  }

  const ativos = trials.filter(t => t.trial_status === "ativo");
  const expirados = trials.filter(t => t.trial_status === "expirado");

  function formatTime(hoursRemaining) {
    const h = Math.abs(Math.round(hoursRemaining));
    if (h < 24) return `${h}h`;
    return `${Math.ceil(h / 24)}d`;
  }

  async function handleSendCoupon(trial) {
    const key = `${trial.user_id}-${trial.materia}`;
    setCouponLoading(key);
    setCouponMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const mat = MATERIAS.find(m => m.id === trial.materia);

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/create-coupon-preference`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          userId: trial.user_id,
          materia: trial.materia,
          materiaLabel: mat?.label || trial.materia,
          grupo: trial.grupo || 1,
        }),
      });

      if (!resp.ok) {
        const d = await resp.json();
        throw new Error(d.error || `Erro ${resp.status}`);
      }

      const { checkout_url } = await resp.json();

      const subject = encodeURIComponent(
        `Oferta especial CronoPed - ${mat?.label || trial.materia}`
      );
      const body = encodeURIComponent(
        `Olá ${trial.nome || ""}!\n\n` +
        `Vimos que seu período de teste do cronograma de ${mat?.label || trial.materia} chegou ao fim.\n\n` +
        `Preparamos uma oferta especial para você: acesso completo por apenas R$ ${COUPON_PRICE.toFixed(2).replace(".", ",")} via PIX!\n\n` +
        `Clique no link abaixo para aproveitar:\n${checkout_url}\n\n` +
        `Este link é válido por 7 dias.\n\n` +
        `Equipe CronoPed`
      );
      window.open(`mailto:${trial.email}?subject=${subject}&body=${body}`, "_blank");
      setCouponMsg({ key, type: "success", text: "Mailto aberto!" });
    } catch (err) {
      setCouponMsg({ key, type: "error", text: err.message });
    }
    setCouponLoading(null);
    setTimeout(() => setCouponMsg(null), 4000);
  }

  function renderTrial(t, i) {
    const mat = MATERIAS.find(m => m.id === t.materia);
    const isAtivo = t.trial_status === "ativo";
    const hours = Math.round(t.hours_remaining);
    const key = `${t.user_id}-${t.materia}`;

    return (
      <div key={key + i} style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 14px", borderBottom: "1px solid var(--bg-subtle)",
      }}>
        {/* Time badge */}
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
          minWidth: 36, textAlign: "center",
          color: isAtivo ? (Math.abs(hours) <= 24 ? "#DC2626" : "#D97706") : "#6B7280",
          background: isAtivo ? (Math.abs(hours) <= 24 ? "#FEF2F2" : "#FEF3C7") : "#F3F4F6",
        }}>
          {isAtivo ? formatTime(hours) : `-${formatTime(hours)}`}
        </span>

        {/* User info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{t.nome}</div>
          <div style={{ fontSize: 10, color: "var(--text-faint)" }}>{t.email}</div>
        </div>

        {/* Materia */}
        <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, flexShrink: 0 }}>
          {mat?.icon} {mat?.label || t.materia}
        </div>

        {/* Coupon button for expired */}
        {!isAtivo && (
          <button
            onClick={() => handleSendCoupon(t)}
            disabled={couponLoading === key}
            style={{
              fontSize: 9, fontWeight: 700, border: "none", borderRadius: 4,
              padding: "4px 8px", cursor: "pointer", whiteSpace: "nowrap",
              background: "#059669", color: "#fff",
              opacity: couponLoading === key ? 0.6 : 1,
            }}
          >
            {couponLoading === key ? "..." : "Cupom"}
          </button>
        )}

        {/* Coupon feedback */}
        {couponMsg?.key === key && (
          <span style={{
            fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
            background: couponMsg.type === "success" ? "#DCFCE7" : "#FEF2F2",
            color: couponMsg.type === "success" ? "#16A34A" : "#DC2626",
          }}>
            {couponMsg.text}
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      {ativos.length > 0 && (
        <>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "#16A34A", padding: "8px 14px 4px",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />
            Ativo ({ativos.length})
          </div>
          {ativos.map(renderTrial)}
        </>
      )}

      {expirados.length > 0 && (
        <>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "#6B7280", padding: "8px 14px 4px",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#9CA3AF" }} />
            Expirado ({expirados.length})
          </div>
          {expirados.map(renderTrial)}
        </>
      )}
    </div>
  );
}
