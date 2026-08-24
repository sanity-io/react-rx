import {map, type Observable, timer} from 'rxjs'

const LATENCY_MS = 1500

export interface Profile {
  name: string
  bio: string
}

const BIOS: Record<string, string> = {
  Ada: 'Wrote the first published algorithm — a century before hardware could run it.',
  Grace:
    'Coined “debugging” after evicting an actual moth from a relay.',
  Alan: 'Asked whether machines can think, then built one that helped answer it.',
}

/**
 * One cold, fetch-like observable per profile, with visible latency.
 *
 * The Map-stable identity is load-bearing twice over: react-rx keys its
 * promise cache by observable identity, and `preloadObservablePromise` in the
 * click handler must receive the SAME instance the hook sees during render —
 * a factory that built a fresh observable per call would warm one cache entry
 * while the transition render suspends on another.
 */
let cache = new Map<string, Observable<Profile>>()

export function fetchProfile$(
  name: string,
): Observable<Profile> {
  let profile$ = cache.get(name)
  if (!profile$) {
    profile$ = timer(LATENCY_MS).pipe(
      map(() => ({
        name,
        bio:
          BIOS[name] ??
          `Profile for “${name}” loaded after ${LATENCY_MS}ms.`,
      })),
    )
    cache.set(name, profile$)
  }
  return profile$
}

/** Forget every profile so the next run of the demo starts cold. */
export function resetProfileCache(): void {
  cache = new Map()
}
