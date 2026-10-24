import { defineConfig } from 'vite'

// /api vai para o worker local (pnpm dev:api, porta 8787). Em produção, VITE_API_URL aponta para o Worker.
export default defineConfig({
  server: { port: 4213, proxy: { '/api': 'http://localhost:8787' } },
  preview: { port: 4213, proxy: { '/api': 'http://localhost:8787' } },
  build: { target: 'es2022', chunkSizeWarningLimit: 900, assetsInlineLimit: 0 },
})
