import { useState, useMemo } from "react";

// Data de lançamento do app
const LAUNCH_DATE = new Date(2026, 1, 24); // 24/02/2026

/**
 * Preenche todos os dias desde o lançamento (24/02) até hoje.
 * Recebe raw = [{day: "2026-02-25", signups: 3}, ...]
 * Retorna [{date, label, dayLabel, value, isToday}, ...]
 */
function fillDays(raw) {
  const map = {};
  (raw || []).forEach(d => {
    const key = d.day?.substring(0, 10);
    if (key) map[key] = d.signups || 0;
  });

  const days = [];
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const cursor = new Date(LAUNCH_DATE);
  while (cursor <= now) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    const dayOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][cursor.getDay()];
    days.push({
      date: new Date(cursor),
      key,
      label: `${String(cursor.getDate()).padStart(2, "0")}/${String(cursor.getMonth() + 1).padStart(2, "0")}`,
      dayLabel: dayOfWeek,
      value: map[key] || 0,
      isToday: key === todayStr,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export default function MiniBarChart({ rawGrowth, color = "#3B82F6", label }) {
  const [hovered, setHovered] = useState(null);

  const days = useMemo(() => fillDays(rawGrowth), [rawGrowth]);
  const total = useMemo(() => days.reduce((s, d) => s + d.value, 0), [days]);
  const todaySignups = useMemo(() => days.find(d => d.isToday)?.value || 0, [days]);
  const maxVal = useMemo(() => Math.max(...days.map(d => d.value), 1), [days]);
  const numDays = days.length || 1;

  if (!rawGrowth || rawGrowth.length === 0) {
    return <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Sem dados de signups</div>;
  }

  const chartH = 110;
  const barW = 14;
  const gap = 3;
  const totalW = days.length * (barW + gap);
  const labelEvery = 3; // show date label every N days

  return (
    <div>
      {label && <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</div>}

      {/* Summary stats */}
      <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Total ({numDays}d)</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: todaySignups > 0 ? "#16A34A" : "var(--text-muted)", lineHeight: 1 }}>{todaySignups}</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Hoje</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-faint)", lineHeight: 1 }}>{(total / numDays).toFixed(1)}</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Média/dia</div>
        </div>
      </div>

      {/* Tooltip */}
      {hovered !== null && (
        <div style={{
          fontSize: 11, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6,
          background: "var(--bg-subtle)", borderRadius: 6, padding: "4px 10px", display: "inline-block",
        }}>
          {days[hovered].dayLabel} {days[hovered].label}: <strong style={{ color }}>{days[hovered].value} signup{days[hovered].value !== 1 ? "s" : ""}</strong>
        </div>
      )}

      {/* Chart */}
      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <svg width={Math.max(totalW, 200)} height={chartH + 24} style={{ display: "block" }}>
          {/* Horizontal grid lines */}
          {[0.25, 0.5, 0.75, 1].map(pct => (
            <line key={pct} x1={0} x2={totalW} y1={chartH - chartH * pct} y2={chartH - chartH * pct}
              stroke="var(--bg-subtle)" strokeWidth={1} />
          ))}

          {/* Bars */}
          {days.map((d, i) => {
            const barH = Math.max((d.value / maxVal) * (chartH - 4), d.value > 0 ? 6 : 0);
            const x = i * (barW + gap);
            const isHover = hovered === i;

            return (
              <g key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Hover background */}
                <rect x={x - 1} y={0} width={barW + 2} height={chartH} fill={isHover ? "var(--bg-page)" : "transparent"} rx={3} />

                {/* Bar */}
                <rect
                  x={x}
                  y={chartH - barH}
                  width={barW}
                  height={barH || 1}
                  rx={3}
                  fill={d.isToday ? "#F59E0B" : color}
                  opacity={d.value === 0 ? 0.15 : isHover ? 1 : 0.8}
                />

                {/* Value on top of bar (when hovered or large value) */}
                {d.value > 0 && isHover && (
                  <text x={x + barW / 2} y={chartH - barH - 4} textAnchor="middle"
                    fontSize="10" fontWeight="700" fill={d.isToday ? "#F59E0B" : color}>
                    {d.value}
                  </text>
                )}

                {/* Date label */}
                {(i % labelEvery === 0 || d.isToday) && (
                  <text x={x + barW / 2} y={chartH + 12} textAnchor="middle"
                    fontSize="8" fontWeight={d.isToday ? "700" : "400"}
                    fill={d.isToday ? "#F59E0B" : "var(--text-muted)"}>
                    {d.label}
                  </text>
                )}

                {/* Today dot */}
                {d.isToday && (
                  <circle cx={x + barW / 2} cy={chartH + 19} r={2} fill="#F59E0B" />
                )}
              </g>
            );
          })}

          {/* Max value label */}
          <text x={totalW - 2} y={10} textAnchor="end" fontSize="9" fill="var(--border-medium)">
            max: {maxVal}
          </text>
        </svg>
      </div>
    </div>
  );
}
