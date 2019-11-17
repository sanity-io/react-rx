import {Example} from '../../Examples'
const fs = require('fs')

export const ErrorsExample: Example = {
  name: 'errors',
  title: 'Errors',
  evalCallback: 'component',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/ErrorsExample.tsx`, 'utf-8')
}
