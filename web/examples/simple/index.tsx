import {Example} from '../../Examples'

const fs = require('fs')

export const SimpleExample: Example = {
  id: 'simple-counter',
  title: 'A stateful component',
  source: fs.readFileSync(`${__dirname}/Counter.example.tsx`, 'utf-8')
}
