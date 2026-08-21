/** @public */
export interface UseObservableOptions {
  /**
   * Pause the active store subscription. While `true`, later emissions do not update the component
   * and the last received value (or the resolved `initialValue`) is returned. A disabled hook
   * performs no subscriptions at all — the render-phase warm-up for replacement observables is
   * skipped too.
   */
  disabled?: boolean
}
