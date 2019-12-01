import {
  ReactDOM,
  reactiveComponent,
  forwardRef,
  map,
  React,
  useState
} from 'examples/_utils/globalScope'
//@endimport

const CustomInput = forwardRef((props$, ref) => {
  return props$.pipe(
    map(props => (
      <input
        ref={ref}
        type="text"
        value={props.value}
        onChange={props.onChange}
      />
    ))
  )
})

const ForwardRefExample = reactiveComponent(() => {
  const [value$, setValue] = useState('hello world')
  const inputRef = React.useRef(null)

  return value$.pipe(
    map(value => (
      <>
        <button
          onClick={() => {
            inputRef.current.select()
          }}
        >
          Select text in input
        </button>
        <div>
          <CustomInput
            ref={inputRef}
            value={value}
            onChange={() => {
              setValue(inputRef.current.value)
            }}
          />
        </div>
      </>
    ))
  )
})

ReactDOM.render(<ForwardRefExample />, document.getElementById('forward-ref'))
