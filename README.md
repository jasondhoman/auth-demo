# React SPA with Auth0 and Active Directory

This Vite app uses Auth0 Universal Login and the Auth0 React SDK's Authorization Code Flow with PKCE. Auth0's AD/LDAP connector authenticates against Active Directory; the browser does not connect to LDAP or receive directory credentials.

## Set up Auth0 and Active Directory

1. Create an [Auth0 tenant](https://auth0.com/docs/get-started/auth0-overview/create-tenants) and a **Single Page Application** in its dashboard. Check that your Auth0 plan supports the AD/LDAP enterprise connection.
2. In the application's settings, configure these URLs for local development:
   - Allowed Callback URLs: `http://localhost:5173`
   - Allowed Logout URLs: `http://localhost:5173`
   - Allowed Web Origins: `http://localhost:5173`

   Save the settings. Vite may choose another port if 5173 is occupied; use the actual origin consistently in Auth0 if that happens. For deployment, add the exact HTTPS origin for each environment to all three settings.
3. Under **Authentication > Enterprise > Active Directory / LDAP**, create a connection and record its connection name. Follow [Auth0's AD/LDAP connection guide](https://auth0.com/docs/authenticate/identity-providers/enterprise-identity-providers/active-directory-ldap) and [connector installation instructions](https://auth0.com/docs/authenticate/identity-providers/enterprise-identity-providers/active-directory-ldap/ad-ldap-connector/install-configure-ad-ldap-connector). Install the connector on an organization-controlled host with access to AD, configure its directory endpoint, base DN and service-account credentials, and verify its tests. Prefer LDAPS with a valid certificate.
4. Enable the AD/LDAP connection for the SPA in Auth0, and disable all other connections for that application. The connection parameter selects AD for the sign-in flow, but the Auth0 application settings are what restrict available connections. Test the connection in the Auth0 dashboard.
5. Copy `.env.example` to `.env.local` and populate it with the tenant domain (for example, `tenant.us.auth0.com`, without `https://`), the SPA's client ID, and the AD/LDAP connection name:

   ```env
   VITE_AUTH0_DOMAIN=tenant.us.auth0.com
   VITE_AUTH0_CLIENT_ID=your-client-id
   VITE_AUTH0_CONNECTION=your-ad-connection-name
   ```

   Vite embeds `VITE_` variables in browser code: they are public. Never put an Auth0 client secret, connector provisioning ticket, or directory credentials in these variables or commit them to the project. Restart Vite after changing environment variables.

The connector requires access to your directory and outbound connectivity to Auth0. Consult Auth0's documentation for its platform requirements, availability, credential caching, and high-availability options. It is intended for directories your organization controls, not installation on customers' servers.

## Run and verify

```sh
pnpm install
pnpm dev
```

Open the origin Vite prints. The app should show a sign-in button; after successful AD login, it shows the starter app and user identity. Sign out returns to the app. Check an invalid AD login and verify that users cannot sign in using another connection. An authentication or configuration error is shown instead of the app.

Run `pnpm test`, `pnpm build`, and `pnpm lint` for local checks. A complete login test requires a configured Auth0 tenant and a working AD/LDAP connector.

## Routes

TanStack Router generates `src/routeTree.gen.ts` from the route files in `src/routes/` when Vite starts or builds. `/login` is public; `_authenticated.tsx` is a pathless layout whose `beforeLoad` guard redirects signed-out visitors to login and returns them to the requested route after authentication. Add protected pages under the `_authenticated` layout (for example, `_authenticated.settings.tsx`). Configure the production host to serve `index.html` for SPA routes.

## Local mock authentication

To try the guarded app without an Auth0 tenant or Active Directory, run:

```sh
VITE_MOCK_AUTH=true npm run dev
```

Open the localhost URL printed by Vite. The React mock login form accepts the public test credentials **`demo` / `demo-password`** to sign in as Mock User. Refresh to retain the session, and sign out to clear it. These credentials are for local testing only, not secrets or real accounts. Sessions are held in memory and disappear when the dev server restarts. Auth0 environment variables are not required in mock mode.

The mock server is available only in the Vite development server, only when explicitly enabled, and only from localhost. Production builds and the preview server do not enable mock authentication, even if the variable is set. This mock does not issue tokens or test Auth0 redirects, LDAP, real credentials, or API authorization; never use it to protect real data.

## Security boundary

This is a client-side UI gate, not server-side authorization: shipped SPA assets are public. Any API or other sensitive resource must validate its own access tokens and enforce authorization independently.
