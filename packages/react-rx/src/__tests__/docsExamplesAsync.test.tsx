/* oxlint-disable typescript/ban-ts-comment, typescript/prefer-ts-expect-error -- Cross-workspace imports need TS6059 suppression. */
import {BehaviorSubject, Subject} from 'rxjs'
import {afterEach, describe, expect, test, vi} from 'vitest'

// @ts-ignore -- this regression suite intentionally imports runnable website source.
import * as requestExample from '../../../../website/src/examples/resilient-fetch/request'
// @ts-ignore -- this regression suite intentionally imports runnable website source.
import * as chatExample from '../../../../website/src/examples/streaming-chat/stream'

type ChatCommand = chatExample.ChatCommand
type ChatState = chatExample.ChatState
type FetchState = requestExample.FetchState
type RequestCommand = requestExample.RequestCommand
const {chatState$, INITIAL_CHAT_STATE} = chatExample
const {requestEvents$, resilientFetchState$} = requestExample

afterEach(() => {
  vi.useRealTimers()
})

describe('streaming chat example', () => {
  test('accumulates tokens and stops only the selected room', async () => {
    vi.useFakeTimers()
    const commands = new Subject<ChatCommand>()
    const states: ChatState[] = []
    const subscription = chatState$(commands, 10).subscribe((state) => states.push(state))

    commands.next({
      type: 'start',
      roomId: 'incident',
      runId: 1,
      prompt: 'Help',
    })
    commands.next({
      type: 'start',
      roomId: 'release',
      runId: 2,
      prompt: 'Ship',
    })
    await vi.advanceTimersByTimeAsync(25)
    commands.next({type: 'stop', roomId: 'incident'})

    const stoppedText = states.at(-1)?.incident.messages.at(-1)?.text
    await vi.advanceTimersByTimeAsync(5_000)

    expect(states.at(-1)?.incident.status).toBe('stopped')
    expect(states.at(-1)?.incident.messages.at(-1)?.text).toBe(stoppedText)
    expect(states.at(-1)?.release.status).toBe('completed')
    expect(states.at(-1)?.release.messages.at(-1)?.text).toContain('staged rollout')
    subscription.unsubscribe()
  })

  test('contains a token error so a later command can complete', async () => {
    vi.useFakeTimers()
    const commands = new Subject<ChatCommand>()
    let state = INITIAL_CHAT_STATE
    const subscription = chatState$(commands, 10).subscribe((next) => {
      state = next
    })

    commands.next({
      type: 'start',
      roomId: 'research',
      runId: 1,
      prompt: 'Test',
      failAtToken: 1,
    })
    await vi.advanceTimersByTimeAsync(100)
    expect(state.research.status).toBe('error')

    commands.next({
      type: 'start',
      roomId: 'research',
      runId: 2,
      prompt: 'Try again',
    })
    await vi.advanceTimersByTimeAsync(5_000)
    expect(state.research.status).toBe('completed')
    subscription.unsubscribe()
  })
})

describe('resilient fetch example', () => {
  test('bounds retries and converts the final error to an event', async () => {
    vi.useFakeTimers()
    const events: string[] = []
    const subscription = requestEvents$(
      {generation: 1, latencyMs: 10, fail: true},
      {maxAttempts: 3, backoffMs: 20},
    ).subscribe((event) => events.push(event.type))

    await vi.advanceTimersByTimeAsync(1_000)
    expect(events).toEqual(['requesting', 'requesting', 'requesting', 'failed'])
    subscription.unsubscribe()
  })

  test('counts attempts independently for each subscription', async () => {
    vi.useFakeTimers()
    const events$ = requestEvents$({
      generation: 1,
      latencyMs: 10,
      fail: false,
    })
    const firstAttempts: number[] = []
    const secondAttempts: number[] = []

    const first = events$.subscribe((event) => {
      if (event.type === 'requesting') firstAttempts.push(event.attempt)
    })
    await vi.advanceTimersByTimeAsync(20)
    const second = events$.subscribe((event) => {
      if (event.type === 'requesting') secondAttempts.push(event.attempt)
    })
    await vi.advanceTimersByTimeAsync(20)

    expect(firstAttempts).toEqual([1])
    expect(secondAttempts).toEqual([1])
    first.unsubscribe()
    second.unsubscribe()
  })

  test('cancels stale work, resumes offline work, and keeps last-good data', async () => {
    vi.useFakeTimers()
    const refresh = new Subject<RequestCommand>()
    const online = new BehaviorSubject(true)
    let state: FetchState = {
      status: 'idle',
      attempt: 0,
    }
    const subscription = resilientFetchState$(refresh, online, {backoffMs: 10}).subscribe(
      (next) => {
        state = next
      },
    )

    await vi.advanceTimersByTimeAsync(1_000)
    expect(state.data?.generation).toBe(1)

    refresh.next({
      generation: 2,
      latencyMs: 100,
      fail: false,
    })
    await vi.advanceTimersByTimeAsync(20)
    refresh.next({
      generation: 3,
      latencyMs: 10,
      fail: false,
    })
    await vi.advanceTimersByTimeAsync(20)
    expect(state.data?.generation).toBe(3)

    refresh.next({
      generation: 4,
      latencyMs: 50,
      fail: false,
    })
    online.next(false)
    await vi.advanceTimersByTimeAsync(100)
    expect(state.status).toBe('offline')
    expect(state.data?.generation).toBe(3)

    online.next(true)
    await vi.advanceTimersByTimeAsync(60)
    expect(state.status).toBe('ready')
    expect(state.data?.generation).toBe(4)

    refresh.next({
      generation: 5,
      latencyMs: 10,
      fail: true,
    })
    await vi.advanceTimersByTimeAsync(1_000)
    expect(state.status).toBe('error')
    expect(state.data?.generation).toBe(4)
    subscription.unsubscribe()
  })
})
