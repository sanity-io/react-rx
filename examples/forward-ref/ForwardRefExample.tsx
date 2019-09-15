import * as React from 'react'
import {map} from 'rxjs/operators'
import {forwardRef, reactiveComponent, useState} from '../../src/reactiveComponent'

interface Props {
  value: number
  onChange: (next: number) => void
}

const Input = forwardRef<HTMLInputElement, Props>((props$, ref) => {
  return props$.pipe(
    map((props: Props) => (
      <div>
        Hi
        <input
          type="range"
          min={1}
          ref={ref}
          max={1000}
          value={props.value}
          onChange={event => props.onChange(Number(event.currentTarget.value))}
        />
      </div>
    ))
  )
})

export const ForwardRefExample = reactiveComponent<{}>(() => {
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
