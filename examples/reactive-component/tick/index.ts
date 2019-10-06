import {TickExample} from './TickExample'
const fs = require('fs')

export default {
  component: TickExample,
  title: 'Ticker',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/TickExample.tsx`, 'utf-8'),
}
