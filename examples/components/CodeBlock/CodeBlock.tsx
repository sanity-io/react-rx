import * as React from 'react'
import Highlight, {defaultProps} from 'prism-react-renderer'
import theme from 'prism-react-renderer/themes/oceanicNext'
import {LineNo, Pre} from './styles'

interface Props {
  source: string
}

export function CodeBlock(props: Props) {
  return (
    <Highlight {...defaultProps} theme={theme} code={props.source} language="jsx">
      {({className, style, tokens, getLineProps, getTokenProps}) => (
        <Pre className={className} style={style}>
          {tokens.map((line, i) => (
            <div {...getLineProps({line, key: i})}>
              <LineNo>{i + 1}</LineNo>
              {line.map((token, key) => (
                <span {...getTokenProps({token, key})} />
              ))}
            </div>
          ))}
        </Pre>
      )}
    </Highlight>
  )
}
