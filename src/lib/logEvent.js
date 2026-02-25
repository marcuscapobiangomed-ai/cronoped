import { supabase } from "../supabase";

export function logEvent(type, meta = {}) {
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return;
    supabase.from("eventos").insert({ user_id: user.id, type, meta }).then(({ error }) => {
      if (error) console.warn("logEvent:", error.message);
    });
  });
}
