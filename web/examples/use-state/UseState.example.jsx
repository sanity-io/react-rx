import {
  React,
  ReactDOM,
  reactiveComponent,
  useState,
  switchMap,
  startWith,
  timer,
  map
} from '../_utils/globalScope'
//@endimport

const UseStateExample = reactiveComponent(() => {
  const [delay$, setDelay] = useState(100)

  return delay$.pipe(
    switchMap(delay =>
      timer(200, delay).pipe(
        startWith('Starting…'),
        map(n => `N: ${n}`),
        map(label => (
          <div>
            Current delay: {delay}
            <input
              type="range"
              min={0}
              max={1000}
              step={100}
              onClick={e => setDelay(Number(e.currentTarget.value) || 1000)}
            />
            {label}
          </div>
        ))
      )
    )
  )
})

ReactDOM.render(<UseStateExample />, document.getElementById('use-state'))
