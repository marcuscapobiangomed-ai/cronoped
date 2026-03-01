// Supabase Edge Function: pre-create-coupon-preference
// Link de pagamento com desconto para trials expirados (Cronograma 2026.1)
// Deploy: supabase functions deploy pre-create-coupon-preference

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_TOKEN     = Deno.env.get("MP_ACCESS_TOKEN")!;
const APP_URL      = Deno.env.get("PRE_APP_URL") || "https://cronopre.modulo1.workers.dev";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) return json({ error: "Token inválido" }, 401);

    const { data: profile } = await supabase
      .from("pre_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) return json({ error: "Unauthorized" }, 403);

    const { userId, materia, materiaLabel, grupo } = await req.json();
    if (!userId || !materia || !materiaLabel || !grupo) {
      return json({ error: "Dados incompletos" }, 400);
    }

    const { data: acesso } = await supabase
      .from("pre_acessos")
      .select("status, trial_expires_at")
      .eq("user_id", userId)
      .eq("materia", materia)
      .single();

    if (!acesso || acesso.status !== "trial") {
      return json({ error: "Usuário não tem trial para esta matéria" }, 400);
    }

    await supabase.from("pre_acessos").upsert(
      { user_id: userId, materia, grupo, status: "pending" },
      { onConflict: "user_id,materia" }
    );

    const isSandbox = MP_TOKEN.startsWith("TEST-");
    const externalRef = `${userId}|${materia}|${grupo}`;

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
          title: `Cronograma 2026.1 – ${materiaLabel} Grupo ${grupo} (Cupom PIX)`,
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
        notification_url: `${SUPABASE_URL}/functions/v1/pre-mp-webhook`,
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
      await sb.from("pre_eventos").insert({ type: "edge_fn_error", meta: { fn: "pre-create-coupon-preference", error: String(err) } });
    } catch (_) { /* ignore */ }
    return json({ error: "Erro interno do servidor" }, 500);
  }
});

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
