// Supabase Edge Function: mp-webhook
// Recebe notificações do Mercado Pago (IPN v1 query params + IPN v2 body JSON)
// Deploy: supabase functions deploy mp-webhook
// Config: verify_jwt = false (chamada externa pelo MP)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const MP_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;

Deno.serve(async (req) => {
  try {
    // Extrair topic + id — suporta AMBOS os formatos do MP
    const url = new URL(req.url);
    let topic = url.searchParams.get("topic") || url.searchParams.get("type");
    let paymentId = url.searchParams.get("id") || url.searchParams.get("data.id");

    // Fallback: IPN V2 body JSON ({"type":"payment","data":{"id":"123"}})
    if (!paymentId && req.method === "POST") {
      try {
        const body = await req.json();
        if (!topic) topic = body.type || body.topic;
        if (!paymentId) paymentId = body.data?.id?.toString() || body.id?.toString();
      } catch { /* body não é JSON, ignorar */ }
    }

    if (topic !== "payment" || !paymentId) {
      return new Response("ok", { status: 200 });
    }

    // Validar que id é numérico
    if (!/^\d+$/.test(paymentId)) {
      console.warn(`webhook id invalido: ${paymentId}`);
      return new Response("invalid id", { status: 400 });
    }

    // Busca detalhes do pagamento no MP (fonte de verdade)
    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${MP_TOKEN}` }
    });

    if (!mpResp.ok) {
      console.error(`Erro ao consultar MP: status=${mpResp.status}`);
      return new Response("mp error", { status: 502 });
    }

    const payment = await mpResp.json();

    if (payment.status === "approved" && payment.external_reference) {
      const parts = payment.external_reference.split("|");
      if (parts.length !== 3) {
        console.warn(`external_reference formato invalido: ${payment.external_reference}`);
        return new Response("invalid ref", { status: 400 });
      }

      const [userId, materia, grupo] = parts;

      // Idempotencia: so atualizar se ainda nao esta aprovado
      const { data: existing } = await supabase
        .from("acessos")
        .select("status")
        .eq("user_id", userId)
        .eq("materia", materia)
        .single();

      if (existing?.status === "aprovado") {
        console.log(`Acesso ja aprovado (duplicado): user=${userId} materia=${materia}`);
        return new Response("ok", { status: 200 });
      }

      const { error } = await supabase.from("acessos").update({
        status: "aprovado",
        grupo: parseInt(grupo),
        mp_payment_id: String(payment.id)
      }).eq("user_id", userId).eq("materia", materia);

      if (error) {
        console.error(`Erro ao atualizar acesso: ${error.message}`);
        return new Response("db error", { status: 500 });
      }

      // Log payment_success event
      await supabase.from("eventos").insert({
        user_id: userId,
        type: "payment_success",
        meta: { materia, grupo: parseInt(grupo), mp_payment_id: String(payment.id) },
      });

      console.log(`Acesso liberado: user=${userId} materia=${materia} grupo=${grupo}`);
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("internal error", { status: 500 });
  }
});
