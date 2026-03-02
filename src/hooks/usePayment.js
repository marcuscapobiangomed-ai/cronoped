import { useState } from "react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../supabase";
import { logEvent } from "../lib/logEvent";

/**
 * Hook que gerencia todo o fluxo de pagamento:
 * - Pagamento avulso por matéria (PIX/cartão)
 * - Cancelamento de pagamento pendente
 * - Assinatura mensal
 */
export function usePayment(userId, toast, reloadAcessos) {
  const [payingCard, setPayingCard] = useState(null);
  const [cardErrors, setCardErrors] = useState({});
  const [payMethod, setPayMethod] = useState({});
  const [cancelingId, setCancelingId] = useState(null);
  const [subscribing, setSubscribing] = useState(false);

  function clearCardError(materiaId) {
    setCardErrors(prev => ({ ...prev, [materiaId]: null }));
  }

  function setCardError(materiaId, msg) {
    setCardErrors(prev => ({ ...prev, [materiaId]: msg }));
  }

  async function callCreatePreference(token, materia, grupo, method) {
    return fetch(`${SUPABASE_URL}/functions/v1/create-preference`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        materiaId: materia.id,
        materiaLabel: materia.label,
        grupo,
        paymentMethod: method,
      }),
    });
  }

  async function handlePagarCard(materia, grupo) {
    if (!grupo) return;
    const method = payMethod[materia.id] || "pix";
    setPayingCard(materia.id);
    setCardErrors(prev => ({ ...prev, [materia.id]: null }));
    logEvent("payment_attempt", { materia: materia.id, grupo, method });
    try {
      const { data: { session: sess } } = await supabase.auth.getSession();
      let token = sess?.access_token;
      if (!token) {
        setCardErrors(prev => ({ ...prev, [materia.id]: "Sessão expirada. Faça login novamente." }));
        setPayingCard(null);
        return;
      }

      let resp = await callCreatePreference(token, materia, grupo, method);

      if (resp.status === 401) {
        const { data: refreshData } = await supabase.auth.refreshSession();
        token = refreshData?.session?.access_token;
        if (!token) {
          setCardErrors(prev => ({ ...prev, [materia.id]: "Sessão expirada. Faça login novamente." }));
          setPayingCard(null);
          return;
        }
        resp = await callCreatePreference(token, materia, grupo, method);
      }

      if (!resp.ok) {
        let errMsg = `Erro ${resp.status}`;
        try { const errData = await resp.json(); errMsg = errData.error || errData.msg || errMsg; } catch { /* ignore */ }
        logEvent("payment_failure", { materia: materia.id, grupo, error: errMsg, status: resp.status });
        setCardErrors(prev => ({ ...prev, [materia.id]: errMsg }));
        setPayingCard(null);
        return;
      }

      const data = await resp.json();
      if (data.error) {
        logEvent("payment_failure", { materia: materia.id, grupo, error: data.error });
        setCardErrors(prev => ({ ...prev, [materia.id]: data.error }));
        setPayingCard(null);
        return;
      }
      if (!data.init_point) {
        logEvent("payment_failure", { materia: materia.id, grupo, error: "no_init_point" });
        setCardErrors(prev => ({ ...prev, [materia.id]: "Erro ao criar link de pagamento. Tente novamente." }));
        setPayingCard(null);
        return;
      }
      try {
        const checkoutUrl = new URL(data.init_point);
        if (!checkoutUrl.hostname.endsWith("mercadopago.com") && !checkoutUrl.hostname.endsWith("mercadopago.com.br")) {
          throw new Error("URL de checkout inválida");
        }
      } catch {
        logEvent("payment_failure", { materia: materia.id, grupo, error: "invalid_checkout_url" });
        setCardErrors(prev => ({ ...prev, [materia.id]: "URL de pagamento inválida. Tente novamente." }));
        setPayingCard(null);
        return;
      }
      window.location.href = data.init_point;
    } catch (err) {
      console.error("handlePagarCard error:", err);
      logEvent("payment_failure", { materia: materia.id, grupo, error: err.message });
      setCardErrors(prev => ({ ...prev, [materia.id]: "Erro de conexão. Tente novamente." }));
      setPayingCard(null);
    }
  }

  async function handleCancelarPendente(materiaId) {
    setCancelingId(materiaId);
    try {
      const { data: row } = await supabase.from("acessos")
        .select("trial_expires_at")
        .eq("user_id", userId)
        .eq("materia", materiaId)
        .single();

      const trialAindaValido = row?.trial_expires_at && new Date(row.trial_expires_at) > new Date();

      if (trialAindaValido) {
        await supabase.from("acessos")
          .update({ status: "trial" })
          .eq("user_id", userId)
          .eq("materia", materiaId)
          .eq("status", "pending");
      } else {
        await supabase.from("acessos")
          .delete()
          .eq("user_id", userId)
          .eq("materia", materiaId)
          .eq("status", "pending");
      }

      await reloadAcessos();
    } catch (err) {
      console.error("cancelarPendente:", err.message);
    }
    setCancelingId(null);
  }

  async function handleSubscribe() {
    setSubscribing(true);
    try {
      const { data: { session: sess } } = await supabase.auth.getSession();
      let token = sess?.access_token;
      if (!token) {
        toast("Sessão expirada. Faça login novamente.", "error");
        setSubscribing(false);
        return;
      }
      let resp = await fetch(`${SUPABASE_URL}/functions/v1/create-subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": SUPABASE_ANON_KEY,
        },
      });
      if (resp.status === 401) {
        const { data: refreshData } = await supabase.auth.refreshSession();
        token = refreshData?.session?.access_token;
        if (!token) { toast("Sessão expirada. Faça login novamente.", "error"); setSubscribing(false); return; }
        resp = await fetch(`${SUPABASE_URL}/functions/v1/create-subscription`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "apikey": SUPABASE_ANON_KEY },
        });
      }
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        toast(err.error || "Erro ao criar assinatura.", "error");
        setSubscribing(false);
        return;
      }
      const data = await resp.json();
      if (data.init_point) {
        try {
          const checkoutUrl = new URL(data.init_point);
          if (!checkoutUrl.hostname.endsWith("mercadopago.com") && !checkoutUrl.hostname.endsWith("mercadopago.com.br")) {
            throw new Error("URL inválida");
          }
        } catch {
          toast("URL de pagamento inválida. Tente novamente.", "error");
          setSubscribing(false);
          return;
        }
        logEvent("subscription_attempt", {});
        window.location.href = data.init_point;
      }
    } catch (err) {
      console.error("handleSubscribe:", err);
      toast("Erro de conexão. Tente novamente.", "error");
      setSubscribing(false);
    }
  }

  return {
    payingCard, cardErrors, payMethod, setPayMethod, cancelingId, subscribing,
    clearCardError, setCardError, handlePagarCard, handleCancelarPendente, handleSubscribe,
  };
}
