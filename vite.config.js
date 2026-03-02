import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
  const missing = required.filter(k => !env[k])
  if (missing.length) {
    throw new Error(`\n\n  ERRO: Variáveis de ambiente faltando: ${missing.join(', ')}\n  Crie o arquivo .env com as credenciais do Supabase.\n`)
  }
  return { plugins: [react()] }
})
