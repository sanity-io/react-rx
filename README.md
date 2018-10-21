# react-props-stream

Higher order components for creating React components from RxJS streams

## Simple example

```typescript jsx
import {withPropsStream} from 'react-props-stream'
import {timer} from 'rxjs'
import {map} from 'rxjs/operators'
const numbers$ = timer(0, 1000).pipe(map(n => ({number: n})))

const MyStreamingComponent = withPropsStream(
  numbers$,
  props => <div>The number is {props.number}</div>
)
```

## Component that automatically fetches `props.url` when its value change

```typescript jsx
import {withPropsStream} from 'react-props-stream'
import {map, distinctUntilChanged, switchMap} from 'rxjs/operators'

const FetchComponent = withPropsStream(
  props$ =>
    props$.pipe(
      map(props => props.url),
      distinctUntilChanged(),
      switchMap(url => fetch(url).then(response => response.text())),
      map(responseText => ({responseText}))
    ),
  props => <div>The result was: {props.responseText}</div>
)

// Usage
ReactDOM.render(<FetchComponent url="http://example.com" />, document.getElementById('myid'))
```

## More examples
See more examples here: https://github.com/sanity-io/react-props-stream/tree/master/examples
