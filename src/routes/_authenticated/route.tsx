import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '../../AuthGate'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: '/login', search: { redirect: location.href }, replace: true })
    }
  },
  component: AuthenticatedLayout,
})
