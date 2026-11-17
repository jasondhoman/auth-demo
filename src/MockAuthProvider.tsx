import { Auth0Context, type RedirectLoginOptions } from '@auth0/auth0-react'
import { useContext, useEffect, useState, type ReactNode } from 'react'
import { safeReturnTo } from './returnTo'

type MockUser = { sub: string; name: string; email: string }

async function requestSession(path: string, method: 'GET' | 'POST', signal?: AbortSignal) {
  const response = await fetch(`/__mock_auth/${path}`, { method, signal })
  if (!response.ok) throw new Error(`Mock auth server error: ${response.status}`)
  const data: { user: MockUser | null } = await response.json()
  return data.user
}

export default function MockAuthProvider({ children }: { children: ReactNode }) {
  const initialContext = useContext(Auth0Context)
  const [user, setUser] = useState<MockUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error>()

  useEffect(() => {
    const controller = new AbortController()
    requestSession('session', 'GET', controller.signal)
      .then(setUser)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setError(error instanceof Error ? error : new Error('Mock authentication failed.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [])

  async function loginWithRedirect(options?: RedirectLoginOptions) {
    await requestSession('login', 'POST')
    window.location.assign(safeReturnTo(options?.appState?.returnTo))
  }

  async function logout() {
    await requestSession('logout', 'POST')
    window.location.assign('/')
  }

  return (
    <Auth0Context.Provider value={{
      ...initialContext,
      isLoading,
      isAuthenticated: !!user,
      user: user ?? undefined,
      error,
      loginWithRedirect,
      logout,
    }}>
      {children}
    </Auth0Context.Provider>
  )
}
