import express from 'express'

import * as fakeData from './src/data/fake-data.js'

const app = express()
const port = 8080

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

app.get('/lessons', (req, res, next) => {
  const tab = req.query.tab
  const search = req.query.q
  void fakeData
    .getLessons(tab, search, req.query.delay || 0)
    .then((lessons) => {
      res.send(JSON.stringify(lessons))
    })
    .catch(next)
})

app.post('/lesson/:id/toggle', (req, res, next) => {
  void fakeData
    .postLessonToggle(req.params.id, req.query.delay || 0)
    .then(() => {
      res.send(JSON.stringify({status: 'ok'}))
    })
    .catch(next)
})

app.post('/login', (req, res, next) => {
  void fakeData
    .postLogin(req.query.delay || 0)
    .then(() => {
      res.send(JSON.stringify({status: 'ok'}))
    })
    .catch(next)
})

app.listen(port, () => {
  console.warn(`Server running on port ${port}`)
})
