import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabase";

/**
 * Hook que gerencia o carregamento e estado de acessos + subscription do usuário.
 * Retorna os acessos, subscription, valores derivados e função de reload.
 */
export function useAcessos(userId, isVIP) {
  const [acessos, setAcessos] = useState({});
  const [loadingAcessos, setLoadingAcessos] = useState(true);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from("acessos").select("materia,grupo,status,trial_expires_at").eq("user_id", userId),
      supabase.from("subscriptions").select("status,current_period_end").eq("user_id", userId).maybeSingle(),
    ]).then(([acessosRes, subRes]) => {
      if (cancelled) return;
      if (acessosRes.error) console.error("loadAcessos:", acessosRes.error.message);
      const map = {};
      (acessosRes.data || []).forEach(a => {
        map[a.materia] = { grupo: a.grupo, status: a.status, trial_expires_at: a.trial_expires_at };
      });
      setAcessos(map);
      setLoadingAcessos(false);
      if (subRes.data) setSubscription(subRes.data);
    });
    return () => { cancelled = true; };
  }, [userId]);

  const { isSubscriber, hasActiveTrial, hasUsedTrial, hasAnyAccess } = useMemo(() => {
    const now = new Date();
    const _isSubscriber = subscription &&
      ['authorized', 'paused'].includes(subscription.status) &&
      subscription.current_period_end &&
      new Date(subscription.current_period_end) > now;
    const acessosList = Object.values(acessos);
    const _hasActiveTrial = acessosList.some(
      a => a.status === "trial" && a.trial_expires_at && new Date(a.trial_expires_at) > now
    );
    const _hasUsedTrial = acessosList.some(a => a.status === "trial");
    const _hasAnyAccess = isVIP || _isSubscriber || acessosList.some(a => {
      if (a.status === "aprovado") return true;
      if (a.status === "trial" && a.trial_expires_at && new Date(a.trial_expires_at) > now) return true;
      return false;
    });
    return {
      isSubscriber: _isSubscriber,
      hasActiveTrial: _hasActiveTrial,
      hasUsedTrial: _hasUsedTrial,
      hasAnyAccess: _hasAnyAccess,
    };
  }, [acessos, subscription, isVIP]);

  async function reloadAcessos() {
    const { data } = await supabase.from("acessos").select("materia,grupo,status,trial_expires_at").eq("user_id", userId);
    const map = {};
    (data || []).forEach(a => {
      map[a.materia] = { grupo: a.grupo, status: a.status, trial_expires_at: a.trial_expires_at };
    });
    setAcessos(map);
    const { data: sub } = await supabase.from("subscriptions").select("status,current_period_end")
      .eq("user_id", userId).maybeSingle();
    if (sub) setSubscription(sub);
  }

  return {
    acessos, loadingAcessos, subscription,
    isSubscriber, hasActiveTrial, hasUsedTrial, hasAnyAccess,
    reloadAcessos,
  };
}
