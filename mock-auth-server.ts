import { randomBytes } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

const user = { sub: 'mock|developer', name: 'Mock User', email: 'mock@example.test' }

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

    const token = req.headers.cookie?.split('; ')
      .find((cookie) => cookie.startsWith('mock_auth='))?.slice('mock_auth='.length)
    const send = (body: object) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(body))
    }

    if (req.method === 'GET' && req.url === '/__mock_auth/session') {
      send({ user: token && sessions.has(token) ? user : null })
      return
    }
    if (req.method === 'POST' && req.headers.origin === `http://${host}`) {
      if (req.url === '/__mock_auth/login') {
        if (token) sessions.delete(token)
        const session = randomBytes(32).toString('hex')
        sessions.add(session)
        res.setHeader('Set-Cookie', `mock_auth=${session}; HttpOnly; SameSite=Strict; Path=/`)
        send({ user })
        return
      }
      if (req.url === '/__mock_auth/logout') {
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
