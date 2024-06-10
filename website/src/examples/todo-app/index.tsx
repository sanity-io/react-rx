import styled from 'styled-components'

import {Example} from '../../_pages/Examples/Examples'
import storage from './storage'

const fs = require('fs')

export const TodoAppExample: Example = {
  id: 'todo-app',
  title: 'An Application',
  scope: {storage, styled},
  source: fs.readFileSync(`${__dirname}/TodoApp.example.tsx`, 'utf-8'),
}
