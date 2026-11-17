import { useAuth0 } from '@auth0/auth0-react'
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
  RouterProvider,
} from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import App from './App'
import { AuthenticatedLayout, Login } from './AuthGate'

const rootRoute = createRootRouteWithContext<{ isAuthenticated: boolean }>()()

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : '/',
  }),
  beforeLoad: ({ context }) => {
    if (context.isAuthenticated) throw redirect({ to: '/' })
  },
  component: function LoginRoute() {
    const { redirect: returnTo } = loginRoute.useSearch()
    return <Login returnTo={returnTo} connection={import.meta.env.VITE_AUTH0_CONNECTION?.trim() ?? ''} />
  },
})

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  beforeLoad: ({ context, location }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: '/login', search: { redirect: location.href }, replace: true })
    }
  },
  component: AuthenticatedLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/',
  component: App,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  authenticatedRoute.addChildren([indexRoute]),
])

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
