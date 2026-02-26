import { supabase } from "../supabase";
import { MODULE_END_DATE } from "../constants";

export async function dbLoadProgress(userId, materia) {
  const {data, error} = await supabase.from("progresso").select("completed,notes,customizations")
    .eq("user_id",userId).eq("materia",materia).single();
  if (error && error.code !== "PGRST116") console.error("dbLoadProgress:", error.message);
  return {completed:data?.completed||{}, notes:data?.notes||{}, customizations:data?.customizations||{}};
}

export async function dbSaveProgress(userId, materia, completed, notes, customizations) {
  const row = {user_id:userId, materia, completed, notes, updated_at:new Date().toISOString()};
  if (customizations !== undefined) row.customizations = customizations;
  const {error} = await supabase.from("progresso").upsert(row, {onConflict:"user_id,materia"});
  if (error) throw error;
}

export async function activateTrial(materia, grupo) {
  const { error } = await supabase.rpc("activate_trial", {
    p_materia: materia, p_grupo: grupo,
  });
  if (error) throw error;
}

export async function validateAcesso(userId, materiaId, isVIP) {
  // VIP users always have access
  if (isVIP) {
    const {data} = await supabase.from("acessos").select("status,grupo,trial_expires_at")
      .eq("user_id",userId).eq("materia",materiaId).single();
    return {status: "vip", grupo: data?.grupo || 1, trial_expires_at: null};
  }

  const {data, error} = await supabase.from("acessos").select("status,grupo,trial_expires_at")
    .eq("user_id",userId).eq("materia",materiaId).single();
  if (error && error.code !== "PGRST116") console.error("validateAcesso:", error.message);

  if (!data) return null;

  // Check if trial is still active
  const now = new Date();
  const trialActive = data.status === 'trial' &&
                      data.trial_expires_at &&
                      new Date(data.trial_expires_at) > now;

  // Module expiration check (non-VIP users lose access after module end date)
  if (new Date() > MODULE_END_DATE) return null;

  // Access granted if: paid OR trial is active
  const hasAccess = data.status === 'aprovado' || trialActive;

  if (hasAccess) {
    return {status: data.status, grupo: data.grupo, trial_expires_at: data.trial_expires_at};
  }

  return null;
}
