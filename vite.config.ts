import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { certificateDevProxy } from './server/viteCertificateProxy.ts'

export default defineConfig(({ mode }) => ({
  // Explicitly public variables only; stale legacy secret names cannot be exposed.
  envPrefix: 'VITE_PUBLIC_',
  plugins: [react(), tailwindcss(), certificateDevProxy(loadEnv(mode, process.cwd(), 'ZALEX_').ZALEX_API_KEY)],
  server: {
    host: 'localhost',
    port: 3000,
    strictPort: true,
  },
}))
