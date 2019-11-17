import {Example} from '../../Examples'
import {formatDistance} from 'date-fns'

const fs = require('fs')

export const PassThroughPropsExample: Example = {
  name: 'pass-through-props',
  title: 'Pass through props',
  evalCallback: 'render',
  type: 'mixed',
  scope: {formatDistance},
  source: fs.readFileSync(`${__dirname}/PassThroughPropsExample.tsx`, 'utf-8')
}
