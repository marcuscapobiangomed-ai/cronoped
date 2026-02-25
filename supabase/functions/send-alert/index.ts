// Supabase Edge Function: send-alert
// Envia emails de alerta para o admin quando ocorrem eventos críticos
// Chamada internamente pelo trigger do PostgreSQL via pg_net
//
// Deploy: supabase functions deploy send-alert
// Secrets: RESEND_API_KEY (criar conta em resend.com)
// Config: verify_jwt = false (chamada interna)

const RESEND_KEY  = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = "marcuscapobiangomed@gmail.com";
const FROM_EMAIL  = "CronoPed <onboarding@resend.dev>"; // Resend sandbox
const APP_URL     = "https://plannerinternato.marcuscapobiangomed.workers.dev";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("method not allowed", { status: 405 });
    }

    if (!RESEND_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response("resend not configured", { status: 500 });
    }

    const { type, meta, user_name, user_email } = await req.json();

    const subject = `[CronoPed] ${formatSubject(type, meta)}`;
    const html = buildEmailHtml(type, meta, user_name, user_email);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return new Response("email send failed", { status: 502 });
    }

    console.log(`Alert sent: ${type}`);
    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("send-alert error:", err);
    return new Response("internal error", { status: 500 });
  }
});

function formatSubject(type: string, meta: Record<string, unknown>): string {
  switch (type) {
    case "payment_failure":  return `Falha de pagamento${meta?.materia ? ` - ${meta.materia}` : ""}`;
    case "payment_success":  return `Pagamento confirmado${meta?.materia ? ` - ${meta.materia}` : ""}`;
    case "edge_fn_error":    return `Erro edge function${meta?.fn ? ` - ${meta.fn}` : ""}`;
    case "error":            return `Erro no sistema`;
    case "suporte_ticket":   return `Novo ticket: ${meta?.assunto || "Suporte"}`;
    default:                 return `Alerta: ${type}`;
  }
}

const TYPE_CONFIG: Record<string, { icon: string; title: string; accent: string; bg: string }> = {
  payment_failure: { icon: "💳", title: "Falha de Pagamento",    accent: "#DC2626", bg: "#FEF2F2" },
  payment_success: { icon: "✅", title: "Pagamento Confirmado", accent: "#16A34A", bg: "#F0FDF4" },
  edge_fn_error:   { icon: "⚙️", title: "Erro Edge Function",   accent: "#F59E0B", bg: "#FFFBEB" },
  error:           { icon: "🔴", title: "Erro no Sistema",      accent: "#DC2626", bg: "#FEF2F2" },
  suporte_ticket:  { icon: "💬", title: "Novo Ticket de Suporte",accent: "#4338CA", bg: "#EEF2FF" },
};

function buildEmailHtml(
  type: string,
  meta: Record<string, unknown>,
  user_name?: string,
  user_email?: string,
): string {
  const cfg = TYPE_CONFIG[type] || { icon: "📢", title: type, accent: "#475569", bg: "#F8FAFC" };
  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  // Ticket de suporte — layout especial
  if (type === "suporte_ticket") {
    return wrap(cfg, `
      <tr><td style="padding:0 0 14px">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td style="font-size:13px;color:#475569;font-weight:600">De:</td>
          <td style="font-size:13px;color:#0F172A;text-align:right">${user_name || "?"} (${user_email || "?"})</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:0 0 14px">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td style="font-size:13px;color:#475569;font-weight:600">Assunto:</td>
          <td style="text-align:right"><span style="background:${cfg.bg};color:${cfg.accent};padding:3px 12px;border-radius:6px;font-size:12px;font-weight:700">${meta?.assunto || "?"}</span></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:0 0 16px">
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px">
          <p style="margin:0;font-size:13px;color:#0F172A;line-height:1.6;white-space:pre-wrap">${meta?.mensagem || ""}</p>
        </div>
      </td></tr>
    `, now, meta?.ticket_id ? `Ticket #${meta.ticket_id}` : "");
  }

  // Alerta genérico — layout com detalhes
  const rows = meta && Object.keys(meta).length > 0
    ? Object.entries(meta).map(([k, v]) => `
        <tr>
          <td style="font-size:12px;color:#64748B;padding:6px 0;border-bottom:1px solid #F1F5F9;font-weight:600;width:120px">${k}</td>
          <td style="font-size:12px;color:#0F172A;padding:6px 0;border-bottom:1px solid #F1F5F9">${v}</td>
        </tr>
      `).join("")
    : `<tr><td style="font-size:12px;color:#94A3B8;padding:8px 0">Sem dados adicionais</td></tr>`;

  return wrap(cfg, `
    ${user_name ? `
    <tr><td style="padding:0 0 14px">
      <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="font-size:13px;color:#475569;font-weight:600">Usuário:</td>
        <td style="font-size:13px;color:#0F172A;text-align:right">${user_name} (${user_email || "?"})</td>
      </tr></table>
    </td></tr>
    ` : ""}
    <tr><td style="padding:0 0 4px;font-size:12px;font-weight:700;color:#475569">Detalhes</td></tr>
    <tr><td style="padding:0 0 16px">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse">${rows}</table>
    </td></tr>
  `, now, "");
}

function wrap(
  cfg: { icon: string; title: string; accent: string; bg: string },
  body: string,
  now: string,
  extra: string,
): string {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:24px;background:#F1F5F9;font-family:system-ui,-apple-system,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;margin:0 auto">
  <!-- Header -->
  <tr><td style="background:#0F172A;padding:20px 24px;border-radius:12px 12px 0 0">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="font-size:20px;line-height:1">${cfg.icon}</td>
      <td style="padding-left:12px">
        <div style="font-size:16px;font-weight:800;color:#fff;margin:0">${cfg.title}</div>
        <div style="font-size:11px;color:#64748B;margin-top:2px">CronoPed · Internato M1</div>
      </td>
    </tr></table>
  </td></tr>

  <!-- Accent bar -->
  <tr><td style="height:3px;background:${cfg.accent}"></td></tr>

  <!-- Body -->
  <tr><td style="background:#fff;padding:24px;border:1px solid #E2E8F0;border-top:none">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${body}
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#F8FAFC;padding:14px 24px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="font-size:11px;color:#94A3B8">${now}${extra ? ` · ${extra}` : ""}</td>
      <td style="font-size:11px;text-align:right"><a href="${APP_URL}" style="color:#2563EB;text-decoration:none;font-weight:600">Abrir CronoPed →</a></td>
    </tr></table>
  </td></tr>
</table>
</body></html>
  `;
}
