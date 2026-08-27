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

function expectStableIdentity(useEvent: EffectEventHook) {
  const identities = new Set<() => void>()

  function Component({value}: {value: number}) {
    identities.add(
      useEvent(() => {
        void value
      }),
    )
    return null
  }

  const {rerender} = render(<Component value={0} />)
  rerender(<Component value={1} />)
  rerender(<Component value={2} />)

  expect(identities.size).toBe(1)
}

describe('useEffectEvent', () => {
  for (const componentType of componentTypes) {
    test(`sees the latest value in ${componentType} components`, () => {
      expectLatestValue(useEffectEvent, componentType)
    })
  }

  // React Compiler only leaves `useEffectEvent` out of the dependencies it
  // infers when the hook is React's own, so a ponyfill has to keep a stable
  // identity. React's native hook and `use-effect-event@2` both return a fresh
  // function per render and would fail this.
  test('returns the same callback across renders', () => {
    expectStableIdentity(useEffectEvent)
  })
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
