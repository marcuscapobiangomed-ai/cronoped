-- Adicionar política DELETE em pre_acessos
-- Permite que usuários deletem seus próprios registros (cancelar pagamento pendente)
CREATE POLICY "Users delete own acessos"
  ON pre_acessos
  FOR DELETE
  USING (auth.uid() = user_id);
