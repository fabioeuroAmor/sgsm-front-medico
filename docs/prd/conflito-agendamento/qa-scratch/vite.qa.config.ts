// Front de QA do conflito de agendamento: mesma app, porta 3010, proxy /v1 para o sgsm de QA (:8095)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const raiz = fileURLToPath(new URL('../../../../', import.meta.url))

export default defineConfig({
  root: raiz,
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('../../../../src', import.meta.url)) } },
  server: {
    port: 3010,
    strictPort: true,
    proxy: {
      '/v1/api/auth': { target: 'http://localhost:8091', changeOrigin: true },
      '/v1': { target: 'http://localhost:8095', changeOrigin: true },
      '^/ia/(chat|busca|paciente|kpis|etl)': { target: 'http://localhost:8082', changeOrigin: true },
      '/crm/': { target: 'http://localhost:8082', changeOrigin: true },
    },
  },
})
