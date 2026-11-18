const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

function load(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8')
    .replaceAll('import.meta.env.VITE_AUTH0_CONNECTION', "'company-ad'")
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const exports = {}
  vm.runInNewContext(compiled, {
    exports,
    URL,
    window: { location: { origin: 'http://localhost:5173' } },
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`)
      return dependencies[name]
    },
  })
  return exports
}

test('return locations preserve local paths but reject external and login URLs', () => {
  const { safeReturnTo } = load('returnTo.ts')
  for (const value of ['https://evil.example', '//evil.example', '/\\evil.example', '/login', null]) {
    assert.equal(safeReturnTo(value), '/')
  }
  assert.equal(safeReturnTo('/dashboard?tab=one#details'), '/dashboard?tab=one#details')
})

test('router waits for authentication before loading routes', () => {
  const { default: AuthRouter } = load('router.tsx', {
    '@auth0/auth0-react': { useAuth0: () => ({ isLoading: true, isAuthenticated: false }) },
    '@tanstack/react-router': {},
    react: {},
    'react/jsx-runtime': require('react/jsx-runtime'),
    './routeTree.gen': { routeTree: {} },
  })
  const loading = AuthRouter()
  assert.equal(loading.props.role, 'status')
  assert.equal(loading.props.children, 'Loading authentication...')
})

test('protected route guard redirects signed-out users and allows signed-in users', () => {
  const { Route } = load('routes/_authenticated.tsx', {
    '@tanstack/react-router': {
      createFileRoute: () => (options) => options,
      redirect: (options) => options,
    },
    '../AuthGate': { AuthenticatedLayout: () => null },
  })
  const guard = Route.beforeLoad
  const location = { href: '/?view=one#section' }
  assert.throws(() => guard({ context: { isAuthenticated: false }, location }), (result) => {
    assert.equal(result.to, '/login')
    assert.equal(result.search.redirect, location.href)
    return true
  })
  assert.equal(guard({ context: { isAuthenticated: true }, location }), undefined)
})
