import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { mockAuthServer } from './mock-auth-server.ts'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [
    react(),
    ...(command === 'serve' && process.env.NODE_ENV !== 'production' &&
      loadEnv(mode, process.cwd(), 'VITE_').VITE_MOCK_AUTH === 'true' ? [mockAuthServer()] : []),
  ],
}))
