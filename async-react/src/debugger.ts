// Vanilla JS network debugger panel (not React) so React Performance Tracks
// stay free of debugger work.

import {
  createDebuggingState,
  DEBUG_NETWORK_PATH,
  type ApiDebugState,
  type ApiPath,
  type DebuggingState,
  type EndpointLatency,
} from './data/debugging'

function clamp(x: number) {
  return Math.max(0, Math.min(1, x))
}

interface PathChange {
  from: string
  to: string
  type?: NavigationType | null
}

function supportsNavigationApi(): boolean {
  return 'navigation' in window
}

function onPathChange(cb: (change: PathChange) => void) {
  let prevPath = location.pathname

  if (supportsNavigationApi()) {
    const handler = (e: NavigationCurrentEntryChangeEvent) => {
      const to = new URL(navigation.currentEntry?.url ?? location.href)
      if (to.pathname !== prevPath) {
        const old = prevPath
        prevPath = to.pathname
        cb({from: old, to: to.pathname, type: e.navigationType})
      }
    }
    navigation.addEventListener('currententrychange', handler)
    return () => navigation.removeEventListener('currententrychange', handler)
  }

  const fireIfChanged = () => {
    const next = location.pathname
    if (next !== prevPath) {
      const old = prevPath
      prevPath = next
      cb({from: old, to: next})
    }
  }

  const onPop = () => fireIfChanged()
  const onHash = () => fireIfChanged()
  window.addEventListener('popstate', onPop)
  window.addEventListener('hashchange', onHash)

  // oxlint-disable-next-line typescript/unbound-method
  const origPush = history.pushState
  // oxlint-disable-next-line typescript/unbound-method
  const origReplace = history.replaceState
  history.pushState = function (this: History, ...args: Parameters<History['pushState']>) {
    const ret = origPush.apply(this, args)
    fireIfChanged()
    return ret
  }
  history.replaceState = function (this: History, ...args: Parameters<History['replaceState']>) {
    const ret = origReplace.apply(this, args)
    fireIfChanged()
    return ret
  }

  return () => {
    window.removeEventListener('popstate', onPop)
    window.removeEventListener('hashchange', onHash)
    history.pushState = origPush
    history.replaceState = origReplace
  }
}

interface ProgressElement extends HTMLDivElement {
  _cleanup?: () => void
}

interface TimedProgressProps {
  startMs: number
  delayMs: number
  onDone?: () => void
  height?: string
}

function TimedProgress({startMs, delayMs, onDone, height = '6px'}: TimedProgressProps) {
  const container: ProgressElement = document.createElement('div')
  container.setAttribute('role', 'progressbar')
  container.setAttribute('aria-valuemin', '0')
  container.setAttribute('aria-valuemax', '100')
  container.setAttribute('aria-label', 'Timed progress')
  Object.assign(container.style, {
    position: 'relative',
    width: '100%',
    height,
    background: 'rgba(53,143,127,0.08)',
    borderRadius: height,
    overflow: 'hidden',
  })

  const bar = document.createElement('div')
  Object.assign(bar.style, {
    position: 'absolute',
    inset: 0,
    transform: 'translateX(-100%)',
    width: '100%',
    willChange: 'transform',
    background: '#00bc7d',
  })
  container.appendChild(bar)

  let raf = 0
  let doneFired = false

  function tick() {
    const now = Date.now()
    const progress = delayMs <= 0 ? 1 : clamp((now - startMs) / delayMs)
    bar.style.transform = `translateX(${progress * 100 - 100}%)`

    if (progress < 1) {
      raf = requestAnimationFrame(tick)
    } else if (!doneFired) {
      doneFired = true
      if (onDone) onDone()
    }
  }
  raf = requestAnimationFrame(tick)

  container._cleanup = () => cancelAnimationFrame(raf)
  return container
}

function IndeterminateProgress(height = '6px') {
  const container = document.createElement('div')
  container.setAttribute('role', 'progressbar')
  container.setAttribute('aria-label', 'Real network delay')
  container.className = 'network-progress-indeterminate'
  Object.assign(container.style, {
    position: 'relative',
    width: '100%',
    height,
    background: 'rgba(53,143,127,0.08)',
    borderRadius: height,
    overflow: 'hidden',
  })
  const bar = document.createElement('div')
  bar.className = 'network-progress-indeterminate-bar'
  container.appendChild(bar)
  return container
}

interface NetworkRequestProps {
  label: string
  id: ApiPath
  api: ApiDebugState
  row?: HTMLDivElement
}

function NetworkRequest({label, id, api, row}: NetworkRequestProps) {
  let requestsDiv: HTMLDivElement
  if (!row) {
    row = document.createElement('div')
    row.className = 'network-row'
    const header = document.createElement('div')
    header.className = 'network-row-header'
    const labelDiv = document.createElement('div')
    labelDiv.textContent = label
    const controls = document.createElement('div')
    controls.className = 'network-controls'

    const span = document.createElement('span')
    span.dataset.role = 'delay-label'
    span.textContent = formatDelayLabel(api.latency)

    const input = document.createElement('input')
    input.type = 'range'
    input.min = '0'
    input.max = '3000'
    input.step = '50'
    input.value = String(api.latency.ms)
    input.disabled = api.latency.mode === 'real'
    input.addEventListener('input', () => {
      const ms = Number(input.value)
      span.textContent = `${ms}ms`
      void postNetworkConfig(id, {mode: 'fixed', ms})
    })

    const realLabel = document.createElement('label')
    realLabel.className = 'network-real-toggle'
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = api.latency.mode === 'real'
    checkbox.title = 'Use MSW delay("real")'
    checkbox.setAttribute('aria-label', `Real latency for ${label}`)
    const realText = document.createElement('span')
    realText.textContent = 'real'
    checkbox.addEventListener('change', () => {
      const ms = Number(input.value)
      const latency: EndpointLatency = checkbox.checked ? {mode: 'real', ms} : {mode: 'fixed', ms}
      input.disabled = checkbox.checked
      span.textContent = formatDelayLabel(latency)
      void postNetworkConfig(id, latency)
    })
    realLabel.appendChild(checkbox)
    realLabel.appendChild(realText)

    controls.appendChild(span)
    controls.appendChild(input)
    controls.appendChild(realLabel)
    header.appendChild(labelDiv)
    header.appendChild(controls)
    requestsDiv = document.createElement('div')
    requestsDiv.className = 'network-row-requests'
    row.appendChild(header)
    row.appendChild(requestsDiv)
  } else {
    const controls = row.querySelector('.network-controls')
    const span = controls?.querySelector('[data-role="delay-label"]')
    const input = controls?.querySelector('input[type="range"]')
    const checkbox = controls?.querySelector('input[type="checkbox"]')
    const existingRequests = row.querySelector('.network-row-requests')
    if (
      !(span instanceof HTMLElement) ||
      !(input instanceof HTMLInputElement) ||
      !(checkbox instanceof HTMLInputElement) ||
      !(existingRequests instanceof HTMLDivElement)
    ) {
      throw new Error('Expected the network row to keep its controls and requests container')
    }
    span.textContent = formatDelayLabel(api.latency)
    input.value = String(api.latency.ms)
    input.disabled = api.latency.mode === 'real'
    checkbox.checked = api.latency.mode === 'real'
    requestsDiv = existingRequests
    requestsDiv.innerHTML = ''
  }

  const requests = api.requests.filter((req) => !req.done)
  if (requests.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'network-request min-h-6'
    requestsDiv.appendChild(empty)
  } else {
    requests.forEach((req) => {
      const reqDiv = document.createElement('div')
      reqDiv.className = 'network-request'
      const span = document.createElement('span')
      span.textContent = req.label
      reqDiv.appendChild(span)
      if (req.latency.mode === 'real') {
        reqDiv.appendChild(IndeterminateProgress())
      } else {
        reqDiv.appendChild(TimedProgress({startMs: req.start, delayMs: req.latency.ms}))
      }
      requestsDiv.appendChild(reqDiv)
    })
  }

  return row
}

function formatDelayLabel(latency: EndpointLatency): string {
  return latency.mode === 'real' ? 'real' : `${latency.ms}ms`
}

function Debugger() {
  const container = document.createElement('div')
  container.className = 'debugger'
  let requests: DebuggingState = createDebuggingState()

  let rows: Partial<Record<ApiPath, HTMLDivElement>> = {}

  function render() {
    let apis: {label: string; id: ApiPath}[]
    if (window.location.pathname === '/login') {
      apis = [
        {label: 'GET /api/lessons', id: '/api/lessons'},
        {label: 'POST /api/login', id: '/api/login'},
      ]
    } else {
      apis = [
        {label: 'GET /api/lessons', id: '/api/lessons'},
        {label: 'POST /api/lesson/:id', id: '/api/lesson/:id/toggle'},
      ]
    }
    apis.forEach(({label, id}) => {
      const existingRow = rows[id]
      if (!existingRow) {
        const created = NetworkRequest({
          label,
          id,
          api: requests[id],
        })
        rows[id] = created
        container.appendChild(created)
      } else {
        NetworkRequest({
          label,
          id,
          api: requests[id],
          row: existingRow,
        })
      }
    })
  }

  window.addEventListener('debugging-update', (event) => {
    requests = event.detail
    render()
  })
  onPathChange(() => {
    rows = {}
    container.innerHTML = ''
    render()
  })
  render()
  return container
}

async function postNetworkConfig(path: ApiPath, latency: EndpointLatency) {
  const {ensureWorker} = await import('./mocks/browser')
  await ensureWorker()
  await fetch(DEBUG_NETWORK_PATH, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({path, mode: latency.mode, ms: latency.ms}),
  })
}

const root = document.getElementById('debugger')
if (root) {
  root.appendChild(Debugger())
  void import('./mocks/browser').then(({ensureWorker}) => ensureWorker())
}
