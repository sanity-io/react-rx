import {formatDistance} from 'date-fns'

import {Example} from '../../pages/Examples/Examples'

const fs = require('fs')

export const PassThroughPropsExample: Example = {
  id: 'pass-through-props',
  title: 'Pass through props',
  scope: {formatDistance},
  source: fs.readFileSync(`${__dirname}/PassThroughPropsExample.jsx`, 'utf-8')
}
