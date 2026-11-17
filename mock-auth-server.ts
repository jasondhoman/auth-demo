import { randomBytes } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

const user = { sub: 'mock|developer', name: 'Mock User', email: 'mock@example.test' }
const mockUsername = 'demo'
const mockPassword = 'demo-password'

function returnTo(value: string | null, origin: string): string {
  if (!value?.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/'
  const url = new URL(value, origin)
  if (url.origin !== origin || url.pathname === '/login' || url.pathname.startsWith('/__mock_auth/')) return '/'
  return url.pathname + url.search + url.hash
}

export function mockAuthServer(): Plugin {
  const sessions = new Set<string>()

  function handle(req: IncomingMessage, res: ServerResponse, next: () => void) {
    if (!req.url?.startsWith('/__mock_auth/')) return next()

    res.setHeader('Cache-Control', 'no-store')
    const remote = req.socket.remoteAddress
    const host = req.headers.host
    let hostname: string | undefined
    try {
      hostname = host && new URL(`http://${host}`).hostname
    } catch {
      res.writeHead(400).end('Invalid host')
      return
    }
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote ?? '') ||
        !['localhost', '127.0.0.1', '[::1]'].includes(hostname ?? '')) {
      res.writeHead(403).end('Mock auth is only available on localhost')
      return
    }

    const url = new URL(req.url, `http://${host}`)
    const destination = returnTo(url.searchParams.get('returnTo'), url.origin)
    const token = req.headers.cookie?.split('; ')
      .find((cookie) => cookie.startsWith('mock_auth='))?.slice('mock_auth='.length)
    const send = (body: object) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(body))
    }

    if (req.method === 'GET' && url.pathname === '/__mock_auth/session') {
      send({ user: token && sessions.has(token) ? user : null })
      return
    }
    const loginForm = (invalid = false) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'")
      res.statusCode = invalid ? 401 : 200
      res.end(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mock sign in</title>
<style>body{font:18px system-ui;max-width:24rem;margin:10vh auto;padding:1rem}form,label{display:grid;gap:.5rem}form{gap:1rem}input,button{font:inherit;padding:.5rem}</style>
</head><body><main><h1>Mock sign in</h1><p>Development only</p>
${invalid ? '<p role="alert">Invalid username or password.</p>' : ''}
<form action="/__mock_auth/login?returnTo=${encodeURIComponent(destination)}" method="post">
<label>Username<input name="username" autocomplete="username" required></label>
<label>Password<input name="password" type="password" autocomplete="current-password" required></label>
<button type="submit">Sign in</button></form></main></body></html>`)
    }

    if (req.method === 'GET' && url.pathname === '/__mock_auth/login') {
      loginForm()
      return
    }
    if (req.method === 'POST' && req.headers.origin === `http://${host}`) {
      if (url.pathname === '/__mock_auth/login') {
        if (req.headers['content-type']?.split(';')[0].trim() !== 'application/x-www-form-urlencoded') {
          res.writeHead(415).end('Expected form data')
          return
        }
        let body = ''
        let tooLarge = false
        req.setEncoding('utf8')
        req.on('data', (chunk: string) => {
          if (tooLarge) return
          body += chunk
          if (Buffer.byteLength(body) > 4096) {
            tooLarge = true
            res.writeHead(413).end('Form data too large')
          }
        })
        req.on('end', () => {
          if (tooLarge) return
          const form = new URLSearchParams(body)
          if (form.get('username') !== mockUsername || form.get('password') !== mockPassword) {
            loginForm(true)
            return
          }
          if (token) sessions.delete(token)
          const session = randomBytes(32).toString('hex')
          sessions.add(session)
          res.setHeader('Set-Cookie', `mock_auth=${session}; HttpOnly; SameSite=Strict; Path=/`)
          res.writeHead(303, { Location: destination }).end()
        })
        req.on('error', () => {
          if (!res.headersSent) res.writeHead(400).end('Could not read form data')
        })
        return
      }
      if (url.pathname === '/__mock_auth/logout') {
        if (token) sessions.delete(token)
        res.setHeader('Set-Cookie', 'mock_auth=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0')
        send({ user: null })
        return
      }
    }
    res.writeHead(403).end('Invalid mock auth request')
  }

  return {
    name: 'mock-auth-server',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(handle)
    },
  }
}
