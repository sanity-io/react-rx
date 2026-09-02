import {CircleCheckBig} from 'lucide-react'

import PendingButton from './PendingButton'

export default function CompleteButton({
  complete,
  action,
}: {
  complete: boolean
  action: (complete: boolean) => Promise<void>
}) {
  // The data layer merges the user's pending intent into `complete`, so no
  // useOptimistic here; PendingButton still owns the delayed loading state.
  return (
    <PendingButton action={() => action(!complete)}>
      {complete ? <CircleCheckBig className="text-chart-2" size={48} /> : <div></div>}
    </PendingButton>
  )
}
