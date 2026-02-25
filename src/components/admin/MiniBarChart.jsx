export default function MiniBarChart({ data, color = "#3B82F6", height = 100, label }) {
  if (!data || data.length === 0) return <div style={{ color: "#94A3B8", fontSize: 12 }}>Sem dados</div>;

  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <div>
      {label && <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>{label}</div>}
      <svg width="100%" height={height} viewBox={`0 0 ${data.length * 14} ${height}`} preserveAspectRatio="none">
        {data.map((d, i) => {
          const barH = (d.value / maxVal) * (height - 20);
          return (
            <g key={i}>
              <rect
                x={i * 14 + 2}
                y={height - barH - 16}
                width={10}
                height={barH}
                rx={3}
                fill={color}
                opacity={0.8}
              >
                <title>{d.label}: {d.value}</title>
              </rect>
              {i % 7 === 0 && (
                <text x={i * 14 + 7} y={height - 2} textAnchor="middle" fontSize="7" fill="#94A3B8">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
