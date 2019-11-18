import {Example} from '../../Examples'
import storage from './storage'
const fs = require('fs')

export const TodoAppExample: Example = {
  id: 'todo-app',
  title: 'An Application',
  scope: {storage},
  source: fs.readFileSync(`${__dirname}/TodoApp.example.jsx`, 'utf-8')
}
