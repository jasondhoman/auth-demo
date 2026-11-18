import { useState, type FormEvent } from 'react'
import { safeReturnTo } from './returnTo'

export default function MockLoginForm({ returnTo, authError }: { returnTo: unknown; authError?: Error }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)
    setSubmitting(true)
    try {
      const response = await fetch('/__mock_auth/login', {
        method: 'POST',
        body: new URLSearchParams({ username, password }),
      })
      if (response.status === 401) throw new Error('Invalid username or password.')
      if (!response.ok) throw new Error(`Mock auth server error: ${response.status}`)
      window.location.assign(safeReturnTo(returnTo))
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to sign in.')
      setSubmitting(false)
    }
  }

  return (
    <main className="auth">
      <h1>Mock sign in</h1>
      <p>Development mock authentication is enabled.</p>
      {(error || authError) && <p role="alert">{error || authError?.message}</p>}
      <form className="mock-login" onSubmit={signIn}>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        </label>
        <button type="submit" className="counter" disabled={submitting}>Sign in</button>
      </form>
    </main>
  )
}
