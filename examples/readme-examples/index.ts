import {ReadmeExamples} from './ReadmeExamples'
const fs = require('fs')

export default {
  component: ReadmeExamples,
  title: 'Readme examples',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/ReadmeExamples.tsx`, 'utf-8'),
}
