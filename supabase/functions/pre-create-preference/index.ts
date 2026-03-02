// Supabase Edge Function: pre-create-preference
// Cria preferência de pagamento MP para Cronograma 2026.1 (tabelas pre_)
// Deploy: supabase functions deploy pre-create-preference

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_TOKEN     = Deno.env.get("MP_ACCESS_TOKEN")!;
const APP_URL      = Deno.env.get("PRE_APP_URL") || "https://cronopre.modulo1.workers.dev";

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

    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/);
    if (!bearerMatch) return json({ error: "Formato de auth inválido" }, 401);
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(bearerMatch[1]);
    if (authErr || !user) return json({ error: "Token inválido" }, 401);

    const { materiaId, materiaLabel, grupo, paymentMethod } = await req.json();
    if (!materiaId || !materiaLabel || !grupo) return json({ error: "Dados incompletos" }, 400);
    const isPix = paymentMethod === "pix";

    // Verificar acesso existente
    const { data: existing } = await supabase
      .from("pre_acessos")
      .select("status")
      .eq("user_id", user.id)
      .eq("materia", materiaId)
      .single();

    if (existing?.status === "aprovado") {
      return json({ error: "Acesso já ativo para esta matéria" }, 409);
    }

    // Criar/atualizar registro pending
    await supabase.from("pre_acessos").upsert(
      { user_id: user.id, materia: materiaId, grupo, status: "pending" },
      { onConflict: "user_id,materia" }
    );

    // Verificar referral para desconto PIX
    const { data: profileData } = await supabase
      .from("pre_profiles")
      .select("referred_by")
      .eq("id", user.id)
      .single();
    const hasReferral = !!profileData?.referred_by;

    // Criar preferência no Mercado Pago
    const isSandbox = MP_TOKEN.startsWith("TEST-");
    const externalRef = `${user.id}|${materiaId}|${grupo}`;
    const unitPrice = isPix ? (hasReferral ? 16.90 : 19.90) : 20.90;

    let excludedTypes: { id: string }[];
    if (isPix && !isSandbox) {
      excludedTypes = [
        { id: "ticket" }, { id: "credit_card" }, { id: "debit_card" },
        { id: "atm" }, { id: "prepaid_card" },
      ];
    } else if (isPix && isSandbox) {
      excludedTypes = [{ id: "ticket" }];
    } else {
      excludedTypes = [{ id: "ticket" }, { id: "bank_transfer" }];
    }

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MP_TOKEN}`,
      },
      body: JSON.stringify({
        items: [{
          title: `Meu Planner 2026.1 – ${materiaLabel} Grupo ${grupo}${isPix ? " (PIX)" : ""}`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: unitPrice,
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

    return json({ init_point: checkoutUrl, sandbox: isSandbox });

  } catch (err) {
    console.error(err);
    try {
      const sb = createClient(SUPABASE_URL, SERVICE_KEY);
      await sb.from("pre_eventos").insert({ type: "edge_fn_error", meta: { fn: "pre-create-preference", error: String(err) } });
    } catch (_) { /* ignore */ }
    return json({ error: "Erro interno do servidor" }, 500);
  }
});

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
