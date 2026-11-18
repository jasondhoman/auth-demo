import { createFileRoute, redirect } from '@tanstack/react-router'
import { Login } from '../AuthGate'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : '/',
  }),
  beforeLoad: ({ context }) => {
    if (context.isAuthenticated) throw redirect({ to: '/' })
  },
  component: function LoginRoute() {
    const { redirect: returnTo } = Route.useSearch()
    return <Login returnTo={returnTo} connection={import.meta.env.VITE_AUTH0_CONNECTION?.trim() ?? ''} />
  },
})
