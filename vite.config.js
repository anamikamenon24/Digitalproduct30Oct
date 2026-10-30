import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Folders that must never be served by URL from the dev server. Private downloads are only
// reachable through /api/download (which checks ownership); the rest is server code or data.
const PRIVATE_DIRS = ['storage', 'server', 'db', 'scripts', 'tests', '.data', 'api/_lib']

function blockPrivateFiles() {
  const blocked = (url) => {
    let path
    try {
      path = decodeURIComponent(new URL(url, 'http://x').pathname).replace(/\\/g, '/').toLowerCase()
    } catch {
      return true
    }
    // Direct paths (/storage/x) and Vite's absolute-file route (/@fs/C:/.../storage/x).
    return PRIVATE_DIRS.some((d) => path.startsWith(`/${d}/`) || path === `/${d}` || (path.startsWith('/@fs/') && path.includes(`/${d}/`)))
      || /\/\.env(\.|$)/.test(path)
  }
  const middleware = (req, res, next) => {
    if (req.url && !req.url.startsWith('/api/') && blocked(req.url)) {
      res.statusCode = 404
      res.end('Not found')
      return
    }
    next()
  }
  return {
    name: 'pixelora-block-private-files',
    // Block bodies on purpose: if these hooks return a function, Vite calls it as a post-hook.
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

export default defineConfig(({ mode }) => {
  // Only the port is read here; secrets in .env are never exposed to the frontend (no VITE_ prefix).
  const apiPort = loadEnv(mode, process.cwd(), '').API_PORT || '3051'
  // The browser only ever talks to the Vite port; /api calls are forwarded to the local API server.
  const api = { target: `http://localhost:${apiPort}`, changeOrigin: false }
  // /mock-checkout is the offline Stripe stand-in (server/mock-checkout.js); it 404s unless STRIPE_MOCK=1.
  const proxy = { '/api': api, '/mock-checkout': api }
  return {
    plugins: [blockPrivateFiles(), react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            motion: ['framer-motion'],
            icons: ['lucide-react'],
          },
        },
      },
    },
    server: {
      port: 5180,
      strictPort: true,
      open: false,
      proxy,
      fs: { deny: ['.env', '.env.*', '*.{crt,pem,key}', '**/storage/**', '**/server/**', '**/db/**', '**/.data/**'] },
    },
    preview: { port: 4180, strictPort: true, proxy },
  }
})
