import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/v1/api/auth': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/v1': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // Só os subcaminhos reais da API — não o prefixo inteiro, que colidiria
      // com as rotas SPA /ia e /crm em navegação direta/reload (ver App.tsx).
      '^/ia/(chat|busca|paciente|kpis|etl)': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/crm/': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
    },
  },
})
