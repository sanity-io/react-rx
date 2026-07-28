import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import {defineConfig, globalIgnores} from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['**/dist', 'website/.next', 'website/next-env.d.ts', 'website/public/_pagefind']),
  js.configs.recommended,
  tseslint.configs.recommended,
  eslintConfigPrettier,
  reactHooks.configs.flat.recommended,
  {
    plugins: {
      react: reactPlugin,
    },
    rules: {
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
])
