import {useTransition, type MouseEvent, type ReactNode} from 'react'

import {Button} from '@/components/ui/button'
import {debugLog} from '@/debug-log'

import {IconButtonShimmer} from './ButtonShimmer'

export default function PendingButton({
  action,
  onClick,
  loading,
  children,
}: {
  action?: () => Promise<void> | void
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  loading?: boolean
  children: ReactNode
}) {
  const [_isPending, transition] = useTransition()
  const isPending = action != null ? _isPending : loading

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    if (action) {
      // #region agent log
      debugLog({
        hypothesisId: 'H4',
        location: 'PendingButton.tsx:handleClick',
        message: 'outer useTransition starting',
        data: {hasAction: true},
      })
      // #endregion
      transition(async () => {
        await action()
        // #region agent log
        debugLog({
          hypothesisId: 'H4',
          location: 'PendingButton.tsx:outer-transition-done',
          message: 'outer useTransition scope settled',
        })
        // #endregion
      })
    } else if (onClick) {
      onClick(e)
    }
  }

  return (
    <Button
      className="relative overflow-hidden cursor-pointer"
      variant="outline"
      size="icon-lg"
      onClick={handleClick}
    >
      <IconButtonShimmer isPending={isPending}>{children}</IconButtonShimmer>
    </Button>
  )
}
