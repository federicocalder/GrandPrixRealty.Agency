import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/seo-lab/',
  server: {
    port: 5174,
    proxy: {
      '/seo-api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/seo-api/, '')
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
