import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Tailwind is applied through postcss.config.cjs
export default defineConfig({
  plugins: [react()],
})
