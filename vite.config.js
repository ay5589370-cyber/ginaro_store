import process from 'node:process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'


const localApiRoutes = new Map([
  ['/api/ai/chat', './api/ai/chat.js'],
  ['/api/orders/create', './api/orders/create.js'],
  ['/api/orders/cancel', './api/orders/cancel.js'],
  ['/api/reviews/create', './api/reviews/create.js'],
  ['/api/reviews/update', './api/reviews/update.js'],
  ['/api/reviews/delete', './api/reviews/delete.js'],
  ['/api/reviews/eligibility', './api/reviews/eligibility.js'],
  ['/api/custom-designs/upload', './api/custom-designs/upload.js'],
  ['/api/custom-designs/signed-url', './api/custom-designs/signed-url.js'],
  ['/api/custom-designs/file', './api/custom-designs/file.js'],
  ['/api/admin/orders/update-status', './api/admin/orders/update-status.js'],
  ['/api/admin/reviews/delete', './api/admin/reviews/delete.js'],
])

function loadServerEnv(mode) {
  const env = loadEnv(mode, process.cwd(), '')

  Object.entries(env).forEach(([key, value]) => {
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  })
}

async function loadLocalApiHandler(routeModule) {
  const moduleUrl = pathToFileURL(resolve(process.cwd(), routeModule)).href
  const { default: handler } = await import(moduleUrl)
  return handler
}

function sendLocalApiError(res, code = 'API_ROUTE_FAILED', status = 500) {
  if (res.headersSent) return

  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({
    success: false,
    error: {
      code,
      message: 'Sorry, this request could not be processed right now.',
    },
  }))
}

function localApiPlugin() {
  return {
    name: 'ginaro-local-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname
        const routeModule = localApiRoutes.get(pathname)

        if (!routeModule) {
          next()
          return
        }

        try {
          const handler = await loadLocalApiHandler(routeModule)
          await handler(req, res)
        } catch (error) {
          console.error('Local API middleware failed', {
            route: pathname,
            code: error.code || 'API_ROUTE_FAILED',
            status: error.status || 500,
          })

          sendLocalApiError(res, error.code || 'API_ROUTE_FAILED', error.status || 500)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  loadServerEnv(mode)

  return {
    plugins: [react(), localApiPlugin()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('react') || id.includes('react-router-dom')) return 'react-vendor'
            if (id.includes('firebase')) return 'firebase-vendor'
            if (id.includes('@supabase')) return 'supabase-vendor'

            return 'vendor'
          },
        },
      },
    },
  }
})
