import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175, // Distinto a Auth (5173) y Expense (5174)
    proxy: {
      '/report': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/report/, ''), // La CF atiende en / directo
      },
    },
  },
})
