import {EventHandlersExample} from './EventHandlersExample'
const fs = require('fs')

export default {
  component: EventHandlersExample,
  title: 'Event handlers',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/EventHandlersExample.tsx`, 'utf-8'),
}
