import {BehaviorSubject} from 'rxjs'
import {afterEach, describe, expect, test, vi} from 'vitest'

import {createCount$} from '../../../../website/src/examples/sync/RxTimer'
import {selectUnit} from '../../../../website/src/examples/time-ago/selectUnit'
import {createSnapshot$} from '../../../../website/src/examples/time-ago/TimeAgo'

afterEach(() => {
  vi.useRealTimers()
})

describe('time-ago example', () => {
  test('selectUnit picks the coarsest whole unit at each boundary', () => {
    expect(selectUnit(0)).toEqual({unit: 'second', value: 0})
    expect(selectUnit(59_000)).toEqual({unit: 'second', value: 59})
    expect(selectUnit(60_000)).toEqual({unit: 'minute', value: 1})
    expect(selectUnit(3_600_000)).toEqual({unit: 'hour', value: 1})
    expect(selectUnit(86_400_000)).toEqual({unit: 'day', value: 1})
  })

  test('distinctUntilChanged counts only emissions that change the label', async () => {
    vi.useFakeTimers()
    // A timestamp 65 seconds in the past: the minute value changes once a minute,
    // even though the underlying timer ticks every second.
    const date = new Date(Date.now() - 65_000)
    const snapshots: Array<{unit: string; value: number; emissions: number}> = []
    const subscription = createSnapshot$(date).subscribe((snapshot) => snapshots.push(snapshot))

    // Flush the initial (0ms) tick: the first value is the minute bucket, emission #1.
    await vi.advanceTimersByTimeAsync(0)
    expect(snapshots).toEqual([{unit: 'minute', value: 1, emissions: 1}])

    // 54 more seconds of ticks all collapse to the same {minute, 1}.
    await vi.advanceTimersByTimeAsync(54_000)
    expect(snapshots).toHaveLength(1)

    // Crossing into the second minute is the only new emission.
    await vi.advanceTimersByTimeAsync(1_000)
    expect(snapshots.at(-1)).toEqual({unit: 'minute', value: 2, emissions: 2})

    subscription.unsubscribe()
  })
})

describe('sync timer example', () => {
  test('keeps the running total across pause, resume, and interval changes', async () => {
    vi.useFakeTimers()
    const running$ = new BehaviorSubject(false)
    const delay$ = new BehaviorSubject(100)
    const counts: number[] = []
    const subscription = createCount$(running$, delay$).subscribe((count) => counts.push(count))

    // Paused: startWith(0) is the only value so far.
    expect(counts.at(-1)).toBe(0)

    running$.next(true)
    await vi.advanceTimersByTimeAsync(350)
    expect(counts.at(-1)).toBe(3)

    // Pausing stops emissions without resetting the fold.
    running$.next(false)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(counts.at(-1)).toBe(3)

    // Resuming continues the total from where it stopped.
    running$.next(true)
    await vi.advanceTimersByTimeAsync(200)
    expect(counts.at(-1)).toBe(5)

    // Changing the interval swaps the timer but keeps counting up.
    delay$.next(50)
    await vi.advanceTimersByTimeAsync(100)
    expect(counts.at(-1)).toBe(7)

    subscription.unsubscribe()
  })
})
