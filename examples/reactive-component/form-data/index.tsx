import {FormDataExample} from './FormDataExample'
const fs = require('fs')

export default {
  component: FormDataExample,
  title: 'Form data',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/FormDataExample.tsx`, 'utf-8'),
}
