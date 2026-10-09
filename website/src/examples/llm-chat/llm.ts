import {
  concatMap,
  delay,
  from,
  of,
  type Observable,
} from 'rxjs'

/**
 * ─── MOCK ────────────────────────────────────────────────────────────────
 * A stand-in for a real streaming LLM API. In your app this function would
 * wrap a fetch ReadableStream or an SSE connection into an observable of
 * token deltas. Everything OUTSIDE this file is what your own code looks
 * like. Swap this mock for a real client and the rest stays the same.
 */
export function streamCompletion(
  prompt: string,
): Observable<string> {
  const answer =
    CANNED_ANSWERS[prompt] ??
    `I don't have a canned answer for “${prompt}”, but a real model would stream one here.`

  // A cold observable: every subscription is one "request" that streams
  // tokens with a bit of jitter, then completes.
  return from(tokenize(answer)).pipe(
    concatMap((token) =>
      of(token).pipe(
        delay(40 + Math.random() * 130),
      ),
    ),
  )
}

function tokenize(text: string): string[] {
  return text.split(/(?<= )/)
}

const CANNED_ANSWERS: Record<string, string> = {
  'Suggest a quick weeknight dinner': `Try a one-pan lemon garlic pasta: cook spaghetti, and while it boils, sizzle garlic in olive oil with chili flakes. Toss the drained pasta with the oil, lemon juice and zest, a splash of pasta water, and a handful of parmesan. Twenty minutes, one pot to wash, and it tastes like you tried much harder than you did.`,
  'Explain RxJS in one paragraph': `RxJS models anything that happens over time (clicks, sockets, timers, requests) as observables: lazy streams of values you transform with operators like map, filter and switchMap instead of wiring callbacks together. Composition is the superpower: cancellation, retries, debouncing and combining several async sources become one declarative chain instead of a pile of flags and cleanup code.`,
  'Write a haiku about streams': `Values drift downstream,
subscribe, and the river wakes.
Unsubscribe: silence.`,
}
