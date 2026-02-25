-- ========================================================================
-- Trial System for CronoPed Freemium Model
-- Execute this in Supabase Dashboard → SQL Editor
-- ========================================================================

-- 1. Add trial_expires_at column to acessos table
ALTER TABLE acessos
ADD COLUMN trial_expires_at TIMESTAMPTZ;

-- 2. Function to auto-create trial access for new users
CREATE OR REPLACE FUNCTION create_trial_access(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_mat text;
  v_mats text[] := ARRAY['ped', 'cm', 'go', 'cc', 'sim', 'emg'];
BEGIN
  -- For each subject with data, create a trial access record
  FOREACH v_mat IN ARRAY v_mats LOOP
    INSERT INTO acessos (user_id, materia, grupo, status, trial_expires_at)
    VALUES (p_user_id, v_mat, 1, 'trial', now() + interval '7 days')
    ON CONFLICT (user_id, materia) DO NOTHING;
  END LOOP;
END;
$$;

-- 3. Trigger function (wrapper — PG triggers can't take args directly)
CREATE OR REPLACE FUNCTION trigger_new_user_trial()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM create_trial_access(NEW.id);
  RETURN NEW;
END;
$$;

-- 4. Trigger on profiles table to auto-create trial for new users
DROP TRIGGER IF EXISTS tr_new_user_trial ON profiles;
CREATE TRIGGER tr_new_user_trial
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_new_user_trial();

-- 4. For existing users, optionally run this to give them trial:
-- SELECT create_trial_access(id) FROM auth.users;
-- (Commented out — uncomment if you want to give trial to existing users)
