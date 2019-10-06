import {ForwardRefExample} from './ForwardRefExample'
const fs = require('fs')

export default {
  component: ForwardRefExample,
  title: 'Forward Ref',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/ForwardRefExample.tsx`, 'utf-8'),
}
