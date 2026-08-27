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
        className="absolute top-4 right-4 hidden text-sm underline md:block"
      >
        GitHub
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
const root = createRoot(container, {})
root.render(<App />)
