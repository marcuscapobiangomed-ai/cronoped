import { supabase } from "../supabase";

const MAX_SESSIONS = 1;
const LS_KEY = "cronoped_session_token";

export function getSessionToken() {
  return localStorage.getItem(LS_KEY);
}

function setSessionToken(token) {
  localStorage.setItem(LS_KEY, token);
}

function clearSessionToken() {
  localStorage.removeItem(LS_KEY);
}

/**
 * Registra uma nova sessão para o usuário.
 * - Gera token UUID
 * - Insere em sessoes_ativas
 * - Remove sessões excedentes (mantém só as MAX_SESSIONS mais recentes)
 * - Salva token no localStorage
 */
export async function registerSession(userId) {
  const token = crypto.randomUUID();
  const deviceInfo = navigator.userAgent.substring(0, 200);

  // Inserir nova sessão
  const { error } = await supabase.from("sessoes_ativas").insert({
    user_id: userId,
    token,
    device_info: deviceInfo,
  });

  if (error) {
    console.error("registerSession insert:", error.message);
    // Continuar mesmo com erro — não bloquear o login
  }

  setSessionToken(token);

  // Limpar sessões excedentes (manter apenas as MAX_SESSIONS mais recentes)
  const { data: sessions } = await supabase
    .from("sessoes_ativas")
    .select("id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (sessions && sessions.length > MAX_SESSIONS) {
    const toDelete = sessions.slice(MAX_SESSIONS).map(s => s.id);
    await supabase
      .from("sessoes_ativas")
      .delete()
      .in("id", toDelete);
  }

  // Limpeza: remover sessões inativas de QUALQUER usuário (> 10 min sem heartbeat)
  await supabase
    .from("sessoes_ativas")
    .delete()
    .lt("last_seen", new Date(Date.now() - 10 * 60 * 1000).toISOString());
}

/**
 * Heartbeat: atualiza last_seen e verifica se a sessão ainda existe.
 * Retorna { valid: true } se OK, { valid: false } se a sessão foi invalidada.
 */
export async function heartbeat(userId) {
  const token = getSessionToken();
  if (!token) return { valid: false };

  const { data, error } = await supabase
    .from("sessoes_ativas")
    .update({ last_seen: new Date().toISOString() })
    .eq("token", token)
    .eq("user_id", userId)
    .select("id");

  // Se nenhuma row foi atualizada, a sessão não existe mais (foi deletada por outro login)
  if (error || !data || data.length === 0) {
    clearSessionToken();
    return { valid: false };
  }

  return { valid: true };
}

/**
 * Encerra a sessão atual (no logout).
 */
export async function endSession() {
  const token = getSessionToken();
  if (token) {
    await supabase
      .from("sessoes_ativas")
      .delete()
      .eq("token", token);
  }
  clearSessionToken();
}
