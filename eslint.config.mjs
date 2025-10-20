import js from '@eslint/js'
import {defineConfig, globalIgnores} from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', 'website/.next', 'website/next-env.d.ts']),
  js.configs.recommended,
  tseslint.configs.recommended,
  eslintConfigPrettier,
  reactHooks.configs.flat.recommended,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      'react': reactPlugin,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
])
