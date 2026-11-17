const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

const returnToSource = fs.readFileSync(path.join(__dirname, '../src/returnTo.ts'), 'utf8')
const returnToCompiled = ts.transpileModule(returnToSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText
const returnToExports = {}
vm.runInNewContext(returnToCompiled, {
  exports: returnToExports,
  URL,
  window: { location: { origin: 'http://localhost:5173' } },
})

const source = fs.readFileSync(path.join(__dirname, '../src/AuthGate.tsx'), 'utf8')
  .replaceAll('import.meta.env.DEV', 'false')
  .replaceAll('import.meta.env.VITE_MOCK_AUTH', "'false'")
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText

function render(auth, component = 'Login', props = {}) {
  let actionError
  const exports = {}
  const dependencies = {
    '@auth0/auth0-react': { useAuth0: () => auth },
    '@tanstack/react-router': { Outlet: () => null },
    react: { useState: () => [undefined, (value) => { actionError = value }] },
    'react/jsx-runtime': require('react/jsx-runtime'),
    './returnTo': returnToExports,
  }
  vm.runInNewContext(compiled, {
    exports,
    Error,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`)
      return dependencies[name]
    },
    window: { location: { origin: 'http://localhost:5173' } },
  })
  return {
    tree: exports[component]({ connection: 'company-ad', ...props }),
    actionError: () => actionError,
  }
}

function find(element, predicate) {
  if (!element || typeof element !== 'object') return undefined
  if (predicate(element)) return element
  const children = element.props?.children
  for (const child of Array.isArray(children) ? children : [children]) {
    const result = find(child, predicate)
    if (result) return result
  }
}

test('signed-out layout hides content and login displays authentication errors', () => {
  const signedOut = render({ isAuthenticated: false }, 'AuthenticatedLayout').tree
  assert.equal(signedOut, null)

  const failed = render({ isAuthenticated: false, error: new Error('Access denied') }).tree
  assert.equal(find(failed, (node) => node.props?.role === 'alert').props.children, 'Access denied')
  assert.equal(find(failed, (node) => node.props?.children === 'private app'), undefined)
})

test('sign-in selects the AD connection and reports failures', async () => {
  let options
  const login = render({
    isAuthenticated: false,
    loginWithRedirect: async (value) => { options = value },
  }, 'Login', { returnTo: '/?view=one#section' })
  await find(login.tree, (node) => node.type === 'button').props.onClick()
  assert.equal(options.authorizationParams.connection, 'company-ad')
  assert.equal(options.appState.returnTo, '/?view=one#section')

  const failed = render({
    isAuthenticated: false,
    loginWithRedirect: async () => { throw new Error('Login failed') },
  })
  await find(failed.tree, (node) => node.type === 'button').props.onClick()
  assert.equal(failed.actionError(), 'Login failed')
})

test('authenticated view displays identity and signs out to the app', async () => {
  let options
  const loggedIn = render({
    isAuthenticated: true,
    user: { name: 'Directory User' },
    logout: async (value) => { options = value },
  }, 'AuthenticatedLayout')
  assert.ok(find(loggedIn.tree, (node) => node.type === 'header'))
  assert.ok(find(loggedIn.tree, (node) => Array.isArray(node.props?.children) && node.props.children.includes('Directory User')))
  await find(loggedIn.tree, (node) => node.type === 'button').props.onClick()
  assert.equal(options.logoutParams.returnTo, 'http://localhost:5173')

  const failed = render({
    isAuthenticated: true,
    logout: async () => { throw new Error('Logout failed') },
  }, 'AuthenticatedLayout')
  await find(failed.tree, (node) => node.type === 'button').props.onClick()
  assert.equal(failed.actionError(), 'Logout failed')
})
