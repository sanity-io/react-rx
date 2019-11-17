import {Example} from '../../Examples'
import storage from './storage'
const fs = require('fs')

export const FormDataExample: Example = {
  name: 'form-data',
  title: 'Form data',
  evalCallback: 'render',
  type: 'mixed',
  scope: {storage},
  source: fs.readFileSync(`${__dirname}/FormDataExample.tsx`, 'utf-8')
}
