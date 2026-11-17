const assert = require('node:assert/strict')
const fs = require('node:fs')
const { createServer, request } = require('node:http')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

const source = fs.readFileSync(path.join(__dirname, '../mock-auth-server.ts'), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText
const serverModule = {}
vm.runInNewContext(compiled, { exports: serverModule, require, URL })
const { mockAuthServer } = serverModule

test('mock server supports local sessions and rejects cross-origin requests', async (t) => {
  let handler
  mockAuthServer().configureServer({ middlewares: { use: (fn) => { handler = fn } } })
  const server = createServer((req, res) => handler(req, res, () => res.writeHead(404).end()))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const origin = `http://127.0.0.1:${server.address().port}`

  const session = await fetch(`${origin}/__mock_auth/session`)
  assert.equal((await session.json()).user, null)

  const forbidden = await fetch(`${origin}/__mock_auth/login`, {
    method: 'POST',
    headers: { origin: 'http://evil.example' },
  })
  assert.equal(forbidden.status, 403)

  const login = await fetch(`${origin}/__mock_auth/login`, {
    method: 'POST',
    headers: { origin },
  })
  assert.equal((await login.json()).user.name, 'Mock User')
  const cookie = login.headers.get('set-cookie').split(';')[0]
  assert.match(login.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/)

  const authenticated = await fetch(`${origin}/__mock_auth/session`, { headers: { cookie } })
  assert.equal((await authenticated.json()).user.sub, 'mock|developer')

  const logout = await fetch(`${origin}/__mock_auth/logout`, {
    method: 'POST',
    headers: { origin, cookie },
  })
  assert.equal((await logout.json()).user, null)
  const afterLogout = await fetch(`${origin}/__mock_auth/session`, { headers: { cookie } })
  assert.equal((await afterLogout.json()).user, null)

  const otherHostStatus = await new Promise((resolve, reject) => {
    const req = request(`${origin}/__mock_auth/session`, { headers: { host: 'evil.example' } }, (res) => {
      res.resume()
      resolve(res.statusCode)
    })
    req.on('error', reject)
    req.end()
  })
  assert.equal(otherHostStatus, 403)
})
