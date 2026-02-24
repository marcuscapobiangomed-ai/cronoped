// Supabase Edge Function: create-preference
// Cria a preferência de pagamento no Mercado Pago com segurança (token nunca exposto no frontend)
//
// Deploy:
//   supabase functions deploy create-preference
// Ou pelo Dashboard: Edge Functions → New Function → nome: create-preference
//
// Secrets necessários no Dashboard → Edge Functions → Secrets:
//   MP_ACCESS_TOKEN = APP_USR-113524672456336-022408-c1b46c2cca7642793777982fb2e3ebd4-3223711791

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_TOKEN     = Deno.env.get("MP_ACCESS_TOKEN")!;
const APP_URL      = Deno.env.get("APP_URL") || "https://bespoke-cupcake-e79c07.netlify.app";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  APP_URL,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // 1. Autenticar o usuário pelo JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) return json({ error: "Token inválido" }, 401);

    // 2. Ler body
    const { materiaId, materiaLabel, grupo } = await req.json();
    if (!materiaId || !materiaLabel || !grupo) return json({ error: "Dados incompletos" }, 400);

    // 3. Verificar se já tem acesso aprovado (não cobrar duas vezes)
    const { data: existing } = await supabase
      .from("acessos")
      .select("status")
      .eq("user_id", user.id)
      .eq("materia", materiaId)
      .single();

    if (existing?.status === "aprovado") {
      return json({ error: "Acesso já ativo para esta matéria" }, 409);
    }

    // 4. Criar/atualizar registro pending
    await supabase.from("acessos").upsert(
      { user_id: user.id, materia: materiaId, grupo, status: "pending" },
      { onConflict: "user_id,materia" }
    );

    // 5. Criar preferência no Mercado Pago
    const externalRef = `${user.id}|${materiaId}|${grupo}`;
    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MP_TOKEN}`,
      },
      body: JSON.stringify({
        items: [{
          title: `Cronograma – ${materiaLabel} Grupo ${grupo}`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: 9.90,
        }],
        external_reference: externalRef,
        back_urls: {
          success: `${APP_URL}?status=approved&external_reference=${encodeURIComponent(externalRef)}`,
          failure: `${APP_URL}?status=failure`,
          pending: `${APP_URL}?status=pending`,
        },
        auto_return: "approved",
        notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
      }),
    });

    const pref = await mpRes.json();
    if (!pref.init_point) {
      console.error("MP error:", pref);
      return json({ error: "Erro ao criar preferência no Mercado Pago" }, 500);
    }

    return json({ init_point: pref.init_point });

  } catch (err) {
    console.error(err);
    return json({ error: "Erro interno do servidor" }, 500);
  }
});

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}
