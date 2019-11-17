  import {Example} from '../../Examples'
const fs = require('fs')

export const FetchExample: Example = {
  name: 'fetch',
  title: 'Fetch',
  evalCallback: 'render',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/FetchExample.tsx`, 'utf-8')
}
