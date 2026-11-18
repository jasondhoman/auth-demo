import { randomBytes } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

const user = { sub: 'mock|developer', name: 'Mock User', email: 'mock@example.test' }
const mockUsername = 'demo'
const mockPassword = 'demo-password'

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
    const token = req.headers.cookie?.split('; ')
      .find((cookie) => cookie.startsWith('mock_auth='))?.slice('mock_auth='.length)
    const send = (body: object, status = 200) => {
      res.setHeader('Content-Type', 'application/json')
      res.statusCode = status
      res.end(JSON.stringify(body))
    }

    if (req.method === 'GET' && url.pathname === '/__mock_auth/session') {
      send({ user: token && sessions.has(token) ? user : null })
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
            send({ error: 'Invalid username or password.' }, 401)
            return
          }
          if (token) sessions.delete(token)
          const session = randomBytes(32).toString('hex')
          sessions.add(session)
          res.setHeader('Set-Cookie', `mock_auth=${session}; HttpOnly; SameSite=Strict; Path=/`)
          send({ user })
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
