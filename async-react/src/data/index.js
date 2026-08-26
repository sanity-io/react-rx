import { use, useEffect } from "react";
import {
  preloadObservablePromise,
  useObservablePromise,
  useSyncObservable,
} from "react-rx";
import {
  defer,
  distinctUntilChanged,
  scan,
  shareReplay,
  Subject,
} from "rxjs";

import { delayedFetch } from "./debug.jsx";

/**
 * @typedef {{id: string, title: string, description: string, icon: string, complete: boolean}} Lesson
 * @typedef {ReadonlyMap<string, boolean>} Wanted
 * @typedef {{type: "want", id: string, complete: boolean}
 *   | {type: "abandon", id: string}
 *   | {type: "confirm", lessons: Lesson[]}} StoreEvent
 */

/** Upstream keeps its promise cache for the session so back/forward never
 * re-suspends; approximate with a long retention window. Entries are dropped
 * earlier by revalidate() after mutations. */
const LESSONS_TTL = 10 * 60 * 1000;

/** One cold observable per tab+search. react-rx's promise cache is keyed by
 * observable identity, so identity is the cache key. revalidate() drops the
 * identities, so the next transition render swaps to fresh sources. */
let queries = new Map();

export function revalidate() {
  queries = new Map();
}

function lessonsFor(tab, search) {
  const key = `${tab || "all"}|${search || ""}`;
  if (!queries.has(key)) {
    // Creating this during render fetches nothing. react-rx subscribes after
    // commit, during a live swap, or during preload.
    queries.set(
      key,
      defer(() =>
        delayedFetch(`/lessons?tab=${tab || "all"}&q=${search || ""}`),
      ),
    );
  }
  return queries.get(key);
}

/** Call above the Suspense boundary and pass the promise to useLessons below. */
export function useLessonsPromise(tab, search) {
  return useObservablePromise(lessonsFor(tab, search), {
    ttl: LESSONS_TTL,
  });
}

const events$ = new Subject();

/** What the user asked for but has not seen yet, by lesson id. */
const wanted$ = events$.pipe(
  scan(reduceWanted, new Map()),
  distinctUntilChanged(),
  shareReplay({ bufferSize: 1, refCount: false }),
);
// An intent recorded while no list is mounted must survive navigation.
wanted$.subscribe();

/** Read intent below the Suspense boundary so its urgent update cannot suspend
 * the committed tree. Only committed server data retires an intent. */
export function useLessons(promise) {
  const lessons = use(promise);
  const wanted = useSyncObservable(wanted$, null);
  useEffect(() => {
    events$.next({ type: "confirm", lessons });
  }, [lessons]);
  return applyWanted(lessons, wanted);
}

/** Record intent before the POST so the check flips in the same event tick.
 * Drop it before rethrowing a failure so the action rejects with data restored. */
export function setComplete(id, complete) {
  events$.next({ type: "want", id, complete });
  return delayedFetch(`/lesson/${id}/toggle`, { method: "POST" }).catch(
    (error) => {
      events$.next({ type: "abandon", id });
      throw error;
    },
  );
}

/** @type {(wanted: Wanted, event: StoreEvent) => Wanted} */
function reduceWanted(wanted, event) {
  switch (event.type) {
    case "want":
      return new Map(wanted).set(event.id, event.complete);
    case "abandon":
      return retire(wanted, (id) => id === event.id);
    case "confirm":
      return retire(wanted, (id, complete) =>
        event.lessons.some(
          (lesson) => lesson.id === id && lesson.complete === complete,
        ),
      );
    default: {
      /** @type {never} */ (event);
      return wanted;
    }
  }
}

function applyWanted(lessons, wanted) {
  if (!wanted || wanted.size === 0) return lessons;
  return lessons.map((lesson) =>
    wanted.has(lesson.id) && wanted.get(lesson.id) !== lesson.complete
      ? { ...lesson, complete: wanted.get(lesson.id) }
      : lesson,
  );
}

/** Preserve the reference when nothing matched so distinctUntilChanged drops
 * confirmation no-ops. */
function retire(wanted, matches) {
  const next = new Map(wanted);
  for (const [id, complete] of wanted) {
    if (matches(id, complete)) next.delete(id);
  }
  return next.size === wanted.size ? wanted : next;
}

export function prefetchLessons() {
  // Warm the identity Home will render so a fast login needs no fallback.
  return Promise.race([
    preloadObservablePromise(lessonsFor("all", "")),
    delay(1000),
  ]);
}

export async function login() {
  await delayedFetch("/login", { method: "POST" });
  revalidate();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
