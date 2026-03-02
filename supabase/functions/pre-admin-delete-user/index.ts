// Supabase Edge Function: pre-admin-delete-user
// Deleta dados do usuario nas tabelas pre_ (NÃO deleta auth.users - compartilhado)
// Deploy: supabase functions deploy pre-admin-delete-user

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const APP_URL = Deno.env.get("PRE_APP_URL") || "https://cronopre.modulo1.workers.dev";
const corsHeaders = {
  "Access-Control-Allow-Origin": APP_URL,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Sem autenticação" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/);
    if (!bearerMatch) {
      return new Response(JSON.stringify({ error: "Formato de auth inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = bearerMatch[1];
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin in pre_profiles (NOT profiles)
    const { data: profile } = await adminClient
      .from("pre_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userId === user.id) {
      return new Response(JSON.stringify({ error: "Não pode excluir a si mesmo" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete all pre_ data (NÃO deleta auth.users - compartilhado com CronoPED)
    const tables = [
      { table: "pre_affiliate_commissions", column: "affiliate_user_id" },
      { table: "pre_affiliate_commissions", column: "referred_user_id" },
      { table: "pre_sessoes_ativas", column: "user_id" },
      { table: "pre_progresso", column: "user_id" },
      { table: "pre_acessos", column: "user_id" },
      { table: "pre_suporte", column: "user_id" },
      { table: "pre_eventos", column: "user_id" },
      { table: "pre_profiles", column: "id" },
    ];

    for (const { table, column } of tables) {
      const { error: delErr } = await adminClient
        .from(table)
        .delete()
        .eq(column, userId);
      if (delErr) {
        console.error(`Erro ao deletar ${table}.${column}=${userId}:`, delErr.message);
      }
    }

    // IMPORTANTE: NÃO chama auth.admin.deleteUser() - auth é compartilhado

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
