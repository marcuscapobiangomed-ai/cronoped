# 🎁 Freemium + Grupo Picker - Implementação Completa

## ✅ O que foi feito

### 1. **Backend - Supabase SQL** ✅ (Precisa executar)
- Criado arquivo: `supabase/add-trial-system.sql`
- Adiciona coluna `trial_expires_at` à tabela `acessos`
- Cria função `create_trial_access()` para auto-gerar trials
- Cria trigger automático `tr_new_user_trial` para novos usuários

**PRÓXIMO PASSO:** Execute o SQL no Supabase Dashboard

### 2. **Validação de Acesso** ✅ (Feito)
- Arquivo: `src/lib/db.js`
- Atualiza `validateAcesso()` para aceitar:
  - `status = "aprovado"` (pago permanente), OU
  - `status = "trial"` E `trial_expires_at > agora` (teste dentro do prazo)

### 3. **Dashboard - Card Expansível** ✅ (Feito)
- Arquivo: `src/components/Dashboard.jsx`
- **Mudanças:**
  - Remover modal global de pagamento
  - Cada card é agora **auto-contido** (estado local)
  - Card expande ao clicar "▶ Selecionar grupo"
  - Dropdown SELECT para escolher grupo (não mais buttons)
  - Botão dinâmico: "▶ Abrir Cronograma" (se tem acesso) ou "💳 Pagar" (se não tem)
  - Mostra badge: "✓ Acesso ativo" / "🎁 Trial: Xd" / "R$ 9,90"
  - Dias restantes do trial aparecem no badge

### 4. **Build** ✅ (Passado)
```
Dashboard: 7.13 KB (2.74 KB gz) — +0.2 KB vs anterior
Sem erros, pronto para deploy
```

---

## 🔧 PRÓXIMOS PASSOS (você precisa fazer)

### Passo 1️⃣: Executar SQL no Supabase

1. Abra https://supabase.com → seu projeto
2. Vá para **SQL Editor**
3. Cole o conteúdo de: `supabase/add-trial-system.sql`
4. Execute a query
5. Espere sucesso ✅

**Resultado esperado:**
- Coluna `trial_expires_at` adicionada à tabela `acessos`
- Função `create_trial_access` criada
- Trigger `tr_new_user_trial` criada

### Passo 2️⃣: Testar Freemium Localmente

1. **Limpar localStorage** (simular novo usuário):
   ```javascript
   // Console do browser
   localStorage.clear();
   location.reload();
   ```

2. **Criar conta nova** (por ex. lucas@test.com)

3. **Verificar no Supabase** (Table Editor):
   - Ir para `acessos` table
   - Filtrar por seu novo user_id
   - Verificar que existem 6 registros (um por matéria)
   - Coluna `status` = "trial"
   - Coluna `trial_expires_at` = hoje + 7 dias

4. **No app:**
   - Dashboard deve mostrar "🎁 Trial: 7d" em todos os cards
   - Clicar "▶ Selecionar grupo"
   - Card expande mostrando dropdown de grupos
   - Escolher grupo → botão muda para "▶ Abrir Cronograma"
   - Clicar em "Abrir" → navega para schedule com esse grupo

### Passo 3️⃣: Testar Expiração do Trial

1. **Alterar data de expiração no Supabase:**
   ```sql
   UPDATE acessos
   SET trial_expires_at = now()
   WHERE user_id = '<seu_uuid>' AND materia = 'ped';
   ```

2. **Recarregar app:**
   - Badge de Pediatria agora mostra "R$ 9,90"
   - Card expande normalmente
   - Escolher grupo
   - Botão muda para "💳 Pagar R$ 9,90"

### Passo 4️⃣: Testar Pagamento

1. Clicar em "💳 Pagar R$ 9,90"
2. Selecionar grupo antes
3. Redireciona para Mercado Pago (testbox se quiser)
4. Após confirmação → webhook atualiza acesso para "aprovado"
5. Próxima vez que entrar → "✓ Acesso ativo"

### Passo 5️⃣: Deploy

```bash
git add .
git commit -m "feat: freemium 7d trial + in-card grupo picker"
git push origin main
# Netlify deploya automaticamente via GitHub
```

---

## 📊 Exemplo de Fluxo

### Novo usuário:
1. Cria conta → trigger automático cria 6 registros com `status='trial'`
2. Entra no Dashboard → vê "🎁 Trial: 7d" em todos os cards
3. Clica "▶ Selecionar grupo" em Pediatria
4. Seleciona Grupo 3
5. Clica "▶ Abrir Cronograma"
6. Vê o cronograma de Pediatria Grupo 3
7. 7 dias depois → trial expira
8. Próxima visita → vê "R$ 9,90"
9. Pode pagar R$ 9,90 para renovar indefinidamente

### Usuário que pagou:
1. Tem `status='aprovado'` para algumas matérias
2. Vê "✓ Acesso ativo"
3. Clica card → expande → seleciona grupo → "▶ Abrir Cronograma"

---

## 📝 Notas Técnicas

### Estado por card (em vez de global):
```javascript
cardStates = {
  'ped': { expandido: false, grupoSelecionado: null },
  'cm':  { expandido: true,  grupoSelecionado: 3 },
  // ...
}
```

### Lógica de acesso atualizada:
```javascript
const now = new Date();
const trialAtivo = acesso?.status === 'trial' &&
                   acesso?.trial_expires_at &&
                   new Date(acesso.trial_expires_at) > now;
const hasAccess = acesso?.status === "aprovado" || trialAtivo;
```

### Arquivo de SQL criado:
`supabase/add-trial-system.sql` — já pronto, copie e cole no Supabase

---

## ✨ Melhorias visuais

- **Cards** agora são "cartões de ação" — clica para expandir
- **Dropdown SELECT** em vez de buttons para escolher grupo
- **Badge dinâmico** mostra "🎁 Trial: Xd" com dias restantes
- **Botão contextual** — "Abrir" vs "Pagar" dependendo do estado
- **Sem modal** — tudo acontece dentro do card
- **Responsive** — funciona em mobile

---

## ⚠️ Possíveis Problemas

### Erro ao executar SQL:
- Coluna `trial_expires_at` já existe? → Pode ignorar (idempotente)
- Trigger já existe? → Pode ignorar
- Função já existe? → Pode ignorar
- Erro de permissão? → Você precisa ter acesso de admin no Supabase

### Trial não aparece:
- Você executou o SQL?
- O novo usuário foi criado APÓS executar o SQL?
- Verificou a tabela `acessos` no Supabase?

### Card não expande:
- Abra DevTools (F12) → Console
- Procure por erros JavaScript
- Verifique que `handleGrupoChange()` é chamado

---

## 🎯 Checklist Final

- [ ] SQL executado no Supabase com sucesso
- [ ] Nova conta criada depois do SQL
- [ ] 6 registros em `acessos` com `status='trial'`
- [ ] Dashboard mostra "🎁 Trial: 7d"
- [ ] Clica card → expande com dropdown de grupos
- [ ] Seleciona grupo → botão muda para "Abrir"
- [ ] Clica "Abrir" → vai para schedule
- [ ] Simula expiração → card mostra "R$ 9,90"
- [ ] Build está passando (`npm run build`)
- [ ] Pronto para deploy!

---

**Pronto para um freemium bem mais atrativo! 🚀**
