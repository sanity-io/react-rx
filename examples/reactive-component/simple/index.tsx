import {SimpleExample} from './SimpleExample'

const fs = require('fs')

export default {
  component: SimpleExample,
  title: 'Simple counter',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/SimpleExample.tsx`, 'utf-8'),
}
