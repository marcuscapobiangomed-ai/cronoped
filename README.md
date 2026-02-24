# 🩺 Internato HUCAM — Cronograma 2026.1

App web para acompanhamento do cronograma do internato médico com sincronização em nuvem e pagamento integrado.

## Stack

- **Frontend**: React 19 + Vite + CSS puro
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **Pagamento**: Mercado Pago Checkout
- **Deploy**: Netlify

## Estrutura

```
src/
  App.jsx          — Componentes principais (Auth, Dashboard, ScheduleView)
  scheduleData.js  — Dados do cronograma + configuração das matérias
  supabase.js      — Cliente Supabase
  index.css        — Estilos globais

supabase/
  functions/
    create-preference/  — Edge Function: cria preferência MP (token seguro)
    mp-webhook/         — Edge Function: recebe confirmação de pagamento
```

## Setup local

```bash
npm install
npm run dev
```

## Deploy

1. `npm run build`
2. Arrastar pasta `dist/` no [Netlify Drop](https://app.netlify.com/drop)

## Secrets necessários no Supabase

Em **Settings → Edge Functions → Secrets**:
- `MP_ACCESS_TOKEN` — Token de acesso do Mercado Pago

## Banco de dados (Supabase)

Tabelas: `profiles`, `acessos`, `progresso`

## Coluna `email` na tabela profiles

Execute no SQL Editor do Supabase se ainda não tiver:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
```
