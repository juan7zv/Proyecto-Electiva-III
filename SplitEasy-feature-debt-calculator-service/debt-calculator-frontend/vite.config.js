import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5176, // Distinto a Auth (5173), Expense (5174) y Report (5175)
    proxy: {
      '/balances': 'http://localhost:8000',
      '/debts': 'http://localhost:8000',
    },
  },
})
