import {Example} from '../../Examples'
import storage from './storage'
const fs = require('fs')

export const FormDataExample: Example = {
  id: 'form-data',
  title: 'Form data',
  scope: {storage},
  source: fs.readFileSync(`${__dirname}/FormDataExample.tsx`, 'utf-8')
}
