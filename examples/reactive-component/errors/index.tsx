import {ErrorsExample} from './ErrorsExample'
const fs = require('fs')

export default {
  component: ErrorsExample,
  title: 'Errors',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/ErrorsExample.tsx`, 'utf-8'),
}
