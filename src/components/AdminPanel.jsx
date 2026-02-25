import { useState, useEffect, useCallback } from "react";
import { fetchAdminData } from "../lib/adminApi";
import StatCard from "./admin/StatCard";
import MiniBarChart from "./admin/MiniBarChart";
import EventFeed from "./admin/EventFeed";
import ConversionTable from "./admin/ConversionTable";
import TrialExpirations from "./admin/TrialExpirations";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "eventos",  label: "Eventos" },
  { key: "usuarios", label: "Usuários" },
];

export default function AdminPanel({ onBack }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [tab, setTab]         = useState("overview");
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const d = await fetchAdminData();
      setData(d);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  function timeSinceRefresh() {
    if (!lastRefresh) return "";
    const s = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
    if (s < 5) return "agora";
    if (s < 60) return `${s}s atrás`;
    return `${Math.floor(s / 60)}m atrás`;
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#64748B", fontSize: 15 }}>
      Carregando painel admin…
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16, color: "#64748B", padding: 24 }}>
      <span style={{ fontSize: 48 }}>⚠️</span>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#DC2626" }}>Erro: {error}</div>
      <button onClick={onBack} style={{ background: "#0F172A", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>← Voltar</button>
    </div>
  );

  const sessions = data?.active_sessions || {};
  const growth = (data?.user_growth || []).map(d => ({
    label: new Date(d.day).getDate().toString(),
    value: d.signups,
  }));
  const devices = data?.devices || [];
  const totalDeviceSessions = devices.reduce((s, d) => s + d.sessions, 0) || 1;

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      {/* Header */}
      <div style={{ background: "#0F172A", padding: "14px 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={onBack} style={{ background: "#1E293B", border: "none", color: "#94A3B8", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>🔧 Painel Admin</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: "#64748B" }}>⟳ {timeSinceRefresh()}</span>
            <button onClick={loadData} style={{ background: "#1E293B", border: "none", color: "#94A3B8", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Atualizar</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px 40px" }}>
        {/* Stats row */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          <StatCard icon="👥" label="Total Usuários" value={data?.total_users || 0} color="#0F172A" />
          <StatCard icon="🟢" label="Online agora" value={sessions.active_now || 0} color="#16A34A" sub={`${sessions.active_1h || 0} na última hora`} />
          <StatCard icon="💰" label="Receita total" value={`R$ ${Number(data?.total_revenue || 0).toFixed(2)}`} color="#16A34A" />
          <StatCard icon="📈" label="Pagantes" value={data?.total_paid || 0} color="#2563EB" sub={data?.total_users ? `${Math.round((data.total_paid / data.total_users) * 100)}% conversão` : ""} />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#E2E8F0", borderRadius: 8, padding: 3 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: "8px 14px", borderRadius: 6, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 700, transition: "all 0.15s",
              background: tab === t.key ? "#fff" : "transparent",
              color: tab === t.key ? "#0F172A" : "#64748B",
              boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}>{t.label}</button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 14 }}>
            {/* Signups chart */}
            <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #E2E8F0" }}>
              <MiniBarChart data={growth} color="#3B82F6" height={100} label="📊 Signups (30 dias)" />
            </div>

            {/* Devices */}
            <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 10 }}>📱 Dispositivos</div>
              {devices.map(d => (
                <div key={d.device} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 70, fontSize: 11, fontWeight: 600, color: "#475569" }}>{d.device}</div>
                  <div style={{ flex: 1, height: 8, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${Math.round((d.sessions / totalDeviceSessions) * 100)}%`, height: "100%", background: "#3B82F6", borderRadius: 99 }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#94A3B8", width: 35, textAlign: "right" }}>{Math.round((d.sessions / totalDeviceSessions) * 100)}%</div>
                </div>
              ))}
              {devices.length === 0 && <div style={{ fontSize: 12, color: "#94A3B8" }}>Sem sessões ativas</div>}
            </div>

            {/* Conversion */}
            <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #E2E8F0", gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 10 }}>📊 Conversão por matéria</div>
              <ConversionTable funnel={data?.conversion_funnel} revenue={data?.revenue} />
            </div>

            {/* Engagement */}
            <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 10 }}>📚 Engajamento</div>
              {(data?.engagement || []).map(e => (
                <div key={e.materia} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F1F5F9", fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: "#0F172A" }}>{e.materia}</span>
                  <span style={{ color: "#64748B" }}>{e.users_with_progress} users · {e.avg_completed} atividades avg</span>
                </div>
              ))}
              {(!data?.engagement || data.engagement.length === 0) && <div style={{ fontSize: 12, color: "#94A3B8" }}>Sem dados de progresso</div>}
            </div>

            {/* Expiring trials */}
            <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 10 }}>⏳ Trials expirando (3 dias)</div>
              <TrialExpirations trials={data?.expiring_trials} />
            </div>
          </div>
        )}

        {tab === "eventos" && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>📋 Eventos recentes (últimos 50)</div>
            </div>
            <EventFeed events={data?.recent_events} />
          </div>
        )}

        {tab === "usuarios" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 14 }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #E2E8F0", gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 10 }}>📊 Funil de conversão</div>
              <ConversionTable funnel={data?.conversion_funnel} revenue={data?.revenue} />
            </div>
            <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 10 }}>⏳ Trials expirando</div>
              <TrialExpirations trials={data?.expiring_trials} />
            </div>
            <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #E2E8F0" }}>
              <MiniBarChart data={growth} color="#2563EB" height={100} label="📈 Crescimento (30 dias)" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
