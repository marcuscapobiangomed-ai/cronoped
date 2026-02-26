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
 * Registra uma nova sessão para o usuário via RPC atômico.
 * - Gera token UUID
 * - Chama register_session_atomic (insere + limpa excedentes numa transação)
 * - Salva token no localStorage
 * - Tolerante a falhas: não bloqueia o login se o RPC falhar
 */
export async function registerSession(userId) {
  try {
    const token = crypto.randomUUID();
    const deviceInfo = navigator.userAgent.substring(0, 200);

    const { error } = await supabase.rpc("register_session_atomic", {
      p_token: token,
      p_device_info: deviceInfo,
      p_max_sessions: MAX_SESSIONS,
    });

    if (error) {
      console.warn("registerSession RPC:", error.message);
      // Salvar token mesmo com erro — heartbeat vai tolerar
    }

    setSessionToken(token);
  } catch (err) {
    console.warn("registerSession exception:", err.message);
  }
}

/**
 * Heartbeat: atualiza last_seen e verifica se a sessão ainda existe.
 * Retorna { valid: true } se OK, { valid: false } se a sessão foi invalidada.
 * Tolerante a falhas: erros de rede/RPC NÃO kickam o usuário.
 */
export async function heartbeat(userId) {
  const token = getSessionToken();
  if (!token) {
    // Sem token = sessão nunca foi registrada. Tentar registrar agora.
    try { await registerSession(userId); } catch (_) {}
    return { valid: true }; // Não kickar por falta de token
  }

  try {
    const { data, error } = await supabase
      .from("sessoes_ativas")
      .update({ last_seen: new Date().toISOString() })
      .eq("token", token)
      .eq("user_id", userId)
      .select("id");

    // Erro de rede/RLS/tipo → NÃO kickar, pode ser problema temporário
    if (error) {
      console.warn("heartbeat error (tolerating):", error.message);
      return { valid: true };
    }

    // Sem erro mas sem rows atualizadas = sessão foi deletada por outro login
    if (!data || data.length === 0) {
      clearSessionToken();
      return { valid: false };
    }

    return { valid: true };
  } catch (err) {
    // Erro de rede/fetch → não kickar
    console.warn("heartbeat exception (tolerating):", err.message);
    return { valid: true };
  }
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
