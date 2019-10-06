import {ContextExample} from './ContextExample'
const fs = require('fs')

export default {
  component: ContextExample,
  title: 'React context',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/ContextExample.tsx`, 'utf-8'),
}
