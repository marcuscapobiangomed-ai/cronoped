// Supabase Edge Function: pre-mp-webhook
// Webhook do Mercado Pago para Cronograma 2026.1 (tabelas pre_)
// Deploy: supabase functions deploy pre-mp-webhook --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const MP_TOKEN          = Deno.env.get("MP_ACCESS_TOKEN")!;
const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET") || "";
const RESEND_KEY        = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL        = Deno.env.get("FROM_EMAIL") || "Meu Planner <onboarding@resend.dev>";
const APP_URL           = Deno.env.get("PRE_APP_URL") || "https://cronopre.modulo1.workers.dev";

async function verifySignature(req: Request, dataId: string): Promise<boolean> {
  if (!MP_WEBHOOK_SECRET) {
    console.error("CRITICAL: MP_WEBHOOK_SECRET not configured — rejecting webhook");
    return false;
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  if (!xSignature || !xRequestId) return false;

  const parts: Record<string, string> = {};
  xSignature.split(",").forEach(p => {
    const [k, v] = p.split("=", 2);
    if (k && v) parts[k.trim()] = v.trim();
  });

  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(MP_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

  return computed === v1;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    let topic = url.searchParams.get("topic") || url.searchParams.get("type");
    let paymentId = url.searchParams.get("id") || url.searchParams.get("data.id");

    let bodyText: string | null = null;
    if (!paymentId && req.method === "POST") {
      try {
        bodyText = await req.text();
        const body = JSON.parse(bodyText);
        if (!topic) topic = body.type || body.topic;
        if (!paymentId) paymentId = body.data?.id?.toString() || body.id?.toString();
      } catch { /* body não é JSON */ }
    }

    if (topic !== "payment" || !paymentId) {
      return new Response("ok", { status: 200 });
    }

    if (!/^\d+$/.test(paymentId)) {
      console.warn(`webhook id invalido: ${paymentId}`);
      return new Response("invalid id", { status: 400 });
    }

    const sigValid = await verifySignature(req, paymentId);
    if (!sigValid) {
      console.warn("webhook signature invalida");
      return new Response("invalid signature", { status: 401 });
    }

    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${MP_TOKEN}` }
    });

    if (!mpResp.ok) {
      console.error(`Erro ao consultar MP: status=${mpResp.status}`);
      return new Response("mp error", { status: 502 });
    }

    const payment = await mpResp.json();

    if (!payment.external_reference) {
      console.log(`webhook sem external_reference: payment=${paymentId} status=${payment.status}`);
      return new Response("ok", { status: 200 });
    }

    const refParts = payment.external_reference.split("|");
    if (refParts.length !== 3) {
      console.warn(`external_reference formato invalido: ${payment.external_reference}`);
      return new Response("invalid ref", { status: 400 });
    }

    const [userId, materia, grupo] = refParts;
    if (!userId || !materia || !grupo) {
      console.warn(`external_reference com campos vazios: ${payment.external_reference}`);
      return new Response("invalid ref", { status: 400 });
    }

    const grupoNum = parseInt(grupo);
    if (isNaN(grupoNum) || grupoNum < 1) {
      console.warn(`grupo invalido: ${grupo}`);
      return new Response("invalid ref", { status: 400 });
    }

    if (payment.status === "approved") {
      const { data: existing, error: selErr } = await supabase
        .from("pre_acessos")
        .select("status")
        .eq("user_id", userId)
        .eq("materia", materia)
        .maybeSingle();

      if (selErr) {
        console.error(`Erro ao consultar acesso: ${selErr.message}`);
        return new Response("db error", { status: 500 });
      }

      if (existing?.status === "aprovado") {
        console.log(`Acesso ja aprovado (duplicado): user=${userId} materia=${materia}`);
        return new Response("ok", { status: 200 });
      }

      const valorPago = payment.transaction_amount || null;

      // Validar valor mínimo do pagamento (menor preço: R$16,90 PIX c/ referral)
      const MIN_PRICE = 16.00;
      if (!valorPago || valorPago < MIN_PRICE) {
        console.warn(`Valor suspeito: R$${valorPago} para user=${userId} materia=${materia}`);
        await supabase.from("pre_eventos").insert({
          user_id: userId, type: "payment_suspicious",
          meta: { materia, valor: valorPago, mp_payment_id: String(payment.id) },
        });
        return new Response("suspicious amount", { status: 400 });
      }

      if (!existing) {
        const { error } = await supabase.from("pre_acessos").insert({
          user_id: userId, materia, grupo: grupoNum,
          status: "aprovado", mp_payment_id: String(payment.id),
          valor_pago: valorPago,
        });
        if (error) {
          console.error(`Erro ao inserir acesso: ${error.message}`);
          return new Response("db error", { status: 500 });
        }
      } else {
        const { error } = await supabase.from("pre_acessos").update({
          status: "aprovado",
          grupo: grupoNum,
          mp_payment_id: String(payment.id),
          valor_pago: valorPago,
        }).eq("user_id", userId).eq("materia", materia);

        if (error) {
          console.error(`Erro ao atualizar acesso: ${error.message}`);
          return new Response("db error", { status: 500 });
        }
      }

      // Log payment_success
      await supabase.from("pre_eventos").insert({
        user_id: userId,
        type: "payment_success",
        meta: { materia, grupo: grupoNum, mp_payment_id: String(payment.id), valor_pago: valorPago },
      });

      // Creditar comissão ao afiliado
      if (valorPago && valorPago > 0) {
        try {
          const { data: referralData } = await supabase
            .from("pre_profiles")
            .select("referred_by")
            .eq("id", userId)
            .single();

          if (referralData?.referred_by) {
            const { data: affiliate } = await supabase
              .from("pre_profiles")
              .select("id")
              .eq("referral_code", referralData.referred_by)
              .single();

            if (affiliate) {
              const { data: existingComm } = await supabase
                .from("pre_affiliate_commissions")
                .select("id")
                .eq("referred_user_id", userId)
                .eq("materia", materia)
                .maybeSingle();

              if (existingComm) {
                console.log(`Comissão já existe (idempotente): referred=${userId} materia=${materia}`);
              } else {
                const { data: paidRefs } = await supabase
                  .from("pre_affiliate_commissions")
                  .select("referred_user_id")
                  .eq("affiliate_user_id", affiliate.id);
                const existingUsers = new Set((paidRefs || []).map((r: { referred_user_id: string }) => r.referred_user_id));
                const isNewUser = !existingUsers.has(userId);
                const totalDistinct = existingUsers.size + (isNewUser ? 1 : 0);
                const comissaoPct = totalDistinct <= 5 ? 10.00 : totalDistinct <= 20 ? 20.00 : totalDistinct <= 40 ? 30.00 : 40.00;
                const comissaoValor = Math.round(valorPago * comissaoPct) / 100;

                await supabase.from("pre_affiliate_commissions").insert({
                  affiliate_user_id: affiliate.id,
                  referred_user_id: userId,
                  materia,
                  valor_venda: valorPago,
                  comissao_pct: comissaoPct,
                  comissao_valor: comissaoValor,
                });

                await supabase.from("pre_eventos").insert({
                  user_id: affiliate.id,
                  type: "affiliate_commission",
                  meta: { referred_user_id: userId, materia, valor_venda: valorPago, comissao: comissaoValor },
                });

                console.log(`Comissão criada: afiliado=${affiliate.id} valor=R$${comissaoValor}`);
              }
            }
          }
        } catch (affErr) {
          console.error("Erro ao processar comissão:", affErr);
        }
      }

      console.log(`Acesso liberado: user=${userId} materia=${materia} grupo=${grupo}`);

      // Enviar e-mail de confirmação ao usuário
      try {
        const { data: userProfile } = await supabase
          .from("pre_profiles")
          .select("nome, email")
          .eq("id", userId)
          .single();

        if (userProfile?.email && RESEND_KEY) {
          const nome = userProfile.nome?.split(" ")[0] || "Aluno";
          const periodoNum = materia.replace(/\D/g, "");
          const materiaLabel = periodoNum ? `${periodoNum}º Período` : materia;
          await sendConfirmationEmail(userProfile.email, nome, materiaLabel, grupoNum, valorPago);
        }
      } catch (emailErr) {
        console.error("Erro ao enviar e-mail de confirmação:", emailErr);
      }

    } else if (payment.status === "rejected" || payment.status === "cancelled") {
      await supabase.from("pre_eventos").insert({
        user_id: userId,
        type: "payment_failed",
        meta: {
          materia, grupo: grupoNum,
          mp_payment_id: String(payment.id),
          mp_status: payment.status,
          mp_status_detail: payment.status_detail || "",
        },
      });
      console.log(`Pagamento ${payment.status}: user=${userId} materia=${materia}`);
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("internal error", { status: 500 });
  }
});

async function sendConfirmationEmail(
  to: string,
  nome: string,
  materiaLabel: string,
  grupo: number,
  valor: number,
) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: `Pagamento confirmado – ${materiaLabel}`,
      html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:24px;background:#F1F5F9;font-family:system-ui,-apple-system,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;margin:0 auto">
  <tr><td style="background:#0F172A;padding:20px 24px;border-radius:12px 12px 0 0">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="font-size:20px;line-height:1">✅</td>
      <td style="padding-left:12px">
        <div style="font-size:16px;font-weight:800;color:#fff">Pagamento Confirmado</div>
        <div style="font-size:11px;color:#64748B;margin-top:2px">Meu Planner 2026.1</div>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="height:3px;background:#16A34A"></td></tr>
  <tr><td style="background:#fff;padding:24px;border:1px solid #E2E8F0;border-top:none">
    <p style="margin:0 0 16px;font-size:15px;color:#0F172A">Olá, <strong>${nome}</strong>!</p>
    <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6">
      Seu pagamento foi confirmado e seu acesso já está liberado.
    </p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F0FDF4;border-radius:10px;border:1px solid #BBF7D0">
      <tr><td style="padding:16px">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="font-size:13px;color:#475569;padding:4px 0">Período:</td>
            <td style="font-size:13px;color:#0F172A;font-weight:700;text-align:right;padding:4px 0">${materiaLabel}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#475569;padding:4px 0">Grupo:</td>
            <td style="font-size:13px;color:#0F172A;font-weight:700;text-align:right;padding:4px 0">${grupo}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#475569;padding:4px 0">Valor:</td>
            <td style="font-size:13px;color:#16A34A;font-weight:700;text-align:right;padding:4px 0">R$ ${valor.toFixed(2)}</td>
          </tr>
        </table>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:20px">
      <tr><td align="center">
        <a href="${APP_URL}" style="display:inline-block;background:#0F172A;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:700">
          Acessar meu cronograma →
        </a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="background:#F8FAFC;padding:14px 24px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px">
    <p style="margin:0;font-size:11px;color:#94A3B8;text-align:center">
      Meu Planner 2026.1 · Acesso por semestre
    </p>
  </td></tr>
</table>
</body></html>
      `.trim(),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
  } else {
    console.log(`E-mail de confirmação enviado para ${to}`);
  }
}
