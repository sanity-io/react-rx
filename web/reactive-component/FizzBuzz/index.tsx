import {FizzBuzzExample} from './FizzBuzzExample'

const fs = require('fs')

export default {
  name: 'fizz-buzz',
  component: FizzBuzzExample,
  title: 'Fizz Buzz',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/FizzBuzzExample.tsx`, 'utf-8'),
}
