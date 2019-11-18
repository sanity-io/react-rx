import {Example} from '../../Examples'

const fs = require('fs')

export const EventHandlersExample: Example = {
  id: 'event-handlers',
  title: 'Event handlers',
  source: fs.readFileSync(`${__dirname}/EventHandlersExample.jsx`, 'utf-8')
}
