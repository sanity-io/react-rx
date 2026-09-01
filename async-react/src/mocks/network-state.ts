import {delay} from 'msw'

import {
  createDebuggingState,
  isApiPath,
  pathnameToApiPath,
  persistLatency,
  type ApiDebugState,
  type ApiPath,
  type DebuggingState,
  type DebugRequest,
  type EndpointLatency,
} from '@/data/debugging'

let debuggingState = createDebuggingState()

const inFlight = new Map<string, ApiPath>()

export function getDebuggingState(): DebuggingState {
  return debuggingState
}

function updatePath(path: ApiPath, update: Partial<ApiDebugState>): void {
  debuggingState = {...debuggingState, [path]: {...debuggingState[path], ...update}}
  window.dispatchEvent(new CustomEvent('debugging-update', {detail: debuggingState}))
}

export function setEndpointLatency(path: ApiPath, latency: EndpointLatency): void {
  persistLatency(path, latency)
  updatePath(path, {latency})
}

export function applyEndpointDelay(path: ApiPath): Promise<void> {
  const latency = debuggingState[path].latency
  return latency.mode === 'real' ? delay('real') : delay(latency.ms)
}

export function trackRequestStart(request: Request, requestId: string): void {
  const url = new URL(request.url)
  const path = pathnameToApiPath(url.pathname)
  if (path == null) {
    return
  }
  const debugRequest: DebugRequest = {
    id: requestId,
    label: `${request.method} ${url.pathname}`,
    start: Date.now(),
    latency: debuggingState[path].latency,
  }
  inFlight.set(requestId, path)
  updatePath(path, {requests: [...debuggingState[path].requests, debugRequest]})
}

export function trackRequestEnd(requestId: string): void {
  const path = inFlight.get(requestId)
  if (path == null) {
    return
  }
  inFlight.delete(requestId)
  updatePath(path, {
    requests: debuggingState[path].requests.filter((request) => request.id !== requestId),
  })
}

export function parseNetworkConfigBody(value: unknown): {path: ApiPath; latency: EndpointLatency} {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError('Network config body must be an object')
  }
  if (!('path' in value) || typeof value.path !== 'string') {
    throw new TypeError('Network config requires a path')
  }
  if (!isApiPath(value.path)) {
    throw new TypeError(`Unknown API path: ${value.path}`)
  }
  if (!('mode' in value) || (value.mode !== 'fixed' && value.mode !== 'real')) {
    throw new TypeError('Network config requires mode "fixed" or "real"')
  }
  if (!('ms' in value) || typeof value.ms !== 'number' || !Number.isFinite(value.ms)) {
    throw new TypeError('Network config requires a finite ms number')
  }
  return {
    path: value.path,
    latency: {mode: value.mode, ms: Math.max(0, value.ms)},
  }
}
