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
    case "payment_failure": return `Falha de pagamento${meta?.materia ? ` - ${meta.materia}` : ""}`;
    case "edge_fn_error":   return `Erro edge function${meta?.fn ? ` - ${meta.fn}` : ""}`;
    case "error":           return `Erro no sistema`;
    default:                return `Alerta: ${type}`;
  }
}

function buildEmailHtml(
  type: string,
  meta: Record<string, unknown>,
  user_name?: string,
  user_email?: string,
): string {
  const metaStr = meta && Object.keys(meta).length > 0
    ? Object.entries(meta).map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`).join("")
    : "<li>Sem dados adicionais</li>";

  return `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#0F172A;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:16px">🚨 CronoPed Alert</h2>
      </div>
      <div style="background:#fff;padding:20px 24px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 8px 8px">
        <p style="margin:0 0 12px"><strong>Tipo:</strong> <code style="background:#FEF2F2;color:#DC2626;padding:2px 8px;border-radius:4px">${type}</code></p>
        ${user_name ? `<p style="margin:0 0 6px"><strong>Usuário:</strong> ${user_name} (${user_email || "?"})</p>` : ""}
        <p style="margin:12px 0 6px"><strong>Detalhes:</strong></p>
        <ul style="margin:0;padding-left:20px;color:#475569">${metaStr}</ul>
        <hr style="border:none;border-top:1px solid #E2E8F0;margin:16px 0"/>
        <p style="margin:0;font-size:12px;color:#94A3B8">${new Date().toISOString()}</p>
      </div>
    </div>
  `;
}
