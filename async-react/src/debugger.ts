import {
  DEBUG_NETWORK_PATH,
  type ApiDebugState,
  type ApiPath,
  type DebuggingState,
  type DebugRequest,
  type EndpointLatency,
} from './mocks/debugging'
import {ensureWorker} from './mocks/browser'
import {getDebuggingState} from './mocks/network-state'

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

  const origPush = history.pushState.bind(history)
  const origReplace = history.replaceState.bind(history)
  history.pushState = (...args: Parameters<History['pushState']>) => {
    origPush(...args)
    fireIfChanged()
  }
  history.replaceState = (...args: Parameters<History['replaceState']>) => {
    origReplace(...args)
    fireIfChanged()
  }

  return () => {
    window.removeEventListener('popstate', onPop)
    window.removeEventListener('hashchange', onHash)
    history.pushState = origPush
    history.replaceState = origReplace
  }
}

function TimedProgress(startMs: number, delayMs: number) {
  const container = document.createElement('div')
  container.setAttribute('role', 'progressbar')
  container.setAttribute('aria-valuemin', '0')
  container.setAttribute('aria-valuemax', '100')
  container.setAttribute('aria-label', 'Timed progress')
  container.className = 'network-progress'

  const bar = document.createElement('div')
  bar.className = 'network-progress-bar'
  container.appendChild(bar)

  function tick() {
    if (!container.isConnected) {
      return
    }
    const progress = delayMs <= 0 ? 1 : clamp((Date.now() - startMs) / delayMs)
    bar.style.transform = `translateX(${progress * 100 - 100}%)`
    if (progress < 1) {
      requestAnimationFrame(tick)
    }
  }
  requestAnimationFrame(tick)

  return container
}

function IndeterminateProgress() {
  const container = document.createElement('div')
  container.setAttribute('role', 'progressbar')
  container.setAttribute('aria-label', 'Real network delay')
  container.className = 'network-progress network-progress-indeterminate'
  const bar = document.createElement('div')
  bar.className = 'network-progress-indeterminate-bar'
  container.appendChild(bar)
  return container
}

interface NetworkRow {
  root: HTMLDivElement
  delayLabel: HTMLSpanElement
  slider: HTMLInputElement
  realCheckbox: HTMLInputElement
  requestsDiv: HTMLDivElement
}

function formatDelayLabel(latency: EndpointLatency): string {
  return latency.mode === 'real' ? 'real' : `${latency.ms}ms`
}

function syncControls(row: NetworkRow, latency: EndpointLatency): void {
  row.delayLabel.textContent = formatDelayLabel(latency)
  row.slider.value = String(latency.ms)
  row.slider.disabled = latency.mode === 'real'
  row.realCheckbox.checked = latency.mode === 'real'
}

function renderRequests(row: NetworkRow, requests: DebugRequest[]): void {
  row.requestsDiv.innerHTML = ''
  if (requests.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'network-request min-h-6'
    row.requestsDiv.appendChild(empty)
    return
  }
  for (const request of requests) {
    const requestDiv = document.createElement('div')
    requestDiv.className = 'network-request'
    const label = document.createElement('span')
    label.textContent = request.label
    requestDiv.appendChild(label)
    requestDiv.appendChild(
      request.latency.mode === 'real'
        ? IndeterminateProgress()
        : TimedProgress(request.start, request.latency.ms),
    )
    row.requestsDiv.appendChild(requestDiv)
  }
}

function updateNetworkRow(row: NetworkRow, api: ApiDebugState): void {
  syncControls(row, api.latency)
  renderRequests(row, api.requests)
}

function createNetworkRow(label: string, id: ApiPath, api: ApiDebugState): NetworkRow {
  const root = document.createElement('div')
  root.className = 'network-row'
  const header = document.createElement('div')
  header.className = 'network-row-header'
  const labelDiv = document.createElement('div')
  labelDiv.textContent = label
  const controls = document.createElement('div')
  controls.className = 'network-controls'

  const delayLabel = document.createElement('span')

  const slider = document.createElement('input')
  slider.type = 'range'
  slider.min = '0'
  slider.max = '3000'
  slider.step = '50'

  const realLabel = document.createElement('label')
  realLabel.className = 'network-real-toggle'
  const realCheckbox = document.createElement('input')
  realCheckbox.type = 'checkbox'
  realCheckbox.title = 'Use MSW delay("real")'
  realCheckbox.setAttribute('aria-label', `Real latency for ${label}`)
  const realText = document.createElement('span')
  realText.textContent = 'real'
  realLabel.appendChild(realCheckbox)
  realLabel.appendChild(realText)

  controls.appendChild(delayLabel)
  controls.appendChild(slider)
  controls.appendChild(realLabel)
  header.appendChild(labelDiv)
  header.appendChild(controls)
  const requestsDiv = document.createElement('div')
  requestsDiv.className = 'network-row-requests'
  root.appendChild(header)
  root.appendChild(requestsDiv)

  const row: NetworkRow = {root, delayLabel, slider, realCheckbox, requestsDiv}

  slider.addEventListener('input', () => {
    const latency: EndpointLatency = {mode: 'fixed', ms: Number(slider.value)}
    syncControls(row, latency)
    postNetworkConfig(id, latency)
  })
  realCheckbox.addEventListener('change', () => {
    const latency: EndpointLatency = {
      mode: realCheckbox.checked ? 'real' : 'fixed',
      ms: Number(slider.value),
    }
    syncControls(row, latency)
    postNetworkConfig(id, latency)
  })

  updateNetworkRow(row, api)
  return row
}

function Debugger() {
  const container = document.createElement('div')
  container.className = 'debugger'
  let state: DebuggingState = getDebuggingState()
  let rows: Partial<Record<ApiPath, NetworkRow>> = {}

  function render() {
    const apis: {label: string; id: ApiPath}[] =
      window.location.pathname === '/login'
        ? [{label: 'GET /api/lessons', id: '/api/lessons'}]
        : [
            {label: 'GET /api/lessons', id: '/api/lessons'},
            {label: 'POST /api/lesson/:id', id: '/api/lesson/:id/toggle'},
          ]
    for (const {label, id} of apis) {
      const existing = rows[id]
      if (existing) {
        updateNetworkRow(existing, state[id])
      } else {
        const row = createNetworkRow(label, id, state[id])
        rows[id] = row
        container.appendChild(row.root)
      }
    }
  }

  window.addEventListener('debugging-update', (event) => {
    state = event.detail
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

function postNetworkConfig(path: ApiPath, latency: EndpointLatency): void {
  ensureWorker()
    .then(() =>
      fetch(DEBUG_NETWORK_PATH, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({path, mode: latency.mode, ms: latency.ms}),
      }),
    )
    .catch((error: unknown) => {
      console.error('Failed to update network config', error)
    })
}

const root = document.getElementById('debugger')
if (root) {
  root.appendChild(Debugger())
}
