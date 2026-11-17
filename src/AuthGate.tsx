import { useAuth0 } from '@auth0/auth0-react'
import { Outlet } from '@tanstack/react-router'
import { useState } from 'react'
import { safeReturnTo } from './returnTo'

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

  return (
    <main className="auth">
      <h1>Sign in</h1>
      <p>{import.meta.env.DEV && import.meta.env.VITE_MOCK_AUTH === 'true'
        ? 'Development mock authentication is enabled.'
        : 'Sign in with your Active Directory account to continue.'}</p>
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
