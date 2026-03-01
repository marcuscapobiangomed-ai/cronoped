// Supabase Edge Function: create-coupon-preference
// Admin gera link de pagamento com desconto (R$16,90 PIX) para trials expirados
//
// Deploy:
//   supabase functions deploy create-coupon-preference
//
// Usa os mesmos secrets de create-preference:
//   MP_ACCESS_TOKEN, APP_URL

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_TOKEN     = Deno.env.get("MP_ACCESS_TOKEN")!;
const APP_URL      = Deno.env.get("APP_URL") || "https://plannerinternato.modulo1.workers.dev";

const COUPON_PRICE = 16.90;

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
    // 1. Autenticar o caller pelo JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) return json({ error: "Token inválido" }, 401);

    // 2. Verificar que o caller é admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) return json({ error: "Unauthorized" }, 403);

    // 3. Ler body
    const { userId, materia, materiaLabel, grupo } = await req.json();
    if (!userId || !materia || !materiaLabel || !grupo) {
      return json({ error: "Dados incompletos" }, 400);
    }

    // 4. Verificar que o usuário tem trial para esta matéria
    const { data: acesso } = await supabase
      .from("acessos")
      .select("status, trial_expires_at")
      .eq("user_id", userId)
      .eq("materia", materia)
      .single();

    if (!acesso || acesso.status !== "trial") {
      return json({ error: "Usuário não tem trial para esta matéria" }, 400);
    }

    // 5. Criar/atualizar registro pending para o usuário
    await supabase.from("acessos").upsert(
      { user_id: userId, materia, grupo, status: "pending" },
      { onConflict: "user_id,materia" }
    );

    // 6. Criar preferência no Mercado Pago — PIX only, preço cupom
    const isSandbox = MP_TOKEN.startsWith("TEST-");
    const externalRef = `${userId}|${materia}|${grupo}`;

    // PIX only em produção; sandbox mantém cartão pois PIX não funciona
    const excludedTypes = isSandbox
      ? [{ id: "ticket" }]
      : [
          { id: "ticket" }, { id: "credit_card" }, { id: "debit_card" },
          { id: "atm" }, { id: "prepaid_card" },
        ];

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MP_TOKEN}`,
      },
      body: JSON.stringify({
        items: [{
          title: `Cronograma – ${materiaLabel} Grupo ${grupo} (Cupom PIX)`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: COUPON_PRICE,
        }],
        payment_methods: { excluded_payment_types: excludedTypes },
        external_reference: externalRef,
        back_urls: {
          success: `${APP_URL}?status=approved&external_reference=${encodeURIComponent(externalRef)}`,
          failure: `${APP_URL}?status=failure`,
          pending: `${APP_URL}?status=pending&external_reference=${encodeURIComponent(externalRef)}`,
        },
        auto_return: "approved",
        notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
        expires: true,
        expiration_date_to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });

    const pref = await mpRes.json();
    if (!pref.init_point) {
      console.error("MP error:", pref);
      return json({ error: "Erro ao criar preferência no Mercado Pago" }, 500);
    }

    const checkoutUrl = isSandbox
      ? (pref.sandbox_init_point || pref.init_point)
      : pref.init_point;

    return json({ checkout_url: checkoutUrl, price: COUPON_PRICE });

  } catch (err) {
    console.error(err);
    try {
      const sb = createClient(SUPABASE_URL, SERVICE_KEY);
      await sb.from("eventos").insert({ type: "edge_fn_error", meta: { fn: "create-coupon-preference", error: String(err) } });
    } catch (_) { /* ignore logging failure */ }
    return json({ error: "Erro interno do servidor" }, 500);
  }
});

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
