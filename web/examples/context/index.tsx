import {Example} from '../../Examples'

const fs = require('fs')

export const ContextExample: Example = {
  id: 'react-context',
  title: 'React context',
  source: fs.readFileSync(`${__dirname}/ContextExample.tsx`, 'utf-8')
}
