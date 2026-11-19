import { useAuth0 } from '@auth0/auth0-react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/account')({
  component: function Account() {
    const { user } = useAuth0()
    return (
      <main className="auth">
        <h1>Account</h1>
        <p>Signed in as {user?.name || user?.email || user?.sub || 'user'}</p>
        {user?.email && <p>{user.email}</p>}
      </main>
    )
  },
})
