import {setupWorker} from 'msw/browser'

import {handlers} from '@/mocks/handlers'
import {trackRequestEnd, trackRequestStart} from '@/mocks/network-state'

const worker = setupWorker(...handlers)

let startPromise: Promise<void> | null = null

async function startWorker(): Promise<void> {
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
    },
  })

  worker.events.on('request:start', ({request, requestId}) => {
    trackRequestStart(request, requestId)
  })

  worker.events.on('request:end', ({requestId}) => {
    trackRequestEnd(requestId)
  })

  worker.events.on('response:mocked', ({requestId}) => {
    trackRequestEnd(requestId)
  })
}

export function ensureWorker(): Promise<void> {
  if (startPromise == null) {
    startPromise = startWorker()
  }
  return startPromise
}
