import { Auth0Context, useAuth0 } from '@auth0/auth0-react'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { useContext, useEffect, useState } from 'react'
import { routeTree } from './routeTree.gen'

function createAppRouter(isAuthenticated: boolean) {
  return createRouter({ routeTree, context: { isAuthenticated } })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}

function ReadyRouter({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [router] = useState(() => createAppRouter(isAuthenticated))

  useEffect(() => {
    void router.invalidate()
  }, [router, isAuthenticated])

  return <RouterProvider router={router} context={{ isAuthenticated }} />
}

export default function AuthRouter() {
  const { isLoading, isAuthenticated } = useAuth0()
  if (isLoading) return <main className="auth" role="status">Loading authentication...</main>
  return <ReadyRouter isAuthenticated={isAuthenticated} />
}

export function UnconfiguredApp() {
  const context = useContext(Auth0Context)
  return (
    <Auth0Context.Provider value={{
      ...context,
      isLoading: false,
      isAuthenticated: false,
      error: new Error('Authentication is not configured. See the README for setup.'),
    }}>
      <AuthRouter />
    </Auth0Context.Provider>
  )
}
