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
  const url = new URL(req.url);
  const topic = url.searchParams.get("topic") || url.searchParams.get("type");
  const id    = url.searchParams.get("id");

  if (topic !== "payment" || !id) {
    return new Response("ok", { status: 200 });
  }

  // Busca detalhes do pagamento no MP
  const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { "Authorization": `Bearer ${MP_TOKEN}` }
  });
  const payment = await mpResp.json();

  if (payment.status === "approved" && payment.external_reference) {
    const [userId, materia, grupo] = payment.external_reference.split("|");
    await supabase.from("acessos").update({
      status: "aprovado",
      mp_payment_id: String(payment.id)
    }).eq("user_id", userId).eq("materia", materia);
    console.log(`✅ Acesso liberado: user=${userId} materia=${materia} grupo=${grupo}`);
  }

  return new Response("ok", { status: 200 });
});
