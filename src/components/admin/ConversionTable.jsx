import { MATERIAS } from "../../scheduleData";

export default function ConversionTable({ funnel, revenue }) {
  const revenueMap = {};
  (revenue || []).forEach(r => { revenueMap[r.materia] = r; });

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #E2E8F0" }}>
            {["Matéria", "Trial", "Pendente", "Pago", "Receita"].map(h => (
              <th key={h} style={{ padding: "5px 8px", textAlign: "left", color: "#64748B", fontWeight: 700, fontSize: 11 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(funnel || []).map(row => {
            const mat = MATERIAS.find(m => m.id === row.materia);
            const rev = revenueMap[row.materia];
            const total = row.trials + row.pending + row.paid;
            const convPct = total > 0 ? Math.round((row.paid / total) * 100) : 0;
            return (
              <tr key={row.materia} style={{ borderBottom: "1px solid #F1F5F9" }}>
                <td style={{ padding: "5px 8px", fontWeight: 600, color: "#0F172A" }}>
                  {mat?.icon} {mat?.label || row.materia}
                </td>
                <td style={{ padding: "5px 8px", color: "#D97706" }}>{row.trials}</td>
                <td style={{ padding: "5px 8px", color: "#94A3B8" }}>{row.pending}</td>
                <td style={{ padding: "5px 8px" }}>
                  <span style={{ fontWeight: 700, color: "#16A34A" }}>{row.paid}</span>
                  <span style={{ fontSize: 10, color: "#94A3B8", marginLeft: 4 }}>({convPct}%)</span>
                </td>
                <td style={{ padding: "5px 8px", fontWeight: 700, color: "#0F172A" }}>
                  R$ {rev ? Number(rev.revenue_brl).toFixed(2) : "0,00"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
