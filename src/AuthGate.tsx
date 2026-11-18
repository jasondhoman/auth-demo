import { useAuth0 } from '@auth0/auth0-react'
import { Outlet } from '@tanstack/react-router'
import { lazy, Suspense, useState } from 'react'
import { safeReturnTo } from './returnTo'

const MockLoginForm = import.meta.env.DEV ? lazy(() => import('./MockLoginForm')) : null

export function Login({ returnTo, connection }: { returnTo: unknown; connection: string }) {
  const { error, loginWithRedirect } = useAuth0()
  const [actionError, setActionError] = useState<string>()

  async function signIn() {
    setActionError(undefined)
    try {
      await loginWithRedirect({
        authorizationParams: { connection },
        appState: { returnTo: safeReturnTo(returnTo) },
      })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to start sign-in.')
    }
  }

  if (import.meta.env.DEV && import.meta.env.VITE_MOCK_AUTH === 'true' && MockLoginForm) {
    return (
      <Suspense fallback={<main className="auth" role="status">Loading authentication...</main>}>
        <MockLoginForm returnTo={returnTo} authError={error} />
      </Suspense>
    )
  }

  return (
    <main className="auth">
      <h1>Sign in</h1>
      <p>Sign in with your Active Directory account to continue.</p>
      {(error || actionError) && <p role="alert">{actionError || error?.message}</p>}
      <button type="button" className="counter" onClick={signIn}>Sign in</button>
    </main>
  )
}

export function AuthenticatedLayout() {
  const { isAuthenticated, logout, user } = useAuth0()
  const [actionError, setActionError] = useState<string>()

  async function signOut() {
    setActionError(undefined)
    try {
      await logout({ logoutParams: { returnTo: window.location.origin } })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to sign out.')
    }
  }

  if (!isAuthenticated) return null

  return (
    <>
      <header className="auth-header">
        <span>Signed in as {user?.name || user?.email || user?.sub || 'user'}</span>
        {import.meta.env.DEV && import.meta.env.VITE_MOCK_AUTH === 'true' && <span> (mock)</span>}
        <button type="button" className="counter" onClick={signOut}>Sign out</button>
        {actionError && <p role="alert">{actionError}</p>}
      </header>
      <Outlet />
    </>
  )
}
