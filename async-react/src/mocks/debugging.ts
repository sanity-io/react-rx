export type ApiPath = '/api/lessons' | '/api/lesson/:id/toggle'

export type EndpointLatency = {mode: 'fixed' | 'real'; ms: number}

export interface DebugRequest {
  id: string
  label: string
  start: number
  latency: EndpointLatency
}

export interface ApiDebugState {
  latency: EndpointLatency
  requests: DebugRequest[]
}

export type DebuggingState = Record<ApiPath, ApiDebugState>

const API_PATHS: readonly ApiPath[] = ['/api/lessons', '/api/lesson/:id/toggle']

export const DEBUG_NETWORK_PATH = '/api/debug/network'

declare global {
  interface WindowEventMap {
    'debugging-update': CustomEvent<DebuggingState>
  }
}

export function isApiPath(value: string): value is ApiPath {
  return API_PATHS.some((path) => path === value)
}

export function parseEndpointLatency(value: unknown): EndpointLatency | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  if (!('mode' in value) || (value.mode !== 'fixed' && value.mode !== 'real')) {
    return null
  }
  if (!('ms' in value) || typeof value.ms !== 'number' || !Number.isFinite(value.ms)) {
    return null
  }
  return {mode: value.mode, ms: Math.max(0, value.ms)}
}

function parseStoredLatency(raw: string | null): EndpointLatency {
  const fallback: EndpointLatency = {mode: 'fixed', ms: 0}
  if (raw == null) {
    return fallback
  }
  try {
    return parseEndpointLatency(JSON.parse(raw)) ?? fallback
  } catch {
    return fallback
  }
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
