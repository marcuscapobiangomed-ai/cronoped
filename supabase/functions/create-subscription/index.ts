// Supabase Edge Function: create-subscription
// Cria assinatura mensal recorrente no Mercado Pago (Preapproval API)
// R$9,90/mês — acesso a todas as matérias
//
// Deploy:
//   supabase functions deploy create-subscription

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_TOKEN     = Deno.env.get("MP_ACCESS_TOKEN")!;
const APP_URL      = Deno.env.get("APP_URL") || "https://plannerinternato.modulo1.workers.dev";

const SUBSCRIPTION_AMOUNT = 9.90;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  APP_URL,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // 1. Autenticar usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/);
    if (!bearerMatch) return json({ error: "Formato de auth inválido" }, 401);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(bearerMatch[1]);
    if (authErr || !user) return json({ error: "Token inválido" }, 401);

    // 2. Verificar se já tem assinatura ativa
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id, status, mp_preapproval_id")
      .eq("user_id", user.id)
      .single();

    if (existingSub?.status === "authorized") {
      return json({ error: "Você já tem uma assinatura ativa" }, 409);
    }

    // 3. Buscar email do perfil
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    // 4. Criar assinatura no Mercado Pago (sem plano associado)
    const externalRef = `sub|${user.id}`;

    const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MP_TOKEN}`,
      },
      body: JSON.stringify({
        reason: "CronoPed — Acesso Mensal Completo",
        external_reference: externalRef,
        payer_email: profile?.email || user.email,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: SUBSCRIPTION_AMOUNT,
          currency_id: "BRL",
        },
        back_url: `${APP_URL}?subscription=pending`,
        status: "pending",
      }),
    });

    const preapproval = await mpRes.json();

    if (!preapproval.id || !preapproval.init_point) {
      console.error("MP preapproval error:", preapproval);
      return json({ error: "Erro ao criar assinatura no Mercado Pago" }, 500);
    }

    // 5. Salvar/atualizar registro no banco
    if (existingSub) {
      // Re-ativar assinatura cancelada/pausada
      await supabase.from("subscriptions").update({
        mp_preapproval_id: preapproval.id,
        status: "pending",
        cancelled_at: null,
        updated_at: new Date().toISOString(),
      }).eq("id", existingSub.id);
    } else {
      await supabase.from("subscriptions").insert({
        user_id: user.id,
        mp_preapproval_id: preapproval.id,
        status: "pending",
        amount: SUBSCRIPTION_AMOUNT,
      });
    }

    // 6. Log evento
    await supabase.from("eventos").insert({
      user_id: user.id,
      type: "subscription_created",
      meta: { mp_preapproval_id: preapproval.id, amount: SUBSCRIPTION_AMOUNT },
    });

    const isSandbox = MP_TOKEN.startsWith("TEST-");
    const checkoutUrl = isSandbox
      ? (preapproval.sandbox_init_point || preapproval.init_point)
      : preapproval.init_point;

    return json({ init_point: checkoutUrl, preapproval_id: preapproval.id });

  } catch (err) {
    console.error(err);
    try {
      const sb = createClient(SUPABASE_URL, SERVICE_KEY);
      await sb.from("eventos").insert({ type: "edge_fn_error", meta: { fn: "create-subscription", error: String(err) } });
    } catch (_) {}
    return json({ error: "Erro interno do servidor" }, 500);
  }
});

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
