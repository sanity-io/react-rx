import * as React from 'react'
import {timer} from 'rxjs'
import {map} from 'rxjs/operators'
import {streamingComponent} from '../../hooks'

export const SimpleExample = streamingComponent(() => timer(0, 100).pipe(map(n => <>The number is {n}</>)))
