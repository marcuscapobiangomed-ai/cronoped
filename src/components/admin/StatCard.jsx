export default function StatCard({ icon, label, value, color = "#0F172A", sub, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: "#fff",
      borderRadius: 10,
      padding: "10px 14px",
      border: "1px solid #E2E8F0",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      flex: 1,
      minWidth: 130,
      cursor: onClick ? "pointer" : "default",
      transition: "all 0.15s",
    }}>
      <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 3, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
