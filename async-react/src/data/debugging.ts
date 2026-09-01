export type ApiPath = '/api/lessons' | '/api/lesson/:id/toggle' | '/api/login'

export type EndpointLatency = {mode: 'fixed'; ms: number} | {mode: 'real'; ms: number}

export interface DebugRequest {
  id: string
  label: string
  start: number
  done: boolean
  latency: EndpointLatency
}

export interface ApiDebugState {
  latency: EndpointLatency
  requests: DebugRequest[]
}

export type DebuggingState = Record<ApiPath, ApiDebugState>

const API_PATHS: readonly ApiPath[] = ['/api/lessons', '/api/lesson/:id/toggle', '/api/login']

export const DEBUG_NETWORK_PATH = '/api/debug/network'

declare global {
  interface WindowEventMap {
    'debugging-update': CustomEvent<DebuggingState>
  }
}

export function isApiPath(value: string): value is ApiPath {
  return (API_PATHS as readonly string[]).includes(value)
}

function defaultLatency(): EndpointLatency {
  return {mode: 'fixed', ms: 0}
}

function parseStoredLatency(raw: string | null): EndpointLatency {
  if (raw == null || raw === '') {
    return defaultLatency()
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'mode' in parsed &&
      'ms' in parsed &&
      (parsed.mode === 'fixed' || parsed.mode === 'real') &&
      typeof parsed.ms === 'number' &&
      Number.isFinite(parsed.ms)
    ) {
      return {mode: parsed.mode, ms: Math.max(0, parsed.ms)}
    }
  } catch {
    const legacy = Number(raw)
    if (Number.isFinite(legacy)) {
      return {mode: 'fixed', ms: Math.max(0, legacy)}
    }
  }
  return defaultLatency()
}

function storedLatency(path: ApiPath): EndpointLatency {
  return parseStoredLatency(localStorage.getItem(path))
}

export function persistLatency(path: ApiPath, latency: EndpointLatency): void {
  localStorage.setItem(path, JSON.stringify(latency))
}

export function createDebuggingState(): DebuggingState {
  return {
    '/api/lessons': {latency: storedLatency('/api/lessons'), requests: []},
    '/api/lesson/:id/toggle': {
      latency: storedLatency('/api/lesson/:id/toggle'),
      requests: [],
    },
    '/api/login': {latency: storedLatency('/api/login'), requests: []},
  }
}

export function pathnameToApiPath(pathname: string): ApiPath | null {
  const patterned = pathname
    .split('/')
    .map((segment) => {
      if (!segment) return ''
      if (/^\d+$/.test(segment) || /^[0-9a-fA-F-]{6,}$/.test(segment)) {
        return ':id'
      }
      return segment
    })
    .join('/')
  return isApiPath(patterned) ? patterned : null
}
