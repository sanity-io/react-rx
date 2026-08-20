/** @public */
export interface UseObservableOptions {
  /**
   * Pause the active store subscription. While `true`, later emissions do not update the component
   * and the last received value (or `initialValue`) is returned. The render-phase warm-up
   * subscription still runs when no `initialValue` is given (and for replacement observables after
   * an identity change) — pair an `initialValue` with a stable observable identity if you need
   * zero subscriptions.
   */
  disabled?: boolean
}
