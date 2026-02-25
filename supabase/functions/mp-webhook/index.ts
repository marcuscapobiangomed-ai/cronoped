// Supabase Edge Function: mp-webhook
// Deploy no Supabase Dashboard → Edge Functions → New Function → nome: mp-webhook
// Cole este código lá

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const MP_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!; // Obrigatório: configure em Settings → Edge Functions → Secrets

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const topic = url.searchParams.get("topic") || url.searchParams.get("type");
    const id    = url.searchParams.get("id");

    if (topic !== "payment" || !id) {
      return new Response("ok", { status: 200 });
    }

    // Validar que id é numérico (proteção contra injection)
    if (!/^\d+$/.test(id)) {
      console.warn(`webhook id invalido: ${id}`);
      return new Response("invalid id", { status: 400 });
    }

    // Busca detalhes do pagamento no MP (fonte de verdade)
    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
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

      console.log(`Acesso liberado: user=${userId} materia=${materia} grupo=${grupo}`);
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("internal error", { status: 500 });
  }
});
