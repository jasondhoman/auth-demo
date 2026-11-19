import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['src/routes/**/*.{ts,tsx}'],
    ignores: [
      'src/routes/__root.tsx',
      'src/routes/_public/**',
      'src/routes/_authenticated/**',
    ],
    plugins: {
      routes: {
        rules: {
          'require-layout-folder': {
            create(context) {
              return {
                Program(node) {
                  context.report({ node, message: 'Put routes in _public/ or _authenticated/.' })
                },
              }
            },
          },
        },
      },
    },
    rules: { 'routes/require-layout-folder': 'error' },
  },
])
