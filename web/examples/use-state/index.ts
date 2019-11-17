import {Example} from '../../Examples'

const fs = require('fs')

export const UseReactiveStateExample: Example = {
  id: 'use-state',
  title: 'Reactive useState',
  source: fs.readFileSync(`${__dirname}/UseState.example.tsx`, 'utf-8')
}
