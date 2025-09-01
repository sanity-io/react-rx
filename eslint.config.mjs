import js from '@eslint/js'
import {defineConfig, globalIgnores} from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import reactHooksPluginWithUseEffectEvent from 'eslint-plugin-react-hooks-with-use-effect-event'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', 'website/.next']),
  js.configs.recommended,
  tseslint.configs.recommended,
  eslintConfigPrettier,
  ...reactHooksPlugin.configs['flat/recommended'],
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      'react': reactPlugin,
      'react-hooks-with-use-effect-event': reactHooksPluginWithUseEffectEvent,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      // This rule understands useEffectEvent, unlike the original react-hooks plugin
      'react-hooks-with-use-effect-event/exhaustive-deps': 'error',
      'react-hooks/exhaustive-deps': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
])
