const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

const source = fs.readFileSync(path.join(__dirname, '../src/MockLoginForm.tsx'), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText

function render(response, destination = '/?view=one#section') {
  const state = ['demo', 'demo-password', undefined, false]
  const updates = []
  let index = 0
  let request
  let redirected
  const exports = {}
  const dependencies = {
    react: { useState: () => { const i = index++; return [state[i], (value) => { updates[i] = value }] } },
    'react/jsx-runtime': require('react/jsx-runtime'),
    './returnTo': { safeReturnTo: (value) => value },
  }
  vm.runInNewContext(compiled, {
    exports, Error, URLSearchParams,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`)
      return dependencies[name]
    },
    fetch: async (url, options) => {
      request = { url, options }
      if (response instanceof Error) throw response
      return response
    },
    window: { location: { assign: (value) => { redirected = value } } },
  })
  const tree = exports.default({ returnTo: destination })
  const form = tree.props.children.find((child) => child?.type === 'form')
  return {
    submit: () => form.props.onSubmit({ preventDefault() {} }),
    updates,
    request: () => request,
    redirected: () => redirected,
  }
}

test('mock login submits credentials and restores the requested route', async () => {
  const form = render({ status: 200, ok: true })
  await form.submit()
  assert.equal(form.request().url, '/__mock_auth/login')
  assert.equal(form.request().options.method, 'POST')
  assert.equal(form.request().options.body.get('username'), 'demo')
  assert.equal(form.request().options.body.get('password'), 'demo-password')
  assert.equal(form.redirected(), '/?view=one#section')
})

test('mock login reports invalid credentials without navigating', async () => {
  const form = render({ status: 401, ok: false })
  await form.submit()
  assert.equal(form.updates[2], 'Invalid username or password.')
  assert.equal(form.updates[3], false)
  assert.equal(form.redirected(), undefined)
})

test('mock login surfaces server and network errors', async () => {
  for (const [response, message] of [
    [{ status: 503, ok: false }, 'Mock auth server error: 503'],
    [new Error('Network failed'), 'Network failed'],
  ]) {
    const form = render(response)
    await form.submit()
    assert.equal(form.updates[2], message)
    assert.equal(form.updates[3], false)
    assert.equal(form.redirected(), undefined)
  }
})
