import {observableCallback} from 'observable-callback'
import {Context, Dispatch, SetStateAction, useContext, useState} from 'react'
import {ComponentType} from 'react'
import {DependencyList, useMemo} from 'react'
import {useCallback, useEffect} from 'react'
import {
  createElement,
  forwardRef as reactForwardRef,
  Fragment,
  FunctionComponent,
  ReactNode,
  Ref,
  useRef,
} from 'react'
import {OperatorFunction} from 'rxjs'
import {Subscription} from 'rxjs'
import {BehaviorSubject} from 'rxjs'
import {Observable} from 'rxjs'
import {startWith} from 'rxjs/operators'
import {map, switchMap} from 'rxjs/operators'
import {shareReplay, tap} from 'rxjs/operators'
import {distinctUntilChanged} from 'rxjs/operators'
import {useSyncExternalStore} from 'use-sync-external-store/shim'

const getDisplayName = (Component: any) => {
  if (typeof Component === 'string') {
    return Component
  }

  return (Component && (Component.displayName || Component.name)) || 'Unknown'
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/ban-types
const wrapDisplayName = (BaseComponent: Function, wrapperName: string) =>
  `${wrapperName}(${getDisplayName(BaseComponent)})`

type Component<Props> = (input$: Observable<Props>) => Observable<ReactNode>

function fromComponent<Props>(component: Component<Props>): FunctionComponent<Props> {
  const wrappedComponent = (props: Props) => {
    return createElement(
      Fragment,
      null,
      useObservable<ReactNode>(useRef(component(useAsObservable(props))).current),
    )
  }
  wrappedComponent.displayName = wrapDisplayName(component, 'reactiveComponent')
  return wrappedComponent
}

// eslint-disable-next-line @typescript-eslint/ban-types
function fromObservable<Props>(input$: Observable<ReactNode>): FunctionComponent<{}> {
  return function ReactiveComponent() {
    return createElement(Fragment, null, useObservable<ReactNode>(input$))
  }
}

function reactiveComponent<Props>(observable: Observable<Props>): FunctionComponent<Props>
function reactiveComponent<Props>(component: Component<Props>): FunctionComponent<Props>
function reactiveComponent<Props>(observableOrComponent: Observable<ReactNode> | Component<Props>) {
  return typeof observableOrComponent === 'function'
    ? fromComponent(observableOrComponent)
    : fromObservable(observableOrComponent)
}

type ForwardRefComponent<RefType, Props> = (
  input$: Observable<Props>,
  ref: Ref<RefType>,
) => Observable<ReactNode>

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/ban-types
export function forwardRef<RefType, Props = {}>(component: ForwardRefComponent<RefType, Props>) {
  const wrappedComponent = reactForwardRef((props: Props, ref: Ref<RefType>) => {
    return createElement(
      Fragment,
      null,
      useObservable<ReactNode>(useRef(component(useAsObservable(props), ref)).current),
    )
  })
  wrappedComponent.displayName = wrapDisplayName(component, 'reactiveComponent')
  return wrappedComponent
}

/**
 * React hook to convert any props or state value into an observable
 * Returns an observable representing updates to any React value (props, state or any other calculated value)
 * Note: the returned observable is the same instance throughout the component lifecycle
 * @param value
 */
function useAsObservable<T>(value: T): Observable<T>
function useAsObservable<T, K>(
  value: T,
  operator: (input: Observable<T>) => Observable<K>,
): Observable<K>
function useAsObservable<T, K = T>(
  value: T,
  operator?: (input: Observable<T>) => Observable<K>,
): Observable<T | K> {
  const setup = useCallback((): [Observable<T | K>, BehaviorSubject<T>] => {
    const subject = new BehaviorSubject(value)

    const observable = subject.asObservable().pipe(distinctUntilChanged())
    return [operator ? observable.pipe(operator) : observable, subject]
  }, [])

  const ref = useRef<[Observable<T | K>, BehaviorSubject<T>]>()

  if (!ref.current) {
    ref.current = setup()
  }

  const [observable] = ref.current

  useEffect(() => {
    if (!ref.current) {
      return
    }
    const [, subject] = ref.current
    subject.next(value)
  }, [value, ref])

  const shouldRestoreSubscriptionRef = useRef(false)
  useEffect(() => {
    if (shouldRestoreSubscriptionRef.current) {
      if (!ref.current) {
        ref.current = setup()
      }
      shouldRestoreSubscriptionRef.current = false
    }

    return () => {
      if (!ref.current) {
        return
      }
      // React StrictMode will call effects as `setup + teardown + setup` thus we can't trust this callback as "react is about to unmount"
      // Tracking this ref lets us set the subscription back up on the next `setup` call if needed, and if it really did unmounted then all is well
      shouldRestoreSubscriptionRef.current = true
      const [, subject] = ref.current
      subject.complete()
      ref.current = undefined
    }
  }, [])
  return observable
}

function getValue<T>(value: T): T extends () => infer U ? U : T {
  return typeof value === 'function' ? value() : value
}

interface CacheRecord<T> {
  subscription: Subscription
  observable: Observable<T>
  currentValue: T
}

const cache = new WeakMap<Observable<any>, CacheRecord<any>>()
function getOrCreateStore<T>(inputObservable: Observable<T>, initialValue: T) {
  if (!cache.has(inputObservable)) {
    const entry: Partial<CacheRecord<T>> = {currentValue: initialValue}
    entry.observable = inputObservable.pipe(
      shareReplay({refCount: true, bufferSize: 1}),
      tap(value => (entry.currentValue = value)),
    )

    // Eagerly subscribe to sync set `entry.currentValue` to what the observable returns
    entry.subscription = entry.observable.subscribe()

    cache.set(inputObservable, entry as CacheRecord<T>)
  }
  return cache.get(inputObservable)!
}

export function useObservable<T>(observable: Observable<T>): T | undefined
export function useObservable<T>(observable: Observable<T>, initialValue: T): T
export function useObservable<T>(observable: Observable<T>, initialValue: () => T): T
export function useObservable<T>(observable: Observable<T>, initialValue?: T | (() => T)) {
  const [getSnapshot, subscribe] = useMemo<
    [() => T, Parameters<typeof useSyncExternalStore>[0]]
  >(() => {
    const store = getOrCreateStore(observable, getValue(initialValue))
    if (store.subscription.closed) {
      store.subscription = store.observable.subscribe()
    }
    return [
      function getSnapshot() {
        // @TODO: perf opt opportunity: we could do `store.subscription.unsubscribe()` here to clear up some memory, as this subscription is only needed to provide a sync initialValue.
        return store.currentValue
      },
      function subscribe(callback: () => void) {
        // @TODO: perf opt opportunity: we could do `store.subscription.unsubscribe()` here as we only need 1 subscription active to keep the observer alive
        const sub = store.observable.subscribe(callback)
        return () => {
          sub.unsubscribe()
        }
      },
    ]
  }, [observable])

  const shouldRestoreSubscriptionRef = useRef(false)
  useEffect(() => {
    const store = getOrCreateStore(observable, getValue(initialValue))
    if (shouldRestoreSubscriptionRef.current) {
      if (store.subscription.closed) {
        store.subscription = store.observable.subscribe()
      }
      shouldRestoreSubscriptionRef.current = false
    }

    return () => {
      // React StrictMode will call effects as `setup + teardown + setup` thus we can't trust this callback as "react is about to unmount"
      // Tracking this ref lets us set the subscription back up on the next `setup` call if needed, and if it really did unmounted then all is well
      shouldRestoreSubscriptionRef.current = !store.subscription.closed
      store.subscription.unsubscribe()
    }
  }, [observable])

  return useSyncExternalStore(subscribe, getSnapshot)
}

export function useMemoObservable<T>(
  observableOrFactory: Observable<T> | (() => Observable<T>),
  deps: DependencyList,
): T | undefined
export function useMemoObservable<T>(
  observableOrFactory: Observable<T> | (() => Observable<T>),
  deps: DependencyList,
  initialValue: T | (() => T),
): T
export function useMemoObservable<T>(
  observableOrFactory: Observable<T> | (() => Observable<T>),
  deps: DependencyList,
  initialValue?: T | (() => T),
) {
  return useObservable(
    useMemo(() => getValue(observableOrFactory), deps),
    initialValue,
  )
}

const EMPTY_DEPS: DependencyList = []

export function useObservableCallback<T, U>(
  fn: (arg: Observable<T>) => Observable<U>,
  dependencies: DependencyList = EMPTY_DEPS,
): (arg: T) => void {
  const callbackRef = useRef<[Observable<T>, (val: T) => void]>()

  if (!callbackRef.current) {
    callbackRef.current = observableCallback<T>()
  }

  const [calls$, call] = callbackRef.current

  const callback = useCallback(fn, dependencies)

  useEffect(() => {
    const subscription = calls$.pipe(callback).subscribe()
    return () => {
      subscription.unsubscribe()
    }
  }, [calls$, call, callback])

  return call
}

/**
 * React hook to convert any props or state value into an observable
 * Returns an observable representing updates to any React value (props, state or any other calculated value)
 * Note: the returned observable is the same instance throughout the component lifecycle
 * @param value
 */
function useWithObservable<T>(value: T): T | undefined
function useWithObservable<T, K>(
  value: T,
  operator: (input: Observable<T>) => Observable<K>,
): K | undefined
function useWithObservable<T, K = T>(
  value: T,
  operator?: (input: Observable<T>) => Observable<K>,
): T | K | undefined {
  return operator
    ? useObservable(useAsObservable(value, operator))
    : useObservable(useAsObservable(value))
}

const createState = <T,>(initialState: T) => observableCallback(startWith<T, T>(initialState))

function observeState<T>(initial: T | (() => T)): [Observable<T>, Dispatch<SetStateAction<T>>]
function observeState<T>(
  initial?: T | (() => T),
): [Observable<T | undefined>, Dispatch<SetStateAction<T | undefined>>] {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [value, update] = useState<T | undefined>(initial)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return [useAsObservable(value), update]
}

function observeCallback<T>(): [Observable<T>, (arg: T) => void]
function observeCallback<T, K>(operator: OperatorFunction<T, K>): [Observable<K>, (arg: T) => void]
function observeCallback<T, K>(
  operator?: OperatorFunction<T, K>,
): [Observable<T | K>, (arg: T) => void] {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const ref = useRef<[Observable<T | K>, (arg: T) => void]>()
  if (!ref.current) {
    ref.current = operator ? observableCallback<T, K>(operator) : observableCallback<T>()
  }
  return ref.current
}

function observeContext<T>(context: Context<T>): Observable<T> {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useAsObservable(useContext<T>(context))
}

function observeElement<T>(): [Observable<T | null>, (el: T | null) => void] {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const ref = useRef<[Observable<T | null>, (value: T | null) => void]>()
  if (!ref.current) {
    ref.current = createState<T | null>(null)
  }
  return ref.current
}

interface Props<T> {
  observable: Observable<T>
  children: (value: T) => ReactNode
}

type ObservableComponent<T> = ComponentType<Props<T>>

function createWithObservable<T>(): ObservableComponent<T> {
  return reactiveComponent((props$: Observable<Props<T>>) =>
    props$.pipe(
      distinctUntilChanged((props, prevProps) => props.observable === prevProps.observable),
      switchMap(
        (props): Observable<ReactNode> =>
          props.observable.pipe(map((observableValue: T) => props.children(observableValue))),
      ),
    ),
  )
}
