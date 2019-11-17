import {Example} from '../../Examples'
const fs = require('fs')

export const ErrorsExample: Example = {
  id: 'errors',
  title: 'Errors',
  source: fs.readFileSync(`${__dirname}/ErrorsExample.tsx`, 'utf-8')
}
