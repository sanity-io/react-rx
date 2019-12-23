import {
  map,
  operators,
  React,
  ReactDOM,
  reactiveComponent,
  timer
} from '../_utils/globalScope'
import {useElement} from '../../../src'
//@endimport

const {withLatestFrom} = operators

const STYLE: React.CSSProperties = {
  textAlign: 'center',
  border: '1px dashed'
}

const SPEED = 2
const unpx = (v: string) => Number(v.replace(/px$/, ''))

const UseElementExample = reactiveComponent(() => {
  const [element$, ref] = useElement<HTMLElement>()

  const count$ = timer(0, 16).pipe(
    map(n => n % 400),
    map(n => (n > 200 ? -1 : 1))
  )
  return count$.pipe(
    withLatestFrom(element$),
    map(([direction, element]) => {
      const Tag = direction === 1 ? 'section' : 'article'
      return (
        <Tag
          // this connects the element$ observable to the actual element
          ref={ref}
          style={{
            ...STYLE,
            backgroundColor: Tag == 'article' ? '#335186' : '#90441a',
            borderRadius:
              unpx(element?.style.borderRadius || '20px') +
              direction * SPEED * -0.1,
            height: (element?.clientHeight || 0) + direction * SPEED,
            width: (element?.clientWidth || 0) + direction * SPEED
          }}
        >
          <div
            style={{
              ...(element && {fontSize: element.clientHeight / 5}),
              width: '100%',
              height: '100%',
              lineHeight: '500%'
            }}
          >
            {`<${Tag}>`}
          </div>
        </Tag>
      )
    })
  )
})

ReactDOM.render(
  <UseElementExample />,
  document.getElementById('use-element-example')
)
