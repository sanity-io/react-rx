import {FetchExample} from './FetchExample'
const fs = require('fs')

export default {
  component: FetchExample,
  title: 'Fetch',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/FetchExample.tsx`, 'utf-8'),
}
