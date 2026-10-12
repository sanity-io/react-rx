import {ReactTimer} from './ReactTimer'
import {RxTimer} from './RxTimer'

export default function App() {
  return (
    <main>
      <p>
        The same pause/resume timer, built two
        ways. Start both, then move a slider or
        pause one: the running total survives the
        pause in each.
      </p>
      <ReactTimer />
      <RxTimer />
    </main>
  )
}
