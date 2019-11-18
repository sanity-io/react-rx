import React, {Fragment} from 'react'

import Editor from 'react-simple-code-editor'
import Highlight, {defaultProps} from 'prism-react-renderer'
import theme from 'prism-react-renderer/themes/nightOwl'
import prism, {languages} from 'prismjs'
import {default as ReactDOM, render} from 'react-dom'
import {CodeBlock} from '../web/components/CodeBlock'

const exampleCode = `
interface Props {
  number?: number
  error?: null | Error
  retrying?: boolean | Error
  onRetry?: (event: React.MouseEvent) => void
}

const numbers$ = timer(500, 500)

const ErrorsExample = component(() => {
  const [onRetry$, onRetry] = useEvent<React.MouseEvent>()
  const [onError$, onError] = useEvent<React.MouseEvent>()

  const errors$ = onError$.pipe(
    mergeMapTo(throwError(new Error('User triggered an error')))
  )

  return merge(numbers$, errors$).pipe(
    map(n => ({number: n})),
    catchError((error, caught$) => {
      return merge(
        of({error}),
        onRetry$.pipe(
          take(1),
          switchMapTo(concat(of({error, retrying: true}), caught$))
        )
      )
    }),
    map((props: Props) => (
      <>
        <p>This observable stream will fail when you click the button below</p>

        <p>
          <button type="button" onClick={onError}>
            Trigger error!
          </button>
        </p>
        {props.error ? (
          <>
            {props.retrying ? (
              <>Retrying…</>
            ) : (
              <>
                <p>Oh no: an error occurred: {props.error.message}</p>
                <p>
                  <button onClick={onRetry}>Retry</button>
                </p>
              </>
            )}
          </>
        ) : (
          <>Counter: {props.number}</>
        )}
      </>
    ))
  )
})

ReactDOM.render(<ErrorsExample />, document.getElementById('errors'))
`

const highlight = code => (
  <Highlight {...defaultProps} theme={theme} code={code} language="jsx">
    {({className, style, tokens, getLineProps, getTokenProps}) => (
      <Fragment>
        {tokens.map((line, i) => (
          <div {...getLineProps({line, key: i})}>
            {line.map((token, key) => (
              <span {...getTokenProps({token, key})} />
            ))}
          </div>
        ))}
      </Fragment>
    )}
  </Highlight>
)

const styles = {
  root: {
    boxSizing: 'border-box',
    fontFamily: '"Dank Mono", "Fira Code", monospace',
    ...theme.plain,
  },
}

function EditorExample() {
  const [code, setCode] = React.useState(exampleCode)
  return (
    <Editor
      value={code}
      onValueChange={setCode}
      highlight={src => prism.highlight(src, languages.js, 'javascript')}
      padding={10}
      style={styles.root}
    />
  )
}

const App = () => (
  <>
    <h1>Welcome to prism-react-renderer!</h1>
    <EditorExample />
    <CodeBlock source={exampleCode} scope={{}} filename="dummy.ts" />
  </>
)

render(<App />, document.getElementById('app'))
