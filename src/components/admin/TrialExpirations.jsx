import { MATERIAS } from "../../scheduleData";

export default function TrialExpirations({ trials }) {
  if (!trials || trials.length === 0) {
    return <div style={{ color: "#94A3B8", fontSize: 12, padding: 12 }}>Nenhum trial expirando nos próximos 3 dias.</div>;
  }

  return (
    <div>
      {trials.map((t, i) => {
        const mat = MATERIAS.find(m => m.id === t.materia);
        const hours = Math.max(0, Math.round(t.hours_remaining));
        const urgent = hours <= 24;
        return (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", borderBottom: "1px solid #F1F5F9",
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
              color: urgent ? "#DC2626" : "#D97706",
              background: urgent ? "#FEF2F2" : "#FEF3C7",
            }}>
              {hours < 24 ? `${hours}h` : `${Math.ceil(hours / 24)}d`}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>{t.nome}</div>
              <div style={{ fontSize: 10, color: "#64748B" }}>{t.email}</div>
            </div>
            <div style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>
              {mat?.icon} {mat?.label || t.materia}
            </div>
          </div>
        );
      })}
    </div>
  );
}
