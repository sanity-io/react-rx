import {UseReactiveStateExample} from './UseReactiveStateExample'
const fs = require('fs')

export default {
  component: UseReactiveStateExample,
  title: 'Reactive state',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/UseReactiveStateExample.tsx`, 'utf-8'),
}
