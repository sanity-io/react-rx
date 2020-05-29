import {observableCallback} from 'observable-callback'
import {startWith} from 'rxjs/operators'

// for consumption outside of react only
export const createEventHandler = observableCallback

export const createState = <T>(initialState: T) => observableCallback(startWith<T, T>(initialState))
