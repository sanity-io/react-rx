import * as React from 'react'
import * as rxjs from 'rxjs'
import * as operators from 'rxjs/operators'
import {forwardRef, component, useState} from '../../../src'
import {render} from '../../utils/eval-render-noop'
//@endimports

const {map} = operators

interface Props {
  value: number
  onChange: (next: number) => void
}

const Input = forwardRef<HTMLInputElement, Props>((props$, ref) => {
  return props$.pipe(
    map((props: Props) => (
      <>
        <div>This input is forwarded as ref:</div>
        <input
          type="range"
          min={1}
          ref={ref}
          max={1000}
          value={props.value}
          onChange={event => props.onChange(Number(event.currentTarget.value))}
        />
      </>
    ))
  )
})

const ForwardRefExample = component<{}>(() => {
  const [value$, setValue] = useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  return value$.pipe(
    map(value => (
      <Input
        ref={inputRef}
        value={value}
        onChange={() => {
          if (inputRef.current) {
            setValue(Number(inputRef.current.value))
          }
        }}
      />
    ))
  )
})

render(<ForwardRefExample />)
