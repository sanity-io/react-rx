import {FizzBuzzExample} from './FizzBuzzExample'

const fs = require('fs')

export default {
  component: FizzBuzzExample,
  title: 'Fizz Buzz',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/FizzBuzzExample.tsx`, 'utf-8'),
}
