import {useErrorBoundary} from 'use-error-boundary'

import {Example} from './Example'

export default function App() {
  const {ErrorBoundary, didCatch, error, reset} =
    useErrorBoundary()

  if (didCatch) {
    return (
      <>
        <div
          style={{
            color: 'crimson',
          }}
        >
          Oh no! An error occurred:
          <br />
          {error.message}
        </div>
        <button onClick={reset}>Try again</button>
      </>
    )
  }

  return (
    <ErrorBoundary>
      <Example />
    </ErrorBoundary>
  )
}
