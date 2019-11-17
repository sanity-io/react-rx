import {Example} from '../../Examples'

const fs = require('fs')

export const UseReactiveStateExample: Example = {
  name: 'use-reactive-state',
  title: 'Reactive state',
  evalCallback: 'component',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/UseReactiveStateExample.tsx`, 'utf-8')
}
