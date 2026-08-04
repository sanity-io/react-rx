import './demo.css'
import Home from './Home'
import Login from './Login'
import NetworkDebugger from './NetworkDebugger'
import {Router, useRouter} from './router'

/**
 * The React Conf 2025 "Async React" demo (github.com/rickhanlonii/async-react)
 * rebuilt on react-rx + RxJS. Product code stays declarative: routing runs
 * in transitions, data reads suspend by default, design components own
 * their pending/optimistic feedback through `action` props. The data
 * layer is streams, so revalidations update visible lists in place.
 *
 * Try it: open the network debugger at the bottom, give /lessons some
 * latency, and log in again. Under ~150ms nothing ever looks "loading".
 */
function Screen() {
  const router = useRouter()

  if (router.url === '/login') {
    return <Login />
  }
  return (
    <>
      <header className="lesson">
        <strong>Course Lessons</strong>
        {/* Log out is a plain transition navigation, so you can replay the
            login flow with different latencies. */}
        <button
          type="button"
          className="outline"
          onClick={() =>
            router.navigate('/login')
          }
        >
          Log out
        </button>
      </header>
      <Home />
    </>
  )
}

export default function App() {
  return (
    <Router>
      <Screen />
      <hr />
      <NetworkDebugger />
    </Router>
  )
}
