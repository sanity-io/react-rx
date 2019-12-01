import {
  reactiveComponent,
  map,
  React,
  ReactDOM,
  startWith,
  useEvent,
  useState
} from '../_utils/globalScope'
import {Observable, timer} from 'rxjs'
import {mapTo, switchMap, withLatestFrom} from 'rxjs/operators'
//@endimport

const STYLE: React.CSSProperties = {
  textAlign: 'center',
  border: '1px dashed'
}

const unpx = (v: string) => Number(v.replace(/px$/, ''))

const UseElementExample = reactiveComponent(() => {
  const [element$, ref] = useState<HTMLElement | null>(null)

  const count$ = timer(0, 3000).pipe(
    switchMap(i => timer(0, 5).pipe(mapTo(i % 2 === 0 ? 1 : -1)))
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
              unpx(element?.style.borderRadius || '20px') + direction * -0.1,
            height: (element?.clientHeight || 0) + direction,
            width: (element?.clientWidth || 0) + direction
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
  document.getElementById('event-handlers')
)
