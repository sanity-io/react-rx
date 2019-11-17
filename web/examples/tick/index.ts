import {Example} from '../../Examples'

const fs = require('fs')

export const TickExample: Example = {
  id: 'ticker',
  title: 'Ticker',
  source: fs.readFileSync(`${__dirname}/TickExample.tsx`, 'utf-8')
}
