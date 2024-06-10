'use client'

import {useServerInsertedHTML} from 'next/navigation'
import {useState} from 'react'
import {ServerStyleSheet, StyleSheetManager} from 'styled-components'

export function StyledComponentsRegistry({children}: {children: React.ReactNode}): JSX.Element {
  const isMounted = useIsMounted()
  // Only create stylesheet once with lazy initial state
  // x-ref: https://reactjs.org/docs/hooks-reference.html#lazy-initial-state
  const [styledComponentsStyleSheet] = useState(() => new ServerStyleSheet())

  useServerInsertedHTML(() => {
    const styles = styledComponentsStyleSheet.getStyleElement()
    styledComponentsStyleSheet.instance.clearTag()
    return <>{styles}</>
  })

  if (isMounted) return <>{children}</>

  return (
    <StyleSheetManager sheet={styledComponentsStyleSheet.instance}>{children}</StyleSheetManager>
  )
}

import {useSyncExternalStore} from 'react'

function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
}
// eslint-disable-next-line no-empty-function
const emptySubscribe = () => () => {}
