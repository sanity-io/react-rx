import {ViewTransition, type ReactNode} from 'react'
import {createRoot} from 'react-dom/client'

import './index.css'
import './debugger.css'

import Home from '@/app/Home'
import Login from '@/app/Login'
import {Card, CardContent} from '@/components/ui/card'
import {Router, useRouter} from '@/router/index'

function Layout({children}: {children: ReactNode}) {
  return (
    <>
      <a
        href="https://github.com/sanity-io/react-rx/tree/current/async-react"
        target="_blank"
        rel="noreferrer"
        aria-label="GitHub"
        className="absolute top-4 right-4 hidden md:block"
      >
        {/* Inlined rather than imported: lucide deprecated every brand icon and
            removes them in v1.0 (lucide-icons/lucide#670). */}
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-6 fill-current">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a5.9 5.9 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
        </svg>
      </a>
      <div className="root flex-1 w-[475px] h-full overflow-hidden">
        <Card className="h-[610px] gap-2 flex flex-col border-solid border rounded-lg">
          <CardContent className="h-full px-0">
            <div className="flex flex-1 flex-col h-full">
              <div className="flex flex-col flex-1 gap-2 h-full">{children}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function AppRouter() {
  const {url} = useRouter()

  return (
    <>
      {url === '/' && (
        <ViewTransition key={url} default="none" enter="auto" exit="auto">
          <Layout>
            <Home />
          </Layout>
        </ViewTransition>
      )}
      {url === '/login' && (
        <ViewTransition key={url} default="none" enter="auto" exit="auto">
          <Layout>
            <div className="flex flex-col gap-6 p-12">
              <Card className="border-none">
                <Login />
              </Card>
            </div>
          </Layout>
        </ViewTransition>
      )}
    </>
  )
}

export default function App() {
  return (
    <Router>
      <AppRouter />
    </Router>
  )
}

const container = document.getElementById('root')
if (!container) {
  throw new Error('Expected the document to contain a #root element')
}

async function prepare(): Promise<void> {
  const {ensureWorker} = await import('@/mocks/browser')
  await ensureWorker()
}

const root = createRoot(container, {})
void prepare().then(() => {
  root.render(<App />)
})
