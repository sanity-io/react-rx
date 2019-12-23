import {Example} from '../../pages/Examples/Examples'

const fs = require('fs')

export const UseReactiveStateExample: Example = {
  id: 'use-state',
  title: 'Reactive useState',
  source: fs.readFileSync(`${__dirname}/UseState.example.jsx`, 'utf-8')
}
