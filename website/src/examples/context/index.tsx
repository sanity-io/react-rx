'use client'

import Sandpack from '@/components/Sandpack'

import App from './App.tsx?raw'
import context from './context.tsx?raw'
import ModeSwitcher from './ModeSwitcher.tsx?raw'

export default function Example() {
  return (
    <Sandpack
      files={{
        '/App.tsx': App,
        '/ModeSwitcher.tsx': ModeSwitcher,
        '/context.tsx': context,
      }}
    />
  )
}