import {useEffect} from 'react'
import {createRoot} from 'react-dom/client'
import {
  rxComponent,
  state,
} from 'react-rx-old'
import {timer} from 'rxjs'
import {
  map,
  startWith,
  switchMap,
} from 'rxjs/operators'

const ReactiveStateExample =
  rxComponent(() => {
    const [delay$, setDelay] =
      state(100)

    return delay$.pipe(
      switchMap((delay) =>
        timer(500, delay).pipe(
          map((n) => `Count: ${n}`),
          startWith(
            'Starting counter…',
          ),
          map((label) => (
            <>
              Counter interval (ms):{' '}
              <input
                type="range"
                min={0}
                max={1000}
                step={100}
                onChange={(e) =>
                  setDelay(
                    Number(
                      e.currentTarget
                        .value,
                    ),
                  )
                }
              />
              {delay}
              <div>{label}</div>
            </>
          )),
        ),
      ),
    )
  })

export default function App() {
  /**
   * Uses a `createRoot` workaround as legacy `rxComponent` APIs are not fully supported in Strict Mode
   */
  useEffect(() => {
    const root = createRoot(
      document.getElementById(
        'example',
      )!,
    )
    root.render(
      <ReactiveStateExample />,
    )
    return () => {
      root.unmount()
    }
  }, [])
  return <div id="example" />
}
