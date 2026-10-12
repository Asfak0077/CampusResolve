import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // When hosted (e.g. an E2B sandbox preview) the app is reached over HTTPS through
  // a proxy that forwards 443 -> this dev port. The HMR client must therefore dial
  // wss on 443 instead of the default ws://<host>:5173, otherwise the browser blocks
  // it as mixed content. Locally we keep Vite's defaults.
  const isHosted = process.env.E2B_SANDBOX === 'true' || env.VITE_HOSTED === 'true'

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      allowedHosts: true as any,
      hmr: isHosted ? { protocol: 'wss', clientPort: 443 } : undefined,
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://localhost:5001',
          changeOrigin: true
        },
        '/socket.io': {
          target: env.VITE_BACKEND_URL || 'http://localhost:5001',
          ws: true,
          changeOrigin: true
        },
        '/uploads': {
          target: env.VITE_BACKEND_URL || 'http://localhost:5001',
          changeOrigin: true
        }
      }
    },
    define: {
      'import.meta.env.VITE_VERCEL': JSON.stringify(env.VITE_VERCEL || 'false'),
      'import.meta.env.PROD': JSON.stringify(mode === 'production'),
    }
  }
})
