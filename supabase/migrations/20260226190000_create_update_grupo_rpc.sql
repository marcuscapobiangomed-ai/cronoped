-- RPC para atualizar o grupo do usuario numa materia
-- Chamado pelo ScheduleView.jsx quando VIP/trial troca grupo
CREATE OR REPLACE FUNCTION update_grupo(p_materia TEXT, p_grupo INTEGER)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE acessos
  SET grupo = p_grupo
  WHERE user_id = auth.uid()
    AND materia = p_materia;
END;
$$;

GRANT EXECUTE ON FUNCTION update_grupo(TEXT, INTEGER) TO authenticated;
