/** @public */
export interface UseObservableOptions {
  /**
   * Pause the active store subscription. While `true`, later emissions do not update the component
   * and the last received value (or `initialValue`) is returned. When no `initialValue` is given
   * the render-phase warm-up subscription still runs — provide an `initialValue` (or swap the
   * observable) if you need zero subscriptions.
   */
  disabled?: boolean
}
