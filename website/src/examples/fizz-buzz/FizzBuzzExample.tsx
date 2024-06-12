import {useObservable} from 'react-rx'
import {timer} from 'rxjs'
import {map, take} from 'rxjs/operators'

const observable = timer(0, 500).pipe(
  map((n) => n + 1),
  map((n) => {
    const divBy3 = n % 3 === 0
    const divBy5 = n % 5 === 0
    const divBy3And5 = divBy3 && divBy5
    return divBy3And5
      ? 'Fizz Buzz'
      : divBy3
        ? 'Fizz'
        : divBy5
          ? 'Buzz'
          : String(n)
  }),
  map((n, i) => (
    <h1>
      {i + 1}: {n}
    </h1>
  )),
  take(100),
)

export default function App() {
  return useObservable(observable)
}
