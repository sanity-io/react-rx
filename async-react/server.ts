import express from 'express'

import * as fakeData from './src/data/fake-data.ts'

const app = express()
const port = 8080

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function queryDelay(value: unknown): number {
  const parsed = Number(queryString(value))
  return Number.isFinite(parsed) ? parsed : 0
}

app.use(function (_req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

app.get('/lessons', (req, res, next) => {
  const tab = queryString(req.query.tab)
  const search = queryString(req.query.q)
  void fakeData
    .getLessons(tab, search, queryDelay(req.query.delay))
    .then((lessons) => {
      res.send(JSON.stringify(lessons))
    })
    .catch(next)
})

app.post('/lesson/:id/toggle', (req, res, next) => {
  void fakeData
    .postLessonToggle(req.params.id, queryDelay(req.query.delay))
    .then(() => {
      res.send(JSON.stringify({status: 'ok'}))
    })
    .catch(next)
})

app.post('/login', (req, res, next) => {
  void fakeData
    .postLogin(queryDelay(req.query.delay))
    .then(() => {
      res.send(JSON.stringify({status: 'ok'}))
    })
    .catch(next)
})

app.listen(port, () => {
  console.warn(`Server running on port ${port}`)
})
