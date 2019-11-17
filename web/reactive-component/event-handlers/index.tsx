import {Example} from '../../Examples'

const fs = require('fs')

export const EventHandlersExample: Example = {
  name: 'event-handlers',
  title: 'Event handlers',
  evalCallback: 'component',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/EventHandlersExample.tsx`, 'utf-8')
}
