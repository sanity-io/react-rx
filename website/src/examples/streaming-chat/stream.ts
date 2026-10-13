import {
  catchError,
  concat,
  concatMap,
  from,
  groupBy,
  mergeMap,
  type Observable,
  of,
  scan,
  shareReplay,
  startWith,
  switchMap,
  throwError,
  timer,
} from 'rxjs'

export const ROOMS = [
  {id: 'incident', label: 'Incident room'},
  {id: 'release', label: 'Release room'},
  {id: 'research', label: 'Research room'},
] as const

export type RoomId = (typeof ROOMS)[number]['id']

export type ChatCommand =
  | {
      type: 'start'
      roomId: RoomId
      runId: number
      prompt: string
      failAtToken?: number
    }
  | {type: 'stop'; roomId: RoomId}
  | {type: 'clear'; roomId: RoomId}

export type ChatEvent =
  | {
      type: 'started'
      roomId: RoomId
      runId: number
      prompt: string
    }
  | {
      type: 'token'
      roomId: RoomId
      runId: number
      token: string
    }
  | {
      type: 'completed'
      roomId: RoomId
      runId: number
    }
  | {
      type: 'failed'
      roomId: RoomId
      runId: number
      message: string
    }
  | {type: 'stopped'; roomId: RoomId}
  | {type: 'cleared'; roomId: RoomId}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export interface RoomState {
  status:
    | 'idle'
    | 'streaming'
    | 'completed'
    | 'stopped'
    | 'error'
  messages: ChatMessage[]
  error?: string
}

export type ChatState = Record<RoomId, RoomState>

export const INITIAL_CHAT_STATE: ChatState =
  Object.fromEntries(
    ROOMS.map(({id}) => [
      id,
      {status: 'idle', messages: []},
    ]),
  ) as unknown as ChatState

const ROOM_REPLIES: Record<RoomId, string> = {
  incident:
    'I checked the timeline. The queue recovered after the worker restart; verify the backlog, then record the mitigation and owner.',
  release:
    'The release is ready for a staged rollout. Start at ten percent, watch error rate and latency, then promote after the observation window.',
  research:
    'The evidence supports a small experiment. Define one measurable outcome, capture the baseline, and compare the result before expanding scope.',
}

function tokensFor(
  roomId: RoomId,
  prompt: string,
) {
  const context = prompt.trim()
    ? `Regarding “${prompt.trim()}”: `
    : ''
  return (
    (context + ROOM_REPLIES[roomId]).match(
      /\S+\s*/g,
    ) ?? []
  )
}

export function tokenEvents$(
  command: Extract<ChatCommand, {type: 'start'}>,
  tokenDelayMs = 90,
): Observable<ChatEvent> {
  const tokens$ = from(
    tokensFor(command.roomId, command.prompt),
  ).pipe(
    concatMap((token, index) =>
      timer(tokenDelayMs).pipe(
        mergeMap(() =>
          index === command.failAtToken
            ? throwError(
                () =>
                  new Error(
                    'The simulated connection was interrupted.',
                  ),
              )
            : of({
                type: 'token',
                roomId: command.roomId,
                runId: command.runId,
                token,
              } as const),
        ),
      ),
    ),
  )

  return concat(
    of({
      type: 'started',
      roomId: command.roomId,
      runId: command.runId,
      prompt: command.prompt,
    } as const),
    tokens$,
    of({
      type: 'completed',
      roomId: command.roomId,
      runId: command.runId,
    } as const),
  )
}

export function reduceChatEvent(
  state: ChatState,
  event: ChatEvent,
): ChatState {
  const room = state[event.roomId]
  let nextRoom: RoomState

  switch (event.type) {
    case 'started':
      nextRoom = {
        status: 'streaming',
        messages: [
          ...room.messages,
          {
            id: `${event.runId}-user`,
            role: 'user',
            text: event.prompt,
          },
          {
            id: `${event.runId}-assistant`,
            role: 'assistant',
            text: '',
          },
        ],
      }
      break
    case 'token':
      nextRoom = {
        ...room,
        messages: room.messages.map((message) =>
          message.id ===
          `${event.runId}-assistant`
            ? {
                ...message,
                text: message.text + event.token,
              }
            : message,
        ),
      }
      break
    case 'completed':
      nextRoom = {...room, status: 'completed'}
      break
    case 'failed':
      nextRoom = {
        ...room,
        status: 'error',
        error: event.message,
      }
      break
    case 'stopped':
      nextRoom = {...room, status: 'stopped'}
      break
    case 'cleared':
      nextRoom = {status: 'idle', messages: []}
      break
  }

  return {...state, [event.roomId]: nextRoom}
}

export function chatState$(
  commands$: Observable<ChatCommand>,
  tokenDelayMs = 90,
): Observable<ChatState> {
  return commands$.pipe(
    groupBy((command) => command.roomId),
    mergeMap((roomCommands$) =>
      roomCommands$.pipe(
        switchMap((command) => {
          if (command.type === 'stop') {
            return of({
              type: 'stopped',
              roomId: command.roomId,
            } as const)
          }
          if (command.type === 'clear') {
            return of({
              type: 'cleared',
              roomId: command.roomId,
            } as const)
          }
          return tokenEvents$(
            command,
            tokenDelayMs,
          ).pipe(
            catchError((error: unknown) =>
              of({
                type: 'failed',
                roomId: command.roomId,
                runId: command.runId,
                message:
                  error instanceof Error
                    ? error.message
                    : 'Unknown streaming error',
              } as const),
            ),
          )
        }),
      ),
    ),
    scan(reduceChatEvent, INITIAL_CHAT_STATE),
    startWith(INITIAL_CHAT_STATE),
    shareReplay({bufferSize: 1, refCount: true}),
  )
}
