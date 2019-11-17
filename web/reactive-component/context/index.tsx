import {Example} from '../../Examples'

const fs = require('fs')

export const ContextExample: Example = {
  name: 'react-context',
  title: 'React context',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/ContextExample.tsx`, 'utf-8')
}
