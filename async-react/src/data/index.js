import { preloadObservablePromise } from "react-rx";
import {
  defer,
  filter,
  firstValueFrom,
  shareReplay,
  startWith,
  Subject,
  switchMap,
  tap,
} from "rxjs";
import { delayedFetch } from "./debug.jsx";

// Stream-backed, suspense-enabled data fetching with react-rx.
//
// Each tab+search key gets one cached observable. Components read it as a
// use()-compatible promise via useObservablePromise: suspend until the first
// result, then update in place. Because later emissions never re-trigger
// Suspense, revalidation after a mutation streams fresh data into every
// visible list without any fallback risk.
const revalidate$ = new Subject();
const settled$ = new Subject();
const lessonsStreams = new Map();

export function revalidate() {
  revalidate$.next();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getLessons$(tab, search) {
  const key = `${tab || "all"}:${search || ""}`;
  let stream = lessonsStreams.get(key);
  if (!stream) {
    stream = revalidate$.pipe(
      startWith(undefined),
      switchMap(() =>
        defer(() =>
          delayedFetch(`/lessons?tab=${tab || "all"}&q=${search || ""}`),
        ),
      ),
      tap(() => settled$.next(key)),
      // Stale-while-revalidate: coming back to a key replays the last result
      // immediately (no fallback) while startWith + switchMap fetch a fresh
      // copy that streams in place.
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    lessonsStreams.set(key, stream);
  }
  return stream;
}

/**
 * Refetch every live lessons stream. Resolves when the given key has fresh
 * data, so actions can await it and their pending state covers the mutation
 * and the refetch, like awaiting router.refresh() used to.
 */
export function refreshLessons(tab, search) {
  const key = `${tab || "all"}:${search || ""}`;
  const done = firstValueFrom(settled$.pipe(filter((k) => k === key)));
  revalidate$.next();
  return done;
}

/**
 * Warm the lessons stream before navigating, waiting at most one second.
 * preloadObservablePromise starts the fetch and returns the exact promise
 * the home screen's useObservablePromise will read. On a fast network the
 * login completes straight into the full list. On a slow one, login
 * navigates after 1s and the Suspense fallback takes over.
 */
export function prefetchLessons() {
  const promise = preloadObservablePromise(getLessons$("all", ""), {
    ttl: 10_000,
  });
  return Promise.race([promise, delay(1000)]);
}

export async function mutateToggle(id) {
  return delayedFetch(`/lesson/${id}/toggle`, {
    method: "POST",
  });
}

export async function login() {
  return delayedFetch("/login", {
    method: "POST",
  });
}
