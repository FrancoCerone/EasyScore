import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages serve il sito da https://<utente>.github.io/EasyScore/
  base: command === 'build' ? '/EasyScore/' : '/',
  server: {
    port: 3000,
    open: true
  }
}))
