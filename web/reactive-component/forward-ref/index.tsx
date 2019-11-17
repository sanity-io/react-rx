import {Example} from '../../Examples'

const fs = require('fs')

export const ForwardRefExample: Example = {
  name: 'forward-ref',
  title: 'Forward Ref',
  evalCallback: 'render',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/ForwardRefExample.tsx`, 'utf-8')
}
