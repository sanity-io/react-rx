const fs = require('fs')
import {UseObservableExample} from './UseObservableExample'

export default {
  name: 'use-observable',
  component: UseObservableExample,
  title: 'Use observable',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/UseObservableExample.tsx`, 'utf-8')
}
