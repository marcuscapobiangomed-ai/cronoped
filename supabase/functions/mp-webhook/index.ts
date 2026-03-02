// Supabase Edge Function: mp-webhook
// Recebe notificações do Mercado Pago (IPN v1 query params + IPN v2 body JSON)
// Suporta: pagamentos avulsos (topic=payment) + assinaturas (topic=preapproval)
// Deploy: supabase functions deploy mp-webhook
// Config: verify_jwt = false (chamada externa pelo MP)
//
// Secrets necessários:
//   MP_ACCESS_TOKEN       (token de acesso do MP)
//   MP_WEBHOOK_SECRET     (secret do webhook, no painel MP → Webhooks)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const MP_TOKEN          = Deno.env.get("MP_ACCESS_TOKEN")!;
const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET") || "";

/**
 * Valida a assinatura X-Signature do Mercado Pago (HMAC-SHA256).
 * Formato do header: "ts=<timestamp>,v1=<hash>"
 * Template assinado:  "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 */
async function verifySignature(req: Request, dataId: string): Promise<boolean> {
  if (!MP_WEBHOOK_SECRET) {
    console.error("CRITICAL: MP_WEBHOOK_SECRET not configured — rejecting webhook");
    return false;
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  if (!xSignature || !xRequestId) return false;

  // Parse ts e v1 do header
  const parts: Record<string, string> = {};
  xSignature.split(",").forEach(p => {
    const [k, v] = p.split("=", 2);
    if (k && v) parts[k.trim()] = v.trim();
  });

  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  // Construir template e calcular HMAC
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

// ─── Handler de assinatura (preapproval) ─────────────────────────
async function handlePreapproval(preapprovalId: string) {
  // Buscar status da assinatura no MP
  const mpResp = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { "Authorization": `Bearer ${MP_TOKEN}` },
  });

  if (!mpResp.ok) {
    console.error(`Erro ao consultar preapproval MP: status=${mpResp.status}`);
    return new Response("mp error", { status: 502 });
  }

  const preapproval = await mpResp.json();
  const extRef = preapproval.external_reference || "";

  // Validar formato: sub|userId
  if (!extRef.startsWith("sub|")) {
    console.log(`preapproval sem external_reference sub|: ${extRef}`);
    return new Response("ok", { status: 200 });
  }

  const userId = extRef.split("|")[1];
  if (!userId) {
    console.warn(`preapproval userId vazio: ${extRef}`);
    return new Response("ok", { status: 200 });
  }

  const mpStatus = preapproval.status; // authorized, pending, paused, cancelled

  if (mpStatus === "authorized") {
    // Assinatura ativa — calcular fim do período (+30 dias a partir do fim atual ou agora)
    const { data: currentSub } = await supabase
      .from("subscriptions")
      .select("current_period_end")
      .eq("user_id", userId)
      .maybeSingle();
    const baseDate = currentSub?.current_period_end
      ? Math.max(Date.now(), new Date(currentSub.current_period_end).getTime())
      : Date.now();
    const periodEnd = new Date(baseDate + 30 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from("subscriptions").update({
      status: "authorized",
      current_period_end: periodEnd,
      cancelled_at: null,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);

    await supabase.from("eventos").insert({
      user_id: userId,
      type: "subscription_authorized",
      meta: { mp_preapproval_id: preapprovalId },
    });

    console.log(`Assinatura autorizada: user=${userId} period_end=${periodEnd}`);

  } else if (mpStatus === "paused") {
    await supabase.from("subscriptions").update({
      status: "paused",
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);

    await supabase.from("eventos").insert({
      user_id: userId,
      type: "subscription_paused",
      meta: { mp_preapproval_id: preapprovalId },
    });

    console.log(`Assinatura pausada: user=${userId}`);

  } else if (mpStatus === "cancelled") {
    await supabase.from("subscriptions").update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);

    await supabase.from("eventos").insert({
      user_id: userId,
      type: "subscription_cancelled",
      meta: { mp_preapproval_id: preapprovalId },
    });

    console.log(`Assinatura cancelada: user=${userId}`);
  }

  return new Response("ok", { status: 200 });
}

// ─── Handler de pagamento (avulso ou recorrente) ─────────────────
async function handlePayment(paymentId: string) {
  // Busca detalhes do pagamento no MP (fonte de verdade)
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

  const extRef = payment.external_reference;

  // ─── Pagamento de assinatura recorrente ───
  if (extRef.startsWith("sub|")) {
    const userId = extRef.split("|")[1];

    if (payment.status === "approved") {
      // Renovar período: +30 dias a partir do fim atual ou agora (o que for maior)
      const { data: currentSub } = await supabase
        .from("subscriptions")
        .select("current_period_end")
        .eq("user_id", userId)
        .maybeSingle();
      const baseDate = currentSub?.current_period_end
        ? Math.max(Date.now(), new Date(currentSub.current_period_end).getTime())
        : Date.now();
      const periodEnd = new Date(baseDate + 30 * 24 * 60 * 60 * 1000).toISOString();

      await supabase.from("subscriptions").update({
        status: "authorized",
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);

      await supabase.from("eventos").insert({
        user_id: userId,
        type: "subscription_payment",
        meta: { mp_payment_id: String(payment.id), valor: payment.transaction_amount },
      });

      console.log(`Pagamento recorrente aprovado: user=${userId} period_end=${periodEnd}`);
    } else if (payment.status === "rejected") {
      await supabase.from("eventos").insert({
        user_id: userId,
        type: "subscription_payment_failed",
        meta: { mp_payment_id: String(payment.id), status_detail: payment.status_detail },
      });
      console.log(`Pagamento recorrente rejeitado: user=${userId}`);
    }

    return new Response("ok", { status: 200 });
  }

  // ─── Pagamento avulso (formato userId|materia|grupo) ───
  const refParts = extRef.split("|");
  if (refParts.length !== 3) {
    console.warn(`external_reference formato invalido: ${extRef}`);
    return new Response("invalid ref", { status: 400 });
  }

  const [userId, materia, grupo] = refParts;
  if (!userId || !materia || !grupo) {
    console.warn(`external_reference com campos vazios: ${extRef}`);
    return new Response("invalid ref", { status: 400 });
  }

  const grupoNum = parseInt(grupo);
  if (isNaN(grupoNum) || grupoNum < 1) {
    console.warn(`grupo invalido: ${grupo}`);
    return new Response("invalid ref", { status: 400 });
  }

  if (payment.status === "approved") {
    // Idempotencia: so atualizar se ainda nao esta aprovado
    const { data: existing, error: selErr } = await supabase
      .from("acessos")
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
    const MIN_PRICE = 16.00; // margem para centavos de variação do MP
    if (!valorPago || valorPago < MIN_PRICE) {
      console.warn(`Valor suspeito: R$${valorPago} para user=${userId} materia=${materia}`);
      await supabase.from("eventos").insert({
        user_id: userId, type: "payment_suspicious",
        meta: { materia, valor: valorPago, mp_payment_id: String(payment.id) },
      });
      return new Response("suspicious amount", { status: 400 });
    }

    if (!existing) {
      const { error } = await supabase.from("acessos").insert({
        user_id: userId, materia, grupo: grupoNum,
        status: "aprovado", mp_payment_id: String(payment.id),
        valor_pago: valorPago,
      });
      if (error) {
        console.error(`Erro ao inserir acesso: ${error.message}`);
        return new Response("db error", { status: 500 });
      }
    } else {
      const { error } = await supabase.from("acessos").update({
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

    // Log payment_success event
    await supabase.from("eventos").insert({
      user_id: userId,
      type: "payment_success",
      meta: { materia, grupo: grupoNum, mp_payment_id: String(payment.id), valor_pago: valorPago },
    });

    // Creditar comissão ao afiliado (se usuário foi indicado)
    if (valorPago && valorPago > 0) {
      try {
        const { data: referralData } = await supabase
          .from("profiles")
          .select("referred_by")
          .eq("id", userId)
          .single();

        if (referralData?.referred_by) {
          const { data: affiliate } = await supabase
            .from("profiles")
            .select("id")
            .eq("referral_code", referralData.referred_by)
            .single();

          if (affiliate) {
            const { data: existingComm } = await supabase
              .from("affiliate_commissions")
              .select("id")
              .eq("referred_user_id", userId)
              .eq("materia", materia)
              .maybeSingle();

            if (existingComm) {
              console.log(`Comissão já existe (idempotente): referred=${userId} materia=${materia}`);
            } else {
              const { data: paidRefs } = await supabase
                .from("affiliate_commissions")
                .select("referred_user_id")
                .eq("affiliate_user_id", affiliate.id);
              const existingUsers = new Set((paidRefs || []).map((r: { referred_user_id: string }) => r.referred_user_id));
              const isNewUser = !existingUsers.has(userId);
              const totalDistinct = existingUsers.size + (isNewUser ? 1 : 0);
              const comissaoPct = totalDistinct <= 5 ? 10.00 : totalDistinct <= 20 ? 20.00 : totalDistinct <= 40 ? 30.00 : 40.00;
              const comissaoValor = Math.round(valorPago * comissaoPct) / 100;

              await supabase.from("affiliate_commissions").insert({
                affiliate_user_id: affiliate.id,
                referred_user_id: userId,
                materia,
                valor_venda: valorPago,
                comissao_pct: comissaoPct,
                comissao_valor: comissaoValor,
              });

              await supabase.from("eventos").insert({
                user_id: affiliate.id,
                type: "affiliate_commission",
                meta: { referred_user_id: userId, materia, valor_venda: valorPago, comissao: comissaoValor },
              });

              console.log(`Comissão criada: afiliado=${affiliate.id} valor=R$${comissaoValor} ref=${referralData.referred_by}`);
            }
          }
        }
      } catch (affErr) {
        console.error("Erro ao processar comissão de afiliado:", affErr);
      }
    }

    console.log(`Acesso liberado: user=${userId} materia=${materia} grupo=${grupo}`);

  } else if (payment.status === "rejected" || payment.status === "cancelled") {
    await supabase.from("eventos").insert({
      user_id: userId,
      type: "payment_failed",
      meta: {
        materia, grupo: grupoNum,
        mp_payment_id: String(payment.id),
        mp_status: payment.status,
        mp_status_detail: payment.status_detail || "",
      },
    });
    console.log(`Pagamento ${payment.status}: user=${userId} materia=${materia} detail=${payment.status_detail}`);
  }

  return new Response("ok", { status: 200 });
}

// ─── Entry point ─────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    // Extrair topic + id — suporta AMBOS os formatos do MP
    const url = new URL(req.url);
    let topic = url.searchParams.get("topic") || url.searchParams.get("type");
    let dataId = url.searchParams.get("id") || url.searchParams.get("data.id");

    // Fallback: IPN V2 body JSON ({"type":"payment","data":{"id":"123"}})
    if (!dataId && req.method === "POST") {
      try {
        const bodyText = await req.text();
        const body = JSON.parse(bodyText);
        if (!topic) topic = body.type || body.topic;
        if (!dataId) dataId = body.data?.id?.toString() || body.id?.toString();
      } catch { /* body não é JSON, ignorar */ }
    }

    if (!dataId) {
      return new Response("ok", { status: 200 });
    }

    // Validar assinatura X-Signature do Mercado Pago
    const sigValid = await verifySignature(req, dataId);
    if (!sigValid) {
      console.warn("webhook signature invalida");
      return new Response("invalid signature", { status: 401 });
    }

    // Rotear por topic
    if (topic === "preapproval") {
      return await handlePreapproval(dataId);
    }

    if (topic === "payment") {
      if (!/^\d+$/.test(dataId)) {
        console.warn(`webhook payment id invalido: ${dataId}`);
        return new Response("invalid id", { status: 400 });
      }
      return await handlePayment(dataId);
    }

    // Topic desconhecido — aceitar silenciosamente
    return new Response("ok", { status: 200 });

  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("internal error", { status: 500 });
  }
});
