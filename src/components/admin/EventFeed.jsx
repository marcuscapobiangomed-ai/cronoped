const TYPE_STYLES = {
  login:           { icon: "🟢", color: "#16A34A" },
  logout:          { icon: "⚫", color: "#64748B" },
  signup:          { icon: "🔵", color: "#2563EB" },
  payment_attempt: { icon: "🟡", color: "#D97706" },
  payment_success: { icon: "💰", color: "#16A34A" },
  payment_failure: { icon: "🔴", color: "#DC2626" },
  session_kicked:  { icon: "⚠️", color: "#EA580C" },
  edge_fn_error:   { icon: "🔴", color: "#DC2626" },
  error:           { icon: "🔴", color: "#DC2626" },
};

function formatTimestamp(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / 1000;

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const mon = String(d.getMonth() + 1).padStart(2, "0");

  const isToday = d.toDateString() === now.toDateString();
  const dateLabel = isToday ? `hoje ${hh}:${mm}` : `${day}/${mon} ${hh}:${mm}`;

  let rel;
  if (diff < 60)        rel = `${Math.floor(diff)}s atrás`;
  else if (diff < 3600) rel = `${Math.floor(diff / 60)}min atrás`;
  else if (diff < 86400)rel = `${Math.floor(diff / 3600)}h atrás`;
  else                  rel = `${Math.floor(diff / 86400)}d atrás`;

  return { dateLabel, rel };
}

export default function EventFeed({ events }) {
  if (!events || events.length === 0) {
    return <div style={{ color: "#94A3B8", fontSize: 13, padding: 16 }}>Nenhum evento registrado ainda.</div>;
  }

  return (
    <div style={{ maxHeight: 400, overflowY: "auto" }}>
      {events.map(ev => {
        const style = TYPE_STYLES[ev.type] || { icon: "⚪", color: "#64748B" };
        return (
          <div key={ev.id} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "10px 14px", borderBottom: "1px solid #F1F5F9",
          }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{style.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>
                  {ev.user_name || "Sistema"}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: style.color,
                  background: `${style.color}15`, padding: "1px 6px", borderRadius: 4,
                }}>{ev.type}</span>
                {(() => {
                  const { dateLabel, rel } = formatTimestamp(ev.created_at);
                  return (
                    <span style={{ fontSize: 10, color: "#94A3B8" }} title={rel}>
                      {dateLabel}
                    </span>
                  );
                })()}
              </div>
              {ev.meta && Object.keys(ev.meta).length > 0 && (
                <div style={{ fontSize: 10, color: "#64748B", marginTop: 2, fontFamily: "'JetBrains Mono',monospace" }}>
                  {JSON.stringify(ev.meta)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
