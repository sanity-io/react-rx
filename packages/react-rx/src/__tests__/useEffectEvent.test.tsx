import {render} from '@testing-library/react'
import {forwardRef, memo, useEffect, useEffectEvent as useNativeEffectEvent} from 'react'
import {describe, expect, test} from 'vitest'

import {useEffectEvent} from '../useEffectEvent'

const componentTypes = ['memo', 'forwardRef'] as const

type ComponentType = (typeof componentTypes)[number]
type EffectEventHook = (callback: () => void) => () => void

function expectLatestValue(useEvent: EffectEventHook, componentType: ComponentType) {
  const seen: number[] = []

  function useRecord(value: number) {
    const onEvent = useEvent(() => {
      seen.push(value)
    })

    useEffect(() => {
      onEvent()
      // oxlint-disable-next-line react/exhaustive-effect-dependencies -- extra `value` dep is intentional in this test
    }, [onEvent, value])
  }

  if (componentType === 'memo') {
    const Component = memo(function Component({value}: {value: number}) {
      useRecord(value)
      return null
    })
    const {rerender} = render(<Component value={0} />)
    rerender(<Component value={1} />)
  } else {
    const Component = forwardRef<unknown, {value: number}>(function Component({value}, _ref) {
      useRecord(value)
      return null
    })
    const {rerender} = render(<Component value={0} />)
    rerender(<Component value={1} />)
  }

  expect(seen).toEqual([0, 1])
}

describe('useEffectEvent', () => {
  for (const componentType of componentTypes) {
    test(`sees the latest value in ${componentType} components`, () => {
      expectLatestValue(useEffectEvent, componentType)
    })
  }
})

describe('React.useEffectEvent', () => {
  // These expected failures become unexpected passes when the tested React
  // version contains the upstream fix. Before replacing the ponyfill, ensure
  // the fix is also available in the lowest supported React version.
  for (const componentType of componentTypes) {
    test.fails(`sees the latest value in ${componentType} components`, () => {
      expectLatestValue(useNativeEffectEvent, componentType)
    })
  }
})
