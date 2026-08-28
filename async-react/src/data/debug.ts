import {
  createDebuggingState,
  isApiPath,
  type ApiPath,
  type DebugRequest,
  type DebuggingState,
} from './debugging'
import * as fakeServer from './fake-data'

let debuggingState: DebuggingState = createDebuggingState()

let requestId = 0

function getRequestConfig(url: string): {path: ApiPath; delay: number} {
  const pathname = getPathPattern(url)
  if (!isApiPath(pathname)) {
    throw new Error(`No debugging state registered for ${pathname}`)
  }
  return {path: pathname, delay: debuggingState[pathname].delay}
}

function notifyDebugging() {
  debuggingState = {...debuggingState}
  window.dispatchEvent(new CustomEvent('debugging-update', {detail: debuggingState}))
}

const HOST = `http://localhost:8080`

interface JsonResponse {
  json: () => Promise<unknown>
}

type LocalTransport = (url: URL, options?: RequestInit) => Promise<JsonResponse>

type RequestParams = Record<string, string>

function parseUrl(url: URL): {endpoint: string; params: RequestParams | undefined} {
  const u = new URL(url, 'http://localhost')
  const segments = u.pathname.split('/').filter(Boolean)
  const endpoint = segments[segments.length - 1]
  const params: RequestParams = {}

  if (
    segments.length > 2 &&
    (/\d+/.test(segments[segments.length - 2]) ||
      /^[0-9a-fA-F-]{6,}$/.test(segments[segments.length - 2]))
  ) {
    params.id = segments[segments.length - 2]
  }

  u.searchParams.forEach((value, key) => {
    if (key === 'q') params.search = value
    else params[key] = value
  })

  return {endpoint, params: Object.keys(params).length ? params : undefined}
}

function parseDelay(value: string | undefined): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const localTransport: LocalTransport = (url) => {
  const {endpoint, params} = parseUrl(url)
  if (endpoint === 'lessons') {
    return fakeServer
      .getLessons(params?.tab, params?.search, parseDelay(params?.delay))
      .then((data) => {
        return {json: () => Promise.resolve(data)}
      })
  }
  if (endpoint === 'toggle' && params?.id) {
    return fakeServer.postLessonToggle(params.id, parseDelay(params?.delay)).then((data) => {
      return {json: () => Promise.resolve(data)}
    })
  }
  if (endpoint === 'login') {
    return fakeServer.postLogin(parseDelay(params?.delay)).then((data) => {
      return {json: () => Promise.resolve(data)}
    })
  }
  return Promise.reject(new Error('Unknown endpoint'))
}

export function delayedFetch(url: string, options?: RequestInit): Promise<unknown> {
  const {delay, path} = getRequestConfig(url)
  const id = requestId
  requestId += 1
  const request = addRequest(path, {
    id,
    label: `${options?.method || 'GET'} ${url}`,
    start: Date.now(),
    done: false,
    delay: delay,
  })

  const delayedUrl = new URL(url, HOST)
  delayedUrl.searchParams.set('delay', String(delay))

  return localTransport(delayedUrl, options)
    .then((response) => {
      markRequestDone(request)
      return response.json()
    })
    .catch((e: unknown) => {
      markRequestDone(request)
      throw e
    })
}

function addRequest(type: ApiPath, request: DebugRequest): DebugRequest {
  debuggingState[type].requests.push(request)
  notifyDebugging()
  return request
}

function markRequestDone(request: DebugRequest) {
  request.done = true
  notifyDebugging()
}

function getPathPattern(url: string): string {
  const {pathname} = new URL(url, HOST)
  return pathname
    .split('/')
    .map((segment) => {
      if (!segment) return ''
      if (/^\d+$/.test(segment) || /^[0-9a-fA-F-]{6,}$/.test(segment)) {
        return ':id'
      }
      return segment
    })
    .join('/')
}

window.addEventListener('debugging-set-delay', ({detail}) => {
  const {id, value} = detail
  debuggingState[id].delay = value
  localStorage.setItem(id, String(value))
  notifyDebugging()
})
