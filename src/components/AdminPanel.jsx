import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabase";
import { fetchAdminData } from "../lib/adminApi";
import StatCard from "./admin/StatCard";
import MiniBarChart from "./admin/MiniBarChart";
import EventFeed from "./admin/EventFeed";
import ConversionTable from "./admin/ConversionTable";
import TrialExpirations from "./admin/TrialExpirations";
import SupportTickets from "./admin/SupportTickets";
import UserManager from "./admin/UserManager";

const TABS = [
  { key: "overview",   label: "Overview" },
  { key: "eventos",    label: "Eventos" },
  { key: "suporte",    label: "Suporte" },
  { key: "usuarios",   label: "Usuários" },
  { key: "afiliados",  label: "Afiliados" },
];

export default function AdminPanel({ onBack }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [tab, setTab]         = useState("overview");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [users, setUsers] = useState([]);
  const [showOnline, setShowOnline] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [expandedAffiliate, setExpandedAffiliate] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [commLoading, setCommLoading] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(null);
  const [realtimeStatus, setRealtimeStatus] = useState("connecting"); // "connecting" | "live" | "error"
  const debounceRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const d = await fetchAdminData();
      setData(d);
      setError(null);
      setLastRefresh(new Date());
      const { data: usersData } = await supabase.rpc("admin_list_users");
      if (usersData) setUsers(usersData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced reload — agrupa rajadas de eventos em 1 chamada
  const debouncedLoad = useCallback(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadData(), 1500);
  }, [loadData]);

  useEffect(() => {
    loadData();
    // Fallback polling a cada 30s caso realtime caia
    const interval = setInterval(loadData, 30000);

    // Realtime: escuta mudanças em acessos, profiles e eventos
    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "acessos" },   debouncedLoad)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" },  debouncedLoad)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "eventos" }, debouncedLoad)
      .on("postgres_changes", { event: "*", schema: "public", table: "affiliate_commissions" }, debouncedLoad)
      .subscribe((status) => {
        if (status === "SUBSCRIBED")   setRealtimeStatus("live");
        else if (status === "CLOSED" || status === "CHANNEL_ERROR") setRealtimeStatus("error");
        else setRealtimeStatus("connecting");
      });

    return () => {
      clearInterval(interval);
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [loadData, debouncedLoad]);

  function timeSinceRefresh() {
    if (!lastRefresh) return "";
    const s = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
    if (s < 5) return "agora";
    if (s < 60) return `${s}s atrás`;
    return `${Math.floor(s / 60)}m atrás`;
  }

  async function loadCommissions(affiliateId) {
    if (expandedAffiliate === affiliateId) {
      setExpandedAffiliate(null);
      return;
    }
    setExpandedAffiliate(affiliateId);
    setCommLoading(true);
    try {
      const { data: comms } = await supabase.rpc("admin_list_commissions", { p_affiliate_id: affiliateId });
      setCommissions(comms || []);
    } catch (err) {
      console.error("admin_list_commissions:", err.message);
      setCommissions([]);
    }
    setCommLoading(false);
  }

  async function handleMarkPaid(commissionId) {
    setMarkingPaid(commissionId);
    try {
      await supabase.rpc("admin_mark_commission_paid", { p_commission_id: commissionId });
      // Reload commissions for current affiliate
      if (expandedAffiliate) {
        const { data: comms } = await supabase.rpc("admin_list_commissions", { p_affiliate_id: expandedAffiliate });
        setCommissions(comms || []);
      }
      // Refresh main data to update totals
      loadData();
    } catch (err) {
      console.error("admin_mark_commission_paid:", err.message);
    }
    setMarkingPaid(null);
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Realtime indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: realtimeStatus === "live" ? "#22C55E" : realtimeStatus === "error" ? "#EF4444" : "#F59E0B",
                boxShadow: realtimeStatus === "live" ? "0 0 0 2px rgba(34,197,94,0.3)" : "none",
                animation: realtimeStatus === "live" ? "pulse 2s infinite" : "none",
              }} />
              <span style={{ fontSize: 10, color: realtimeStatus === "live" ? "#22C55E" : realtimeStatus === "error" ? "#EF4444" : "#F59E0B", fontWeight: 700 }}>
                {realtimeStatus === "live" ? "Live" : realtimeStatus === "error" ? "Offline" : "..."}
              </span>
            </div>
            <span style={{ fontSize: 11, color: "#475569" }}>⟳ {timeSinceRefresh()}</span>
            <button onClick={loadData} style={{ background: "#1E293B", border: "none", color: "#94A3B8", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Atualizar</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 16px 8px" }}>
        {/* Stats row */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <StatCard icon="👥" label="Total Usuários" value={data?.total_users || 0} color="#0F172A" />
          <StatCard icon="🟢" label="Online agora" value={sessions.active_now || 0} color="#16A34A" sub={`${sessions.active_1h || 0} na última hora`} onClick={() => setShowOnline(true)} />
          <StatCard icon="💰" label="Receita total" value={`R$ ${Number(data?.total_revenue || 0).toFixed(2)}`} color="#16A34A" />
          <StatCard icon="📈" label="Pagantes" value={data?.total_paid || 0} color="#2563EB" sub={data?.total_users ? `${Math.round((data.total_paid / data.total_users) * 100)}% conversão` : ""} />
          {(data?.support_tickets || []).filter(t => t.status === "aberto").length > 0 && (
            <StatCard icon="💬" label="Tickets abertos" value={(data?.support_tickets || []).filter(t => t.status === "aberto").length} color="#F59E0B" />
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 8, background: "#E2E8F0", borderRadius: 8, padding: 3 }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: 8 }}>
            {/* Signups chart — col 1, row 1 */}
            <div style={{ background: "#fff", borderRadius: 10, padding: 12, border: "1px solid #E2E8F0" }}>
              <MiniBarChart rawGrowth={data?.user_growth} color="#3B82F6" label="📊 Novos cadastros (desde 24/02)" />
            </div>

            {/* Devices — col 2, row 1 */}
            <div style={{ background: "#fff", borderRadius: 10, padding: 12, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 8 }}>📱 Dispositivos</div>
              {devices.map(d => (
                <div key={d.device} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 60, fontSize: 11, fontWeight: 600, color: "#475569" }}>{d.device}</div>
                  <div style={{ flex: 1, height: 6, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${Math.round((d.sessions / totalDeviceSessions) * 100)}%`, height: "100%", background: "#3B82F6", borderRadius: 99 }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#94A3B8", width: 32, textAlign: "right" }}>{Math.round((d.sessions / totalDeviceSessions) * 100)}%</div>
                </div>
              ))}
              {devices.length === 0 && <div style={{ fontSize: 11, color: "#94A3B8" }}>Sem sessões ativas</div>}
            </div>

            {/* Conversion — col 3, spans both rows */}
            <div style={{ background: "#fff", borderRadius: 10, padding: 12, border: "1px solid #E2E8F0", gridRow: "1 / 3" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 8 }}>📊 Conversão por matéria</div>
              <ConversionTable funnel={data?.conversion_funnel} revenue={data?.revenue} />
            </div>

            {/* Engagement — col 1, row 2 */}
            <div style={{ background: "#fff", borderRadius: 10, padding: 12, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 8 }}>📚 Engajamento</div>
              {(data?.engagement || []).map(e => (
                <div key={e.materia} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #F1F5F9", fontSize: 11 }}>
                  <span style={{ fontWeight: 600, color: "#0F172A" }}>{e.materia}</span>
                  <span style={{ color: "#64748B" }}>{e.users_with_progress} users · {e.avg_completed} avg</span>
                </div>
              ))}
              {(!data?.engagement || data.engagement.length === 0) && <div style={{ fontSize: 11, color: "#94A3B8" }}>Sem dados</div>}
            </div>

            {/* Expiring trials — col 2, row 2 */}
            <div style={{ background: "#fff", borderRadius: 10, padding: 12, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 8 }}>⏳ Trials expirando (3 dias)</div>
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

        {tab === "suporte" && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>💬 Tickets de suporte</div>
              <span style={{ fontSize: 11, color: "#64748B" }}>{(data?.support_tickets || []).filter(t => t.status === "aberto").length} abertos</span>
            </div>
            <SupportTickets tickets={data?.support_tickets} onRefresh={loadData} />
          </div>
        )}

        {tab === "usuarios" && (
          <UserManager users={users} onRefresh={loadData} initialSearch={userSearch} />
        )}

        {tab === "afiliados" && (() => {
          const affiliates = data?.affiliates || [];
          const totalComissao = affiliates.reduce((s, a) => s + Number(a.comissao_total || 0), 0);
          const totalPendente = affiliates.reduce((s, a) => s + Number(a.comissao_pendente || 0), 0);
          const totalReferred = affiliates.reduce((s, a) => s + (a.total_referred || 0), 0);

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Stats */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <StatCard icon="🔗" label="Afiliados ativos" value={affiliates.length} color="#059669" />
                <StatCard icon="👥" label="Total indicados" value={totalReferred} color="#2563EB" />
                <StatCard icon="💰" label="Comissão total" value={`R$ ${totalComissao.toFixed(2)}`} color="#059669" />
                <StatCard icon="⏳" label="Pendente" value={`R$ ${totalPendente.toFixed(2)}`} color="#F59E0B" />
              </div>

              {/* Lista de afiliados */}
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>🔗 Afiliados</div>
                </div>
                {affiliates.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
                    Nenhum afiliado cadastrado ainda.
                  </div>
                ) : (
                  <div style={{ overflow: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "#F8FAFC" }}>
                          <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Afiliado</th>
                          <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Código</th>
                          <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Indicados</th>
                          <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Pagantes</th>
                          <th style={{ textAlign: "right", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Comissão</th>
                          <th style={{ textAlign: "right", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Pendente</th>
                          <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {affiliates.map((a, i) => (
                          <React.Fragment key={a.user_id || i}>
                            <tr style={{ borderBottom: "1px solid #F1F5F9", cursor: "pointer" }} onClick={() => loadCommissions(a.user_id)}>
                              <td style={{ padding: "10px 14px" }}>
                                <div style={{ fontWeight: 600, color: "#0F172A" }}>
                                  {a.nome || "Sem nome"}
                                  {(() => {
                                    const tp = a.total_paid || 0;
                                    const pct = tp <= 5 ? 10 : tp <= 20 ? 20 : tp <= 40 ? 30 : 40;
                                    return <span style={{ fontSize: 9, fontWeight: 700, color: "#059669", background: "#F0FDF4", padding: "1px 6px", borderRadius: 99, marginLeft: 6 }}>{pct}%</span>;
                                  })()}
                                </div>
                                <div style={{ fontSize: 10, color: "#94A3B8" }}>{a.email}</div>
                              </td>
                              <td style={{ padding: "10px 14px" }}>
                                <span style={{ background: "#F0FDF4", color: "#059669", padding: "3px 8px", borderRadius: 6, fontWeight: 700, fontSize: 11 }}>
                                  {a.code}
                                </span>
                              </td>
                              <td style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: "#0F172A" }}>{a.total_referred || 0}</td>
                              <td style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: "#059669" }}>{a.total_paid || 0}</td>
                              <td style={{ textAlign: "right", padding: "10px 14px", fontWeight: 700, color: "#0F172A" }}>R$ {Number(a.comissao_total || 0).toFixed(2)}</td>
                              <td style={{ textAlign: "right", padding: "10px 14px" }}>
                                {Number(a.comissao_pendente || 0) > 0 ? (
                                  <span style={{ color: "#F59E0B", fontWeight: 700 }}>R$ {Number(a.comissao_pendente).toFixed(2)}</span>
                                ) : (
                                  <span style={{ color: "#94A3B8" }}>R$ 0.00</span>
                                )}
                              </td>
                              <td style={{ textAlign: "center", padding: "10px 14px" }}>
                                <span style={{ fontSize: 12, color: "#94A3B8" }}>{expandedAffiliate === a.user_id ? "▼" : "▶"}</span>
                              </td>
                            </tr>
                            {/* Expanded: commission details */}
                            {expandedAffiliate === a.user_id && (
                              <tr>
                                <td colSpan={7} style={{ padding: 0 }}>
                                  <div style={{ background: "#F8FAFC", padding: "12px 14px", borderBottom: "2px solid #E2E8F0" }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 8 }}>
                                      Comissões de {a.nome || a.code}
                                      <span style={{ marginLeft: 8, fontSize: 10, color: "#94A3B8", fontWeight: 400 }}>
                                        Faixa atual: {(a.total_paid || 0) <= 5 ? "10%" : (a.total_paid || 0) <= 20 ? "20%" : (a.total_paid || 0) <= 40 ? "30%" : "40%"} (1-5: 10%, 6-20: 20%, 21-40: 30%, 41+: 40%)
                                      </span>
                                    </div>
                                    {commLoading ? (
                                      <div style={{ fontSize: 11, color: "#94A3B8", padding: 8 }}>Carregando...</div>
                                    ) : commissions.length === 0 ? (
                                      <div style={{ fontSize: 11, color: "#94A3B8", padding: 8 }}>Nenhuma comissão registrada.</div>
                                    ) : (
                                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                                        <thead>
                                          <tr style={{ background: "#E2E8F0" }}>
                                            <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600, color: "#475569" }}>Indicado</th>
                                            <th style={{ textAlign: "center", padding: "6px 10px", fontWeight: 600, color: "#475569" }}>Matéria</th>
                                            <th style={{ textAlign: "right", padding: "6px 10px", fontWeight: 600, color: "#475569" }}>Venda</th>
                                            <th style={{ textAlign: "right", padding: "6px 10px", fontWeight: 600, color: "#475569" }}>Comissão</th>
                                            <th style={{ textAlign: "center", padding: "6px 10px", fontWeight: 600, color: "#475569" }}>Status</th>
                                            <th style={{ textAlign: "center", padding: "6px 10px", fontWeight: 600, color: "#475569" }}>Ação</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {commissions.map(c => (
                                            <tr key={c.id} style={{ borderBottom: "1px solid #E2E8F0" }}>
                                              <td style={{ padding: "8px 10px" }}>
                                                <div style={{ fontWeight: 600, color: "#0F172A" }}>{c.referred_nome || "—"}</div>
                                                <div style={{ fontSize: 9, color: "#94A3B8" }}>{c.referred_email}</div>
                                              </td>
                                              <td style={{ textAlign: "center", padding: "8px 10px", fontWeight: 600, color: "#0F172A", textTransform: "uppercase" }}>{c.materia}</td>
                                              <td style={{ textAlign: "right", padding: "8px 10px", color: "#475569" }}>R$ {Number(c.valor_venda || 0).toFixed(2)}</td>
                                              <td style={{ textAlign: "right", padding: "8px 10px", fontWeight: 700, color: "#059669" }}>R$ {Number(c.comissao_valor || 0).toFixed(2)}</td>
                                              <td style={{ textAlign: "center", padding: "8px 10px" }}>
                                                {c.status === "pago" ? (
                                                  <span style={{ background: "#DCFCE7", color: "#16A34A", padding: "2px 8px", borderRadius: 99, fontWeight: 700, fontSize: 10 }}>Pago</span>
                                                ) : (
                                                  <span style={{ background: "#FEF3C7", color: "#92400E", padding: "2px 8px", borderRadius: 99, fontWeight: 700, fontSize: 10 }}>Pendente</span>
                                                )}
                                              </td>
                                              <td style={{ textAlign: "center", padding: "8px 10px" }}>
                                                {c.status === "pendente" ? (
                                                  <button
                                                    onClick={(e) => { e.stopPropagation(); handleMarkPaid(c.id); }}
                                                    disabled={markingPaid === c.id}
                                                    style={{
                                                      background: "#16A34A", color: "#fff", border: "none", borderRadius: 4,
                                                      padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer",
                                                    }}
                                                  >
                                                    {markingPaid === c.id ? "..." : "Marcar pago"}
                                                  </button>
                                                ) : (
                                                  <span style={{ fontSize: 10, color: "#94A3B8" }}>--</span>
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Online Users Modal */}
      {showOnline && (() => {
        const onlineUsers = data?.online_users || [];

        function parseDevice(ua) {
          if (!ua) return { os: "Desconhecido", icon: "❓" };
          const s = ua.toLowerCase();
          if (s.includes("iphone")) return { os: "iPhone (iOS)", icon: "📱" };
          if (s.includes("ipad")) return { os: "iPad (iOS)", icon: "📱" };
          if (s.includes("android")) return { os: "Android", icon: "📱" };
          if (s.includes("macintosh") || s.includes("mac os")) return { os: "MacOS", icon: "💻" };
          if (s.includes("windows")) return { os: "Windows", icon: "🖥️" };
          if (s.includes("linux")) return { os: "Linux", icon: "🐧" };
          return { os: "Outro", icon: "🌐" };
        }

        function parseBrowser(ua) {
          if (!ua) return "";
          if (ua.includes("CriOS") || (ua.includes("Chrome") && !ua.includes("Edg"))) return "Chrome";
          if (ua.includes("Safari") && !ua.includes("Chrome") && !ua.includes("CriOS")) return "Safari";
          if (ua.includes("Firefox") || ua.includes("FxiOS")) return "Firefox";
          if (ua.includes("Edg")) return "Edge";
          if (ua.includes("OPR") || ua.includes("Opera")) return "Opera";
          return "";
        }

        return (
          <div onClick={() => setShowOnline(false)} style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, padding: 24,
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: "#fff", borderRadius: 16, padding: "24px", maxWidth: 480, width: "100%",
              maxHeight: "70vh", overflow: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>
                  🟢 Online agora ({onlineUsers.length})
                </div>
                <button onClick={() => setShowOnline(false)} style={{
                  background: "#F1F5F9", border: "none", borderRadius: 8, width: 28, height: 28,
                  cursor: "pointer", fontSize: 14, color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center",
                }}>✕</button>
              </div>
              {onlineUsers.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94A3B8", fontSize: 13, padding: 20 }}>
                  Nenhum usuário online no momento
                </div>
              ) : (
                onlineUsers.map((u, i) => {
                  const lastSeen = new Date(u.last_seen);
                  const secsAgo = Math.floor((Date.now() - lastSeen.getTime()) / 1000);
                  const timeAgo = secsAgo < 60 ? `${secsAgo}s atrás` : `${Math.floor(secsAgo / 60)}m atrás`;
                  const device = parseDevice(u.device_info);
                  const browser = parseBrowser(u.device_info);
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "12px 0", borderBottom: i < onlineUsers.length - 1 ? "1px solid #F1F5F9" : "none",
                    }}>
                      <div style={{ fontSize: 20 }}>{device.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{u.nome || "Sem nome"}</div>
                        <div style={{ fontSize: 11, color: "#64748B" }}>{u.email}</div>
                        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>
                          {device.os}{browser ? ` · ${browser}` : ""} · <span style={{ color: "#16A34A", fontWeight: 600 }}>{timeAgo}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => { setShowOnline(false); setUserSearch(u.email); setTab("usuarios"); }}
                        style={{ background: "#F1F5F9", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 10, fontWeight: 700, color: "#475569", cursor: "pointer", whiteSpace: "nowrap" }}
                      >
                        Editar
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
