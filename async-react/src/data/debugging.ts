// Shared contract between the app's data layer and the standalone debugger panel.
// They only talk over CustomEvents, so the debugger stays out of the app bundle.

export type ApiPath = '/lessons' | '/lesson/:id/toggle' | '/login'

export interface DebugRequest {
  id: number
  label: string
  start: number
  done: boolean
  delay: number
}

export interface ApiDebugState {
  delay: number
  requests: DebugRequest[]
}

export type DebuggingState = Record<ApiPath, ApiDebugState>

interface SetDelayDetail {
  id: ApiPath
  value: number
}

declare global {
  interface WindowEventMap {
    'debugging-update': CustomEvent<DebuggingState>
    'debugging-set-delay': CustomEvent<SetDelayDetail>
  }
}

export function isApiPath(value: string): value is ApiPath {
  return value === '/lessons' || value === '/lesson/:id/toggle' || value === '/login'
}

function storedDelay(path: ApiPath): number {
  const stored = Number(localStorage.getItem(path))
  return Number.isFinite(stored) ? stored : 0
}

export function createDebuggingState(): DebuggingState {
  return {
    '/lessons': {delay: storedDelay('/lessons'), requests: []},
    '/lesson/:id/toggle': {delay: storedDelay('/lesson/:id/toggle'), requests: []},
    '/login': {delay: storedDelay('/login'), requests: []},
  }
}
