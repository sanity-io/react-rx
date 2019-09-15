import * as React from 'react'
import {timer} from 'rxjs'
import {map} from 'rxjs/operators'
import {reactiveComponent} from '../../src/reactiveComponent'

export const SimpleExample = reactiveComponent(timer(0, 100).pipe(map(n => <>The number is {n}</>)))
