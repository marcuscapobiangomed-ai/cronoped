import { supabase } from "../supabase";

export async function dbLoadProgress(userId, materia) {
  const {data, error} = await supabase.from("progresso").select("completed,notes")
    .eq("user_id",userId).eq("materia",materia).single();
  if (error && error.code !== "PGRST116") console.error("dbLoadProgress:", error.message);
  return {completed:data?.completed||{}, notes:data?.notes||{}};
}

export async function dbSaveProgress(userId, materia, completed, notes) {
  const {error} = await supabase.from("progresso").upsert(
    {user_id:userId, materia, completed, notes, updated_at:new Date().toISOString()},
    {onConflict:"user_id,materia"}
  );
  if (error) throw error;
}

export async function validateAcesso(userId, materiaId) {
  const {data, error} = await supabase.from("acessos").select("status,grupo,trial_expires_at")
    .eq("user_id",userId).eq("materia",materiaId).single();
  if (error && error.code !== "PGRST116") console.error("validateAcesso:", error.message);

  if (!data) return null;

  // Check if trial is still active
  const now = new Date();
  const trialActive = data.status === 'trial' &&
                      data.trial_expires_at &&
                      new Date(data.trial_expires_at) > now;

  // Access granted if: paid OR trial is active
  const hasAccess = data.status === 'aprovado' || trialActive;

  if (hasAccess) {
    return {status: data.status, grupo: data.grupo, trial_expires_at: data.trial_expires_at};
  }

  return null;
}
