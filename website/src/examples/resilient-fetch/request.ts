import {
  catchError,
  concat,
  defer,
  distinctUntilChanged,
  map,
  type Observable,
  of,
  retry,
  scan,
  startWith,
  switchMap,
  takeWhile,
  throwError,
  timer,
} from 'rxjs'

export interface RequestCommand {
  generation: number
  latencyMs: number
  fail: boolean
}

export interface Report {
  generation: number
  summary: string
}

export type RequestEvent =
  | {type: 'offline'; command: RequestCommand}
  | {
      type: 'requesting'
      command: RequestCommand
      attempt: number
    }
  | {
      type: 'succeeded'
      command: RequestCommand
      attempt: number
      data: Report
    }
  | {
      type: 'failed'
      command: RequestCommand
      attempt: number
      message: string
    }

export interface FetchState {
  status:
    | 'idle'
    | 'offline'
    | 'refreshing'
    | 'ready'
    | 'error'
  attempt: number
  command?: RequestCommand
  data?: Report
  error?: string
}

export const INITIAL_FETCH_STATE: FetchState = {
  status: 'idle',
  attempt: 0,
}

export type RequestFactory = (
  command: RequestCommand,
  attempt: number,
) => Observable<Report>

export const simulatedRequest: RequestFactory = (
  command,
  attempt,
) =>
  timer(command.latencyMs).pipe(
    switchMap(() =>
      command.fail
        ? throwError(
            () =>
              new Error(
                `Simulated server failure on attempt ${attempt}`,
              ),
          )
        : of({
            generation: command.generation,
            summary: `Report ${command.generation} loaded after ${attempt} attempt${attempt === 1 ? '' : 's'}.`,
          }),
    ),
  )

export function requestEvents$(
  command: RequestCommand,
  {
    maxAttempts = 3,
    backoffMs = 400,
    request = simulatedRequest,
  }: {
    maxAttempts?: number
    backoffMs?: number
    request?: RequestFactory
  } = {},
): Observable<RequestEvent> {
  return defer(() => {
    let attempt = 0

    return defer(() => {
      attempt += 1
      return concat(
        of({
          type: 'requesting',
          command,
          attempt,
        } as const),
        request(command, attempt).pipe(
          map(
            (data) =>
              ({
                type: 'succeeded',
                command,
                attempt,
                data,
              }) as const,
          ),
        ),
      )
    }).pipe(
      retry({
        count: Math.max(0, maxAttempts - 1),
        delay: (_error, retryCount) =>
          timer(
            backoffMs * 2 ** (retryCount - 1),
          ),
      }),
      catchError((error: unknown) =>
        of({
          type: 'failed',
          command,
          attempt,
          message:
            error instanceof Error
              ? error.message
              : 'Unknown request error',
        } as const),
      ),
    )
  })
}

export function reduceRequestEvent(
  state: FetchState,
  event: RequestEvent,
): FetchState {
  switch (event.type) {
    case 'offline':
      return {
        ...state,
        status: 'offline',
        command: event.command,
        error: undefined,
      }
    case 'requesting':
      return {
        ...state,
        status: 'refreshing',
        command: event.command,
        attempt: event.attempt,
        error: undefined,
      }
    case 'succeeded':
      return {
        status: 'ready',
        command: event.command,
        attempt: event.attempt,
        data: event.data,
      }
    case 'failed':
      return {
        ...state,
        status: 'error',
        command: event.command,
        attempt: event.attempt,
        error: event.message,
      }
  }
}

const DEFAULT_COMMAND: RequestCommand = {
  generation: 1,
  latencyMs: 900,
  fail: false,
}

export function resilientFetchState$(
  refresh$: Observable<RequestCommand>,
  online$: Observable<boolean>,
  options?: Parameters<typeof requestEvents$>[1],
): Observable<FetchState> {
  return refresh$.pipe(
    startWith(DEFAULT_COMMAND),
    switchMap((command) =>
      online$.pipe(
        distinctUntilChanged(),
        switchMap((online) =>
          online
            ? requestEvents$(command, options)
            : of({
                type: 'offline',
                command,
              } as const),
        ),
        // A terminal event completes this generation. While offline,
        // the stream stays open so reconnect can restart the request.
        takeWhile(
          (event) =>
            event.type !== 'succeeded' &&
            event.type !== 'failed',
          true,
        ),
      ),
    ),
    scan(reduceRequestEvent, INITIAL_FETCH_STATE),
    startWith(INITIAL_FETCH_STATE),
  )
}
