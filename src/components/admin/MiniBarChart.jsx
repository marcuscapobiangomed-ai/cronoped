export default function MiniBarChart({ data, color = "#3B82F6", height = 100, label }) {
  if (!data || data.length === 0) return <div style={{ color: "#94A3B8", fontSize: 12 }}>Sem dados</div>;

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW = 8;
  const gap = 4;
  const totalW = data.length * (barW + gap);
  const chartH = height - 20;

  return (
    <div>
      {label && <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>{label}</div>}
      <div style={{ overflowX: "auto" }}>
        <svg width={Math.max(totalW, 200)} height={height} style={{ display: "block" }}>
          {data.map((d, i) => {
            const barH = Math.max((d.value / maxVal) * chartH, d.value > 0 ? 4 : 0);
            const x = i * (barW + gap);
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={chartH - barH}
                  width={barW}
                  height={barH}
                  rx={2}
                  fill={color}
                  opacity={0.85}
                >
                  <title>{d.label}: {d.value}</title>
                </rect>
                {i % 7 === 0 && (
                  <text x={x + barW / 2} y={height - 2} textAnchor="middle" fontSize="8" fill="#94A3B8">
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
