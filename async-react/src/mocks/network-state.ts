import {delay as mswDelay} from 'msw'

import {
  createDebuggingState,
  DEBUG_NETWORK_PATH,
  isApiPath,
  persistLatency,
  pathnameToApiPath,
  type ApiPath,
  type DebuggingState,
  type DebugRequest,
  type EndpointLatency,
} from '@/data/debugging'

let debuggingState: DebuggingState = createDebuggingState()

const inFlight = new Map<string, {path: ApiPath; request: DebugRequest}>()

export function getDebuggingState(): DebuggingState {
  return debuggingState
}

function notifyDebugging() {
  debuggingState = {
    '/api/lessons': {
      latency: debuggingState['/api/lessons'].latency,
      requests: [...debuggingState['/api/lessons'].requests],
    },
    '/api/lesson/:id/toggle': {
      latency: debuggingState['/api/lesson/:id/toggle'].latency,
      requests: [...debuggingState['/api/lesson/:id/toggle'].requests],
    },
    '/api/login': {
      latency: debuggingState['/api/login'].latency,
      requests: [...debuggingState['/api/login'].requests],
    },
  }
  window.dispatchEvent(new CustomEvent('debugging-update', {detail: debuggingState}))
}

export function setEndpointLatency(path: ApiPath, latency: EndpointLatency): void {
  debuggingState[path].latency = latency
  persistLatency(path, latency)
  notifyDebugging()
}

export async function applyEndpointDelay(path: ApiPath): Promise<void> {
  const latency = debuggingState[path].latency
  if (latency.mode === 'real') {
    await mswDelay('real')
    return
  }
  await mswDelay(latency.ms)
}

function isDebugNetworkUrl(url: string): boolean {
  try {
    return new URL(url).pathname === DEBUG_NETWORK_PATH
  } catch {
    return false
  }
}

export function trackRequestStart(request: Request, requestId: string): void {
  if (isDebugNetworkUrl(request.url)) {
    return
  }
  const path = pathnameToApiPath(new URL(request.url).pathname)
  if (path == null) {
    return
  }
  const debugRequest: DebugRequest = {
    id: requestId,
    label: `${request.method} ${new URL(request.url).pathname}`,
    start: Date.now(),
    done: false,
    latency: debuggingState[path].latency,
  }
  debuggingState[path].requests.push(debugRequest)
  inFlight.set(requestId, {path, request: debugRequest})
  notifyDebugging()
}

export function trackRequestEnd(requestId: string): void {
  const tracked = inFlight.get(requestId)
  if (!tracked) {
    return
  }
  tracked.request.done = true
  inFlight.delete(requestId)
  notifyDebugging()
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
