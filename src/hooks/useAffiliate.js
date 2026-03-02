import { useState } from "react";
import { supabase } from "../supabase";

/**
 * Hook que gerencia o programa de afiliados:
 * - Carregar stats do afiliado
 * - Criar/definir código de referral
 * - Copiar link de afiliado
 * - Toggle do modal
 */
export function useAffiliate() {
  const [showAffiliate, setShowAffiliate] = useState(false);
  const [affCode, setAffCode] = useState("");
  const [affStats, setAffStats] = useState(null);
  const [affLoading, setAffLoading] = useState(false);
  const [affError, setAffError] = useState("");
  const [affCopied, setAffCopied] = useState(false);

  async function loadAffiliateStats() {
    setAffLoading(true);
    setAffError("");
    try {
      const { data, error } = await supabase.rpc("get_referral_stats");
      if (error) throw error;
      setAffStats(data);
      if (data?.code) setAffCode(data.code);
    } catch (err) {
      setAffError(err.message || "Erro ao carregar dados.");
    }
    setAffLoading(false);
  }

  async function handleSetReferralCode() {
    if (!affCode.trim()) return setAffError("Digite um código.");
    setAffLoading(true);
    setAffError("");
    try {
      const { error } = await supabase.rpc("set_referral_code", { p_code: affCode.trim() });
      if (error) throw error;
      await loadAffiliateStats();
    } catch (err) {
      setAffError(err.message || "Erro ao salvar código.");
      setAffLoading(false);
    }
  }

  function copyAffiliateLink() {
    const link = `https://plannerinternato.modulo1.workers.dev?ref=${affStats?.code}`;
    navigator.clipboard.writeText(link).then(() => {
      setAffCopied(true);
      setTimeout(() => setAffCopied(false), 2000);
    });
  }

  function openAffiliate() {
    setShowAffiliate(true);
    loadAffiliateStats();
  }

  return {
    showAffiliate, setShowAffiliate,
    affCode, setAffCode,
    affStats, affLoading, affError, setAffError, affCopied,
    loadAffiliateStats, handleSetReferralCode, copyAffiliateLink, openAffiliate,
  };
}
