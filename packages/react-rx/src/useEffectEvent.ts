// TODO: switch to `useEffectEvent` from `react` once
// https://github.com/facebook/react/issues/34818 is fixed in the lowest React
// version we support. React 19.2 keeps first-render values when the calling
// component is wrapped in `forwardRef` or `memo`.
export {useEffectEvent} from 'use-effect-event'
