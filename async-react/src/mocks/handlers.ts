import {delay, http, HttpResponse} from 'msw'

import {DEBUG_NETWORK_PATH} from '@/data/debugging'
import * as fakeData from '@/data/fake-data'
import {
  applyEndpointDelay,
  getDebuggingState,
  parseNetworkConfigBody,
  setEndpointLatency,
} from '@/mocks/network-state'

export const handlers = [
  http.get('/api/lessons', async ({request}) => {
    await applyEndpointDelay('/api/lessons')
    const url = new URL(request.url)
    const tab = url.searchParams.get('tab') ?? undefined
    const search = url.searchParams.get('q') ?? undefined
    const lessons = await fakeData.getLessons(tab, search)
    return HttpResponse.json(lessons)
  }),

  http.post('/api/lesson/:id/toggle', async ({params}) => {
    await applyEndpointDelay('/api/lesson/:id/toggle')
    const id = params.id
    if (typeof id !== 'string') {
      return HttpResponse.json({error: 'Missing lesson id'}, {status: 400})
    }
    await fakeData.postLessonToggle(id)
    return HttpResponse.json({status: 'ok'})
  }),

  http.post('/api/login', async () => {
    await delay('real')
    return HttpResponse.json({status: 'ok'})
  }),

  http.post(DEBUG_NETWORK_PATH, async ({request}) => {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return HttpResponse.json({error: 'Invalid JSON'}, {status: 400})
    }
    try {
      const {path, latency} = parseNetworkConfigBody(body)
      setEndpointLatency(path, latency)
      return HttpResponse.json({status: 'ok', state: getDebuggingState()})
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid network config'
      return HttpResponse.json({error: message}, {status: 400})
    }
  }),
]
