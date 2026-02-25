import { supabase } from "../supabase";

export async function fetchAdminData() {
  const { data, error } = await supabase.rpc("admin_dashboard_data");
  if (error) throw error;
  return data;
}
