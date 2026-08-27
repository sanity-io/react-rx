import {CircleCheckBig} from 'lucide-react'
import {startTransition, useEffect} from 'react'
import {useOptimistic} from 'react'

import {debugLog} from '@/debug-log'
import {cn} from '@/lib/utils'

import PendingButton from './PendingButton'

export default function CompleteButton({
  complete,
  action,
}: {
  complete: boolean
  action: () => Promise<void>
}) {
  const [optimisticComplete, setOptimisticComplete] = useOptimistic(complete)

  // #region agent log
  useEffect(() => {
    debugLog({
      hypothesisId: 'H1-H3',
      location: 'CompleteButton.tsx:render-effect',
      message: 'CompleteButton render snapshot',
      data: {completeProp: complete, optimisticComplete, diverged: complete !== optimisticComplete},
    })
  })
  // #endregion

  function clickAction() {
    // #region agent log
    debugLog({
      hypothesisId: 'H3-H4',
      location: 'CompleteButton.tsx:clickAction',
      message: 'clickAction invoked',
      data: {
        completeProp: complete,
        optimisticCompleteBefore: optimisticComplete,
        nextOptimistic: !optimisticComplete,
      },
    })
    // #endregion
    startTransition(async () => {
      setOptimisticComplete(!optimisticComplete)
      // #region agent log
      debugLog({
        hypothesisId: 'H1',
        location: 'CompleteButton.tsx:after-setOptimistic',
        message: 'setOptimisticComplete called, awaiting action',
        data: {targetOptimistic: !optimisticComplete, completeProp: complete},
      })
      // #endregion
      await action()
      // #region agent log
      debugLog({
        hypothesisId: 'H1',
        location: 'CompleteButton.tsx:after-action',
        message: 'action() settled — inner startTransition scope ending',
        data: {completeProp: complete, optimisticCompleteAfterAwait: optimisticComplete},
      })
      // #endregion
    })
  }

  return (
    <PendingButton action={clickAction}>
      {optimisticComplete ? (
        <CircleCheckBig className={cn({'text-chart-2': optimisticComplete})} size={48} />
      ) : (
        <div></div>
      )}
    </PendingButton>
  )
}
