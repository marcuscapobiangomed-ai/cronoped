export default function StatCard({ icon, label, value, color = "#0F172A", sub }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      padding: "16px 18px",
      border: "1px solid #E2E8F0",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      flex: 1,
      minWidth: 140,
    }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
