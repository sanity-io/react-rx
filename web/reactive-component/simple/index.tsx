import {Example} from '../../Examples'

const fs = require('fs')

export const SimpleExample: Example = {
  name: 'simple-counter',
  title: 'Simple counter',
  type: 'mixed',
  evalCallback: 'component',
  source: fs.readFileSync(`${__dirname}/SimpleExample.tsx`, 'utf-8')
}
