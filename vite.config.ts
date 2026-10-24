import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: { port: 4313, proxy: { '/api': 'http://localhost:8787' } },
  preview: { port: 4313, proxy: { '/api': 'http://localhost:8787' } },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
})
