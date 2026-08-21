/** @public */
export interface UseObservableOptions {
  /**
   * Pause the active store subscription. While `true`, later emissions do not update the component
   * and the last received value (or `initialValue`) is returned. The render-phase warm-up
   * subscription still runs when no `initialValue` is given — pair an `initialValue` with
   * `disabled: true` and the hook performs no subscriptions at all.
   */
  disabled?: boolean
}
