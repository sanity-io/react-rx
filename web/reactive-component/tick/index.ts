import {Example} from '../../Examples'

const fs = require('fs')

export const TickExample: Example = {
  name: 'ticker',
  evalCallback: 'render',
  title: 'Ticker',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/TickExample.tsx`, 'utf-8')
}
