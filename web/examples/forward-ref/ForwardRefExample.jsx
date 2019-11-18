import {
  ReactDOM,
  component,
  forwardRef,
  map,
  React,
  useState
} from 'examples/_utils/globalScope'
//@endimport

const Input = forwardRef((props$, ref) => {
  return props$.pipe(
    map(props => (
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

const ForwardRefExample = component(() => {
  const [value$, setValue] = useState(0)
  const inputRef = React.useRef(null)

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

ReactDOM.render(<ForwardRefExample />, document.getElementById('forward-ref'))
