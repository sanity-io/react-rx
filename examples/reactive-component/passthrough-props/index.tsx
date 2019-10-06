import {PassThroughPropsExample} from './PassThroughPropsExample'
const fs = require('fs')

export default {
  component: PassThroughPropsExample,
  title: 'Pass through props',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/PassThroughPropsExample.tsx`, 'utf-8'),
}
