/** @public */
export interface UseObservableOptions {
  /**
   * Pause the active store subscription. While `true`, later emissions do not update the component
   * and the last received value (or `initialValue`) is returned. Does not skip the render-phase
   * warm-up subscription — swap the observable if you need zero subscriptions.
   */
  disabled?: boolean
}
