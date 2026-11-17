import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import './index.css'
import AuthRouter from './router.tsx'
import { safeReturnTo } from './returnTo.ts'

const domain = import.meta.env.VITE_AUTH0_DOMAIN?.trim()
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID?.trim()
const connection = import.meta.env.VITE_AUTH0_CONNECTION?.trim()
const mockAuth = import.meta.env.DEV && import.meta.env.VITE_MOCK_AUTH === 'true'
const MockAuthProvider = import.meta.env.DEV ? lazy(() => import('./MockAuthProvider.tsx')) : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {mockAuth && MockAuthProvider ? (
      <Suspense fallback={<main className="auth" role="status">Loading authentication...</main>}>
        <MockAuthProvider>
          <AuthRouter />
        </MockAuthProvider>
      </Suspense>
    ) : domain && clientId && connection ? (
      <Auth0Provider
        domain={domain}
        clientId={clientId}
        authorizationParams={{ redirect_uri: window.location.origin }}
        onRedirectCallback={(appState) => {
          window.history.replaceState(null, '', safeReturnTo(appState?.returnTo))
        }}
      >
        <AuthRouter />
      </Auth0Provider>
    ) : (
      <main className="auth">
        <h1>Authentication is not configured</h1>
        <p>Set the Auth0 domain, client ID, and connection in your local environment. See the README for setup.</p>
      </main>
    )}
  </StrictMode>,
)
