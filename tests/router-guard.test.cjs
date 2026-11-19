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

test('missing configuration keeps the router available and reports the error', () => {
  const { UnconfiguredApp } = load('router.tsx', {
    '@auth0/auth0-react': { Auth0Context: { Provider: () => null } },
    '@tanstack/react-router': {},
    react: { useContext: () => ({ isLoading: true, isAuthenticated: false }) },
    'react/jsx-runtime': require('react/jsx-runtime'),
    './routeTree.gen': { routeTree: {} },
  })
  const provider = UnconfiguredApp()
  assert.equal(provider.props.value.isLoading, false)
  assert.equal(provider.props.value.isAuthenticated, false)
  assert.match(provider.props.value.error.message, /not configured/)
  assert.ok(provider.props.children)
})

test('authenticated layout redirects signed-out users and allows signed-in users', () => {
  const { Route } = load('routes/_authenticated/route.tsx', {
    '@tanstack/react-router': {
      createFileRoute: () => (options) => options,
      redirect: (options) => options,
    },
    '../../AuthGate': { AuthenticatedLayout: () => null },
  })
  const guard = Route.beforeLoad
  for (const pathname of ['/', '/dashboard', '/dashboard/todos/1', '/reports', '/account']) {
    const location = { pathname, href: `${pathname}?view=one#section` }
    assert.throws(() => guard({ context: { isAuthenticated: false }, location }), (result) => {
      assert.equal(result.to, '/login')
      assert.equal(result.search.redirect, location.href)
      return true
    })

    assert.equal(guard({ context: { isAuthenticated: true }, location }), undefined)
  }
})

test('route files must be placed under a layout folder', async () => {
  const { ESLint } = require('eslint')
  const eslint = new ESLint()
  for (const filePath of ['src/routes/loose.tsx', 'src/routes/nested/loose.tsx']) {
    const [result] = await eslint.lintText('export {}', { filePath })
    assert.ok(result.messages.some((message) => message.ruleId === 'routes/require-layout-folder'))
  }
  for (const filePath of ['src/routes/__root.tsx', 'src/routes/_public/new.tsx', 'src/routes/_authenticated/nested/new.tsx']) {
    const [result] = await eslint.lintText('export {}', { filePath })
    assert.equal(result.messages.some((message) => message.ruleId === 'routes/require-layout-folder'), false)
  }
})

test('generated routes all inherit a public or authenticated layout', async () => {
  const { createServer } = await import('vite')
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { routeTree } = await server.ssrLoadModule('/src/routeTree.gen.ts')
    assert.deepEqual(routeTree.children.map((route) => route.options.id).sort(), ['/_authenticated', '/_public'])
    const authenticated = routeTree.children.find((route) => route.options.id === '/_authenticated')
    assert.equal(typeof authenticated.options.beforeLoad, 'function')
  } finally {
    await server.close()
  }
})

test('todo detail resolves the route parameter and reports unknown todos', () => {
  const { todos } = load('todos.ts')
  const missing = new Error('not found')
  const { Route } = load('routes/_authenticated/dashboard/todos/$todoId.tsx', {
    '@tanstack/react-router': {
      createFileRoute: () => (options) => options,
      notFound: () => missing,
    },
    '../../../../todos': { todos },
    'react/jsx-runtime': require('react/jsx-runtime'),
  })
  const todo = Route.loader({ params: { todoId: '2' } })
  assert.equal(todo, todos[1])
  Route.useLoaderData = () => todo
  const page = JSON.stringify(Route.component())
  assert.ok(page.includes(todo.title))
  assert.ok(page.includes(todo.description))
  assert.throws(() => Route.loader({ params: { todoId: 'missing' } }), (error) => error === missing)
})
