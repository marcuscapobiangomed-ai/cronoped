CREATE OR REPLACE FUNCTION pre_update_grupo(p_materia TEXT, p_grupo INTEGER)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE pre_acessos
  SET grupo = p_grupo
  WHERE user_id = auth.uid()
    AND materia = p_materia;
END;
$$;
