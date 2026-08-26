import {CircleCheckBig} from 'lucide-react'
import {startTransition} from 'react'
import {useOptimistic} from 'react'

import {cn} from '@/lib/utils'

import PendingButton from './PendingButton.jsx'

export default function CompleteButton({complete, action}) {
  const [optimisticComplete, setOptimisticComplete] = useOptimistic(complete)

  function clickAction() {
    startTransition(async () => {
      setOptimisticComplete(!optimisticComplete)
      await action()
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
