import { createClient } from "@supabase/supabase-js";
const URL = "https://udtymgdotifxtimwwjmf.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkdHltZ2RvdGlmeHRpbXd3am1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MjYwMjMsImV4cCI6MjA4NzUwMjAyM30.LTcDjMaa4tL6esqRQsyLvkTdUtgVgnasiIH8219cT5k";
export const supabase = createClient(URL, KEY);
